-- La lista de la pestaña Embarques: `embarques_listar` y `contenedores_listar`. No depende de otro archivo (`SOLO=areas/transporte/listar.sql`).
-- Cada bloque abre su transacción y la revierte. Los ayudantes son copia de `asignar.sql` con su propio prefijo (`db:probar` corre todos los
-- archivos en una sola sesión).
--
-- Qué asegura:
--   L1. Los embarques de un origen, vacíos incluidos, por booking y por cursor (el id de uno del origen); el origen es obligatorio, sin
--       logistica.ver en él da 42501 y un cursor de otro origen 22023 hint cursor.
--   L2. Los filtros: estado (calculado), naviera, prefijo; una clave desconocida, un estado que no existe o un prefijo corto dan 22023 con la
--       clave en el hint.
--   L3. Por fila: contenedores y vehículos {n, hay_mas}, hay_ocultos con «propios» y faltan (lo que bloquea la fase siguiente).
--   L4. Recorre a lo sumo 500: sin llenar la página, cortada con el último mirado como siguiente.
--   L5. Los contenedores: con embarque o sin él (estado sin_embarque), su embarque {id, booking}, el prefijo; un origen sin la regla, vacío.

create or replace function pg_temp.tli_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-tli@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('tli_' || substr(v_id::text, 1, 8), 'tli ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Dos orígenes (con su flujo), dos fases en el primero (la segunda, la siguiente de la primera) y una en el segundo.
create or replace function pg_temp.tli_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fl2 uuid; fa uuid; fb uuid; fa2 uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('tli_' || s, 'tli origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('tli2_' || s, 'tli origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  select id into fl2 from public.flujos where origen_id = o2;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl, 'tli en tránsito', 1, true) returning id into fa;
  insert into public.fases (flujo_id, nombre, orden) values (fl, 'tli en aduana', 2) returning id into fb;
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (fl, fa, fb);
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl2, 'tli2 en tránsito', 1, true) returning id into fa2;
  return jsonb_build_object('o', o, 'o2', o2, 'flujo', fl, 'flujo2', fl2, 'fase', fa, 'siguiente', fb, 'fase2', fa2);
end $f$;

create or replace function pg_temp.tli_vehiculo(p_origen uuid, p_fase uuid, p_creado_por uuid default null) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, creado_por) values (p_origen, 'tli vehículo', p_fase, p_creado_por) returning id;
$f$;

create or replace function pg_temp.tli_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.tli_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.tli_embarques(p_quien uuid, p_origen uuid, p_desde uuid default null, p_tope int default null,
                                                 p_filtros jsonb default '{}') returns jsonb language plpgsql as $f$
declare r jsonb := pg_temp.tli_corre(p_quien, format('select public.embarques_listar(%L, %L, %L, %L)', p_origen, p_desde, p_tope, p_filtros));
begin
  return r;
end $f$;

create or replace function pg_temp.tli_contenedores(p_quien uuid, p_origen uuid, p_desde uuid default null, p_tope int default null,
                                                    p_filtros jsonb default '{}') returns jsonb language sql as $f$
  select pg_temp.tli_corre(p_quien, format('select public.contenedores_listar(%L, %L, %L, %L)', p_origen, p_desde, p_tope, p_filtros));
$f$;

-- Los bookings de una página, en orden.
create or replace function pg_temp.tli_bookings(p_r jsonb) returns text[] language sql as $f$
  select coalesce(array_agg(e ->> 'booking' order by k), '{}') from jsonb_array_elements(p_r -> 'embarques') with ordinality x (e, k);
$f$;

create or replace function pg_temp.tli_fila(p_r jsonb, p_booking text) returns jsonb language sql as $f$
  select e from jsonb_array_elements(p_r -> 'embarques') e where e ->> 'booking' = p_booking;
$f$;

