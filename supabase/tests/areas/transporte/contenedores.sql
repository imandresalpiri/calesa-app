-- Los contenedores por sí mismos: `contenedor_crear` y `contenedor_guardar`. No depende de otro archivo (`SOLO=areas/transporte/contenedores.sql`).
-- Cada bloque abre su transacción, dispara el invariante diferido (como al confirmar) y la revierte. Los ayudantes son copia de `embarques.sql` con
-- su propio prefijo (`db:probar` corre todos los archivos en una sola sesión).
--
-- Qué asegura:
--   K1. Crear: el número normalizado y único en el origen (en otro, pasa); el reintento con el mismo id devuelve el mismo; tipo del catálogo, sello
--       de hasta 40, embarque del mismo origen (de otro, 22023; uno que no existe, PT409); sin id o sin número, 23502.
--   K2. Por origen: cada persona lee sólo los contenedores de su origen y no crea ni guarda en el otro (42501); sin origen, con repuestos.*; con
--       «propios», guarda el de sus vehículos y con uno ajeno adentro da 42501. Sin la clave en ningún origen, guardar da 42501 exista o no el
--       contenedor.
--   K3. Guardar: sin versión, falla; con la vieja, PT409; renombrar se ve en sus unidades; un número que ya existe, 23505; sin cambios; número
--       vacío, 23502; una clave que no es del contenedor, 22023; uno que ya no existe, PT409.
--   K4. Entrar a un embarque (de otro origen, 22023): la unidad lee lo del embarque y no guarda nada propio; mudarse lee el nuevo; salir copia lo del
--       embarque. La fase que exige el booking no deja salir (23514 hint booking) y la que exige la ETA no deja entrar a un embarque sin ella.
--   K5. El estado: sin embarque, armándose, en tránsito, llegó y entregado con las fases de sus propias unidades (no las de todo el embarque).

-- La primera cuenta de una base vacía queda dueña (con `SOLO=`): una de relleno antes, para que ninguna de la prueba lo sea. Una concesión
-- `clave@origen` es sólo para ese origen.
create or replace function pg_temp.tco_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-tco@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('tco_' || substr(v_id::text, 1, 8), 'tco ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Dos orígenes (con su flujo), una fase en cada uno y una final en el primero.
create or replace function pg_temp.tco_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fl2 uuid; fa uuid; fa2 uuid; ff uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('tco_' || s, 'tco origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('tco2_' || s, 'tco origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  select id into fl2 from public.flujos where origen_id = o2;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl, 'tco en tránsito', 1, true) returning id into fa;
  insert into public.fases (flujo_id, nombre, orden, es_final) values (fl, 'tco entregado', 9, true) returning id into ff;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl2, 'tco2 en tránsito', 1, true) returning id into fa2;
  return jsonb_build_object('o', o, 'o2', o2, 'flujo', fl, 'fase', fa, 'fase2', fa2, 'final', ff);
end $f$;

