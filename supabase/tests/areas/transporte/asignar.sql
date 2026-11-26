-- Asignar unidades en lote a un contenedor o a un embarque, y quitarlas: `transporte_asignar` y `transporte_quitar`. No depende de otro archivo
-- (`SOLO=areas/transporte/asignar.sql`). Cada bloque abre su transacción, dispara el invariante diferido (como al confirmar) y la revierte. Los
-- ayudantes son copia de `embarques.sql` con su propio prefijo (`db:probar` corre todos los archivos en una sola sesión).
--
-- Qué asegura:
--   A1. El lote: 200 pasan (sin fila, la versión nula la crea) y repetirlo con sus versiones no cambia nada; 201, repetidas, mal formadas, un tipo
--       que no es o un destino que no existe o no se ve dan su error, sin escribir.
--   A2. Mover: una que está en otro contenedor o directa en otro embarque da 23514 hint mover sin p_mover y se mueve con él; la que va en un
--       contenedor del embarque destino ya está; entrar a un contenedor con embarque limpia lo propio.
--   A3. Un vehículo de otro origen da 22023 hint destino y no se asigna ninguna (todo o nada).
--   A4. Un ítem entra con repuestos.editar; sin él, 42501.
--   A5. Quitar: del contenedor queda directa en su embarque; del embarque sale también del contenedor y copia sus datos; lo que exige la fase da
--       23514; sin versión, falla; la que no está, no cambia.
--   A6. Una versión vieja da PT409 y no cambia ninguna; la nula con fila, PT409.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=`): una de relleno antes, para que ninguna de la prueba lo sea. Una concesión
-- `clave@origen` es sólo para ese origen.
create or replace function pg_temp.tas_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-tas@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('tas_' || substr(v_id::text, 1, 8), 'tas ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Dos orígenes (con su flujo), una fase en cada uno y una final en el primero.
create or replace function pg_temp.tas_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fl2 uuid; fa uuid; fa2 uuid; ff uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('tas_' || s, 'tas origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('tas2_' || s, 'tas origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  select id into fl2 from public.flujos where origen_id = o2;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl, 'tas en tránsito', 1, true) returning id into fa;
  insert into public.fases (flujo_id, nombre, orden, es_final) values (fl, 'tas entregado', 9, true) returning id into ff;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl2, 'tas2 en tránsito', 1, true) returning id into fa2;
  return jsonb_build_object('o', o, 'o2', o2, 'flujo', fl, 'fase', fa, 'fase2', fa2, 'final', ff);
end $f$;

create or replace function pg_temp.tas_vehiculo(p_origen uuid, p_fase uuid, p_creado_por uuid default null) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, creado_por) values (p_origen, 'tas vehículo', p_fase, p_creado_por) returning id;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.tas_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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


create or replace function pg_temp.tas_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.tas_pasa(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' or not p_r ? 'unidades' then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

-- El lote de unos vehículos con la versión vigente de su fila (nula si no tienen).
create or replace function pg_temp.tas_lote(p_vehiculos uuid[]) returns jsonb language sql as $f$
  select jsonb_agg(jsonb_build_object('vehiculo_id', v.id, 'actualizado_en', (select t.actualizado_en from public.transportes t where t.vehiculo_id = v.id))
                   order by v.k)
    from unnest(p_vehiculos) with ordinality v (id, k);
$f$;

create or replace function pg_temp.tas_asignar(p_quien uuid, p_tipo text, p_destino uuid, p_unidades jsonb, p_mover boolean default false)
  returns jsonb language sql as $f$
  select pg_temp.tas_corre(p_quien, format('select public.transporte_asignar(%L, %L, %L, %L)', p_tipo, p_destino, p_unidades, p_mover));
$f$;

create or replace function pg_temp.tas_quitar(p_quien uuid, p_tipo text, p_unidades jsonb) returns jsonb language sql as $f$
  select pg_temp.tas_corre(p_quien, format('select public.transporte_quitar(%L, %L)', p_tipo, p_unidades));
$f$;

create or replace function pg_temp.tas_embarque(p_origen uuid, p_booking text, p_eta date default null) returns uuid language sql as $f$
  insert into public.embarques (origen_id, booking, eta_el) values (p_origen, p_booking, p_eta) returning id;
$f$;

create or replace function pg_temp.tas_contenedor(p_origen uuid, p_numero text, p_embarque uuid default null) returns uuid language sql as $f$
  insert into public.contenedores (origen_id, numero, embarque_id) values (p_origen, p_numero, p_embarque) returning id;
$f$;

create or replace function pg_temp.tas_en(p_v uuid) returns jsonb language sql as $f$
  select jsonb_build_object('contenedor', t.contenedor_id, 'embarque', t.embarque_id) from public.transportes t where t.vehiculo_id = p_v;
$f$;

-- @test asignar: un lote de 200 pasa y repetirlo no cambia nada; 201, repetidas o mal formadas, un tipo o un destino que no son dan su error (A1)
begin;
do $$
declare t jsonb := pg_temp.tas_terreno(); o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid; p uuid; ajena uuid; c uuid; c_o2 uuid;
  vs uuid[]; r jsonb; lote jsonb;
begin
  p := pg_temp.tas_persona(array['logistica.ver', 'logistica.transporte.editar']);
  ajena := pg_temp.tas_persona(array['logistica.ver@' || o2, 'logistica.transporte.editar']);
  c := pg_temp.tas_contenedor(o, 'CONTA1');
  c_o2 := pg_temp.tas_contenedor(o2, 'CONTA1O2');
  with n as (insert into public.vehiculos (origen_id, titulo, fase_id) select o, 'tas lote ' || g, (t ->> 'fase')::uuid from generate_series(1, 201) g
             returning id)
  select array_agg(id order by id) into vs from n;
  perform pg_temp.tas_es('A1 201', pg_temp.tas_asignar(p, 'contenedor', c, pg_temp.tas_lote(vs)), '22023', 'unidades');
  perform pg_temp.tas_es('A1 vacío', pg_temp.tas_asignar(p, 'contenedor', c, '[]'), '22023', 'unidades');
  perform pg_temp.tas_es('A1 repetida', pg_temp.tas_asignar(p, 'contenedor', c, pg_temp.tas_lote(array[vs[1], vs[1]])), '22023', 'unidades');
  perform pg_temp.tas_es('A1 mal formada',
    pg_temp.tas_asignar(p, 'contenedor', c, jsonb_build_array(jsonb_build_object('vehiculo_id', vs[1], 'repuesto_id', vs[2]))), '22023', 'unidades');
  perform pg_temp.tas_es('A1 un tipo que no es', pg_temp.tas_asignar(p, 'booking', c, pg_temp.tas_lote(vs[1:1])), '22023', 'tipo');
  perform pg_temp.tas_es('A1 un destino que no existe', pg_temp.tas_asignar(p, 'contenedor', gen_random_uuid(), pg_temp.tas_lote(vs[1:1])), 'PT409', 'destino');
  perform pg_temp.tas_es('A1 un destino que no ve', pg_temp.tas_asignar(ajena, 'contenedor', c, pg_temp.tas_lote(vs[1:1])), 'PT409', 'destino');
  if exists (select 1 from public.transportes x where x.vehiculo_id = any (vs)) then raise exception 'A1: los errores no debían escribir'; end if;
  r := pg_temp.tas_pasa('A1 200', pg_temp.tas_asignar(p, 'contenedor', c, pg_temp.tas_lote(vs[1:200])));
  if jsonb_array_length(r -> 'unidades') <> 200 or (r ->> 'sin_cambios')::boolean
     or (select count(*) from public.transportes x where x.contenedor_id = c and x.vehiculo_id = any (vs)) <> 200 then
    raise exception 'A1: debían quedar las 200 en el contenedor: %', r ->> 'sin_cambios';
  end if;
  if (r -> 'unidades' -> 0 ->> 'vehiculo_id')::uuid <> vs[1] or r -> 'unidades' -> 0 ->> 'id' is null then
    raise exception 'A1: cada unidad con su fila y su versión, en el orden del lote: %', r -> 'unidades' -> 0;
  end if;
  lote := (select jsonb_agg(jsonb_build_object('vehiculo_id', u ->> 'vehiculo_id', 'actualizado_en', u ->> 'actualizado_en')) from jsonb_array_elements(r -> 'unidades') u);
  r := pg_temp.tas_pasa('A1 repetirlo', pg_temp.tas_asignar(p, 'contenedor', c, lote));
  if not (r ->> 'sin_cambios')::boolean then raise exception 'A1: repetirlo no cambia nada'; end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test asignar: mover pide p_mover; la que va en un contenedor del embarque ya está; entrar a un contenedor con embarque limpia lo propio (A2)
begin;
do $$
declare t jsonb := pg_temp.tas_terreno(); o uuid := (t ->> 'o')::uuid; p uuid; c1 uuid; c2 uuid; c3 uuid; e1 uuid; e2 uuid; e3 uuid;
  v1 uuid; v2 uuid; v3 uuid; v4 uuid; r jsonb;
begin
  p := pg_temp.tas_persona(array['logistica.ver', 'logistica.transporte.editar']);
  e1 := pg_temp.tas_embarque(o, 'BKA21'); e2 := pg_temp.tas_embarque(o, 'BKA22'); e3 := pg_temp.tas_embarque(o, 'BKA23', date '2026-12-20');
  c1 := pg_temp.tas_contenedor(o, 'CONTA21'); c2 := pg_temp.tas_contenedor(o, 'CONTA22'); c3 := pg_temp.tas_contenedor(o, 'CONTA23', e3);
  v1 := pg_temp.tas_vehiculo(o, (t ->> 'fase')::uuid); v2 := pg_temp.tas_vehiculo(o, (t ->> 'fase')::uuid);
  v3 := pg_temp.tas_vehiculo(o, (t ->> 'fase')::uuid); v4 := pg_temp.tas_vehiculo(o, (t ->> 'fase')::uuid);
  insert into public.transportes (vehiculo_id, contenedor_id) values (v1, c1);
  insert into public.transportes (vehiculo_id, embarque_id) values (v2, e1);
  insert into public.transportes (vehiculo_id, contenedor_id) values (v3, c3);
  insert into public.transportes (vehiculo_id, eta_el, notas) values (v4, date '2026-12-05', 'suelta');
  r := pg_temp.tas_asignar(p, 'contenedor', c2, pg_temp.tas_lote(array[v1]));
  perform pg_temp.tas_es('A2 en otro contenedor', r, '23514', 'mover');
  if r ->> 'mensaje' not like '%«CONTA21»: ¿moverlo a éste?' then raise exception 'A2: el mensaje nombra el contenedor: %', r; end if;
  perform pg_temp.tas_pasa('A2 mover al contenedor', pg_temp.tas_asignar(p, 'contenedor', c2, pg_temp.tas_lote(array[v1]), true));
  if pg_temp.tas_en(v1) ->> 'contenedor' <> c2::text then raise exception 'A2: debía quedar en el contenedor nuevo'; end if;
  r := pg_temp.tas_asignar(p, 'embarque', e2, pg_temp.tas_lote(array[v2]));
  perform pg_temp.tas_es('A2 directa en otro embarque', r, '23514', 'mover');
  if r ->> 'mensaje' not like '%«BKA21»: ¿moverlo a éste?' then raise exception 'A2: el mensaje nombra el embarque: %', r; end if;
  perform pg_temp.tas_pasa('A2 mover al embarque', pg_temp.tas_asignar(p, 'embarque', e2, pg_temp.tas_lote(array[v2]), true));
  if pg_temp.tas_en(v2) ->> 'embarque' <> e2::text then raise exception 'A2: debía quedar en el embarque nuevo'; end if;
  r := pg_temp.tas_pasa('A2 ya está en el embarque', pg_temp.tas_asignar(p, 'embarque', e3, pg_temp.tas_lote(array[v3])));
  if not (r ->> 'sin_cambios')::boolean or pg_temp.tas_en(v3) ->> 'contenedor' <> c3::text then
    raise exception 'A2: la que va en un contenedor del embarque ya está: %', r;
  end if;
  -- Suelta, entra a un contenedor con embarque: lee lo del embarque y no guarda nada propio (las notas son suyas).
  perform pg_temp.tas_pasa('A2 entrar', pg_temp.tas_asignar(p, 'contenedor', c3, pg_temp.tas_lote(array[v4])));
  if (select (x.booking, x.eta_el, x.notas) from public.transportes_con_embarque x where x.vehiculo_id = v4)
     is distinct from ('BKA23'::text, date '2026-12-20', 'suelta'::text)
     or (select eta_el from public.transportes where vehiculo_id = v4) is not null then
    raise exception 'A2: al entrar debía leer lo del embarque y no guardar lo propio';
  end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test asignar: un vehículo de otro origen da 22023 y no se asigna ninguna (A3)
begin;
do $$
declare t jsonb := pg_temp.tas_terreno(); o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid; p uuid; c uuid; v uuid; v_o2 uuid; r jsonb;
begin
  p := pg_temp.tas_persona(array['logistica.ver', 'logistica.transporte.editar']);
  c := pg_temp.tas_contenedor(o, 'CONTA3');
  v := pg_temp.tas_vehiculo(o, (t ->> 'fase')::uuid);
  v_o2 := pg_temp.tas_vehiculo(o2, (t ->> 'fase2')::uuid);
  r := pg_temp.tas_asignar(p, 'contenedor', c, pg_temp.tas_lote(array[v, v_o2]));
  perform pg_temp.tas_es('A3 otro origen', r, '22023', 'destino');
  if r ->> 'mensaje' not like '%El contenedor «CONTA3» es de otro origen.' then raise exception 'A3: el mensaje: %', r; end if;
  if exists (select 1 from public.transportes x where x.vehiculo_id in (v, v_o2)) then raise exception 'A3: no debía asignar ninguna'; end if;
  perform pg_temp.tas_es('A3 al embarque de otro origen',
    pg_temp.tas_asignar(p, 'embarque', pg_temp.tas_embarque(o2, 'BKA3'), pg_temp.tas_lote(array[v])), '22023', 'destino');
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test asignar: un ítem entra con repuestos.editar y sin él da 42501 (A4)
begin;
do $$
declare t jsonb := pg_temp.tas_terreno(); o uuid := (t ->> 'o')::uuid; con uuid; sin uuid; c uuid; pr uuid; item uuid; fr uuid; lote jsonb;
begin
  con := pg_temp.tas_persona(array['logistica.ver', 'logistica.transporte.editar', 'repuestos.ver', 'repuestos.editar']);
  sin := pg_temp.tas_persona(array['logistica.ver', 'logistica.transporte.editar', 'repuestos.ver']);
  c := pg_temp.tas_contenedor(o, 'CONTA4');
  insert into public.fases (flujo_id, nombre, orden) select f.id, 'tas en tránsito', 99 from public.flujos f where f.ambito = 'repuestos' returning id into fr;
  insert into public.repuestos_proyectos (vehiculo_etiqueta) values ('tas proyecto') returning id into pr;
  insert into public.repuestos_items (proyecto_id, descripcion, fase_id) values (pr, 'tas ítem', fr) returning id into item;
  lote := jsonb_build_array(jsonb_build_object('repuesto_id', item, 'actualizado_en', null));
  perform pg_temp.tas_es('A4 sin repuestos.editar', pg_temp.tas_asignar(sin, 'contenedor', c, lote), '42501');
  perform pg_temp.tas_pasa('A4 con repuestos.editar', pg_temp.tas_asignar(con, 'contenedor', c, lote));
  if (select contenedor_id from public.transportes where repuesto_id = item) is distinct from c then raise exception 'A4: el ítem debía entrar'; end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test asignar: quitar del contenedor deja la unidad en su embarque, del embarque copia sus datos, y lo exigido no se quita (A5)
begin;
do $$
declare t jsonb := pg_temp.tas_terreno(); o uuid := (t ->> 'o')::uuid; p uuid; e uuid; c uuid; v1 uuid; v2 uuid; v3 uuid; fx uuid; r jsonb;
begin
  p := pg_temp.tas_persona(array['logistica.ver', 'logistica.transporte.editar']);
  e := pg_temp.tas_embarque(o, 'BKA5', date '2026-12-20');
  c := pg_temp.tas_contenedor(o, 'CONTA5', e);
  v1 := pg_temp.tas_vehiculo(o, (t ->> 'fase')::uuid); v2 := pg_temp.tas_vehiculo(o, (t ->> 'fase')::uuid); v3 := pg_temp.tas_vehiculo(o, (t ->> 'fase')::uuid);
  insert into public.transportes (vehiculo_id, contenedor_id) values (v1, c);
  insert into public.transportes (vehiculo_id, embarque_id) values (v2, e);
  r := pg_temp.tas_corre(p, format('select public.transporte_quitar(%L, %L)', 'contenedor', jsonb_build_array(jsonb_build_object('vehiculo_id', v1))));
  if not r ? 'error' or r ->> 'mensaje' not like 'Falta la versión%' then raise exception 'A5: sin versión debía fallar: %', r; end if;
  perform pg_temp.tas_pasa('A5 del contenedor', pg_temp.tas_quitar(p, 'contenedor', pg_temp.tas_lote(array[v1])));
  if pg_temp.tas_en(v1) is distinct from jsonb_build_object('contenedor', null, 'embarque', e) then raise exception 'A5: debía quedar directa en el embarque'; end if;
  perform pg_temp.tas_pasa('A5 del embarque', pg_temp.tas_quitar(p, 'embarque', pg_temp.tas_lote(array[v2])));
  if (select (x.embarque_id, x.eta_el) from public.transportes x where x.vehiculo_id = v2) is distinct from (null::uuid, date '2026-12-20') then
    raise exception 'A5: al salir del embarque debía copiar la ETA';
  end if;
  r := pg_temp.tas_pasa('A5 la que no está', pg_temp.tas_quitar(p, 'contenedor', pg_temp.tas_lote(array[v2, v3])));
  if not (r ->> 'sin_cambios')::boolean then raise exception 'A5: la que no está no cambia: %', r; end if;
  -- La fase exige el contenedor.
  insert into public.transportes (vehiculo_id, contenedor_id) values (v3, c);
  insert into public.fases (flujo_id, nombre, orden) values ((t ->> 'flujo')::uuid, 'tas pide contenedor', 2) returning id into fx;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato) values (fx, 'dato', true, 'transporte.contenedor');
  update public.vehiculos set fase_id = fx where id = v3;
  r := pg_temp.tas_quitar(p, 'contenedor', pg_temp.tas_lote(array[v3]));
  perform pg_temp.tas_es('A5 lo exigido', r, '23514', 'contenedor');
  if r ->> 'mensaje' <> 'La fase «tas pide contenedor» exige el contenedor: no se puede vaciar.' then raise exception 'A5: el mensaje: %', r; end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test asignar: una versión vieja da PT409 y no cambia ninguna; la nula con fila, también (A6)
begin;
do $$
declare t jsonb := pg_temp.tas_terreno(); o uuid := (t ->> 'o')::uuid; p uuid; c uuid; c2 uuid; v1 uuid; v2 uuid; lote jsonb; r jsonb;
begin
  p := pg_temp.tas_persona(array['logistica.ver', 'logistica.transporte.editar']);
  c := pg_temp.tas_contenedor(o, 'CONTA6'); c2 := pg_temp.tas_contenedor(o, 'CONTA6B');
  v1 := pg_temp.tas_vehiculo(o, (t ->> 'fase')::uuid); v2 := pg_temp.tas_vehiculo(o, (t ->> 'fase')::uuid);
  insert into public.transportes (vehiculo_id, notas) values (v1, 'uno');
  insert into public.transportes (vehiculo_id, notas) values (v2, 'dos');
  lote := jsonb_build_array(jsonb_build_object('vehiculo_id', v1, 'actualizado_en', (select actualizado_en from public.transportes where vehiculo_id = v1)),
                            jsonb_build_object('vehiculo_id', v2, 'actualizado_en', (select actualizado_en - interval '1 second' from public.transportes where vehiculo_id = v2)));
  perform pg_temp.tas_es('A6 una vieja', pg_temp.tas_asignar(p, 'contenedor', c, lote), 'PT409');
  perform pg_temp.tas_es('A6 una vieja al quitar', pg_temp.tas_quitar(p, 'embarque', lote), 'PT409');
  perform pg_temp.tas_es('A6 la nula con fila',
    pg_temp.tas_asignar(p, 'contenedor', c, jsonb_build_array(jsonb_build_object('vehiculo_id', v1, 'actualizado_en', null))), 'PT409');
  if exists (select 1 from public.transportes x where x.vehiculo_id in (v1, v2) and x.contenedor_id is not null) then
    raise exception 'A6: no debía cambiar ninguna';
  end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;
