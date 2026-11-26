-- El asistente de IA (`integraciones.asistente_ia`, `asistente_ia_usos`): la clave sólo en Vault y sus últimos 4 por RPC, lo que acepta
-- `integracion_guardar` (con su `hint`), el origen nuevo que borra la clave, el contador por persona y mes y su RLS.
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y revierte.

create or replace function pg_temp.aia_como(p_id uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

-- Una persona que gestiona la empresa (`g`) y otra sin el permiso (`s`). El asistente, como lo deja la migración.
create or replace function pg_temp.aia_terreno(g uuid, s uuid) returns void language plpgsql as $$
declare v_rol uuid;
begin
  reset role;
  insert into auth.users (id, email, raw_app_meta_data) values (g, g || '@ejemplo.com', '{"invitado": true}'), (s, s || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set invitacion_aceptada_en = now(), nombre = 'Persona ' || right(id::text, 3) where id in (g, s);
  delete from public.usuarios_roles where usuario_id in (g, s);
  insert into public.roles (clave, nombre) values ('aia_gestiona', 'AIA gestiona') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (g, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'empresa.ajustes.gestionar', 'todos');
  insert into public.roles (clave, nombre) values ('aia_sin', 'AIA sin') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (s, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'leads.ver', 'todos');
  delete from vault.secrets where name = 'integracion:asistente_ia';
  update public.integraciones set activa = false, secreto_guardado_en = null,
    config = jsonb_set(config, '{clave_termina_en}', 'null'::jsonb)
  where clave = 'asistente_ia';
  delete from public.asistente_ia_usos;
end;
$$;

-- El código y el `hint` de una llamada que debe caer.
create or replace function pg_temp.aia_falla(p_sql text) returns text language plpgsql as $$
declare v_estado text; v_hint text;
begin
  execute p_sql;
  return 'no cayó';
exception when others then
  get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
  return v_estado || '/' || coalesce(v_hint, '');
end;
$$;

create or replace function pg_temp.aia_version() returns timestamptz language sql as $$
  select actualizado_en from public.integraciones where clave = 'asistente_ia'
$$;

-- `n` atajos válidos, con ids y nombres distintos.
create or replace function pg_temp.aia_atajos(n integer) returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', '00000000-0000-4000-8000-' || lpad(i::text, 12, '0'),
    'nombre', 'Atajo ' || i,
    'instruccion', 'Haz algo ' || i,
    'activo', true,
    'max_tokens', 300
  ) order by i), '[]'::jsonb)
  from generate_series(1, n) i
$$;

-- Guardar las indicaciones del asistente con la versión de ahora: el código y el `hint` si cae.
create or replace function pg_temp.aia_indicaciones(p_prompt text, p_atajos jsonb) returns text language plpgsql as $$
begin
  return pg_temp.aia_falla(format(
    'select public.integracion_guardar(%L, %L::timestamptz, p_config => %L::jsonb)',
    'asistente_ia', pg_temp.aia_version(), jsonb_build_object('prompt_base', p_prompt, 'atajos', p_atajos)
  ));
end;
$$;

-- @test empresa: la fila del asistente nace apagada, con DeepSeek, el prompt base y los 5 atajos de ATAJOS_POR_DEFECTO
begin;
do $$
declare c jsonb := (select config from public.integraciones where clave = 'asistente_ia');
begin
  if c is null then raise exception 'no está la fila asistente_ia'; end if;
  if (select activa from public.integraciones where clave = 'asistente_ia') then raise exception 'el asistente nace prendido'; end if;
  if c ->> 'preajuste' <> 'deepseek' or c ->> 'url_base' <> 'https://api.deepseek.com' or c ->> 'modelo' <> 'deepseek-chat' then
    raise exception 'el preajuste no es el de DeepSeek: %', c;
  end if;
  if jsonb_path_query_first(c, '$.clave_termina_en') <> 'null'::jsonb then raise exception 'nace con los últimos 4 de una clave'; end if;
  -- Los mismos ids y nombres que `ATAJOS_POR_DEFECTO` (src/modules/empresa/entities/asistente-ia/config.ts).
  if (select string_agg(a ->> 'id' || '=' || (a ->> 'nombre') || '=' || (a ->> 'max_tokens'), ',' order by o)
      from jsonb_array_elements(c -> 'atajos') with ordinality e(a, o))
     <> 'a5157e00-0000-4000-8000-000000000001=Para WhatsApp=260,a5157e00-0000-4000-8000-000000000002=Para Facebook=650,'
        || 'a5157e00-0000-4000-8000-000000000003=Para TikTok=220,a5157e00-0000-4000-8000-000000000004=Más corto=300,'
        || 'a5157e00-0000-4000-8000-000000000005=Más formal=700' then
    raise exception 'los atajos de fábrica no son los de TS: %', c -> 'atajos';
  end if;
  if c::text ~* 'bolivia|http://|maps\.app' then raise exception 'lo de fábrica nombra datos de V1: %', c; end if;
