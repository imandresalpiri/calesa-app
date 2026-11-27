-- Un embarque y un contenedor por su id: `embarque_leer`, `contenedor_leer` y `transporte_unidades`. No depende de otro archivo
-- (`SOLO=areas/transporte/leer.sql`). Cada bloque abre su transacción y la revierte. Los ayudantes son copia de `asignar.sql` con su propio
-- prefijo (`db:probar` corre todos los archivos en una sola sesión).
--
-- Qué asegura:
--   E1. El embarque con sus contenedores (cada uno con su estado), sus vehículos por contenedor (los sueltos al final) con su fase, la versión
--       de su transporte, su declaración viva y si le falta algo; el conteo y editable. p_falta deja sólo los que tienen algo que falta.
--   E2. El que no existe y el de un origen cuya logística no se ve dan el mismo P0002; con «propios», los ajenos se avisan como ocultos.
--   E3. El contenedor con su embarque (o nulo) y sus vehículos; el que no se ve, P0002.
--   E4. Las unidades de un embarque (también las de sus contenedores) o de un contenedor, para el lote; un tipo que no es, 22023.

create or replace function pg_temp.tle_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-tle@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('tle_' || substr(v_id::text, 1, 8), 'tle ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Dos orígenes (con su flujo), dos fases en el primero (la segunda pide una declaración y es la siguiente de la primera) y una en el segundo.
-- Un embarque con dos contenedores (el primero con dos vehículos, el segundo vacío) y un vehículo suelto, el primero con su declaración.
create or replace function pg_temp.tle_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fl2 uuid; fa uuid; fb uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  e uuid; c1 uuid; c2 uuid; v1 uuid; v2 uuid; v3 uuid; d uuid;
begin
  insert into public.origenes (clave, nombre, tipo) values ('tle_' || s, 'tle origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('tle2_' || s, 'tle origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  select id into fl2 from public.flujos where origen_id = o2;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl, 'tle en tránsito', 1, true) returning id into fa;
  insert into public.fases (flujo_id, nombre, orden) values (fl, 'tle en aduana', 2) returning id into fb;
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (fl, fa, fb);
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato) values (fb, 'dato', true, 'aduana.declaracion');
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl2, 'tle2 en tránsito', 1, true);
  insert into public.embarques (origen_id, booking) values (o, 'TLE' || upper(s)) returning id into e;
  insert into public.contenedores (origen_id, numero, embarque_id) values (o, 'TLEB' || upper(s), e) returning id into c1;
  insert into public.contenedores (origen_id, numero, embarque_id) values (o, 'TLEA' || upper(s), e) returning id into c2;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'tle b', fa) returning id into v1;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'tle a', fa) returning id into v2;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'tle suelto', fa) returning id into v3;
  insert into public.transportes (vehiculo_id, contenedor_id) values (v1, c1), (v2, c1);
  insert into public.transportes (vehiculo_id, embarque_id) values (v3, e);
  insert into public.declaraciones_aduana (numero) values ('TLE-' || s) returning id into d;
  insert into public.declaraciones_vehiculos (declaracion_id, vehiculo_id) values (d, v1);
  return jsonb_build_object('o', o, 'o2', o2, 'fase', fa, 'siguiente', fb, 'e', e, 'c1', c1, 'c2', c2, 'v1', v1, 'v2', v2, 'v3', v3, 'd', d);
end $f$;

create or replace function pg_temp.tle_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.tle_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

-- Los ids de los vehículos de una lectura, en orden.
create or replace function pg_temp.tle_ids(p_r jsonb) returns uuid[] language sql as $f$
  select coalesce(array_agg((v ->> 'vehiculo_id')::uuid order by k), '{}') from jsonb_array_elements(p_r -> 'vehiculos') with ordinality x (v, k);
$f$;

