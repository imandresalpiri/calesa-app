-- Los embarques por sí mismos: `embarque_crear` y `embarque_guardar`. No depende de otro archivo (`SOLO=areas/transporte/embarques.sql`). Cada
-- bloque abre su transacción, dispara el invariante diferido (como al confirmar) y la revierte. Los ayudantes son copia de `con-embarque.sql` con
-- su propio prefijo: `db:probar` corre todos los archivos en una sola sesión y un `pg_temp.x` con otra firma rompería al de otro archivo.
--
-- Qué asegura:
--   E1. Crear: la respuesta con sus claves exactas; el reintento con el mismo id devuelve el mismo (ya_existia) sin otra fila; el mismo id con otro
--       booking, 23505 hint id; otro id con el mismo booking en el origen, 23505 hint booking (en otro origen, pasa); sin id o sin booking, 23502.
--   E2. Por origen: cada persona lee sólo los embarques de su origen y no crea ni guarda en el otro (42501). Sin origen, con repuestos.*: quien
--       sólo tiene logística no lo crea ni lo lee. Crear en un origen que no existe, 22023 hint origen; sin la clave en ningún origen, guardar da
--       42501 exista o no el embarque.
--   E3. Con alcance «propios», crea el embarque y lo guarda con sus vehículos; con uno ajeno adentro, 42501.
--   E4. Guardar: sin versión, falla; con la vieja, PT409; renombrar se ve en sus unidades; un booking que ya existe, 23505; sin cambios, la misma
--       versión; booking vacío, 23502; una clave que no es del embarque, 22023; uno que ya no existe, PT409.
--   E5. Las fechas: ETA o arribo antes del zarpe, 22023 con el campo; un zarpe estimado que no es fecha, 22023; vaciar la ETA que exige la fase
--       de una unidad, 23514 hint eta_el.
--   E6. Los catálogos: naviera o puerto de otro origen, 22023; inactivo, 22023; fuera de la oferta del flujo, 23514; compartido y ofrecido, pasa;
--       lo ya guardado no se revalida.
--   E7. El estado: armándose, en tránsito, llegó y entregado, contra `_estado_del_embarque`.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=`): una de relleno antes, para que ninguna de la prueba lo sea. Una concesión
-- `clave@origen` es sólo para ese origen.
create or replace function pg_temp.tem_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-tem@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('tem_' || substr(v_id::text, 1, 8), 'tem ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Dos orígenes (con su flujo), una fase en cada uno y una final en el primero.
create or replace function pg_temp.tem_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fl2 uuid; fa uuid; fa2 uuid; ff uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('tem_' || s, 'tem origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('tem2_' || s, 'tem origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  select id into fl2 from public.flujos where origen_id = o2;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl, 'tem en tránsito', 1, true) returning id into fa;
  insert into public.fases (flujo_id, nombre, orden, es_final) values (fl, 'tem entregado', 9, true) returning id into ff;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl2, 'tem2 en tránsito', 1, true) returning id into fa2;
  return jsonb_build_object('o', o, 'o2', o2, 'flujo', fl, 'fase', fa, 'fase2', fa2, 'final', ff);
end $f$;

create or replace function pg_temp.tem_vehiculo(p_origen uuid, p_fase uuid, p_creado_por uuid default null) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, creado_por) values (p_origen, 'tem vehículo', p_fase, p_creado_por) returning id;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.tem_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.tem_crear(p_quien uuid, p_id uuid, p_origen uuid, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.tem_corre(p_quien, format('select public.embarque_crear(%L, %L, %L)', p_id, p_origen, p_datos));
$f$;

-- Guarda con la versión vigente del embarque (o la que se pase).
create or replace function pg_temp.tem_guardar(p_quien uuid, p_id uuid, p_cambios jsonb, p_version timestamptz default null) returns jsonb
  language sql as $f$
  select pg_temp.tem_corre(p_quien, format('select public.embarque_guardar(%L, %L, %L)', p_id,
    coalesce(p_version, (select e.actualizado_en from public.embarques e where e.id = p_id)), p_cambios));
$f$;

create or replace function pg_temp.tem_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.tem_pasa(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'actualizado_en' is null then raise exception '%: debía guardar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

-- @test embarques: crear devuelve sus claves, es idempotente por el id y el booking es único en el origen (E1)
begin;
do $$
declare t jsonb := pg_temp.tem_terreno(); o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid; p uuid; id1 uuid := gen_random_uuid();
  r jsonb; r2 jsonb;
begin
  p := pg_temp.tem_persona(array['logistica.ver', 'logistica.transporte.editar']);
  r := pg_temp.tem_pasa('E1 crear', pg_temp.tem_crear(p, id1, o, '{"booking": " bk e1 ", "eta_el": "2026-12-20", "zarpe_estimado_el": "2026-12-01"}'));
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['actualizado_en', 'estado', 'id', 'sin_cambios'] then
    raise exception 'E1: las claves de la respuesta: %', r;
  end if;
  if (r ->> 'id')::uuid <> id1 or r ->> 'estado' <> 'armandose' or (r ->> 'sin_cambios')::boolean then
    raise exception 'E1: la respuesta: %', r;
  end if;
  if (select (e.origen_id, e.booking, e.eta_el, e.zarpe_estimado_el, e.creado_por) from public.embarques e where e.id = id1)
     is distinct from (o, 'BKE1'::text, date '2026-12-20', date '2026-12-01', p) then
    raise exception 'E1: la fila guardada';
  end if;
  -- El reintento: el mismo, sin otra fila ni otra versión.
  r2 := pg_temp.tem_crear(p, id1, o, '{"booking": "BKE1"}');
  if r2 -> 'ya_existia' is distinct from 'true'::jsonb or r2 ->> 'id' <> id1::text or r2 ->> 'actualizado_en' <> r ->> 'actualizado_en'
     or not (r2 ->> 'sin_cambios')::boolean then
    raise exception 'E1: el reintento: %', r2;
  end if;
  if (select count(*) from public.embarques e where e.origen_id = o) <> 1 then raise exception 'E1: el reintento creó otro'; end if;
  perform pg_temp.tem_es('E1 el mismo id con otro booking', pg_temp.tem_crear(p, id1, o, '{"booking": "BKOTRO"}'), '23505', 'id');
  perform pg_temp.tem_es('E1 el mismo id en otro origen', pg_temp.tem_crear(p, id1, o2, '{"booking": "BKE1"}'), '23505', 'id');
  perform pg_temp.tem_es('E1 el booking repetido', pg_temp.tem_crear(p, gen_random_uuid(), o, '{"booking": "BKE1"}'), '23505', 'booking');
  perform pg_temp.tem_pasa('E1 el mismo booking en otro origen', pg_temp.tem_crear(p, gen_random_uuid(), o2, '{"booking": "BKE1"}'));
  perform pg_temp.tem_es('E1 sin id', pg_temp.tem_crear(p, null, o, '{"booking": "BKSINID"}'), '23502', 'id');
  perform pg_temp.tem_es('E1 sin booking', pg_temp.tem_crear(p, gen_random_uuid(), o, '{"eta_el": "2026-12-20"}'), '23502', 'booking');
  perform pg_temp.tem_es('E1 una clave que no es del embarque', pg_temp.tem_crear(p, gen_random_uuid(), o, '{"booking": "BKX", "contenedor": "C1"}'),
                         '22023', 'contenedor');
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test embarques: cada persona lee y escribe sólo los embarques de su origen; los de repuestos, sólo con repuestos.* (E2)
begin;
do $$
declare t jsonb := pg_temp.tem_terreno(); o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid; a uuid; b uuid; rep uuid; lo uuid;
  e_a uuid := gen_random_uuid(); e_b uuid := gen_random_uuid(); e_r uuid := gen_random_uuid(); q text; nadie uuid;
begin
  a := pg_temp.tem_persona(array['logistica.ver@' || o, 'logistica.transporte.editar@' || o]);
  b := pg_temp.tem_persona(array['logistica.ver@' || o2, 'logistica.transporte.editar@' || o2]);
  rep := pg_temp.tem_persona(array['repuestos.ver', 'repuestos.editar']);
  lo := pg_temp.tem_persona(array['logistica.ver', 'logistica.transporte.editar']);
  perform pg_temp.tem_pasa('E2 A crea en su origen', pg_temp.tem_crear(a, e_a, o, '{"booking": "BKA"}'));
  perform pg_temp.tem_pasa('E2 B crea en su origen', pg_temp.tem_crear(b, e_b, o2, '{"booking": "BKB"}'));
  perform pg_temp.tem_es('E2 A no crea en el de B', pg_temp.tem_crear(a, gen_random_uuid(), o2, '{"booking": "BKA2"}'), '42501');
  perform pg_temp.tem_es('E2 A no guarda el de B', pg_temp.tem_guardar(a, e_b, '{"notas": "de A"}'), '42501');
  perform pg_temp.tem_es('E2 B no guarda el de A', pg_temp.tem_guardar(b, e_a, '{"notas": "de B"}'), '42501');
  -- Lo que lee cada una (la RLS de la tabla).
  q := format('select jsonb_agg(booking order by booking) from public.embarques where origen_id in (%L, %L) or origen_id is null', o, o2);
  perform pg_temp.tem_pasa('E2 repuestos crea sin origen', pg_temp.tem_crear(rep, e_r, null, '{"booking": "BKREP"}'));
  if pg_temp.tem_corre(a, q) <> '["BKA"]' or pg_temp.tem_corre(b, q) <> '["BKB"]' then
    raise exception 'E2: cada una debía leer sólo el suyo: % / %', pg_temp.tem_corre(a, q), pg_temp.tem_corre(b, q);
  end if;
  if pg_temp.tem_corre(rep, q) <> '["BKREP"]' then raise exception 'E2: repuestos lee %', pg_temp.tem_corre(rep, q); end if;
  if pg_temp.tem_corre(lo, q) <> '["BKA", "BKB"]' then raise exception 'E2: logística lee %', pg_temp.tem_corre(lo, q); end if;
  perform pg_temp.tem_es('E2 logística no crea sin origen', pg_temp.tem_crear(lo, gen_random_uuid(), null, '{"booking": "BKREP2"}'), '42501');
  perform pg_temp.tem_es('E2 logística no guarda el de repuestos', pg_temp.tem_guardar(lo, e_r, '{"notas": "x"}'), '42501');
  perform pg_temp.tem_pasa('E2 repuestos guarda el suyo', pg_temp.tem_guardar(rep, e_r, '{"notas": "x"}'));
  perform pg_temp.tem_es('E2 repuestos no crea en un origen', pg_temp.tem_crear(rep, gen_random_uuid(), o, '{"booking": "BKREP3"}'), '42501');
  -- Con la clave en todos los orígenes, uno que no existe no llega a la FK.
  perform pg_temp.tem_es('E2 crear en un origen que no existe', pg_temp.tem_crear(lo, gen_random_uuid(), gen_random_uuid(), '{"booking": "BKNO"}'),
                         '22023', 'origen');
  nadie := pg_temp.tem_persona(array['logistica.ver']);
  perform pg_temp.tem_es('E2 sin la clave guarda uno que existe', pg_temp.tem_guardar(nadie, e_a, '{"notas": "x"}'), '42501');
  perform pg_temp.tem_es('E2 sin la clave guarda uno que no existe', pg_temp.tem_guardar(nadie, gen_random_uuid(), '{"notas": "x"}', now()), '42501');
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test embarques: con alcance «propios» se guarda el embarque de sus vehículos, y con uno ajeno adentro da 42501 (E3)
begin;
do $$
declare t jsonb := pg_temp.tem_terreno(); o uuid := (t ->> 'o')::uuid; p uuid; e uuid := gen_random_uuid(); r jsonb;
begin
  p := pg_temp.tem_persona(array['logistica.ver', 'logistica.transporte.editar'], 'propios');
  perform pg_temp.tem_pasa('E3 crea (nace sin unidades)', pg_temp.tem_crear(p, e, o, '{"booking": "BKE3"}'));
  insert into public.transportes (vehiculo_id, embarque_id) values (pg_temp.tem_vehiculo(o, (t ->> 'fase')::uuid, p), e);
  perform pg_temp.tem_pasa('E3 con sus vehículos', pg_temp.tem_guardar(p, e, '{"notas": "mío"}'));
  insert into public.transportes (vehiculo_id, embarque_id) values (pg_temp.tem_vehiculo(o, (t ->> 'fase')::uuid), e);
  r := pg_temp.tem_guardar(p, e, '{"notas": "con uno ajeno"}');
  perform pg_temp.tem_es('E3 con uno ajeno', r, '42501');
  if r ->> 'mensaje' not like '%«BKE3»%' then raise exception 'E3: el mensaje nombra el embarque: %', r; end if;
  if (select notas from public.embarques where id = e) is distinct from 'mío' then raise exception 'E3: no debía cambiar'; end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test embarques: guardar pide la versión, renombra para todas sus unidades y rechaza un booking que ya existe (E4)
begin;
do $$
declare t jsonb := pg_temp.tem_terreno(); o uuid := (t ->> 'o')::uuid; p uuid; e uuid := gen_random_uuid(); v uuid; vigente timestamptz; r jsonb;
begin
  p := pg_temp.tem_persona(array['logistica.ver', 'logistica.transporte.editar']);
  perform pg_temp.tem_pasa('E4 crear', pg_temp.tem_crear(p, e, o, '{"booking": "BKE4"}'));
  perform pg_temp.tem_pasa('E4 crear otro', pg_temp.tem_crear(p, gen_random_uuid(), o, '{"booking": "BKE4B"}'));
  v := pg_temp.tem_vehiculo(o, (t ->> 'fase')::uuid);
  insert into public.transportes (vehiculo_id, embarque_id) values (v, e);
  vigente := (select actualizado_en from public.embarques where id = e);
  r := pg_temp.tem_corre(p, format('select public.embarque_guardar(%L, null, %L)', e, '{"notas": "x"}'));
  if not r ? 'error' or r ->> 'mensaje' not like 'Falta la versión%' then raise exception 'E4: sin versión debía fallar: %', r; end if;
  perform pg_temp.tem_es('E4 la versión vieja', pg_temp.tem_guardar(p, e, '{"notas": "x"}', vigente - interval '1 second'), 'PT409');
  perform pg_temp.tem_es('E4 un booking que ya existe', pg_temp.tem_guardar(p, e, '{"booking": "bke4b"}'), '23505', 'booking');
  perform pg_temp.tem_pasa('E4 renombrar', pg_temp.tem_guardar(p, e, '{"booking": "BKE4C"}'));
  if (select booking from public.transportes_con_embarque where vehiculo_id = v) is distinct from 'BKE4C' then
    raise exception 'E4: la unidad debía leer el booking nuevo';
  end if;
  r := pg_temp.tem_pasa('E4 sin cambios', pg_temp.tem_guardar(p, e, '{"booking": "BKE4C"}'));
  if not (r ->> 'sin_cambios')::boolean or (r ->> 'actualizado_en')::timestamptz <> (select actualizado_en from public.embarques where id = e) then
    raise exception 'E4: sin cambios: %', r;
  end if;
  perform pg_temp.tem_es('E4 booking vacío', pg_temp.tem_guardar(p, e, '{"booking": " "}'), '23502', 'booking');
  perform pg_temp.tem_es('E4 una clave del contenedor', pg_temp.tem_guardar(p, e, '{"contenedor": "C1"}'), '22023', 'contenedor');
  perform pg_temp.tem_es('E4 uno que no existe', pg_temp.tem_guardar(p, gen_random_uuid(), '{"notas": "x"}', now()), 'PT409');
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test embarques: las fechas van en orden y la fase de una unidad no deja vaciar lo que exige (E5)
begin;
do $$
declare t jsonb := pg_temp.tem_terreno(); o uuid := (t ->> 'o')::uuid; p uuid; e uuid := gen_random_uuid(); fx uuid; r jsonb;
begin
  p := pg_temp.tem_persona(array['logistica.ver', 'logistica.transporte.editar']);
  perform pg_temp.tem_es('E5 crear con la ETA antes del zarpe',
    pg_temp.tem_crear(p, gen_random_uuid(), o, '{"booking": "BKE5X", "zarpe_el": "2026-12-10", "eta_el": "2026-12-01"}'), '22023', 'eta_el');
  perform pg_temp.tem_pasa('E5 crear', pg_temp.tem_crear(p, e, o, '{"booking": "BKE5", "zarpe_el": "2026-12-10", "eta_el": "2026-12-20"}'));
  perform pg_temp.tem_es('E5 la ETA antes del zarpe', pg_temp.tem_guardar(p, e, '{"eta_el": "2026-12-01"}'), '22023', 'eta_el');
  perform pg_temp.tem_es('E5 el arribo antes del zarpe', pg_temp.tem_guardar(p, e, '{"arribo_el": "2026-12-01"}'), '22023', 'arribo_el');
  perform pg_temp.tem_es('E5 una fecha que no es AAAA-MM-DD', pg_temp.tem_guardar(p, e, '{"eta_el": "today"}'), '22023', 'eta_el');
  perform pg_temp.tem_es('E5 el zarpe estimado', pg_temp.tem_guardar(p, e, '{"zarpe_estimado_el": "mañana"}'), '22023', 'zarpe_estimado_el');
  r := pg_temp.tem_pasa('E5 el zarpe estimado', pg_temp.tem_guardar(p, e, '{"zarpe_estimado_el": "2026-12-08"}'));
  if (select zarpe_estimado_el from public.embarques where id = e) is distinct from date '2026-12-08' then raise exception 'E5: el zarpe estimado'; end if;
  -- Una unidad en una fase que exige la ETA.
  insert into public.fases (flujo_id, nombre, orden) values ((t ->> 'flujo')::uuid, 'tem pide ETA', 2) returning id into fx;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato) values (fx, 'dato', true, 'transporte.eta');
  insert into public.transportes (vehiculo_id, embarque_id) values (pg_temp.tem_vehiculo(o, fx), e);
  perform pg_temp.tem_es('E5 vaciar la ETA exigida', pg_temp.tem_guardar(p, e, '{"eta_el": null}'), '23514', 'eta_el');
  perform pg_temp.tem_pasa('E5 cambiarla sí', pg_temp.tem_guardar(p, e, '{"eta_el": "2026-12-22"}'));
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test embarques: la naviera y los puertos, del origen o compartidos, activos y en la oferta del flujo (E6)
begin;
do $$
declare t jsonb := pg_temp.tem_terreno(); o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid; p uuid; e uuid := gen_random_uuid();
  nav uuid; nav_o2 uuid; nav_inactiva uuid; nav_fuera uuid; pu uuid; pu_o2 uuid; pu_fuera uuid;
begin
  p := pg_temp.tem_persona(array['logistica.ver', 'logistica.transporte.editar']);
  insert into public.navieras (nombre) values ('tem naviera') returning id into nav;
  insert into public.navieras (nombre, origen_id) values ('tem naviera o2', o2) returning id into nav_o2;
  insert into public.navieras (nombre, activo) values ('tem naviera inactiva', false) returning id into nav_inactiva;
  insert into public.navieras (nombre) values ('tem naviera fuera') returning id into nav_fuera;
  insert into public.puertos (nombre) values ('tem puerto') returning id into pu;
  insert into public.puertos (nombre, origen_id) values ('tem puerto o2', o2) returning id into pu_o2;
  insert into public.puertos (nombre) values ('tem puerto fuera') returning id into pu_fuera;
  -- La oferta del flujo del origen: una naviera y un puerto de origen (el de destino, sin oferta: cualquiera).
  insert into public.flujos_transporte_oferta (flujo_id, tipo, naviera_id) values ((t ->> 'flujo')::uuid, 'naviera', nav);
  insert into public.flujos_transporte_oferta (flujo_id, tipo, puerto_id) values ((t ->> 'flujo')::uuid, 'puerto_origen', pu);
  perform pg_temp.tem_es('E6 naviera de otro origen',
    pg_temp.tem_crear(p, gen_random_uuid(), o, jsonb_build_object('booking', 'BKE6X', 'naviera_id', nav_o2)), '22023', 'naviera_id');
  perform pg_temp.tem_es('E6 naviera inactiva',
    pg_temp.tem_crear(p, gen_random_uuid(), o, jsonb_build_object('booking', 'BKE6X', 'naviera_id', nav_inactiva)), '22023', 'naviera_id');
  perform pg_temp.tem_es('E6 naviera fuera de la oferta',
    pg_temp.tem_crear(p, gen_random_uuid(), o, jsonb_build_object('booking', 'BKE6X', 'naviera_id', nav_fuera)), '23514', 'naviera_id');
  perform pg_temp.tem_es('E6 puerto de destino de otro origen',
    pg_temp.tem_crear(p, gen_random_uuid(), o, jsonb_build_object('booking', 'BKE6X', 'puerto_destino_id', pu_o2)), '22023', 'puerto_destino_id');
  perform pg_temp.tem_es('E6 puerto de origen fuera de la oferta',
    pg_temp.tem_crear(p, gen_random_uuid(), o, jsonb_build_object('booking', 'BKE6X', 'puerto_origen_id', pu_fuera)), '23514', 'puerto_origen_id');
  perform pg_temp.tem_pasa('E6 compartidos y ofrecidos', pg_temp.tem_crear(p, e, o,
    jsonb_build_object('booking', 'BKE6', 'naviera_id', nav, 'puerto_origen_id', pu, 'puerto_destino_id', pu_fuera)));
  perform pg_temp.tem_es('E6 guardar con otra naviera fuera', pg_temp.tem_guardar(p, e, jsonb_build_object('naviera_id', nav_fuera)),
                         '23514', 'naviera_id');
  -- Lo ya guardado no se revalida: la naviera sale de la oferta y el embarque se sigue guardando.
  delete from public.flujos_transporte_oferta where flujo_id = (t ->> 'flujo')::uuid and naviera_id = nav;
  insert into public.flujos_transporte_oferta (flujo_id, tipo, naviera_id) values ((t ->> 'flujo')::uuid, 'naviera', nav_fuera);
  perform pg_temp.tem_pasa('E6 lo guardado no se revalida', pg_temp.tem_guardar(p, e, '{"notas": "sigue"}'));
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test embarques: el estado calculado en sus cuatro ramas, contra la regla (E7)
begin;
do $$
declare t jsonb := pg_temp.tem_terreno(); o uuid := (t ->> 'o')::uuid; p uuid; e uuid := gen_random_uuid(); r jsonb; v_hoy date;
begin
  p := pg_temp.tem_persona(array['logistica.ver', 'logistica.transporte.editar']);
  v_hoy := coalesce(public._bandeja_dia_hoy(), current_date);
  r := pg_temp.tem_pasa('E7 crear', pg_temp.tem_crear(p, e, o, '{"booking": "BKE7", "zarpe_estimado_el": "2020-01-01"}'));
  if r ->> 'estado' <> 'armandose' or r ->> 'estado' <> public._estado_del_embarque(null, null, false, false, v_hoy) then
    raise exception 'E7: sin zarpe (el estimado no cuenta) debía armarse: %', r;
  end if;
  r := pg_temp.tem_pasa('E7 zarpó', pg_temp.tem_guardar(p, e, '{"zarpe_el": "2020-01-02"}'));
  if r ->> 'estado' <> 'en_transito' or r ->> 'estado' <> public._estado_del_embarque(date '2020-01-02', null, false, false, v_hoy) then
    raise exception 'E7: con zarpe hasta hoy debía estar en tránsito: %', r;
  end if;
  r := pg_temp.tem_pasa('E7 llegó', pg_temp.tem_guardar(p, e, '{"arribo_el": "2020-02-01"}'));
  if r ->> 'estado' <> 'llego' or r ->> 'estado' <> public._estado_del_embarque(date '2020-01-02', date '2020-02-01', false, false, v_hoy) then
    raise exception 'E7: con arribo debía haber llegado: %', r;
  end if;
  insert into public.transportes (vehiculo_id, embarque_id) values (pg_temp.tem_vehiculo(o, (t ->> 'final')::uuid), e);
  r := pg_temp.tem_pasa('E7 entregado', pg_temp.tem_guardar(p, e, '{"notas": "todas en la final"}'));
  if r ->> 'estado' <> 'entregado' or r ->> 'estado' <> public._estado_del_embarque(date '2020-01-02', date '2020-02-01', true, true, v_hoy) then
    raise exception 'E7: con todas en una fase final debía estar entregado: %', r;
  end if;
  insert into public.transportes (vehiculo_id, embarque_id) values (pg_temp.tem_vehiculo(o, (t ->> 'fase')::uuid), e);
  r := pg_temp.tem_pasa('E7 una sin entregar', pg_temp.tem_guardar(p, e, '{"notas": "una sin entregar"}'));
  if r ->> 'estado' <> 'llego' then raise exception 'E7: con una sin entregar vuelve a «llegó»: %', r; end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;