end $$;
rollback;

-- @test empresa: la clave del asistente va a Vault, nadie de la app la lee y la fila guarda sólo sus últimos 4
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000a1001';
  s constant uuid := '00000000-0000-4000-8000-0000000a1002';
  v text;
  c jsonb;
begin
  perform pg_temp.aia_terreno(g, s);
  if has_function_privilege('authenticated', 'public.integracion_secreto(text)', 'execute')
     or has_function_privilege('anon', 'public.integracion_secreto(text)', 'execute') then
    raise exception 'authenticated o anon pueden ejecutar integracion_secreto';
  end if;

  perform pg_temp.aia_como(s);
  v := pg_temp.aia_falla(format('select public.integracion_guardar_secreto(%L, %L, %L::timestamptz)', 'asistente_ia', 'sk-prueba-abcd', pg_temp.aia_version()));
  if v not like '42501/%' then raise exception 'sin el permiso esperaba 42501, dio %', v; end if;

  perform pg_temp.aia_como(g);
  v := pg_temp.aia_falla(format('select public.integracion_guardar_secreto(%L, %L, %L::timestamptz)', 'asistente_ia', 'sk-prueba-abcd', pg_temp.aia_version() - interval '1 microsecond'));
  if v not like 'PT409/%' then raise exception 'con una versión vieja esperaba PT409, dio %', v; end if;

  perform public.integracion_guardar_secreto('asistente_ia', '  sk-prueba-secreta-wxyz  ', pg_temp.aia_version());
  c := (select config from public.integraciones where clave = 'asistente_ia');
  if jsonb_path_query_first(c, '$.clave_termina_en') <> '"wxyz"'::jsonb then raise exception 'no guardó los últimos 4: %', c; end if;
  if (select secreto_guardado_en from public.integraciones where clave = 'asistente_ia') is null then raise exception 'no dice que hay clave'; end if;
  if c::text like '%sk-prueba-secreta%' then raise exception 'la clave entera quedó en la configuración'; end if;
  v := pg_temp.aia_falla($q$select public.integracion_secreto('asistente_ia')$q$);
  if v not like '42501/%' then raise exception 'quien gestiona leyó la clave: %', v; end if;

  -- La web pública no recibe `clave_termina_en`.
  perform public.integracion_guardar_secreto('web_publica', 'secreto-de-la-web-1234', (select actualizado_en from public.integraciones where clave = 'web_publica'));
  if (select config ? 'clave_termina_en' from public.integraciones where clave = 'web_publica') then
    raise exception 'la web pública recibió clave_termina_en';
  end if;

  reset role;
  if (select decrypted_secret from vault.decrypted_secrets where name = 'integracion:asistente_ia') is distinct from 'sk-prueba-secreta-wxyz' then
    raise exception 'Vault no guardó la clave entera';
  end if;
  set local role service_role;
  if public.integracion_secreto('asistente_ia') is distinct from 'sk-prueba-secreta-wxyz' then raise exception 'service_role no lee la clave'; end if;
  reset role;
end $$;
rollback;

-- @test empresa: integracion_guardar del asistente rechaza con su hint lo que no cumple y no deja fijar los últimos 4
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000a1011';
  s constant uuid := '00000000-0000-4000-8000-0000000a1012';
  v text;
  c jsonb;
  dos jsonb;
