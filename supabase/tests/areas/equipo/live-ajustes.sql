-- Los ajustes del Live (`live_ajustes_roles`, `live_ajustes_personas`): los lee quien tiene el rol o la persona misma, y todo quien tiene
-- `live.configurar`; se escriben sólo por `live_rol_*` y `live_persona_*` con su versión (PT409); viajan en `mi_sesion()` (el rol principal o el
-- de «Ver como», sin lo propio con la perspectiva); `live_personas()` pagina por cursor.
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y revierte.

create or replace function pg_temp.lva_como(p_id uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

-- A y B con el rol «x» (sin permisos especiales), C con el rol «y» que configura (y gestiona roles: puede «Ver como»).
create or replace function pg_temp.lva_terreno(a uuid, b uuid, c uuid) returns void language plpgsql as $$
declare v_x uuid; v_y uuid;
begin
  reset role;
  insert into auth.users (id, email, raw_app_meta_data) values
    (a, a || '@ejemplo.com', '{"invitado": true}'), (b, b || '@ejemplo.com', '{"invitado": true}'), (c, c || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set invitacion_aceptada_en = now() where id in (a, b, c);
  update public.perfiles set nombre = 'Lva Ana' where id = a;
  update public.perfiles set nombre = 'Lva Beto' where id = b;
  update public.perfiles set nombre = 'Lva Carla' where id = c;
  delete from public.usuarios_roles where usuario_id in (a, b, c);
  insert into public.roles (clave, nombre, orden) values ('lva_x', 'Lva X', 900) returning id into v_x;
  insert into public.roles (clave, nombre, orden) values ('lva_y', 'Lva Y', 901) returning id into v_y;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (a, v_x, true), (b, v_x, true), (c, v_y, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values
    (v_x, 'vehiculos.ver', 'todos'), (v_y, 'live.configurar', 'todos'), (v_y, 'equipo.roles.gestionar', 'todos');
end;
$$;

create or replace function pg_temp.lva_rol(p_clave text) returns uuid language sql as $$
  select id from public.roles where clave = p_clave
$$;

create or replace function pg_temp.lva_falla(p_sql text) returns text language plpgsql as $$
declare v_estado text; v_hint text;
begin
  execute p_sql;
  return 'no cayó';
exception when others then
  get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
  return v_estado || '/' || coalesce(v_hint, '');
end;
$$;

-- @test equipo: live.configurar está en el catálogo con su enforcement y el dueño lo tiene
begin;
do $$
begin
  if not exists (select 1 from public.permisos p where p.clave = 'live.configurar' and p.modulo = 'live' and not p.por_origen and not p.con_alcance
                   and p.aplicado_en like '%live_rol_guardar%') then
    raise exception 'live.configurar no está en el catálogo como se espera';
  end if;
  if not exists (select 1 from public.roles_permisos rp join public.roles r on r.id = rp.rol_id
                  where r.clave = 'dueno' and rp.permiso_clave = 'live.configurar' and rp.alcance = 'todos' and rp.origen_id is null) then
    raise exception 'el dueño no tiene live.configurar';
  end if;
end $$;
rollback;

-- @test equipo: los ajustes del Live los lee quien tiene el rol o la persona misma, y todo quien configura; nadie los escribe directo
begin;
do $$
declare
  a constant uuid := '00000000-0000-4000-8000-0000000fa001';
  b constant uuid := '00000000-0000-4000-8000-0000000fa002';
  c constant uuid := '00000000-0000-4000-8000-0000000fa003';
  v text;
  n integer;
begin
  perform pg_temp.lva_terreno(a, b, c);
  perform pg_temp.lva_como(c);
  perform public.live_rol_guardar(pg_temp.lva_rol('lva_x'), '{"logistica": "cadena", "clientes": "apagado"}', null);
  perform public.live_rol_guardar(pg_temp.lva_rol('lva_y'), '{"inicio": true}', null);
  perform public.live_persona_guardar(a, '{"clientes": "nombres"}', null);
  perform public.live_persona_guardar(b, '{"repuestos": "estadisticas"}', null);
  select count(*) into n from public.live_ajustes_roles where rol_id in (pg_temp.lva_rol('lva_x'), pg_temp.lva_rol('lva_y'));
  if n <> 2 then raise exception 'quien configura no lee todos los roles: %', n; end if;
  select count(*) into n from public.live_ajustes_personas where usuario_id in (a, b);
  if n <> 2 then raise exception 'quien configura no lee todas las personas: %', n; end if;

  perform pg_temp.lva_como(a);
  if not exists (select 1 from public.live_ajustes_roles where rol_id = pg_temp.lva_rol('lva_x')) then raise exception 'A no lee lo de su rol'; end if;
  if exists (select 1 from public.live_ajustes_roles where rol_id = pg_temp.lva_rol('lva_y')) then raise exception 'A lee lo de otro rol'; end if;
  if not exists (select 1 from public.live_ajustes_personas where usuario_id = a) then raise exception 'A no lee lo suyo'; end if;
  if exists (select 1 from public.live_ajustes_personas where usuario_id = b) then raise exception 'A lee lo de otra persona'; end if;

  v := pg_temp.lva_falla(format('insert into public.live_ajustes_personas (usuario_id, ajustes) values (%L, %L)', c, '{"inicio": true}'));
  if v not like '42501/%' then raise exception 'el insert directo esperaba 42501, dio %', v; end if;
  v := pg_temp.lva_falla(format('update public.live_ajustes_personas set ajustes = %L where usuario_id = %L', '{"inicio": true}', a));
  if v not like '42501/%' then raise exception 'el update directo esperaba 42501, dio %', v; end if;
  v := pg_temp.lva_falla(format('delete from public.live_ajustes_roles where rol_id = %L', pg_temp.lva_rol('lva_x')));
  if v not like '42501/%' then raise exception 'el delete directo esperaba 42501, dio %', v; end if;
  v := pg_temp.lva_falla(format('select public.live_rol_guardar(%L, %L, null)', pg_temp.lva_rol('lva_y'), '{"inicio": true}'));
  if v not like '42501/%' then raise exception 'live_rol_guardar sin el permiso esperaba 42501, dio %', v; end if;
  v := pg_temp.lva_falla(format('select public.live_persona_guardar(%L, %L, null)', c, '{"inicio": true}'));
  if v not like '42501/%' then raise exception 'live_persona_guardar sin el permiso esperaba 42501, dio %', v; end if;
  v := pg_temp.lva_falla('select public.live_personas()');
  if v not like '42501/%' then raise exception 'live_personas sin el permiso esperaba 42501, dio %', v; end if;

  reset role;
  if has_table_privilege('anon', 'public.live_ajustes_roles', 'select') or has_table_privilege('anon', 'public.live_ajustes_personas', 'select')
     or has_function_privilege('anon', 'public.live_rol_guardar(uuid, jsonb, timestamptz)', 'execute')
     or has_function_privilege('anon', 'public.live_persona_guardar(uuid, jsonb, timestamptz)', 'execute')
     or has_function_privilege('anon', 'public.live_personas(text, timestamptz, uuid, integer)', 'execute') then
    raise exception 'anon toca los ajustes del Live';
  end if;
end $$;
rollback;

-- @test equipo: la base rechaza unos ajustes del Live mal formados (22023 con hint ajustes en la RPC; el check en la tabla)
begin;
do $$
declare
  a constant uuid := '00000000-0000-4000-8000-0000000fa011';
  b constant uuid := '00000000-0000-4000-8000-0000000fa012';
  c constant uuid := '00000000-0000-4000-8000-0000000fa013';
  v text;
  malo text;
begin
  perform pg_temp.lva_terreno(a, b, c);
  perform pg_temp.lva_como(c);
  foreach malo in array array[
    '{"otra": true}', '{"clientes": "algunos"}', '{"origenes": []}', '{"origenes": ["no-es-uuid"]}', '{"vehiculos": "si"}',
    '{"logistica": "todo"}', '[]', '"todos"', '{"origenes": "algunos"}', '{"origenes": [1]}'] loop
    v := pg_temp.lva_falla(format('select public.live_rol_guardar(%L, %L, null)', pg_temp.lva_rol('lva_x'), malo));
    if v <> '22023/ajustes' then raise exception 'los ajustes % esperaban 22023/ajustes, dieron %', malo, v; end if;
  end loop;
  v := pg_temp.lva_falla(format('select public.live_rol_guardar(%L, %L, null)', gen_random_uuid(), '{}'));
  if v <> '22023/rol' then raise exception 'un rol que no existe esperaba 22023/rol, dio %', v; end if;
  reset role;
  if not public._live_ajustes_validos(jsonb_build_object('origenes', jsonb_build_array(gen_random_uuid()), 'puede_encender', false,
       'clientes', 'completo', 'logistica', 'apagado', 'repuestos', 'estadisticas', 'origenes_config', 'lectura', 'inicio', true,
       'vehiculos', true, 'cotizaciones', false)) then
    raise exception 'unos ajustes completos y válidos no pasaron';
  end if;
  if not public._live_ajustes_validos('{}') then raise exception 'los ajustes vacíos de un rol no pasaron'; end if;
  v := pg_temp.lva_falla(format('insert into public.live_ajustes_roles (rol_id, ajustes) values (%L, %L)', pg_temp.lva_rol('lva_x'), '{"clientes": "x"}'));
  if v not like '23514/%' then raise exception 'el check de la tabla de roles esperaba 23514, dio %', v; end if;
  v := pg_temp.lva_falla(format('insert into public.live_ajustes_personas (usuario_id, ajustes) values (%L, %L)', a, '{}'));
  if v not like '23514/%' then raise exception 'unos ajustes propios vacíos esperaban 23514, dieron %', v; end if;
end $$;
rollback;

-- @test equipo: guardar y quitar los ajustes del Live piden la versión (PT409) y los vacíos de una persona vuelven a lo de su rol
begin;
do $$
declare
  a constant uuid := '00000000-0000-4000-8000-0000000fa021';
  b constant uuid := '00000000-0000-4000-8000-0000000fa022';
  c constant uuid := '00000000-0000-4000-8000-0000000fa023';
  v1 timestamptz;
  v2 timestamptz;
  v text;
begin
  perform pg_temp.lva_terreno(a, b, c);
  perform pg_temp.lva_como(c);
  v1 := public.live_rol_guardar(pg_temp.lva_rol('lva_x'), '{"inicio": true}', null);
  if v1 is null then raise exception 'crear no devolvió la versión'; end if;
  -- Esperada nula con la fila ya creada: PT409, no pisa.
  v := pg_temp.lva_falla(format('select public.live_rol_guardar(%L, %L, null)', pg_temp.lva_rol('lva_x'), '{"inicio": false}'));
  if v not like 'PT409/%' then raise exception 'crear sobre una fila existente esperaba PT409, dio %', v; end if;
  -- Una versión vieja (la de ahora menos 1 µs): PT409.
  v := pg_temp.lva_falla(format('select public.live_rol_guardar(%L, %L, %L)', pg_temp.lva_rol('lva_x'), '{"inicio": false}', v1 - interval '1 microsecond'));
  if v not like 'PT409/%' then raise exception 'una versión vieja esperaba PT409, dio %', v; end if;
  v2 := public.live_rol_guardar(pg_temp.lva_rol('lva_x'), '{"inicio": false}', v1);
  if v2 <= v1 then raise exception 'la versión no avanzó: % → %', v1, v2; end if;
  -- Una esperada sin fila: PT409 (otra persona la quitó).
  v := pg_temp.lva_falla(format('select public.live_rol_guardar(%L, %L, %L)', pg_temp.lva_rol('lva_y'), '{}', v1));
  if v not like 'PT409/%' then raise exception 'una esperada sin fila esperaba PT409, dio %', v; end if;
  v := pg_temp.lva_falla(format('select public.live_rol_quitar(%L, %L)', pg_temp.lva_rol('lva_x'), v1));
  if v not like 'PT409/%' then raise exception 'quitar con una versión vieja esperaba PT409, dio %', v; end if;
  perform public.live_rol_quitar(pg_temp.lva_rol('lva_x'), v2);
  if exists (select 1 from public.live_ajustes_roles where rol_id = pg_temp.lva_rol('lva_x')) then raise exception 'quitar no volvió a lo por defecto'; end if;

  -- La persona: vacíos sin fila no crean nada; vacíos con fila la borran.
  if public.live_persona_guardar(a, '{}', null) is not null then raise exception 'unos ajustes propios vacíos crearon algo'; end if;
  v1 := public.live_persona_guardar(a, '{"clientes": "nombres"}', null);
  if public.live_persona_guardar(a, '{}', v1) is not null then raise exception 'vaciar lo propio no devolvió null'; end if;
  if exists (select 1 from public.live_ajustes_personas where usuario_id = a) then raise exception 'vaciar lo propio no borró la fila'; end if;
  v1 := public.live_persona_guardar(a, '{"clientes": "nombres"}', null);
  v := pg_temp.lva_falla(format('select public.live_persona_quitar(%L, %L)', a, v1 - interval '1 microsecond'));
  if v not like 'PT409/%' then raise exception 'quitar lo propio con una versión vieja esperaba PT409, dio %', v; end if;
  perform public.live_persona_quitar(a, v1);
  -- Una persona dada de baja no recibe ajustes nuevos.
  reset role;
  update public.perfiles set activo = false where id = b;
  perform pg_temp.lva_como(c);
  v := pg_temp.lva_falla(format('select public.live_persona_guardar(%L, %L, null)', b, '{"inicio": true}'));
  if v <> '22023/persona' then raise exception 'una baja esperaba 22023/persona, dio %', v; end if;
end $$;
rollback;

-- @test equipo: mi_sesion trae los ajustes del Live del rol principal y los propios; con «Ver como», los del rol mirado sin los propios
begin;
do $$
declare
  a constant uuid := '00000000-0000-4000-8000-0000000fa031';
  b constant uuid := '00000000-0000-4000-8000-0000000fa032';
  c constant uuid := '00000000-0000-4000-8000-0000000fa033';
  s jsonb;
begin
  perform pg_temp.lva_terreno(a, b, c);
  perform pg_temp.lva_como(c);
  perform public.live_rol_guardar(pg_temp.lva_rol('lva_x'), '{"logistica": "cadena"}', null);
  perform public.live_persona_guardar(a, '{"clientes": "nombres"}', null);
  perform public.live_persona_guardar(c, '{"inicio": true}', null);

  perform pg_temp.lva_como(a);
  s := public.mi_sesion();
  if (select array_agg(k order by k) from jsonb_object_keys(s -> 'live') k) <> array['persona', 'rol'] then
    raise exception 'la clave live no tiene la forma esperada: %', s -> 'live';
  end if;
  if jsonb_path_query_first(s, '$.live.rol.id') <> to_jsonb(pg_temp.lva_rol('lva_x'))
     or jsonb_path_query_first(s, '$.live.rol.nombre') <> '"Lva X"'::jsonb
     or jsonb_path_query_first(s, '$.live.rol.ajustes.logistica') <> '"cadena"'::jsonb then
    raise exception 'mi_sesion no trae el rol principal con sus ajustes: %', s -> 'live';
  end if;
  if jsonb_path_query_first(s, '$.live.persona.clientes') <> '"nombres"'::jsonb then
    raise exception 'mi_sesion no trae lo propio: %', s -> 'live';
  end if;

  -- B: su rol, sin nada propio.
  perform pg_temp.lva_como(b);
  s := public.mi_sesion();
  if s -> 'live' -> 'persona' <> 'null'::jsonb then raise exception 'B trae lo propio de otra persona: %', s -> 'live'; end if;

  -- C mira como «x»: manda lo de «x» y no lo propio.
  perform pg_temp.lva_como(c);
  s := public.mi_sesion(pg_temp.lva_rol('lva_x'));
  if jsonb_path_query_first(s, '$.live.rol.id') <> to_jsonb(pg_temp.lva_rol('lva_x')) then
    raise exception 'con «Ver como» no manda el rol mirado: %', s -> 'live';
  end if;
  if s -> 'live' -> 'persona' <> 'null'::jsonb then raise exception 'con «Ver como» viajó lo propio: %', s -> 'live'; end if;
  -- Sin perspectiva, su rol (sin fila: ajustes nulos) y lo suyo.
  s := public.mi_sesion();
  if jsonb_path_query_first(s, '$.live.rol.id') <> to_jsonb(pg_temp.lva_rol('lva_y')) or s -> 'live' -> 'rol' -> 'ajustes' <> 'null'::jsonb then
    raise exception 'sin perspectiva no manda su rol sin ajustes: %', s -> 'live';
  end if;
  if jsonb_path_query_first(s, '$.live.persona.inicio') <> 'true'::jsonb then raise exception 'sin perspectiva no viaja lo propio'; end if;

  -- Sin rol: rol nulo.
  reset role;
  delete from public.usuarios_roles where usuario_id = b;
  perform pg_temp.lva_como(b);
  s := public.mi_sesion();
  if s -> 'live' -> 'rol' <> 'null'::jsonb then raise exception 'sin rol trae un rol: %', s -> 'live'; end if;

  -- Borrar el rol se lleva sus ajustes.
  reset role;
  delete from public.usuarios_roles where rol_id = pg_temp.lva_rol('lva_x');
  delete from public.roles_permisos where rol_id = pg_temp.lva_rol('lva_x');
  delete from public.roles where clave = 'lva_x';
  if exists (select 1 from public.live_ajustes_roles l left join public.roles r on r.id = l.rol_id where r.id is null) then
    raise exception 'borrar un rol dejó sus ajustes';
  end if;
end $$;
rollback;

-- @test equipo: live_personas pagina por cursor a quienes tienen ajuste propio y busca por nombre con 3 letras
begin;
do $$
declare
  a constant uuid := '00000000-0000-4000-8000-0000000fa041';
  b constant uuid := '00000000-0000-4000-8000-0000000fa042';
  c constant uuid := '00000000-0000-4000-8000-0000000fa043';
  i integer;
  u uuid;
  r jsonb;
  vistos uuid[] := '{}';
  ultimo jsonb;
  vueltas integer := 0;
begin
  perform pg_temp.lva_terreno(a, b, c);
  -- 25 personas más con ajuste propio (el terreno no es lo que se prueba: sin la RPC).
  for i in 1..25 loop
    u := ('00000000-0000-4000-8000-0000000fb' || lpad(i::text, 3, '0'))::uuid;
    insert into auth.users (id, email, raw_app_meta_data) values (u, u || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set invitacion_aceptada_en = now(), nombre = 'Lva Extra ' || i where id = u;
    insert into public.live_ajustes_personas (usuario_id, ajustes, actualizado_en) values (u, '{"inicio": true}', now() - make_interval(secs => i));
  end loop;
  perform pg_temp.lva_como(c);
  r := public.live_personas();
  loop
    vueltas := vueltas + 1;
    if vueltas > 5 then raise exception 'el cursor no termina'; end if;
    if jsonb_array_length(r -> 'personas') > 20 then raise exception 'una página trajo más de 20'; end if;
    select vistos || array_agg((e ->> 'id')::uuid) into vistos from jsonb_array_elements(r -> 'personas') e;
    exit when not (r ->> 'hay_mas')::boolean;
    ultimo := r -> 'personas' -> (jsonb_array_length(r -> 'personas') - 1);
    r := public.live_personas(null, (ultimo ->> 'actualizado_en')::timestamptz, (ultimo ->> 'id')::uuid);
  end loop;
  if cardinality(vistos) <> 25 or (select count(distinct x) from unnest(vistos) x) <> 25 then
    raise exception 'el cursor repitió o perdió personas: % vistas', cardinality(vistos);
  end if;
  -- Dos letras: la misma lista de quienes tienen ajuste propio.
  r := public.live_personas('Lv');
  if jsonb_array_length(r -> 'personas') <> 20 or not (r ->> 'hay_mas')::boolean then raise exception 'dos letras no dieron la lista: %', r; end if;
  -- Con texto: las personas vigentes que lo nombran, con su rol principal y sin ajustes si no los tienen.
  r := public.live_personas('Beto');
  if jsonb_array_length(r -> 'personas') <> 1 or jsonb_path_query_first(r, '$.personas[0].id') <> to_jsonb(b)
     or jsonb_path_query_first(r, '$.personas[0].rol.nombre') <> '"Lva X"'::jsonb or r -> 'personas' -> 0 -> 'ajustes' <> 'null'::jsonb then
    raise exception 'buscar a Beto no dio lo esperado: %', r;
  end if;
end $$;
rollback;