-- @test listar: los embarques de un origen, vacíos incluidos, por booking y por cursor; sin origen, sin permiso o con un cursor ajeno, su error (L1)
begin;
do $$
declare t jsonb := pg_temp.tli_terreno(); o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid; p uuid; ajena uuid; e_o2 uuid; r jsonb;
begin
  p := pg_temp.tli_persona(array['logistica.ver']);
  ajena := pg_temp.tli_persona(array['logistica.ver@' || o2]);
  insert into public.embarques (origen_id, booking) values (o, 'TLIC'), (o, 'TLIA'), (o, 'TLIB');
  insert into public.embarques (origen_id, booking) values (o2, 'TLIA') returning id into e_o2;
  perform pg_temp.tli_es('L1 sin origen', pg_temp.tli_embarques(p, null), '22023', 'p_origen');
  perform pg_temp.tli_es('L1 sin permiso en el origen', pg_temp.tli_embarques(ajena, o), '42501');
  r := pg_temp.tli_embarques(p, o, null, 2);
  if pg_temp.tli_bookings(r) <> array['TLIA', 'TLIB'] or (r ->> 'cortada')::boolean
     or r ->> 'siguiente' <> (select id::text from public.embarques where origen_id = o and booking = 'TLIB') then
    raise exception 'L1: la primera página son los dos primeros por booking, con el segundo como cursor: %', r;
  end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'embarques' -> 0) k)
     <> array['actualizado_en', 'arribo_el', 'booking', 'contenedores', 'estado', 'eta_el', 'faltan', 'hay_ocultos', 'id', 'naviera_id',
              'puerto_destino_id', 'puerto_origen_id', 'vehiculos', 'zarpe_el', 'zarpe_estimado_el'] then
    raise exception 'L1: las claves de una fila: %', r -> 'embarques' -> 0;
  end if;
  if r -> 'embarques' -> 0 ->> 'estado' <> 'armandose' or r -> 'embarques' -> 0 -> 'vehiculos' <> '{"n": 0, "hay_mas": false}' then
    raise exception 'L1: uno vacío se arma y no tiene vehículos: %', r -> 'embarques' -> 0;
  end if;
  r := pg_temp.tli_embarques(p, o, (r ->> 'siguiente')::uuid, 2);
  if pg_temp.tli_bookings(r) <> array['TLIC'] or r -> 'siguiente' <> 'null' then
    raise exception 'L1: la segunda página es el último, sin cursor: %', r;
  end if;
  perform pg_temp.tli_es('L1 un cursor de otro origen', pg_temp.tli_embarques(p, o, e_o2), '22023', 'cursor');
end $$;
rollback;

-- @test listar: el estado calculado, la naviera y el prefijo filtran; una clave, un estado o un prefijo mal dados, 22023 con la clave (L2)
begin;
do $$
declare t jsonb := pg_temp.tli_terreno(); o uuid := (t ->> 'o')::uuid; p uuid; hoy date := coalesce(public._bandeja_dia_hoy(), current_date);
  nav uuid; v uuid; e uuid;
begin
  p := pg_temp.tli_persona(array['logistica.ver']);
  insert into public.navieras (nombre) values ('tli naviera ' || gen_random_uuid()) returning id into nav;
  insert into public.embarques (origen_id, booking, zarpe_el) values (o, 'TLIARMA', hoy + 3);
  insert into public.embarques (origen_id, booking, zarpe_el, naviera_id) values (o, 'TLITRAN', hoy - 3, nav);
  insert into public.embarques (origen_id, booking, zarpe_el, arribo_el) values (o, 'TLILLEG', hoy - 9, hoy - 1);
  insert into public.embarques (origen_id, booking, zarpe_el, arribo_el) values (o, 'TLIENTR', hoy - 9, hoy - 1) returning id into e;
  v := pg_temp.tli_vehiculo(o, (t ->> 'fase')::uuid);
  insert into public.fases (flujo_id, nombre, orden, es_final) values ((t ->> 'flujo')::uuid, 'tli entregado', 9, true);
  update public.vehiculos set fase_id = (select id from public.fases where flujo_id = (t ->> 'flujo')::uuid and es_final) where id = v;
  insert into public.transportes (vehiculo_id, embarque_id) values (v, e);
  if pg_temp.tli_bookings(pg_temp.tli_embarques(p, o, null, null, '{"estado": "armandose"}')) <> array['TLIARMA']
     or pg_temp.tli_bookings(pg_temp.tli_embarques(p, o, null, null, '{"estado": "en_transito"}')) <> array['TLITRAN']
     or pg_temp.tli_bookings(pg_temp.tli_embarques(p, o, null, null, '{"estado": "llego"}')) <> array['TLILLEG']
     or pg_temp.tli_bookings(pg_temp.tli_embarques(p, o, null, null, '{"estado": "entregado"}')) <> array['TLIENTR'] then
    raise exception 'L2: cada estado, el suyo';
  end if;
  if pg_temp.tli_bookings(pg_temp.tli_embarques(p, o, null, null, jsonb_build_object('naviera', nav))) <> array['TLITRAN']
     or pg_temp.tli_bookings(pg_temp.tli_embarques(p, o, null, null, '{"prefijo": " tli l "}')) <> array['TLILLEG'] then
    raise exception 'L2: la naviera y el prefijo (sin espacios, en mayúsculas)';
  end if;
  perform pg_temp.tli_es('L2 una clave desconocida', pg_temp.tli_embarques(p, o, null, null, '{"color": "rojo"}'), '22023', 'color');
  perform pg_temp.tli_es('L2 un estado que no existe', pg_temp.tli_embarques(p, o, null, null, '{"estado": "perdido"}'), '22023', 'estado');
  perform pg_temp.tli_es('L2 sin_embarque no es de un embarque', pg_temp.tli_embarques(p, o, null, null, '{"estado": "sin_embarque"}'), '22023', 'estado');
  perform pg_temp.tli_es('L2 un prefijo corto', pg_temp.tli_embarques(p, o, null, null, '{"prefijo": "tl"}'), '22023', 'prefijo');
  perform pg_temp.tli_es('L2 una naviera que no es un id', pg_temp.tli_embarques(p, o, null, null, '{"naviera": "x"}'), '22023', 'naviera');