begin
  perform pg_temp.aia_terreno(g, s);
  perform pg_temp.aia_como(g);

  v := pg_temp.aia_falla(format($q$select public.integracion_guardar('asistente_ia', %L::timestamptz, p_config => '{"preajuste": "otro", "url_base": "http://ejemplo.com", "modelo": "m"}')$q$, pg_temp.aia_version()));
  if v <> '22023/url_base' then raise exception 'http:// esperaba 22023/url_base, dio %', v; end if;
  v := pg_temp.aia_falla(format($q$select public.integracion_guardar('asistente_ia', %L::timestamptz, p_config => '{"preajuste": "otro", "url_base": "https://ia.ejemplo.com"}')$q$, pg_temp.aia_version()));
  if v <> '22023/url_base' then raise exception 'el proveedor a medias esperaba 22023/url_base, dio %', v; end if;
  v := pg_temp.aia_falla(format($q$select public.integracion_guardar('asistente_ia', %L::timestamptz, p_config => '{"preajuste": "otro", "url_base": "https://ia.ejemplo.com", "modelo": "con espacio"}')$q$, pg_temp.aia_version()));
  if v <> '22023/modelo' then raise exception 'el modelo con espacio esperaba 22023/modelo, dio %', v; end if;
  v := pg_temp.aia_falla(format($q$select public.integracion_guardar('asistente_ia', %L::timestamptz, p_config => '{"preajuste": "x", "url_base": "https://ia.ejemplo.com", "modelo": "m"}')$q$, pg_temp.aia_version()));
  if v <> '22023/preajuste' then raise exception 'un preajuste raro esperaba 22023/preajuste, dio %', v; end if;

  v := pg_temp.aia_indicaciones('Base', pg_temp.aia_atajos(21));
  if v <> '22023/atajos' then raise exception '21 atajos esperaba 22023/atajos, dio %', v; end if;
  v := pg_temp.aia_indicaciones('Base', jsonb_set(pg_temp.aia_atajos(1), '{0,nombre}', to_jsonb(repeat('n', 41))));
  if v <> '22023/atajos' then raise exception 'un nombre de 41 esperaba 22023/atajos, dio %', v; end if;
  v := pg_temp.aia_indicaciones('Base', jsonb_set(pg_temp.aia_atajos(1), '{0,instruccion}', to_jsonb(repeat('i', 501))));
  if v <> '22023/atajos' then raise exception 'una instrucción de 501 esperaba 22023/atajos, dio %', v; end if;
  v := pg_temp.aia_indicaciones(repeat('p', 4001), pg_temp.aia_atajos(1));
  if v <> '22023/prompt_base' then raise exception 'un prompt base de 4.001 esperaba 22023/prompt_base, dio %', v; end if;
  dos := jsonb_set(pg_temp.aia_atajos(2), '{1,nombre}', '"ATAJO 1"');
  v := pg_temp.aia_indicaciones('Base', dos);
  if v <> '22023/atajos' then raise exception 'nombres repetidos esperaba 22023/atajos, dio %', v; end if;
  v := pg_temp.aia_indicaciones('Base', jsonb_set(pg_temp.aia_atajos(1), '{0,max_tokens}', '5000'));
  if v <> '22023/atajos' then raise exception 'un max_tokens fuera de rango esperaba 22023/atajos, dio %', v; end if;
  v := pg_temp.aia_falla(format('select public.integracion_guardar(%L, %L::timestamptz, p_activa => true)', 'asistente_ia', pg_temp.aia_version()));
  if v <> '22023/activa' then raise exception 'activar sin clave esperaba 22023/activa, dio %', v; end if;

  -- 20 atajos y 4.000 caracteres entran; el `clave_termina_en` mandado se ignora y lo desconocido no se acepta.
  v := pg_temp.aia_indicaciones(repeat('p', 4000), pg_temp.aia_atajos(20));
  if v <> 'no cayó' then raise exception 'el tope justo cayó: %', v; end if;
  perform public.integracion_guardar('asistente_ia', pg_temp.aia_version(),
    p_config => '{"preajuste": "otro", "url_base": "http://127.0.0.1:9999", "modelo": "modelo-falso", "clave_termina_en": "hack"}');
  c := (select config from public.integraciones where clave = 'asistente_ia');
  if c ->> 'url_base' <> 'http://127.0.0.1:9999' or c ->> 'modelo' <> 'modelo-falso' then raise exception 'no guardó el loopback: %', c; end if;
  if jsonb_path_query_first(c, '$.clave_termina_en') <> 'null'::jsonb then raise exception 'el navegador fijó los últimos 4: %', c; end if;
  if jsonb_array_length(c -> 'atajos') <> 20 then raise exception 'guardar el proveedor tocó los atajos'; end if;
  v := pg_temp.aia_falla(format($q$select public.integracion_guardar('asistente_ia', %L::timestamptz, p_config => '{"otra": 1}')$q$, pg_temp.aia_version()));
  if v not like '22023/%' then raise exception 'una clave desconocida esperaba 22023, dio %', v; end if;
