-- El transporte en su embarque y su contenedor: la vista que resuelve lo que ve la persona, `transporte_guardar` sobre las entidades y
-- `transporte_leer`. No depende de otro archivo (`SOLO=areas/transporte/con-embarque.sql`). Cada bloque abre su transacción, dispara el
-- invariante diferido (como al confirmar) y la revierte. Los ayudantes son copia de `guardar.sql`.
--
-- Qué asegura:
--   C1. La vista: en un muestrario (suelta con lo propio, directa en un embarque, en un contenedor con embarque, en uno sin embarque, un ítem en un
--       embarque sin origen), cada fila es la combinación de la suya con su contenedor y su embarque: con embarque, naviera, puertos y fechas son
--       del embarque; sin él, los propios.
--   C2. Un booking que no existe se crea con los datos de la unidad; el mismo booking desde otra unidad la suma al embarque (uno solo) y lee sus datos.
--   C3. Con contenedor, el booking es del contenedor: un booking tipeado mueve el contenedor a ese embarque (y lo lee otra unidad del contenedor);
--       un contenedor que va en otro booking, sin tocar el booking, da 23514 hint contenedor.
--   C4. Entrar a un embarque que ya existe con otra fecha da 23514 hint booking; con la misma, entra.
--   C5. Salir copia: sin booking, la unidad conserva las fechas del embarque como propias; sin contenedor, queda directa en el embarque.
--   C6. Las versiones: cambiar la ETA con la versión vieja del embarque da PT409; cambiar el booking con la vieja del contenedor, PT409.
--   C7. transporte_leer: sin fila, nulo; sin ver la logística, 42501; las entidades con su booking, número y versión; con 101 vehículos visibles,
--       100 y hay_mas; con alcance «propios», sólo los suyos y hay_ocultas; la papelera no cuenta.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.trc_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-tr@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('tr_' || substr(v_id::text, 1, 8), 'tr ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Un origen (con su flujo), una fase y la persona que edita todo.
create or replace function pg_temp.trc_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fa uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('trc_' || s, 'trc origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('trc2_' || s, 'trc origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl, 'trc en tránsito', 1, true) returning id into fa;
  return jsonb_build_object('o', o, 'o2', o2, 'fase', fa, 'p', pg_temp.trc_persona(array['logistica.ver', 'logistica.transporte.editar']));
end $f$;

create or replace function pg_temp.trc_vehiculo(t jsonb, p_creado_por uuid default null) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, creado_por) values ((t ->> 'o')::uuid, 'trc vehículo', (t ->> 'fase')::uuid, p_creado_por)
  returning id;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.trc_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, 'null'::jsonb);
end $f$;

-- Guarda con las versiones vigentes de la fila, su embarque y su contenedor (o las que se pasen).
create or replace function pg_temp.trc_guardar(p_quien uuid, p_v uuid, p_cambios jsonb, p_embarque timestamptz default null,
  p_contenedor timestamptz default null) returns jsonb language sql as $f$
  select pg_temp.trc_corre(p_quien, format('select public.transporte_guardar(%L, null, %L, %L, %L, %L)', p_v,
    (select x.actualizado_en from public.transportes_con_embarque x where x.vehiculo_id = p_v), p_cambios,
    coalesce(p_embarque, (select x.embarque_actualizado_en from public.transportes_con_embarque x where x.vehiculo_id = p_v)),
    coalesce(p_contenedor, (select x.contenedor_actualizado_en from public.transportes_con_embarque x where x.vehiculo_id = p_v))));
$f$;

