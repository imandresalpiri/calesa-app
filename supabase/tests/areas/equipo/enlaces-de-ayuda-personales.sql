-- Lo que cada persona elige de los enlaces de ayuda (`enlaces_de_ayuda_personales`, escrito por `enlaces_de_ayuda_guardar_mios()` y leído
-- con `enlaces_de_ayuda_de_mi()`): sólo lo ve y lo edita su dueña o dueño, con su versión y el tope de 20 propios.
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y revierte.

create or replace function pg_temp.edp_como(p_id uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

-- Dos personas sin permisos especiales y dos enlaces de la empresa (escritos sin la RPC: el terreno no es lo que se prueba).
create or replace function pg_temp.edp_terreno(a uuid, b uuid, e1 uuid, e2 uuid) returns void language plpgsql as $$
declare v_rol uuid;
begin
  reset role;
  insert into auth.users (id, email, raw_app_meta_data) values (a, a || '@ejemplo.com', '{"invitado": true}'), (b, b || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set invitacion_aceptada_en = now() where id in (a, b);
  delete from public.usuarios_roles where usuario_id in (a, b);
  insert into public.roles (clave, nombre) values ('edp_rol', 'EDP rol') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (a, v_rol, true), (b, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'leads.ver', 'todos');
  delete from public.enlaces_de_ayuda;
  insert into public.enlaces_de_ayuda (id, titulo, url, orden) values (e1, 'Uno', 'https://uno.com', 1), (e2, 'Dos', 'https://dos.com', 2);
end;
$$;

create or replace function pg_temp.edp_falla(p_sql text) returns text language plpgsql as $$
declare v_estado text; v_hint text;
begin
  execute p_sql;
  return 'no cayó';
exception when others then
  get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
  return v_estado || '/' || coalesce(v_hint, '');
end;
$$;

-- @test equipo: los enlaces propios sólo los ve y los edita su dueña o dueño
begin;
do $$
declare
  a constant uuid := '00000000-0000-4000-8000-0000000ee001';
  b constant uuid := '00000000-0000-4000-8000-0000000ee002';
  e1 constant uuid := '00000000-0000-4000-8000-0000000ee101';
  e2 constant uuid := '00000000-0000-4000-8000-0000000ee102';
  p1 constant uuid := '00000000-0000-4000-8000-0000000ee201';
  r jsonb;
  v text;
begin
  perform pg_temp.edp_terreno(a, b, e1, e2);
  perform pg_temp.edp_como(a);
  r := public.enlaces_de_ayuda_de_mi();
  if r -> 'version' <> 'null'::jsonb or jsonb_array_length(r -> 'mios') <> 0 or jsonb_array_length(r -> 'empresa') <> 2 then
    raise exception 'sin nada guardado, la lectura no es la esperada: %', r;
  end if;
  if (r ->> 'tope_propios')::integer <> 20 then raise exception 'la lectura no dice el tope de propios'; end if;

  r := public.enlaces_de_ayuda_guardar_mios(null, jsonb_build_array(
    jsonb_build_object('id', p1, 'titulo', ' Mi guía ', 'url', 'https://mia.com', 'descripcion', null)));
  if jsonb_path_query_first(r, '$.mios[0].titulo') <> '"Mi guía"'::jsonb then raise exception 'no quedó el propio recortado'; end if;

  -- La otra persona no lo ve: ni en la tabla ni en su lectura.
  perform pg_temp.edp_como(b);
  if exists (select 1 from public.enlaces_de_ayuda_personales) then raise exception 'otra persona ve un enlace propio ajeno'; end if;
  if jsonb_array_length(public.enlaces_de_ayuda_de_mi() -> 'mios') <> 0 then raise exception 'otra persona lee lo ajeno'; end if;
  -- Ni lo pisa con su id.
  v := pg_temp.edp_falla(format('select public.enlaces_de_ayuda_guardar_mios(null, %L)',
    jsonb_build_array(jsonb_build_object('id', p1, 'titulo', 'Pisado', 'url', 'https://otra.com'))));
  if v not like '42501/%' then raise exception 'pisar un propio ajeno esperaba 42501, dio %', v; end if;
  -- Sin RPC, la tabla no se escribe.
  v := pg_temp.edp_falla(format('update public.enlaces_de_ayuda_personales set titulo = %L where id = %L', 'X', p1));
  if v not like '42501/%' then raise exception 'el update directo esperaba 42501, dio %', v; end if;
  reset role;
  if (select titulo from public.enlaces_de_ayuda_personales where id = p1) is distinct from 'Mi guía' then
    raise exception 'otra persona cambió un propio ajeno';
  end if;
  if has_function_privilege('anon', 'public.enlaces_de_ayuda_guardar_mios(timestamptz, jsonb)', 'execute')
     or has_table_privilege('anon', 'public.enlaces_de_ayuda_personales', 'select') then
    raise exception 'anon toca los enlaces personales';
  end if;
end $$;
rollback;

-- @test equipo: guardar lo propio pide la versión; ocultar, ordenar y los quitados de la empresa
begin;
do $$
declare
  a constant uuid := '00000000-0000-4000-8000-0000000ee011';
  b constant uuid := '00000000-0000-4000-8000-0000000ee012';
  e1 constant uuid := '00000000-0000-4000-8000-0000000ee111';
  e2 constant uuid := '00000000-0000-4000-8000-0000000ee112';
  p1 constant uuid := '00000000-0000-4000-8000-0000000ee211';
  r jsonb;
  v1 timestamptz;
  v text;
begin
  perform pg_temp.edp_terreno(a, b, e1, e2);
  perform pg_temp.edp_como(a);
  -- Su orden: el propio, después Dos (oculto) y Uno.
  r := public.enlaces_de_ayuda_guardar_mios(null, jsonb_build_array(
    jsonb_build_object('id', p1, 'titulo', 'Mía', 'url', 'https://mia.com'),
    jsonb_build_object('enlace_id', e2, 'oculto', true),
    jsonb_build_object('enlace_id', e1, 'oculto', false),
    jsonb_build_object('enlace_id', e1, 'oculto', true),
    jsonb_build_object('enlace_id', gen_random_uuid(), 'oculto', false)));
  v1 := (r ->> 'version')::timestamptz;
  if v1 is null then raise exception 'guardar no dio la versión'; end if;
  -- El repetido y el que no existe se ignoran, sin error.
  if jsonb_array_length(r -> 'mios') <> 3 then raise exception 'esperaba 3 filas, hay %', r -> 'mios'; end if;
  if jsonb_path_query_first(r, '$.mios[1].enlace_id') <> to_jsonb(e2) or jsonb_path_query_first(r, '$.mios[1].oculto') <> 'true'::jsonb then
    raise exception 'Dos no quedó segundo y oculto';
  end if;
  if jsonb_path_query_first(r, '$.mios[2].oculto') <> 'false'::jsonb then raise exception 'el repetido pisó al primero'; end if;

  -- Con la esperada nula y filas guardadas, PT409; con una vieja, también.
  v := pg_temp.edp_falla($q$select public.enlaces_de_ayuda_guardar_mios(null, '[]'::jsonb)$q$);
  if v not like 'PT409/%' then raise exception 'esperada nula con filas esperaba PT409, dio %', v; end if;
  v := pg_temp.edp_falla(format('select public.enlaces_de_ayuda_guardar_mios(%L, %L)', v1 - interval '1 microsecond', '[]'));
  if v not like 'PT409/%' then raise exception 'versión vieja esperaba PT409, dio %', v; end if;

  -- Un enlace de la empresa desactivado que no vino conserva su fila; uno quitado se va de lo de cada persona (cascada).
  reset role;
  update public.enlaces_de_ayuda set activo = false where id = e2;
  perform pg_temp.edp_como(a);
  r := public.enlaces_de_ayuda_guardar_mios(v1, jsonb_build_array(jsonb_build_object('enlace_id', e1, 'oculto', false)));
  if not jsonb_path_exists(r, '$.mios[*] ? (@.enlace_id == "00000000-0000-4000-8000-0000000ee112")') then
    raise exception 'el desactivado perdió su fila';
  end if;
  if jsonb_path_exists(r, '$.mios[*] ? (@.id == "00000000-0000-4000-8000-0000000ee211")') then
    raise exception 'el propio que no vino no se borró';
  end if;
  reset role;
  delete from public.enlaces_de_ayuda where id = e1;
  if exists (select 1 from public.enlaces_de_ayuda_personales where enlace_id = e1) then
    raise exception 'quitar uno de la empresa dejó su fila personal';
  end if;
end $$;
rollback;

-- @test equipo: los propios piden https, sus largos y el tope de 20
begin;
do $$
declare
  a constant uuid := '00000000-0000-4000-8000-0000000ee021';
  b constant uuid := '00000000-0000-4000-8000-0000000ee022';
  e1 constant uuid := '00000000-0000-4000-8000-0000000ee121';
  e2 constant uuid := '00000000-0000-4000-8000-0000000ee122';
  v_lista jsonb := '[]'::jsonb;
  v text;
begin
  perform pg_temp.edp_terreno(a, b, e1, e2);
  perform pg_temp.edp_como(a);
  v := pg_temp.edp_falla(format('select public.enlaces_de_ayuda_guardar_mios(null, %L)',
    jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'titulo', 'X', 'url', 'http://x.com'))));
  if v <> '22023/url' then raise exception 'http esperaba 22023/url, dio %', v; end if;
  v := pg_temp.edp_falla(format('select public.enlaces_de_ayuda_guardar_mios(null, %L)',
    jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'titulo', repeat('a', 81), 'url', 'https://x.com'))));
  if v <> '22023/titulo' then raise exception '81 caracteres esperaba 22023/titulo, dio %', v; end if;
  v := pg_temp.edp_falla(format('select public.enlaces_de_ayuda_guardar_mios(null, %L)',
    jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'titulo', 'X', 'url', 'https://x.com', 'descripcion', repeat('a', 141)))));
  if v <> '22023/descripcion' then raise exception '141 caracteres esperaba 22023/descripcion, dio %', v; end if;

  for i in 1 .. 21 loop
    v_lista := v_lista || jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'titulo', 'P' || i, 'url', 'https://p.com/' || i));
  end loop;
  v := pg_temp.edp_falla(format('select public.enlaces_de_ayuda_guardar_mios(null, %L)', v_lista));
  if v <> '22023/tope' then raise exception '21 propios esperaba 22023/tope, dio %', v; end if;
  if jsonb_array_length(public.enlaces_de_ayuda_guardar_mios(null, v_lista - 20) -> 'mios') <> 20 then
    raise exception '20 propios no entraron';
  end if;

  -- El check repite la forma: uno de la empresa no lleva título; uno propio no se oculta.
  reset role;
  v := pg_temp.edp_falla(format($q$insert into public.enlaces_de_ayuda_personales (id, usuario_id, enlace_id, titulo, orden) values (gen_random_uuid(), %L, %L, 'X', 1)$q$, a, e1));
  if v not like '23514/%' then raise exception 'el check de la forma esperaba 23514, dio %', v; end if;
  v := pg_temp.edp_falla(format($q$insert into public.enlaces_de_ayuda_personales (id, usuario_id, titulo, url, oculto, orden) values (gen_random_uuid(), %L, 'X', 'https://x.com', true, 1)$q$, a));
  if v not like '23514/%' then raise exception 'un propio oculto esperaba 23514, dio %', v; end if;
end $$;
rollback;