end $$;
rollback;

-- @test empresa: cambiar sólo el modelo conserva la clave; cambiar el host la borra de Vault y apaga el asistente
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000a1021';
  s constant uuid := '00000000-0000-4000-8000-0000000a1022';
  i public.integraciones;
begin
  perform pg_temp.aia_terreno(g, s);
  perform pg_temp.aia_como(g);
  perform public.integracion_guardar_secreto('asistente_ia', 'sk-clave-del-host-1234', pg_temp.aia_version());
  perform public.integracion_guardar('asistente_ia', pg_temp.aia_version(), p_activa => true);

  perform public.integracion_guardar('asistente_ia', pg_temp.aia_version(),
    p_config => '{"preajuste": "otro", "url_base": "https://API.deepseek.com/v1", "modelo": "deepseek-reasoner"}');
  select * into i from public.integraciones where clave = 'asistente_ia';
  if i.secreto_guardado_en is null or not i.activa or i.config ->> 'clave_termina_en' is distinct from '1234' then
    raise exception 'cambiar el modelo y la ruta borró la clave: %', i;
  end if;

  perform public.integracion_guardar('asistente_ia', pg_temp.aia_version(),
    p_config => '{"preajuste": "otro", "url_base": "https://otro-servidor.ejemplo.com", "modelo": "deepseek-chat"}');
  select * into i from public.integraciones where clave = 'asistente_ia';
  if i.secreto_guardado_en is not null or i.activa or jsonb_path_query_first(i.config, '$.clave_termina_en') <> 'null'::jsonb then
    raise exception 'cambiar el host no borró la clave: %', i;
  end if;
  reset role;
  if exists (select 1 from vault.secrets where name = 'integracion:asistente_ia') then raise exception 'la clave sigue en Vault'; end if;
end $$;
rollback;

-- @test empresa: apibara y la web pública siguen rechazando lo mismo tras recrear integracion_guardar
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000a1031';
  s constant uuid := '00000000-0000-4000-8000-0000000a1032';
  v text;
begin
  perform pg_temp.aia_terreno(g, s);
  perform pg_temp.aia_como(g);
  v := pg_temp.aia_falla(format($q$select public.integracion_guardar('apibara', %L::timestamptz, p_config => '{"endpoint": "https://atacante.example", "plataformas": ["copart"]}')$q$,
    (select actualizado_en from public.integraciones where clave = 'apibara')));
  if v not like 'P0001/%' then raise exception 'apibara fuera de su dominio esperaba P0001, dio %', v; end if;
  v := pg_temp.aia_falla(format($q$select public.integracion_guardar('web_publica', %L::timestamptz, p_config => '{"revalidar_url": "http://ejemplo.com"}')$q$,
    (select actualizado_en from public.integraciones where clave = 'web_publica')));
  if v <> '22023/revalidar_url' then raise exception 'la web por http esperaba 22023/revalidar_url, dio %', v; end if;
end $$;
rollback;

-- @test empresa: el contador suma por persona y mes de la zona de la empresa, sólo por RPC; cada persona ve lo suyo y quien gestiona, todo
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000a1041';
  s constant uuid := '00000000-0000-4000-8000-0000000a1042';
  v text;
  r jsonb;