create or replace function pg_temp.trc_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.trc_pasa(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'actualizado_en' is null then raise exception '%: debía guardar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

-- Lo que ve una unidad en la vista.
create or replace function pg_temp.trc_ve(p_v uuid) returns public.transportes_con_embarque language sql as $f$
  select x from public.transportes_con_embarque x where x.vehiculo_id = p_v;
$f$;

-- @test transporte: la vista es la combinación de la fila con su contenedor y su embarque, en un muestrario (C1)
begin;
do $$
declare t jsonb := pg_temp.trc_terreno(); o uuid := (t ->> 'o')::uuid; nav uuid; nav2 uuid; po uuid; e uuid; e_rep uuid; c1 uuid; c2 uuid;
  pr uuid; item uuid; n integer;
begin
  insert into public.navieras (nombre) values ('trc naviera') returning id into nav;
  insert into public.navieras (nombre) values ('trc naviera 2') returning id into nav2;
  insert into public.puertos (nombre) values ('trc puerto') returning id into po;
  insert into public.embarques (origen_id, booking, naviera_id, puerto_destino_id, zarpe_el, eta_el)
  values (o, 'TRCBK1', nav, po, date '2026-11-20', date '2026-12-20') returning id into e;
  insert into public.embarques (origen_id, booking, naviera_id) values (null, 'TRCBK1', nav2) returning id into e_rep;
  insert into public.contenedores (origen_id, numero, embarque_id) values (o, 'TRCC1', e) returning id into c1;
  insert into public.contenedores (origen_id, numero) values (o, 'TRCC2') returning id into c2;
  insert into public.transportes (vehiculo_id, naviera_id, eta_el, notas) values (pg_temp.trc_vehiculo(t), nav2, date '2026-12-01', 'suelta');
  insert into public.transportes (vehiculo_id, embarque_id) values (pg_temp.trc_vehiculo(t), e);
  insert into public.transportes (vehiculo_id, contenedor_id) values (pg_temp.trc_vehiculo(t), c1);
  insert into public.transportes (vehiculo_id, contenedor_id, eta_el, arribo_el) values (pg_temp.trc_vehiculo(t), c2, date '2026-12-03', date '2026-12-04');
  insert into public.repuestos_proyectos (vehiculo_etiqueta) values ('trc proyecto') returning id into pr;
  insert into public.repuestos_items (proyecto_id, descripcion) values (pr, 'trc ítem') returning id into item;
  insert into public.transportes (repuesto_id, embarque_id) values (item, e_rep);
  -- Lo esperado, por fila: el embarque es el directo o el del contenedor.
  select count(*) into n from (
    (select x.id, x.contenedor_id, x.embarque_id, x.contenedor, x.booking, x.naviera_id, x.puerto_origen_id, x.puerto_destino_id, x.zarpe_el,
            x.eta_el, x.arribo_el, x.notas, x.contenedor_actualizado_en, x.embarque_actualizado_en
       from public.transportes_con_embarque x
      where x.id in (select y.id from public.transportes y where y.repuesto_id = item or y.vehiculo_id in (select v.id from public.vehiculos v where v.origen_id = o))
     except
     select y.id, y.contenedor_id, coalesce(y.embarque_id, c.embarque_id), c.numero, emb.booking,
            case when emb.id is null then y.naviera_id else emb.naviera_id end,
            case when emb.id is null then y.puerto_origen_id else emb.puerto_origen_id end,
            case when emb.id is null then y.puerto_destino_id else emb.puerto_destino_id end,
            case when emb.id is null then y.zarpe_el else emb.zarpe_el end,
            case when emb.id is null then y.eta_el else emb.eta_el end,
            case when emb.id is null then y.arribo_el else emb.arribo_el end,
            y.notas, c.actualizado_en, emb.actualizado_en
       from public.transportes y
       left join public.contenedores c on c.id = y.contenedor_id
       left join public.embarques emb on emb.id = coalesce(y.embarque_id, c.embarque_id))
    union all
    (select y.id, y.contenedor_id, coalesce(y.embarque_id, c.embarque_id), c.numero, emb.booking,
            case when emb.id is null then y.naviera_id else emb.naviera_id end,
            case when emb.id is null then y.puerto_origen_id else emb.puerto_origen_id end,
            case when emb.id is null then y.puerto_destino_id else emb.puerto_destino_id end,
            case when emb.id is null then y.zarpe_el else emb.zarpe_el end,
            case when emb.id is null then y.eta_el else emb.eta_el end,
            case when emb.id is null then y.arribo_el else emb.arribo_el end,
            y.notas, c.actualizado_en, emb.actualizado_en
       from public.transportes y
       left join public.contenedores c on c.id = y.contenedor_id
       left join public.embarques emb on emb.id = coalesce(y.embarque_id, c.embarque_id)
      where y.repuesto_id = item or y.vehiculo_id in (select v.id from public.vehiculos v where v.origen_id = o)
     except
     select x.id, x.contenedor_id, x.embarque_id, x.contenedor, x.booking, x.naviera_id, x.puerto_origen_id, x.puerto_destino_id, x.zarpe_el,
            x.eta_el, x.arribo_el, x.notas, x.contenedor_actualizado_en, x.embarque_actualizado_en
       from public.transportes_con_embarque x)) d;
  if n <> 0 then raise exception 'C1: la vista y la combinación por fila difieren en % filas', n; end if;
  if (select count(*) from public.transportes_con_embarque x
       where x.repuesto_id = item or x.vehiculo_id in (select v.id from public.vehiculos v where v.origen_id = o)) <> 5 then
    raise exception 'C1: la vista debía tener las 5 filas del muestrario';
  end if;
  if (select x.booking || ' ' || x.naviera_id::text from public.transportes_con_embarque x where x.repuesto_id = item) is distinct from 'TRCBK1 ' || nav2 then
    raise exception 'C1: el ítem debía leer el embarque sin origen';
  end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: un booking nuevo se crea con los datos de la unidad y el mismo booking suma otra unidad al embarque (C2)
begin;
do $$
declare t jsonb := pg_temp.trc_terreno(); p uuid := (t ->> 'p')::uuid; v1 uuid := pg_temp.trc_vehiculo(t); v2 uuid := pg_temp.trc_vehiculo(t);
  r jsonb; e uuid;
begin
  r := pg_temp.trc_pasa('C2 crear', pg_temp.trc_guardar(p, v1, '{"booking": " trc bk9 ", "eta_el": "2026-12-10"}'));
  select x.id into e from public.embarques x where x.origen_id = (t ->> 'o')::uuid and x.booking = 'TRCBK9';
  if e is null or (select x.eta_el from public.embarques x where x.id = e) is distinct from date '2026-12-10'
     or r #>> '{embarque,id}' is distinct from e::text or r -> 'contenedor' <> 'null'::jsonb then
    raise exception 'C2: debía crear el embarque TRCBK9 con la ETA y devolverlo: %', r;
  end if;
  if (select y.eta_el from public.transportes y where y.vehiculo_id = v1) is not null then
    raise exception 'C2: con embarque, la unidad no guarda la ETA propia';
  end if;
  perform pg_temp.trc_pasa('C2 sumarse', pg_temp.trc_guardar(p, v2, '{"booking": "TRCBK9"}'));
  if (select count(*) from public.embarques x where x.origen_id = (t ->> 'o')::uuid and x.booking = 'TRCBK9') <> 1
     or (pg_temp.trc_ve(v2)).embarque_id is distinct from e or (pg_temp.trc_ve(v2)).eta_el is distinct from date '2026-12-10' then
    raise exception 'C2: la segunda unidad debía sumarse al mismo embarque y leer su ETA: %', to_jsonb(pg_temp.trc_ve(v2));
  end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: con contenedor, el booking es del contenedor: lo mueve, y uno que va en otro booking da 23514 (C3)
begin;
do $$
declare t jsonb := pg_temp.trc_terreno(); p uuid := (t ->> 'p')::uuid; v1 uuid := pg_temp.trc_vehiculo(t); v2 uuid := pg_temp.trc_vehiculo(t);
  v3 uuid := pg_temp.trc_vehiculo(t); v4 uuid := pg_temp.trc_vehiculo(t); c uuid;
begin
  perform pg_temp.trc_pasa('C3 contenedor', pg_temp.trc_guardar(p, v1, '{"contenedor": "TRCA1"}'));
  perform pg_temp.trc_pasa('C3 otra en el contenedor', pg_temp.trc_guardar(p, v2, '{"contenedor": "TRCA1"}'));
  select x.id into c from public.contenedores x where x.origen_id = (t ->> 'o')::uuid and x.numero = 'TRCA1';
  if (select x.embarque_id from public.contenedores x where x.id = c) is not null then raise exception 'C3: el contenedor nace sin embarque'; end if;
  perform pg_temp.trc_pasa('C3 booking del contenedor', pg_temp.trc_guardar(p, v1, '{"booking": "TRCBKA"}'));
  if (select e.booking from public.contenedores x join public.embarques e on e.id = x.embarque_id where x.id = c) is distinct from 'TRCBKA'
     or (pg_temp.trc_ve(v2)).booking is distinct from 'TRCBKA' or (select y.embarque_id from public.transportes y where y.vehiculo_id = v1) is not null then
    raise exception 'C3: el booking debía mover el contenedor (y llegar a la otra unidad): %', to_jsonb(pg_temp.trc_ve(v2));
  end if;
  perform pg_temp.trc_pasa('C3 otro contenedor en otro booking', pg_temp.trc_guardar(p, v3, '{"contenedor": "TRCA2", "booking": "TRCBKB"}'));
  perform pg_temp.trc_pasa('C3 suelta en TRCBKA', pg_temp.trc_guardar(p, v4, '{"booking": "TRCBKA"}'));
  perform pg_temp.trc_es('C3 contenedor de otro booking', pg_temp.trc_guardar(p, v4, '{"contenedor": "TRCA2"}'), '23514', 'contenedor');
  if (pg_temp.trc_ve(v4)).contenedor is not null then raise exception 'C3: no debía entrar al contenedor'; end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: entrar a un embarque que ya existe con otra fecha da 23514; con la misma, entra (C4)
begin;
do $$
declare t jsonb := pg_temp.trc_terreno(); p uuid := (t ->> 'p')::uuid; v1 uuid := pg_temp.trc_vehiculo(t); v2 uuid := pg_temp.trc_vehiculo(t);
begin
  perform pg_temp.trc_pasa('C4 crear', pg_temp.trc_guardar(p, v1, '{"booking": "TRCBK4", "eta_el": "2026-12-10"}'));
  perform pg_temp.trc_es('C4 otra fecha', pg_temp.trc_guardar(p, v2, '{"booking": "TRCBK4", "eta_el": "2026-12-20"}'), '23514', 'booking');
  if (select x.eta_el from public.embarques x where x.origen_id = (t ->> 'o')::uuid and x.booking = 'TRCBK4') is distinct from date '2026-12-10' then
    raise exception 'C4: la ETA del embarque no debía cambiar';
  end if;
  perform pg_temp.trc_pasa('C4 la misma fecha', pg_temp.trc_guardar(p, v2, '{"booking": "TRCBK4", "eta_el": "2026-12-10"}'));
  if (pg_temp.trc_ve(v2)).booking is distinct from 'TRCBK4' then raise exception 'C4: con la misma fecha debía entrar'; end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: salir del embarque copia sus datos; salir del contenedor deja la unidad directa en el embarque (C5)
begin;
do $$
declare t jsonb := pg_temp.trc_terreno(); p uuid := (t ->> 'p')::uuid; v1 uuid := pg_temp.trc_vehiculo(t); v2 uuid := pg_temp.trc_vehiculo(t);
  y record;
begin
  perform pg_temp.trc_pasa('C5 crear', pg_temp.trc_guardar(p, v1, '{"booking": "TRCBK5", "zarpe_el": "2026-11-28", "eta_el": "2026-12-10"}'));
  perform pg_temp.trc_pasa('C5 salir', pg_temp.trc_guardar(p, v1, '{"booking": null}'));
  select x.embarque_id, x.zarpe_el, x.eta_el into y from public.transportes x where x.vehiculo_id = v1;
  if y.embarque_id is not null or y.zarpe_el is distinct from date '2026-11-28' or y.eta_el is distinct from date '2026-12-10' then
    raise exception 'C5: al salir debía conservar las fechas como propias: %', to_jsonb(y);
  end if;
  perform pg_temp.trc_pasa('C5 en contenedor con booking', pg_temp.trc_guardar(p, v2, '{"contenedor": "TRCA5", "booking": "TRCBK5"}'));
  perform pg_temp.trc_pasa('C5 sin contenedor', pg_temp.trc_guardar(p, v2, '{"contenedor": null}'));
  select x.contenedor_id, x.embarque_id into y from public.transportes x where x.vehiculo_id = v2;
  if y.contenedor_id is not null or (pg_temp.trc_ve(v2)).booking is distinct from 'TRCBK5' then
    raise exception 'C5: sin contenedor debía quedar directa en el embarque: %', to_jsonb(pg_temp.trc_ve(v2));
  end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: la versión vieja del embarque o del contenedor da PT409 (C6)
begin;
do $$
declare t jsonb := pg_temp.trc_terreno(); p uuid := (t ->> 'p')::uuid; v1 uuid := pg_temp.trc_vehiculo(t); v2 uuid := pg_temp.trc_vehiculo(t);
  v3 uuid := pg_temp.trc_vehiculo(t); vieja timestamptz; r jsonb;
begin
  perform pg_temp.trc_pasa('C6 v1', pg_temp.trc_guardar(p, v1, '{"booking": "TRCBK6", "eta_el": "2026-12-10"}'));
  perform pg_temp.trc_pasa('C6 v2', pg_temp.trc_guardar(p, v2, '{"booking": "TRCBK6"}'));
  -- La versión la pone el trigger con now(), la misma en toda la transacción: la «vieja» es una distinta de la vigente.
  vieja := (pg_temp.trc_ve(v1)).embarque_actualizado_en - interval '1 second';
  perform pg_temp.trc_pasa('C6 otra cambia la ETA', pg_temp.trc_guardar(p, v2, '{"eta_el": "2026-12-12"}'));
  r := pg_temp.trc_guardar(p, v1, '{"eta_el": "2026-12-15"}', vieja);
  perform pg_temp.trc_es('C6 embarque viejo', r, 'PT409');
  if r ->> 'mensaje' !~ 'embarque' or (pg_temp.trc_ve(v1)).eta_el is distinct from date '2026-12-12' then
    raise exception 'C6: debía nombrar el embarque y no cambiar la ETA: %', r;
  end if;
  perform pg_temp.trc_pasa('C6 contenedor', pg_temp.trc_guardar(p, v3, '{"contenedor": "TRCA6"}'));
  vieja := (pg_temp.trc_ve(v3)).contenedor_actualizado_en - interval '1 second';
  update public.contenedores set sello = 'S1' where origen_id = (t ->> 'o')::uuid and numero = 'TRCA6';
  r := pg_temp.trc_guardar(p, v3, '{"booking": "TRCBK7"}', null, vieja);
  perform pg_temp.trc_es('C6 contenedor viejo', r, 'PT409');
  if r ->> 'mensaje' !~ 'contenedor' or (pg_temp.trc_ve(v3)).booking is not null then
    raise exception 'C6: debía nombrar el contenedor y no cambiar el booking: %', r;
  end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: transporte_leer, sus entidades y cuántos vehículos ve la persona (C7)
begin;
do $$
declare t jsonb := pg_temp.trc_terreno(); p uuid := (t ->> 'p')::uuid; o uuid := (t ->> 'o')::uuid; prop uuid; nadie uuid; v1 uuid; v2 uuid;
  v_basura uuid; e uuid; c uuid; r jsonb;
begin
  prop := pg_temp.trc_persona(array['logistica.ver@' || o], 'propios');
  nadie := pg_temp.trc_persona(array['leads.ver']);
  v1 := pg_temp.trc_vehiculo(t, prop);
  if pg_temp.trc_corre(prop, format('select public.transporte_leer(%L)', v1)) <> 'null'::jsonb then raise exception 'C7: sin fila debía ser nulo'; end if;
  perform pg_temp.trc_es('C7 sin la logística', pg_temp.trc_corre(nadie, format('select public.transporte_leer(%L)', v1)), '42501');
  perform pg_temp.trc_pasa('C7 v1', pg_temp.trc_guardar(p, v1, '{"booking": "TRCBK8", "contenedor": "TRCA8"}'));
  select x.embarque_id, x.contenedor_id into e, c from public.transportes_con_embarque x where x.vehiculo_id = v1;
  -- Otro del contenedor que `prop` no ve (no es suyo) y uno suyo en la papelera.
  v2 := pg_temp.trc_vehiculo(t);
  insert into public.transportes (vehiculo_id, contenedor_id) values (v2, c);
  v_basura := pg_temp.trc_vehiculo(t, prop);
  insert into public.transportes (vehiculo_id, contenedor_id) values (v_basura, c);
  update public.vehiculos set eliminado_en = now() where id = v_basura;
  r := pg_temp.trc_corre(prop, format('select public.transporte_leer(%L)', v1));
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from
       array['actualizado_en', 'arribo_el', 'booking', 'contenedor', 'entidades', 'eta_el', 'id', 'naviera_id', 'notas', 'puerto_destino_id',
             'puerto_origen_id', 'zarpe_el'] then
    raise exception 'C7: claves de más o de menos: %', r;
  end if;
  if r #>> '{entidades,embarque,booking}' is distinct from 'TRCBK8' or r #>> '{entidades,contenedor,numero}' is distinct from 'TRCA8'
     or r #>> '{entidades,embarque,id}' is distinct from e::text or r #>> '{entidades,contenedor,id}' is distinct from c::text
     or (r #>> '{entidades,embarque,actualizado_en}')::timestamptz is distinct from (pg_temp.trc_ve(v1)).embarque_actualizado_en
     or r ->> 'booking' is distinct from 'TRCBK8' or r ->> 'contenedor' is distinct from 'TRCA8' then
    raise exception 'C7: las entidades debían traer booking, número, ids y versión: %', r;
  end if;
  if r #> '{entidades,contenedor,vehiculos}' is distinct from '{"n": 1, "hay_mas": false, "hay_ocultas": true}'::jsonb then
    raise exception 'C7: «propios» debía contar el suyo (sin la papelera) y saber que hay ocultas: %', r #> '{entidades,contenedor,vehiculos}';
  end if;
  -- 101 visibles: 100 y hay_mas.
  insert into public.transportes (vehiculo_id, embarque_id)
  select pg_temp.trc_vehiculo(t, prop), e from generate_series(1, 100);
  r := pg_temp.trc_corre(prop, format('select public.transporte_leer(%L)', v1));
  if r #> '{entidades,embarque,vehiculos}' is distinct from '{"n": 100, "hay_mas": true, "hay_ocultas": true}'::jsonb then
    raise exception 'C7: con 101 visibles debía dar 100 y hay_mas: %', r #> '{entidades,embarque,vehiculos}';
  end if;
  r := pg_temp.trc_corre(p, format('select public.transporte_leer(%L)', v1));
  if r #> '{entidades,contenedor,vehiculos}' is distinct from '{"n": 2, "hay_mas": false, "hay_ocultas": false}'::jsonb then
    raise exception 'C7: quien ve todo debía contar los dos vivos del contenedor: %', r #> '{entidades,contenedor,vehiculos}';
  end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;