-- @test leer: el embarque con sus contenedores y sus vehículos por contenedor, su declaración y lo que falta; p_falta los filtra (E1)
begin;
do $$
declare t jsonb := pg_temp.tle_terreno(); p uuid; r jsonb; v jsonb;
begin
  p := pg_temp.tle_persona(array['logistica.ver', 'logistica.transporte.editar']);
  r := pg_temp.tle_corre(p, format('select public.embarque_leer(%L)', t ->> 'e'));
  if (select array_agg(k order by k) from jsonb_object_keys(r) k)
     <> array['actualizado_en', 'arribo_el', 'booking', 'contenedores', 'conteo', 'editable', 'estado', 'eta_el', 'hay_mas', 'hay_mas_contenedores',
              'hay_ocultos', 'id', 'naviera_id', 'notas', 'origen_id', 'puerto_destino_id', 'puerto_origen_id', 'vehiculos', 'zarpe_el',
              'zarpe_estimado_el'] then
    raise exception 'E1: las claves del embarque: %', r;
  end if;
  if (select array_agg((c ->> 'id')::uuid order by k) from jsonb_array_elements(r -> 'contenedores') with ordinality x (c, k))
       <> array[(t ->> 'c2')::uuid, (t ->> 'c1')::uuid]
     or r -> 'contenedores' -> 0 ->> 'estado' <> 'armandose' then
    raise exception 'E1: los contenedores por número, con su estado: %', r -> 'contenedores';
  end if;
  if pg_temp.tle_ids(r) <> array[(t ->> 'v2')::uuid, (t ->> 'v1')::uuid, (t ->> 'v3')::uuid] then
    raise exception 'E1: por contenedor y título, los sueltos al final: %', r -> 'vehiculos';
  end if;
  v := r -> 'vehiculos' -> 1;
  if v -> 'declaracion' <> jsonb_build_object('id', t ->> 'd', 'numero', (select numero from public.declaraciones_aduana where id = (t ->> 'd')::uuid))
     or (v ->> 'contenedor_id')::uuid <> (t ->> 'c1')::uuid or v ->> 'fase' <> 'tle en tránsito' or v ->> 'transporte_actualizado_en' is null
     or (v ->> 'falta')::boolean then
    raise exception 'E1: el vehículo con su declaración, su contenedor y su fase; con declaración no le falta nada: %', v;
  end if;
  if r -> 'vehiculos' -> 0 -> 'declaracion' <> 'null' or not (r -> 'vehiculos' -> 0 ->> 'falta')::boolean
     or r -> 'vehiculos' -> 2 -> 'contenedor_id' <> 'null' then
    raise exception 'E1: sin declaración le falta algo; el suelto, sin contenedor: %', r -> 'vehiculos';
  end if;
  if r -> 'conteo' <> '{"n": 3, "hay_mas": false}' or not (r ->> 'editable')::boolean or (r ->> 'hay_ocultos')::boolean or (r ->> 'hay_mas')::boolean then
    raise exception 'E1: el conteo, editable y sin ocultos: %', r - 'vehiculos' - 'contenedores';
  end if;
  r := pg_temp.tle_corre(p, format('select public.embarque_leer(%L, true)', t ->> 'e'));
  if pg_temp.tle_ids(r) <> array[(t ->> 'v2')::uuid, (t ->> 'v3')::uuid] then
    raise exception 'E1: p_falta deja los que tienen algo que falta: %', r -> 'vehiculos';
  end if;
  p := pg_temp.tle_persona(array['logistica.ver']);
  if (pg_temp.tle_corre(p, format('select public.embarque_leer(%L)', t ->> 'e')) ->> 'editable')::boolean then
    raise exception 'E1: sin logistica.transporte.editar no es editable';
  end if;
end $$;
rollback;

-- @test leer: el que no existe o no se ve da el mismo P0002; con «propios», los ajenos se avisan como ocultos (E2)
begin;
do $$
declare t jsonb := pg_temp.tle_terreno(); ajena uuid; propia uuid; r jsonb;
begin
  ajena := pg_temp.tle_persona(array['logistica.ver@' || (t ->> 'o2')]);
  propia := pg_temp.tle_persona(array['logistica.ver'], 'propios');
  update public.vehiculos set creado_por = propia where id = (t ->> 'v3')::uuid;
  perform pg_temp.tle_es('E2 no existe', pg_temp.tle_corre(ajena, format('select public.embarque_leer(%L)', gen_random_uuid())), 'P0002');
  perform pg_temp.tle_es('E2 no se ve', pg_temp.tle_corre(ajena, format('select public.embarque_leer(%L)', t ->> 'e')), 'P0002');
  r := pg_temp.tle_corre(propia, format('select public.embarque_leer(%L)', t ->> 'e'));
  if pg_temp.tle_ids(r) <> array[(t ->> 'v3')::uuid] or not (r ->> 'hay_ocultos')::boolean or r -> 'conteo' <> '{"n": 1, "hay_mas": false}' then
    raise exception 'E2: con «propios», el suyo y el aviso: %', r;
  end if;