begin
  perform pg_temp.aia_terreno(g, s);
  update public.ajustes_empresa set zona_horaria = 'Pacific/Kiritimati' where id = 1;

  perform pg_temp.aia_como(s);
  if public.asistente_ia_contar_uso() <> 1 or public.asistente_ia_contar_uso() <> 2 then raise exception 'dos usos no dieron 2'; end if;
  if (select mes from public.asistente_ia_usos where usuario_id = s) <> date_trunc('month', now() at time zone 'Pacific/Kiritimati')::date then
    raise exception 'el mes no es el de la zona de la empresa';
  end if;
  v := pg_temp.aia_falla(format('insert into public.asistente_ia_usos (usuario_id, mes, usos) values (%L, current_date, 5)', s));
  if v not like '42501/%' then raise exception 'el insert directo esperaba 42501, dio %', v; end if;
  v := pg_temp.aia_falla('update public.asistente_ia_usos set usos = 99');
  if v not like '42501/%' then raise exception 'el update directo esperaba 42501, dio %', v; end if;

  perform pg_temp.aia_como(g);
  perform public.asistente_ia_contar_uso();

  -- Quien no gestiona ve sólo su fila; quien gestiona, las dos.
  perform pg_temp.aia_como(s);
  if (select count(*) from public.asistente_ia_usos) <> 1 then raise exception 'quien no gestiona ve usos ajenos'; end if;
  r := public.asistente_ia_usos_del_mes();
  if jsonb_array_length(r -> 'personas') <> 1 or (r ->> 'cuantas')::integer <> 1 then raise exception 'el resumen de quien no gestiona: %', r; end if;
  perform pg_temp.aia_como(g);
  r := public.asistente_ia_usos_del_mes();
  if jsonb_path_query_first(r, '$.personas[0].usuario_id') <> to_jsonb(s::text)
     or jsonb_path_query_first(r, '$.personas[0].usos') <> '2'::jsonb
     or (r ->> 'cuantas')::integer <> 2 then
    raise exception 'el resumen de quien gestiona: %', r;
  end if;

  -- Una cuenta bloqueada no suma.
  reset role;
  update public.perfiles set bloqueado = true where id = s;
  perform pg_temp.aia_como(s);
  v := pg_temp.aia_falla('select public.asistente_ia_contar_uso()');
  if v not like '42501/%' then raise exception 'una cuenta bloqueada sumó: %', v; end if;
  reset role;

  if has_function_privilege('anon', 'public.asistente_ia_contar_uso()', 'execute')
     or has_function_privilege('anon', 'public.asistente_ia_usos_del_mes()', 'execute')
     or has_table_privilege('anon', 'public.asistente_ia_usos', 'select') then
    raise exception 'anon toca los usos del asistente';
  end if;
end $$;
rollback;

-- @test empresa: los usos del mes cortan en 6 personas y cuentan con tope 101
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000a1051';
  s constant uuid := '00000000-0000-4000-8000-0000000a1052';
  v_mes date;
  r jsonb;
begin
  perform pg_temp.aia_terreno(g, s);
  insert into auth.users (id, email, raw_app_meta_data)
  select ('00000000-0000-4000-8000-0000000b' || lpad(i::text, 4, '0'))::uuid, 'aia' || i || '@ejemplo.com', '{"invitado": true}'
  from generate_series(1, 110) i;
  v_mes := (select date_trunc('month', now() at time zone a.zona_horaria)::date from public.ajustes_empresa a where a.id = 1);
  insert into public.asistente_ia_usos (usuario_id, mes, usos)
  select ('00000000-0000-4000-8000-0000000b' || lpad(i::text, 4, '0'))::uuid, v_mes, i from generate_series(1, 110) i;
  -- Un mes anterior no cuenta.
  insert into public.asistente_ia_usos (usuario_id, mes, usos) values (g, (v_mes - interval '1 month')::date, 500);

  perform pg_temp.aia_como(g);
  r := public.asistente_ia_usos_del_mes();
  if jsonb_array_length(r -> 'personas') <> 6 then raise exception 'no cortó en 6: %', r; end if;
  if jsonb_path_query_first(r, '$.personas[0].usos') <> '110'::jsonb or jsonb_path_query_first(r, '$.personas[5].usos') <> '105'::jsonb then
    raise exception 'el orden no es de más a menos usos: %', r -> 'personas';
  end if;
  if (r ->> 'cuantas')::integer <> 101 then raise exception 'el conteo no tiene tope 101: %', r ->> 'cuantas'; end if;
  if r ->> 'mes' <> v_mes::text then raise exception 'el mes del resumen: %', r ->> 'mes'; end if;
end $$;
rollback;