end $$;
rollback;

-- @test listar: por fila, contenedores y vehículos con tope, los ocultos con «propios» y lo que falta para la fase siguiente (L3)
begin;
do $$
declare t jsonb := pg_temp.tli_terreno(); o uuid := (t ->> 'o')::uuid; p uuid; propia uuid; e uuid; c uuid; v1 uuid; v2 uuid; v3 uuid; r jsonb; f jsonb;
begin
  p := pg_temp.tli_persona(array['logistica.ver']);
  propia := pg_temp.tli_persona(array['logistica.ver'], 'propios');
  insert into public.embarques (origen_id, booking) values (o, 'TLIFILA') returning id into e;
  insert into public.contenedores (origen_id, numero, embarque_id) values (o, 'TLIC1', e) returning id into c;
  insert into public.contenedores (origen_id, numero, embarque_id) values (o, 'TLIC2', e);
  v1 := pg_temp.tli_vehiculo(o, (t ->> 'fase')::uuid, propia);
  v2 := pg_temp.tli_vehiculo(o, (t ->> 'fase')::uuid);
  v3 := pg_temp.tli_vehiculo(o, (t ->> 'siguiente')::uuid);
  insert into public.transportes (vehiculo_id, contenedor_id) values (v1, c), (v2, c);
  insert into public.transportes (vehiculo_id, embarque_id) values (v3, e);
  -- La fase siguiente de «en tránsito» pide una declaración: v1 y v2 tienen algo que falta; v3 ya está en ella y no tiene siguiente.
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato) values ((t ->> 'siguiente')::uuid, 'dato', true, 'aduana.declaracion');
  f := pg_temp.tli_fila(pg_temp.tli_embarques(p, o), 'TLIFILA');
  if f -> 'contenedores' <> '{"n": 2, "hay_mas": false}' or f -> 'vehiculos' <> '{"n": 3, "hay_mas": false}' or (f ->> 'hay_ocultos')::boolean
     or f -> 'faltan' <> '{"n": 2, "hay_mas": false}' or f ->> 'estado' <> 'armandose' then
    raise exception 'L3: la fila con todo a la vista: %', f;
  end if;
  f := pg_temp.tli_fila(pg_temp.tli_embarques(propia, o), 'TLIFILA');
  if f -> 'vehiculos' <> '{"n": 1, "hay_mas": false}' or not (f ->> 'hay_ocultos')::boolean or f -> 'faltan' <> '{"n": 1, "hay_mas": false}' then
    raise exception 'L3: con «propios», sólo el suyo y el aviso de los ocultos: %', f;
  end if;
  -- Con la página de 100, cada fila evalúa 2: el tercero queda sin evaluar.
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato) values ((t ->> 'fase')::uuid, 'dato', true, 'aduana.declaracion');
  update public.vehiculos set fase_id = (t ->> 'fase')::uuid where id = v3;
  f := pg_temp.tli_fila(pg_temp.tli_embarques(p, o, null, 100), 'TLIFILA');
  if f -> 'faltan' <> '{"n": 2, "hay_mas": true}' then
    raise exception 'L3: con 100 filas, dos evaluaciones por fila: %', f;
  end if;