end $$;
rollback;

-- @test leer: el contenedor con su embarque y sus vehículos; sin embarque, nulo; el que no se ve, P0002 (E3)
begin;
do $$
declare t jsonb := pg_temp.tle_terreno(); p uuid; ajena uuid; r jsonb; c uuid;
begin
  p := pg_temp.tle_persona(array['logistica.ver']);
  ajena := pg_temp.tle_persona(array['logistica.ver@' || (t ->> 'o2')]);
  r := pg_temp.tle_corre(p, format('select public.contenedor_leer(%L)', t ->> 'c1'));
  if (select array_agg(k order by k) from jsonb_object_keys(r) k)
     <> array['actualizado_en', 'editable', 'embarque', 'estado', 'hay_mas', 'hay_ocultos', 'id', 'notas', 'numero', 'origen_id', 'sello', 'tipo',
              'tipo_nombre', 'vehiculos'] then
    raise exception 'E3: las claves del contenedor: %', r;
  end if;
  if (r -> 'embarque' ->> 'id')::uuid <> (t ->> 'e')::uuid or r -> 'embarque' ->> 'estado' <> 'armandose'
     or pg_temp.tle_ids(r) <> array[(t ->> 'v2')::uuid, (t ->> 'v1')::uuid] then
    raise exception 'E3: su embarque y sus dos vehículos: %', r;
  end if;
  insert into public.contenedores (origen_id, numero) values ((t ->> 'o')::uuid, 'TLESOLO') returning id into c;
  r := pg_temp.tle_corre(p, format('select public.contenedor_leer(%L)', c));
  if r -> 'embarque' <> 'null' or r ->> 'estado' <> 'sin_embarque' or r -> 'vehiculos' <> '[]' then
    raise exception 'E3: sin embarque: %', r;
  end if;
  perform pg_temp.tle_es('E3 no se ve', pg_temp.tle_corre(ajena, format('select public.contenedor_leer(%L)', t ->> 'c1')), 'P0002');
end $$;
rollback;

-- @test leer: las unidades de un embarque (con las de sus contenedores) o de un contenedor; un tipo que no es, 22023 (E4)
begin;
do $$
declare t jsonb := pg_temp.tle_terreno(); p uuid; r jsonb;
begin
  p := pg_temp.tle_persona(array['logistica.ver']);
  r := pg_temp.tle_corre(p, format('select public.transporte_unidades(%L, %L)', 'embarque', t ->> 'e'));
  if (select array_agg((u ->> 'vehiculo_id')::uuid order by u ->> 'vehiculo_id') from jsonb_array_elements(r -> 'unidades') u)
     <> (select array_agg(x order by x::text) from unnest(array[(t ->> 'v1')::uuid, (t ->> 'v2')::uuid, (t ->> 'v3')::uuid]) x)
     or (r ->> 'hay_mas')::boolean or (r ->> 'hay_ocultas')::boolean then
    raise exception 'E4: las tres del embarque: %', r;
  end if;
  if not (r -> 'unidades' -> 0 ?& array['transporte_id', 'titulo', 'fase_id', 'fase', 'fase_orden', 'origen_id', 'embarque_id', 'contenedor_id',
                                        'contenedor', 'booking', 'eta_el', 'actualizado_en']) then
    raise exception 'E4: la forma de una unidad: %', r -> 'unidades' -> 0;
  end if;
  r := pg_temp.tle_corre(p, format('select public.transporte_unidades(%L, %L)', 'contenedor', t ->> 'c1'));
  if jsonb_array_length(r -> 'unidades') <> 2 then
    raise exception 'E4: las dos del contenedor: %', r;
  end if;
  r := pg_temp.tle_corre(p, format('select public.transporte_unidades(%L, %L)', 'contenedor', gen_random_uuid()));
  if r -> 'unidades' <> '[]' then
    raise exception 'E4: uno que no existe, vacío: %', r;
  end if;
  perform pg_temp.tle_es('E4 un tipo que no es', pg_temp.tle_corre(p, format('select public.transporte_unidades(%L, %L)', 'booking', t ->> 'e')), '22023', 'tipo');
end $$;
rollback;