create or replace function pg_temp.tco_vehiculo(p_origen uuid, p_fase uuid, p_creado_por uuid default null) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, creado_por) values (p_origen, 'tco vehículo', p_fase, p_creado_por) returning id;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.tco_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.tco_crear(p_quien uuid, p_id uuid, p_origen uuid, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.tco_corre(p_quien, format('select public.contenedor_crear(%L, %L, %L)', p_id, p_origen, p_datos));
$f$;

-- Guarda con la versión vigente del contenedor (o la que se pase).
create or replace function pg_temp.tco_guardar(p_quien uuid, p_id uuid, p_cambios jsonb, p_version timestamptz default null) returns jsonb
  language sql as $f$
  select pg_temp.tco_corre(p_quien, format('select public.contenedor_guardar(%L, %L, %L)', p_id,
    coalesce(p_version, (select e.actualizado_en from public.contenedores e where e.id = p_id)), p_cambios));
$f$;

create or replace function pg_temp.tco_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.tco_pasa(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'actualizado_en' is null then raise exception '%: debía guardar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

-- Un embarque como superusuario (las RPC de embarques tienen su archivo).
create or replace function pg_temp.tco_embarque(p_origen uuid, p_booking text, p_eta date default null, p_naviera uuid default null,
  p_zarpe date default null, p_arribo date default null) returns uuid language sql as $f$
  insert into public.embarques (origen_id, booking, eta_el, naviera_id, zarpe_el, arribo_el) values (p_origen, p_booking, p_eta, p_naviera, p_zarpe, p_arribo)
  returning id;
$f$;

-- @test contenedores: crear normaliza el número, es idempotente por el id y valida tipo, sello y embarque (K1)
begin;
do $$
declare t jsonb := pg_temp.tco_terreno(); o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid; p uuid; id1 uuid := gen_random_uuid();
  e uuid; e_o2 uuid; r jsonb; r2 jsonb;
begin
  p := pg_temp.tco_persona(array['logistica.ver', 'logistica.transporte.editar']);
  e := pg_temp.tco_embarque(o, 'BKK1');
  e_o2 := pg_temp.tco_embarque(o2, 'BKK1');
  r := pg_temp.tco_pasa('K1 crear', pg_temp.tco_crear(p, id1, o, '{"numero": " abcu 123 4567 ", "tipo": "40HC", "sello": " S-1 ", "notas": " n "}'));
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['actualizado_en', 'estado', 'id', 'sin_cambios']
     or r ->> 'estado' <> 'sin_embarque' or (r ->> 'sin_cambios')::boolean then
    raise exception 'K1: la respuesta: %', r;
  end if;
  if (select (c.origen_id, c.numero, c.tipo, c.sello, c.notas, c.embarque_id, c.creado_por) from public.contenedores c where c.id = id1)
     is distinct from (o, 'ABCU1234567'::text, '40HC'::text, 'S-1'::text, 'n'::text, null::uuid, p) then
    raise exception 'K1: la fila guardada';
  end if;
  r2 := pg_temp.tco_crear(p, id1, o, '{"numero": "ABCU1234567"}');
  if r2 -> 'ya_existia' is distinct from 'true'::jsonb or r2 ->> 'actualizado_en' <> r ->> 'actualizado_en' then
    raise exception 'K1: el reintento: %', r2;
  end if;
  if (select count(*) from public.contenedores c where c.origen_id = o) <> 1 then raise exception 'K1: el reintento creó otro'; end if;
  perform pg_temp.tco_es('K1 el mismo id con otro número', pg_temp.tco_crear(p, id1, o, '{"numero": "OTRO1"}'), '23505', 'id');
  perform pg_temp.tco_es('K1 el número repetido', pg_temp.tco_crear(p, gen_random_uuid(), o, '{"numero": "abcu1234567"}'), '23505', 'numero');
  perform pg_temp.tco_pasa('K1 el mismo número en otro origen', pg_temp.tco_crear(p, gen_random_uuid(), o2, '{"numero": "ABCU1234567"}'));
  r := pg_temp.tco_pasa('K1 en un embarque', pg_temp.tco_crear(p, gen_random_uuid(), o, jsonb_build_object('numero', 'CONTK1B', 'embarque_id', e)));
  if r ->> 'estado' <> 'armandose' then raise exception 'K1: en un embarque sin zarpe se arma: %', r; end if;
  perform pg_temp.tco_es('K1 sin id', pg_temp.tco_crear(p, null, o, '{"numero": "CONTK1X"}'), '23502', 'id');
  perform pg_temp.tco_es('K1 sin número', pg_temp.tco_crear(p, gen_random_uuid(), o, '{"tipo": "20"}'), '23502', 'numero');
  perform pg_temp.tco_es('K1 un número inválido', pg_temp.tco_crear(p, gen_random_uuid(), o, '{"numero": "ÑÑ#1"}'), '22023', 'numero');
  perform pg_temp.tco_es('K1 un tipo que no existe', pg_temp.tco_crear(p, gen_random_uuid(), o, '{"numero": "CONTK1X", "tipo": "99XX"}'), '22023', 'tipo');
  perform pg_temp.tco_es('K1 un sello largo', pg_temp.tco_crear(p, gen_random_uuid(), o, jsonb_build_object('numero', 'CONTK1X', 'sello', repeat('s', 41))),
                         '22023', 'sello');
  perform pg_temp.tco_es('K1 un embarque de otro origen',
    pg_temp.tco_crear(p, gen_random_uuid(), o, jsonb_build_object('numero', 'CONTK1X', 'embarque_id', e_o2)), '22023', 'embarque_id');
  perform pg_temp.tco_es('K1 un embarque que no existe',
    pg_temp.tco_crear(p, gen_random_uuid(), o, jsonb_build_object('numero', 'CONTK1X', 'embarque_id', gen_random_uuid())), 'PT409', 'embarque_id');
  perform pg_temp.tco_es('K1 un embarque que no es uuid', pg_temp.tco_crear(p, gen_random_uuid(), o, '{"numero": "CONTK1X", "embarque_id": "x"}'),
                         '22023', 'embarque_id');
  perform pg_temp.tco_es('K1 una clave que no es del contenedor', pg_temp.tco_crear(p, gen_random_uuid(), o, '{"numero": "CONTK1X", "booking": "B"}'),
                         '22023', 'booking');
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test contenedores: cada persona lee y escribe sólo los contenedores de su origen; con «propios», 42501 si tiene uno ajeno (K2)
begin;
do $$
declare t jsonb := pg_temp.tco_terreno(); o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid; a uuid; b uuid; rep uuid; pr uuid;
  c_a uuid := gen_random_uuid(); c_b uuid := gen_random_uuid(); c_r uuid := gen_random_uuid(); c_p uuid := gen_random_uuid(); q text;
  nadie uuid;
begin
  a := pg_temp.tco_persona(array['logistica.ver@' || o, 'logistica.transporte.editar@' || o]);
  b := pg_temp.tco_persona(array['logistica.ver@' || o2, 'logistica.transporte.editar@' || o2]);
  rep := pg_temp.tco_persona(array['repuestos.ver', 'repuestos.editar']);
  pr := pg_temp.tco_persona(array['logistica.ver', 'logistica.transporte.editar'], 'propios');
  perform pg_temp.tco_pasa('K2 A crea en su origen', pg_temp.tco_crear(a, c_a, o, '{"numero": "CONTA"}'));
  perform pg_temp.tco_pasa('K2 B crea en su origen', pg_temp.tco_crear(b, c_b, o2, '{"numero": "CONTB"}'));
  perform pg_temp.tco_pasa('K2 repuestos crea sin origen', pg_temp.tco_crear(rep, c_r, null, '{"numero": "CONTREP"}'));
  perform pg_temp.tco_es('K2 A no crea en el de B', pg_temp.tco_crear(a, gen_random_uuid(), o2, '{"numero": "CONTA2"}'), '42501');
  perform pg_temp.tco_es('K2 A no guarda el de B', pg_temp.tco_guardar(a, c_b, '{"notas": "de A"}'), '42501');
  perform pg_temp.tco_es('K2 A no guarda el de repuestos', pg_temp.tco_guardar(a, c_r, '{"notas": "de A"}'), '42501');
  perform pg_temp.tco_es('K2 repuestos no crea en un origen', pg_temp.tco_crear(rep, gen_random_uuid(), o, '{"numero": "CONTREP2"}'), '42501');
  q := format('select jsonb_agg(numero order by numero) from public.contenedores where origen_id in (%L, %L) or origen_id is null', o, o2);
  if pg_temp.tco_corre(a, q) <> '["CONTA"]' or pg_temp.tco_corre(b, q) <> '["CONTB"]' or pg_temp.tco_corre(rep, q) <> '["CONTREP"]' then
    raise exception 'K2: cada una debía leer sólo el suyo: % / % / %', pg_temp.tco_corre(a, q), pg_temp.tco_corre(b, q), pg_temp.tco_corre(rep, q);
  end if;
  -- «propios»: crea; con su vehículo guarda; con uno ajeno, 42501 y nada cambia.
  perform pg_temp.tco_pasa('K2 propios crea', pg_temp.tco_crear(pr, c_p, o, '{"numero": "CONTP"}'));
  insert into public.transportes (vehiculo_id, contenedor_id) values (pg_temp.tco_vehiculo(o, (t ->> 'fase')::uuid, pr), c_p);
  perform pg_temp.tco_pasa('K2 propios con su vehículo', pg_temp.tco_guardar(pr, c_p, '{"sello": "S1"}'));
  insert into public.transportes (vehiculo_id, contenedor_id) values (pg_temp.tco_vehiculo(o, (t ->> 'fase')::uuid), c_p);
  perform pg_temp.tco_es('K2 propios con uno ajeno', pg_temp.tco_guardar(pr, c_p, '{"sello": "S2"}'), '42501');
  if (select sello from public.contenedores where id = c_p) is distinct from 'S1' then raise exception 'K2: no debía cambiar'; end if;
  nadie := pg_temp.tco_persona(array['logistica.ver']);
  perform pg_temp.tco_es('K2 sin la clave guarda uno que existe', pg_temp.tco_guardar(nadie, c_a, '{"notas": "x"}'), '42501');
  perform pg_temp.tco_es('K2 sin la clave guarda uno que no existe', pg_temp.tco_guardar(nadie, gen_random_uuid(), '{"notas": "x"}', now()), '42501');
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test contenedores: guardar pide la versión, renombra para sus unidades y rechaza un número que ya existe (K3)
begin;
do $$
declare t jsonb := pg_temp.tco_terreno(); o uuid := (t ->> 'o')::uuid; p uuid; c uuid := gen_random_uuid(); v uuid; vigente timestamptz; r jsonb;
begin
  p := pg_temp.tco_persona(array['logistica.ver', 'logistica.transporte.editar']);
  perform pg_temp.tco_pasa('K3 crear', pg_temp.tco_crear(p, c, o, '{"numero": "CONTK3"}'));
  perform pg_temp.tco_pasa('K3 crear otro', pg_temp.tco_crear(p, gen_random_uuid(), o, '{"numero": "CONTK3B"}'));
  v := pg_temp.tco_vehiculo(o, (t ->> 'fase')::uuid);
  insert into public.transportes (vehiculo_id, contenedor_id) values (v, c);
  vigente := (select actualizado_en from public.contenedores where id = c);
  r := pg_temp.tco_corre(p, format('select public.contenedor_guardar(%L, null, %L)', c, '{"notas": "x"}'));
  if not r ? 'error' or r ->> 'mensaje' not like 'Falta la versión%' then raise exception 'K3: sin versión debía fallar: %', r; end if;
  perform pg_temp.tco_es('K3 la versión vieja', pg_temp.tco_guardar(p, c, '{"notas": "x"}', vigente - interval '1 second'), 'PT409');
  perform pg_temp.tco_es('K3 un número que ya existe', pg_temp.tco_guardar(p, c, '{"numero": "contk3b"}'), '23505', 'numero');
  perform pg_temp.tco_pasa('K3 renombrar', pg_temp.tco_guardar(p, c, '{"numero": "CONTK3C", "tipo": "20"}'));
  if (select contenedor from public.transportes_con_embarque where vehiculo_id = v) is distinct from 'CONTK3C' then
    raise exception 'K3: la unidad debía leer el número nuevo';
  end if;
  r := pg_temp.tco_pasa('K3 sin cambios', pg_temp.tco_guardar(p, c, '{"numero": "contk3c", "tipo": "20"}'));
  if not (r ->> 'sin_cambios')::boolean then raise exception 'K3: sin cambios: %', r; end if;
  perform pg_temp.tco_es('K3 número vacío', pg_temp.tco_guardar(p, c, '{"numero": ""}'), '23502', 'numero');
  perform pg_temp.tco_es('K3 una clave que no es del contenedor', pg_temp.tco_guardar(p, c, '{"eta_el": "2026-12-01"}'), '22023', 'eta_el');
  perform pg_temp.tco_es('K3 uno que no existe', pg_temp.tco_guardar(p, gen_random_uuid(), '{"notas": "x"}', now()), 'PT409');
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test contenedores: entrar a un embarque limpia lo propio de sus unidades, salir se lo copia y la fase de una unidad no deja perder lo que exige (K4)
begin;
do $$
declare t jsonb := pg_temp.tco_terreno(); o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid; p uuid; c uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid(); nav uuid; nav2 uuid; e uuid; e2 uuid; e3 uuid; v uuid; v2 uuid; fx uuid; fy uuid; x public.transportes_con_embarque;
begin
  p := pg_temp.tco_persona(array['logistica.ver', 'logistica.transporte.editar']);
  insert into public.navieras (nombre) values ('tco naviera') returning id into nav;
  insert into public.navieras (nombre) values ('tco naviera propia') returning id into nav2;
  e := pg_temp.tco_embarque(o, 'BKK4', date '2026-12-20', nav);
  e3 := pg_temp.tco_embarque(o, 'BKK4C', date '2026-12-25', nav);
  perform pg_temp.tco_pasa('K4 crear', pg_temp.tco_crear(p, c, o, '{"numero": "CONTK4"}'));
  v := pg_temp.tco_vehiculo(o, (t ->> 'fase')::uuid);
  insert into public.transportes (vehiculo_id, contenedor_id, naviera_id, eta_el) values (v, c, nav2, date '2026-12-05');
  perform pg_temp.tco_es('K4 un embarque de otro origen',
    pg_temp.tco_guardar(p, c, jsonb_build_object('embarque_id', pg_temp.tco_embarque(o2, 'BKK4O2'))), '22023', 'embarque_id');
  -- Entrar: la unidad lee lo del embarque y no guarda nada propio.
  perform pg_temp.tco_pasa('K4 entrar', pg_temp.tco_guardar(p, c, jsonb_build_object('embarque_id', e)));
  x := (select y from public.transportes_con_embarque y where y.vehiculo_id = v);
  if (x.booking, x.naviera_id, x.eta_el) is distinct from ('BKK4'::text, nav, date '2026-12-20') then raise exception 'K4: al entrar lee %', x; end if;
  if (select num_nonnulls(naviera_id, eta_el) from public.transportes where vehiculo_id = v) <> 0 then raise exception 'K4: al entrar no guarda lo propio'; end if;
  -- Mudarse de embarque: lee el nuevo.
  perform pg_temp.tco_pasa('K4 mudarse', pg_temp.tco_guardar(p, c, jsonb_build_object('embarque_id', e3)));
  if (select (y.booking, y.eta_el) from public.transportes_con_embarque y where y.vehiculo_id = v) is distinct from ('BKK4C'::text, date '2026-12-25') then
    raise exception 'K4: al mudarse debía leer el embarque nuevo';
  end if;
  -- Salir: copia lo del embarque como propio; lo que lee no cambia salvo el booking.
  perform pg_temp.tco_pasa('K4 salir', pg_temp.tco_guardar(p, c, '{"embarque_id": null}'));
  x := (select y from public.transportes_con_embarque y where y.vehiculo_id = v);
  if (x.booking, x.naviera_id, x.eta_el) is distinct from (null::text, nav, date '2026-12-25') then raise exception 'K4: al salir lee %', x; end if;
  if (select (naviera_id, eta_el) from public.transportes where vehiculo_id = v) is distinct from (nav, date '2026-12-25') then
    raise exception 'K4: al salir debía copiar lo del embarque';
  end if;
  -- La fase exige el booking: no sale.
  perform pg_temp.tco_pasa('K4 volver', pg_temp.tco_guardar(p, c, jsonb_build_object('embarque_id', e)));
  insert into public.fases (flujo_id, nombre, orden) values ((t ->> 'flujo')::uuid, 'tco pide booking', 2) returning id into fx;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato) values (fx, 'dato', true, 'transporte.booking');
  update public.vehiculos set fase_id = fx where id = v;
  perform pg_temp.tco_es('K4 salir con el booking exigido', pg_temp.tco_guardar(p, c, '{"embarque_id": null}'), '23514', 'booking');
  if (select embarque_id from public.contenedores where id = c) is distinct from e then raise exception 'K4: debía seguir en su embarque'; end if;
  -- La fase exige la ETA y el embarque no la tiene: no entra.
  e2 := pg_temp.tco_embarque(o, 'BKK4SINETA');
  insert into public.fases (flujo_id, nombre, orden) values ((t ->> 'flujo')::uuid, 'tco pide ETA', 3) returning id into fy;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato) values (fy, 'dato', true, 'transporte.eta');
  perform pg_temp.tco_pasa('K4 crear otro', pg_temp.tco_crear(p, c2, o, '{"numero": "CONTK4B"}'));
  v2 := pg_temp.tco_vehiculo(o, fy);
  insert into public.transportes (vehiculo_id, contenedor_id, eta_el) values (v2, c2, date '2026-12-05');
  perform pg_temp.tco_es('K4 entrar sin la ETA exigida', pg_temp.tco_guardar(p, c2, jsonb_build_object('embarque_id', e2)), '23514', 'eta_el');
  if (select eta_el from public.transportes where vehiculo_id = v2) is distinct from date '2026-12-05' then raise exception 'K4: debía conservar su ETA'; end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test contenedores: el estado, con las fechas de su embarque y las fases de sus propias unidades (K5)
