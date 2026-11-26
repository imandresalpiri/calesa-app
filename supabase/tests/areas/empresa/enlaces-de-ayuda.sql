-- Los enlaces de ayuda de la empresa (`enlaces_de_ayuda`, escritos por `enlace_de_ayuda_*`): permiso, topes, `https`, versión y lectura.
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y revierte.

create or replace function pg_temp.eda_como(p_id uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

-- Una persona que gestiona la empresa (`g`) y otra sin el permiso (`s`).
create or replace function pg_temp.eda_terreno(g uuid, s uuid) returns void language plpgsql as $$
declare v_rol uuid;
begin
  reset role;
  insert into auth.users (id, email, raw_app_meta_data) values (g, g || '@ejemplo.com', '{"invitado": true}'), (s, s || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set invitacion_aceptada_en = now() where id in (g, s);
  delete from public.usuarios_roles where usuario_id in (g, s);
  insert into public.roles (clave, nombre) values ('eda_gestiona', 'EDA gestiona') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (g, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'empresa.ajustes.gestionar', 'todos');
  insert into public.roles (clave, nombre) values ('eda_sin', 'EDA sin') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (s, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'leads.ver', 'todos');
  delete from public.enlaces_de_ayuda;
end;
$$;

-- El código y el `hint` de una llamada que debe caer.
create or replace function pg_temp.eda_falla(p_sql text) returns text language plpgsql as $$
declare v_estado text; v_hint text;
begin
  execute p_sql;
  return 'no cayó';
exception when others then
  get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
  return v_estado || '/' || coalesce(v_hint, '');
end;
$$;

-- @test empresa: sólo escribe quien tiene empresa.ajustes.gestionar; lee toda persona activa
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000ed001';
  s constant uuid := '00000000-0000-4000-8000-0000000ed002';
  e1 constant uuid := '00000000-0000-4000-8000-0000000ed101';
  v text;
begin
  perform pg_temp.eda_terreno(g, s);

  perform pg_temp.eda_como(s);
  v := pg_temp.eda_falla(format('select public.enlace_de_ayuda_crear(%L, %L, %L)', e1, 'Manual', 'https://ayuda.ejemplo.com'));
  if v not like '42501/%' then raise exception 'sin el permiso esperaba 42501, dio %', v; end if;
  -- Sin RPC, la tabla no se escribe: no hay grant de escritura.
  v := pg_temp.eda_falla(format('insert into public.enlaces_de_ayuda (id, titulo, url, orden) values (%L, %L, %L, 1)', e1, 'Manual', 'https://x.com'));
  if v not like '42501/%' then raise exception 'el insert directo esperaba 42501, dio %', v; end if;

  perform pg_temp.eda_como(g);
  perform public.enlace_de_ayuda_crear(e1, '  Manual del sistema  ', 'https://ayuda.ejemplo.com/manual', '  Cómo cotizar  ');

  -- La lee quien no gestiona, recortada.
  perform pg_temp.eda_como(s);
  if (select titulo from public.enlaces_de_ayuda where id = e1) is distinct from 'Manual del sistema' then
    raise exception 'quien no gestiona no lee el enlace recortado';
  end if;
  if (select descripcion from public.enlaces_de_ayuda where id = e1) is distinct from 'Cómo cotizar' then
    raise exception 'la descripción no quedó recortada';
  end if;
  -- Una cuenta bloqueada no la lee.
  reset role;
  update public.perfiles set bloqueado = true where id = s;
  perform pg_temp.eda_como(s);
  if exists (select 1 from public.enlaces_de_ayuda) then raise exception 'una cuenta bloqueada lee los enlaces'; end if;
  reset role;

  if has_function_privilege('anon', 'public.enlace_de_ayuda_crear(uuid, text, text, text)', 'execute')
     or has_function_privilege('anon', 'public.enlaces_de_ayuda_de_mi()', 'execute')
     or has_table_privilege('anon', 'public.enlaces_de_ayuda', 'select') then
    raise exception 'anon toca los enlaces de ayuda';
  end if;
end $$;
rollback;

-- @test empresa: los campos piden https, sus largos y el tope de 30, en la RPC y en los check
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000ed011';
  s constant uuid := '00000000-0000-4000-8000-0000000ed012';
  v text;
  r jsonb;
begin
  perform pg_temp.eda_terreno(g, s);
  perform pg_temp.eda_como(g);

  v := pg_temp.eda_falla($q$select public.enlace_de_ayuda_crear(gen_random_uuid(), 'Manual', 'http://ayuda.ejemplo.com')$q$);
  if v <> '22023/url' then raise exception 'http esperaba 22023/url, dio %', v; end if;
  v := pg_temp.eda_falla($q$select public.enlace_de_ayuda_crear(gen_random_uuid(), 'Manual', 'https://')$q$);
  if v <> '22023/url' then raise exception 'sin dominio esperaba 22023/url, dio %', v; end if;
  v := pg_temp.eda_falla($q$select public.enlace_de_ayuda_crear(gen_random_uuid(), 'Manual', 'https://ayuda ejemplo.com')$q$);
  if v <> '22023/url' then raise exception 'con espacio esperaba 22023/url, dio %', v; end if;
  v := pg_temp.eda_falla($q$select public.enlace_de_ayuda_crear(gen_random_uuid(), 'Manual', 'https://banco.com@otro.com')$q$);
  if v <> '22023/url' then raise exception 'con usuario antes del dominio esperaba 22023/url, dio %', v; end if;
  v := pg_temp.eda_falla($q$select public.enlace_de_ayuda_crear(gen_random_uuid(), '   ', 'https://ayuda.ejemplo.com')$q$);
  if v <> '22023/titulo' then raise exception 'sin título esperaba 22023/titulo, dio %', v; end if;
  v := pg_temp.eda_falla($q$select public.enlace_de_ayuda_crear(gen_random_uuid(), repeat('á', 81), 'https://ayuda.ejemplo.com')$q$);
  if v <> '22023/titulo' then raise exception '81 caracteres esperaba 22023/titulo, dio %', v; end if;
  v := pg_temp.eda_falla($q$select public.enlace_de_ayuda_crear(gen_random_uuid(), 'Manual', 'https://ayuda.ejemplo.com', repeat('a', 141))$q$);
  if v <> '22023/descripcion' then raise exception '141 caracteres esperaba 22023/descripcion, dio %', v; end if;

  -- 80 y 140 entran; la descripción vacía se guarda nula.
  r := public.enlace_de_ayuda_crear(gen_random_uuid(), repeat('á', 80), 'HTTPS://Ayuda.ejemplo.com/a?b=1#c', '   ');
  if jsonb_path_query_first(r, '$.lista.enlaces[0].descripcion') <> 'null'::jsonb then raise exception 'la descripción vacía no quedó nula'; end if;
  if (r -> 'lista' ->> 'tope')::integer <> 30 then raise exception 'la lista no dice el tope'; end if;

  -- El tope: 30 entran, el 31 no.
  for i in 2 .. 30 loop
    perform public.enlace_de_ayuda_crear(gen_random_uuid(), 'Enlace ' || i, 'https://ayuda.ejemplo.com/' || i);
  end loop;
  v := pg_temp.eda_falla($q$select public.enlace_de_ayuda_crear(gen_random_uuid(), 'Uno más', 'https://ayuda.ejemplo.com/31')$q$);
  if v <> '22023/tope' then raise exception 'el 31 esperaba 22023/tope, dio %', v; end if;

  -- Los check repiten las reglas aunque alguien salte la RPC.
  reset role;
  v := pg_temp.eda_falla($q$insert into public.enlaces_de_ayuda (id, titulo, url, orden) values (gen_random_uuid(), 'X', 'http://x.com', 99)$q$);
  if v not like '23514/%' then raise exception 'el check de https esperaba 23514, dio %', v; end if;
  v := pg_temp.eda_falla($q$insert into public.enlaces_de_ayuda (id, titulo, url, orden) values (gen_random_uuid(), repeat('a', 81), 'https://x.com', 99)$q$);
  if v not like '23514/%' then raise exception 'el check del título esperaba 23514, dio %', v; end if;
end $$;
rollback;

-- @test empresa: crear es idempotente; guardar pide la versión (PT409), activar, mover y quitar
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000ed021';
  s constant uuid := '00000000-0000-4000-8000-0000000ed022';
  e1 constant uuid := '00000000-0000-4000-8000-0000000ed121';
  e2 constant uuid := '00000000-0000-4000-8000-0000000ed122';
  e3 constant uuid := '00000000-0000-4000-8000-0000000ed123';
  r jsonb;
  v1 timestamptz;
  v text;
begin
  perform pg_temp.eda_terreno(g, s);
  perform pg_temp.eda_como(g);
  r := public.enlace_de_ayuda_crear(e1, 'Uno', 'https://uno.com');
  v1 := (r ->> 'actualizado_en')::timestamptz;
  r := public.enlace_de_ayuda_crear(e1, 'Otro título', 'https://otro.com');
  if (r ->> 'repetido')::boolean is not true or jsonb_array_length(r -> 'lista' -> 'enlaces') <> 1 then
    raise exception 'repetir el intento creó otro';
  end if;
  perform public.enlace_de_ayuda_crear(e2, 'Dos', 'https://dos.com');
  perform public.enlace_de_ayuda_crear(e3, 'Tres', 'https://tres.com');

  -- Versión vieja: PT409; sin versión, error.
  v := pg_temp.eda_falla(format('select public.enlace_de_ayuda_guardar(%L, %L, %L)', e1, v1 - interval '1 microsecond', '{"titulo": "X"}'));
  if v not like 'PT409/%' then raise exception 'con versión vieja esperaba PT409, dio %', v; end if;
  r := public.enlace_de_ayuda_guardar(e1, v1, '{"titulo": "Uno editado", "descripcion": "Corta"}');
  if (r ->> 'actualizado_en')::timestamptz <= v1 then raise exception 'guardar no movió la versión'; end if;
  if jsonb_path_query_first(r, '$.lista.enlaces ? (@.id == "00000000-0000-4000-8000-0000000ed121").titulo') <> '"Uno editado"'::jsonb then
    raise exception 'no quedó el título editado';
  end if;
  v := pg_temp.eda_falla(format('select public.enlace_de_ayuda_guardar(%L, %L, %L)', e1, (r ->> 'actualizado_en'), '{"url": "ftp://x.com"}'));
  if v <> '22023/url' then raise exception 'guardar ftp esperaba 22023/url, dio %', v; end if;

  -- Desactivar: sigue en la lista de la empresa y deja de salir en la lectura de cada persona.
  r := public.enlace_de_ayuda_guardar(e2, (select actualizado_en from public.enlaces_de_ayuda where id = e2), '{"activo": false}');
  if jsonb_path_query_first(r, '$.lista.enlaces ? (@.id == "00000000-0000-4000-8000-0000000ed122").activo') <> 'false'::jsonb then
    raise exception 'no quedó desactivado';
  end if;
  perform pg_temp.eda_como(s);
  if jsonb_path_exists(public.enlaces_de_ayuda_de_mi(), '$.empresa[*] ? (@.id == "00000000-0000-4000-8000-0000000ed122")') then
    raise exception 'uno desactivado sale en la lectura de una persona';
  end if;
  if jsonb_array_length(public.enlaces_de_ayuda_de_mi() -> 'empresa') <> 2 then raise exception 'la lectura de una persona no trae los dos activos'; end if;
  -- Quien no gestiona no mueve ni quita.
  v := pg_temp.eda_falla(format('select public.enlace_de_ayuda_mover(%L, %L, %L)', e3, (select actualizado_en from public.enlaces_de_ayuda where id = e3), 'subir'));
  if v not like '42501/%' then raise exception 'sin el permiso mover esperaba 42501, dio %', v; end if;

  -- Mover: «subir» el tercero lo cambia con el segundo; en el extremo, nada.
  perform pg_temp.eda_como(g);
  r := public.enlace_de_ayuda_mover(e3, (select actualizado_en from public.enlaces_de_ayuda where id = e3), 'subir');
  if jsonb_path_query_first(r, '$.lista.enlaces[1].id') <> to_jsonb(e3) then raise exception 'subir no lo puso segundo'; end if;
  r := public.enlace_de_ayuda_mover(e1, (select actualizado_en from public.enlaces_de_ayuda where id = e1), 'subir');
  if jsonb_path_query_first(r, '$.lista.enlaces[0].id') <> to_jsonb(e1) then raise exception 'subir el primero lo movió'; end if;
  r := public.enlace_de_ayuda_mover(e1, (select actualizado_en from public.enlaces_de_ayuda where id = e1), 'bajar');
  if jsonb_path_query_first(r, '$.lista.enlaces[1].id') <> to_jsonb(e1) then raise exception 'bajar no lo puso segundo'; end if;

  -- Quitar con versión vieja: PT409; con la buena se va, y otra vez no es error.
  v := pg_temp.eda_falla(format('select public.enlace_de_ayuda_quitar(%L, %L)', e3, v1 - interval '1 day'));
  if v not like 'PT409/%' then raise exception 'quitar con versión vieja esperaba PT409, dio %', v; end if;
  r := public.enlace_de_ayuda_quitar(e3, (select actualizado_en from public.enlaces_de_ayuda where id = e3));
  if jsonb_array_length(r -> 'lista' -> 'enlaces') <> 2 then raise exception 'quitar no lo quitó'; end if;
  r := public.enlace_de_ayuda_quitar(e3, v1);
  if jsonb_array_length(r -> 'lista' -> 'enlaces') <> 2 then raise exception 'quitar otra vez cambió algo'; end if;
  reset role;
end $$;
rollback;