end $$;
rollback;

-- @test listar: recorre a lo sumo 500 embarques; sin llenar la página, cortada con el último mirado (L4)
begin;
do $$
declare t jsonb := pg_temp.tli_terreno(); o uuid := (t ->> 'o')::uuid; p uuid; r jsonb;
begin
  p := pg_temp.tli_persona(array['logistica.ver']);
  insert into public.embarques (origen_id, booking) select o, 'TLIR' || lpad(g::text, 4, '0') from generate_series(1, 520) g;
  r := pg_temp.tli_embarques(p, o, null, null, '{"estado": "llego"}');
  if jsonb_array_length(r -> 'embarques') <> 0 or not (r ->> 'cortada')::boolean
     or r ->> 'siguiente' <> (select id::text from public.embarques where origen_id = o and booking = 'TLIR0500') then
    raise exception 'L4: cortada en el 500: %', r - 'embarques';
  end if;
  r := pg_temp.tli_embarques(p, o, (r ->> 'siguiente')::uuid, null, '{"estado": "llego"}');
  if (r ->> 'cortada')::boolean or r -> 'siguiente' <> 'null' then
    raise exception 'L4: la vuelta termina los 20 que quedan: %', r - 'embarques';
  end if;
end $$;
rollback;

-- @test listar: los contenedores con o sin embarque, su embarque, el prefijo y un origen sin la regla (L5)
begin;
do $$
declare t jsonb := pg_temp.tli_terreno(); o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid; p uuid; e uuid; r jsonb; hoy date := coalesce(public._bandeja_dia_hoy(), current_date);
begin
  p := pg_temp.tli_persona(array['logistica.ver']);
  insert into public.embarques (origen_id, booking, zarpe_el, eta_el) values (o, 'TLIEMB', hoy - 2, hoy + 20) returning id into e;
  insert into public.contenedores (origen_id, numero, embarque_id) values (o, 'TLIK1', e);
  insert into public.contenedores (origen_id, numero) values (o, 'TLIK2'), (o, 'OTRO1');
  insert into public.contenedores (origen_id, numero) values (o2, 'TLIK9');
  r := pg_temp.tli_contenedores(p, o);
  if (select array_agg(c ->> 'numero' order by k) from jsonb_array_elements(r -> 'contenedores') with ordinality x (c, k)) <> array['OTRO1', 'TLIK1', 'TLIK2'] then
    raise exception 'L5: los del origen, por número: %', r;
  end if;
  if r -> 'contenedores' -> 1 -> 'embarque' <> jsonb_build_object('id', e, 'booking', 'TLIEMB') or r -> 'contenedores' -> 1 ->> 'estado' <> 'en_transito'
     or (r -> 'contenedores' -> 1 ->> 'eta_el')::date <> hoy + 20 or r -> 'contenedores' -> 2 -> 'embarque' <> 'null'
     or r -> 'contenedores' -> 2 ->> 'estado' <> 'sin_embarque' then
    raise exception 'L5: cada uno con su embarque y su estado: %', r;
  end if;
  r := pg_temp.tli_contenedores(p, o, null, 10, '{"estado": "sin_embarque", "prefijo": "tli"}');
  if jsonb_array_length(r -> 'contenedores') <> 1 or r -> 'contenedores' -> 0 ->> 'numero' <> 'TLIK2' then
    raise exception 'L5: «Elegir uno sin embarque» con el prefijo: %', r;
  end if;
  perform pg_temp.tli_es('L5 naviera no filtra contenedores', pg_temp.tli_contenedores(p, o, null, null, jsonb_build_object('naviera', e)), '22023', 'naviera');
  update public.flujos_reglas set activa = false where flujo_id = (t ->> 'flujo2')::uuid and regla = 'contenedor';
  r := pg_temp.tli_contenedores(p, o2);
  if r -> 'contenedores' <> '[]' then
    raise exception 'L5: un origen sin la regla contenedor no lista nada: %', r;
  end if;
end $$;
rollback;