begin;
do $$
declare t jsonb := pg_temp.tco_terreno(); o uuid := (t ->> 'o')::uuid; p uuid; c uuid := gen_random_uuid(); e uuid; r jsonb;
begin
  p := pg_temp.tco_persona(array['logistica.ver', 'logistica.transporte.editar']);
  e := pg_temp.tco_embarque(o, 'BKK5');
  r := pg_temp.tco_pasa('K5 crear', pg_temp.tco_crear(p, c, o, '{"numero": "CONTK5"}'));
  if r ->> 'estado' <> 'sin_embarque' then raise exception 'K5: sin embarque: %', r; end if;
  r := pg_temp.tco_pasa('K5 entrar', pg_temp.tco_guardar(p, c, jsonb_build_object('embarque_id', e)));
  if r ->> 'estado' <> 'armandose' then raise exception 'K5: en un embarque sin zarpe: %', r; end if;
  update public.embarques set zarpe_el = date '2020-01-01' where id = e;
  r := pg_temp.tco_pasa('K5 zarpó', pg_temp.tco_guardar(p, c, '{"notas": "zarpó"}'));
  if r ->> 'estado' <> 'en_transito' then raise exception 'K5: con zarpe: %', r; end if;
  update public.embarques set arribo_el = date '2020-02-01' where id = e;
  r := pg_temp.tco_pasa('K5 llegó', pg_temp.tco_guardar(p, c, '{"notas": "llegó"}'));
  if r ->> 'estado' <> 'llego' then raise exception 'K5: con arribo: %', r; end if;
  -- Entregado con sus propias unidades en la final, aunque el embarque tenga otra sin entregar directa.
  insert into public.transportes (vehiculo_id, contenedor_id) values (pg_temp.tco_vehiculo(o, (t ->> 'final')::uuid), c);
  insert into public.transportes (vehiculo_id, embarque_id) values (pg_temp.tco_vehiculo(o, (t ->> 'fase')::uuid), e);
  r := pg_temp.tco_pasa('K5 entregado', pg_temp.tco_guardar(p, c, '{"notas": "entregado"}'));
  if r ->> 'estado' <> 'entregado' or public.embarque_estado(e) <> 'llego' then
    raise exception 'K5: el contenedor entregado (%) y su embarque llegó (%)', r, public.embarque_estado(e);
  end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;
