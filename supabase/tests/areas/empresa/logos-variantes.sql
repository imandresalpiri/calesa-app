-- Las variantes del logo (`logos_empresa`, escritas por `logo_variante_*`): permiso, lectura, nombre único sin importar mayúsculas, tildes ni espacios,
-- tope de 12, versión (PT409), orden, «Quitar» que limpia la ventana de cámara, el recuento de `storage_refcount('marca', …)` y la clave `logo` de
-- `live.ventana`. Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y revierte.

create or replace function pg_temp.lv_como(p_id uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

-- Una persona que gestiona la empresa (`g`) y otra sin el permiso (`s`).
create or replace function pg_temp.lv_terreno(g uuid, s uuid) returns void language plpgsql as $$
declare v_rol uuid;
begin
  reset role;
  insert into auth.users (id, email, raw_app_meta_data) values (g, g || '@ejemplo.com', '{"invitado": true}'), (s, s || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set invitacion_aceptada_en = now() where id in (g, s);
  delete from public.usuarios_roles where usuario_id in (g, s);
  insert into public.roles (clave, nombre) values ('lv_gestiona', 'LV gestiona') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (g, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'empresa.ajustes.gestionar', 'todos');
  insert into public.roles (clave, nombre) values ('lv_sin', 'LV sin') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (s, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'leads.ver', 'todos');
  delete from public.logos_empresa;
end;
$$;

create or replace function pg_temp.lv_falla(p_sql text) returns text language plpgsql as $$
declare v_estado text; v_hint text;
begin
  execute p_sql;
  return 'no cayó';
exception when others then
  get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
  return v_estado || '/' || coalesce(v_hint, '');
end;
$$;

-- Una ruta válida distinta por número.
create or replace function pg_temp.lv_ruta(n integer, ext text default 'png') returns text language sql as $$
  select 'logos/' || md5(n::text) || md5((n + 1000)::text) || '.' || ext
$$;

-- @test empresa: sólo escribe quien tiene empresa.ajustes.gestionar; lee toda persona activa
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000f0001';
  s constant uuid := '00000000-0000-4000-8000-0000000f0002';
  l1 constant uuid := '00000000-0000-4000-8000-0000000f0101';
  v text;
begin
  perform pg_temp.lv_terreno(g, s);

  perform pg_temp.lv_como(s);
  v := pg_temp.lv_falla(format('select public.logo_variante_crear(%L, %L, %L, %L, 100, 50)', l1, 'Ícono', pg_temp.lv_ruta(1), 'png'));
  if v not like '42501/%' then raise exception 'sin el permiso esperaba 42501, dio %', v; end if;
  v := pg_temp.lv_falla(format('insert into public.logos_empresa (id, nombre, ruta, tipo, ancho, alto, orden) values (%L, %L, %L, %L, 1, 1, 1)', l1, 'Ícono', pg_temp.lv_ruta(1), 'png'));
  if v not like '42501/%' then raise exception 'el insert directo esperaba 42501, dio %', v; end if;
  v := pg_temp.lv_falla(format('select public.logo_variante_usos(%L)', 'oscuro'));
  if v not like '42501/%' then raise exception 'los usos sin el permiso esperaban 42501, dio %', v; end if;

  perform pg_temp.lv_como(g);
  perform public.logo_variante_crear(l1, '  Ícono  ', pg_temp.lv_ruta(1), 'png', 120, 60);

  -- La lee quien no gestiona: la tabla y la lectura, con «Principal» y «Para fondo oscuro» primero.
  perform pg_temp.lv_como(s);
  if (select nombre from public.logos_empresa where id = l1) is distinct from 'Ícono' then raise exception 'no quedó el nombre recortado'; end if;
  if jsonb_array_length(public.logos_empresa_leer() -> 'variantes') <> 3 then raise exception 'la lectura no trae las tres'; end if;
  if public.logos_empresa_leer() #>> '{variantes,0,id}' <> 'principal' or public.logos_empresa_leer() #>> '{variantes,1,id}' <> 'oscuro' then
    raise exception 'la lectura no pone primero a Principal y a Para fondo oscuro';
  end if;
  if (public.logos_empresa_leer() ->> 'tope')::integer <> 12 then raise exception 'la lectura no dice el tope'; end if;

  -- Una cuenta bloqueada no lee.
  reset role;
  update public.perfiles set bloqueado = true where id = s;
  perform pg_temp.lv_como(s);
  if exists (select 1 from public.logos_empresa) then raise exception 'una cuenta bloqueada lee los logos'; end if;
  v := pg_temp.lv_falla('select public.logos_empresa_leer()');
  if v like 'no cayó%' then raise exception 'una cuenta bloqueada lee la lista'; end if;
end $$;
rollback;

-- @test empresa: el nombre es único sin importar mayúsculas, tildes ni espacios, y no puede ser el de las dos primeras
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000f0011';
  s constant uuid := '00000000-0000-4000-8000-0000000f0012';
  l1 constant uuid := '00000000-0000-4000-8000-0000000f0111';
  l2 constant uuid := '00000000-0000-4000-8000-0000000f0112';
  v text;
begin
  perform pg_temp.lv_terreno(g, s);
  perform pg_temp.lv_como(g);
  perform public.logo_variante_crear(l1, 'Monocromo', pg_temp.lv_ruta(1), 'png', 10, 10);

  v := pg_temp.lv_falla(format('select public.logo_variante_crear(%L, %L, %L, %L, 10, 10)', l2, ' MONOCRÓMO ', pg_temp.lv_ruta(2), 'png'));
  if v <> '22023/nombre' then raise exception 'un nombre repetido sin tildes ni mayúsculas esperaba 22023/nombre, dio %', v; end if;
  v := pg_temp.lv_falla(format('select public.logo_variante_crear(%L, %L, %L, %L, 10, 10)', l2, 'mono cromo', pg_temp.lv_ruta(2), 'png'));
  if v <> '22023/nombre' then raise exception 'un nombre repetido sin espacios esperaba 22023/nombre, dio %', v; end if;
  v := pg_temp.lv_falla(format('select public.logo_variante_crear(%L, %L, %L, %L, 10, 10)', l2, 'mono' || chr(160) || 'cromo', pg_temp.lv_ruta(2), 'png'));
  if v <> '22023/nombre' then raise exception 'un nombre repetido con espacio duro esperaba 22023/nombre, dio %', v; end if;
  v := pg_temp.lv_falla(format('select public.logo_variante_crear(%L, %L, %L, %L, 10, 10)', l2, 'principal', pg_temp.lv_ruta(2), 'png'));
  if v <> '22023/nombre' then raise exception '«principal» esperaba 22023/nombre, dio %', v; end if;
  v := pg_temp.lv_falla(format('select public.logo_variante_crear(%L, %L, %L, %L, 10, 10)', l2, 'Para fondo  oscuro', pg_temp.lv_ruta(2), 'png'));
  if v <> '22023/nombre' then raise exception '«Para fondo oscuro» esperaba 22023/nombre, dio %', v; end if;
  v := pg_temp.lv_falla(format('select public.logo_variante_crear(%L, %L, %L, %L, 10, 10)', l2, '   ', pg_temp.lv_ruta(2), 'png'));
  if v <> '22023/nombre' then raise exception 'un nombre vacío esperaba 22023/nombre, dio %', v; end if;
  v := pg_temp.lv_falla(format('select public.logo_variante_crear(%L, %L, %L, %L, 10, 10)', l2, repeat('a', 41), pg_temp.lv_ruta(2), 'png'));
  if v <> '22023/nombre' then raise exception '41 caracteres esperaba 22023/nombre, dio %', v; end if;
  perform public.logo_variante_crear(l2, repeat('a', 40), pg_temp.lv_ruta(2), 'png', 10, 10);

  -- Una ruta o un tipo que no son de un logo, o medidas que no son.
  v := pg_temp.lv_falla(format('select public.logo_variante_crear(gen_random_uuid(), %L, %L, %L, 10, 10)', 'Otro', 'logos/abc.png', 'png'));
  if v <> '22023/archivo' then raise exception 'una ruta inválida esperaba 22023/archivo, dio %', v; end if;
  v := pg_temp.lv_falla(format('select public.logo_variante_crear(gen_random_uuid(), %L, %L, %L, 10, 10)', 'Otro', pg_temp.lv_ruta(3), 'svg'));
  if v <> '22023/archivo' then raise exception 'un tipo que no es el de la ruta esperaba 22023/archivo, dio %', v; end if;
  v := pg_temp.lv_falla(format('select public.logo_variante_crear(gen_random_uuid(), %L, %L, %L, 0, 10)', 'Otro', pg_temp.lv_ruta(3), 'png'));
  if v <> '22023/archivo' then raise exception 'medidas en cero esperaban 22023/archivo, dio %', v; end if;

  -- Repetir el intento devuelve lo mismo, sin otra fila.
  perform public.logo_variante_crear(l1, 'Monocromo', pg_temp.lv_ruta(1), 'png', 10, 10);
  if (select count(*) from public.logos_empresa) <> 2 then raise exception 'repetir el intento sumó otra fila'; end if;
end $$;
rollback;

-- @test empresa: hasta 12 variantes
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000f0021';
  s constant uuid := '00000000-0000-4000-8000-0000000f0022';
  v text;
begin
  perform pg_temp.lv_terreno(g, s);
  perform pg_temp.lv_como(g);
  for i in 1..12 loop
    perform public.logo_variante_crear(gen_random_uuid(), 'Variante ' || i, pg_temp.lv_ruta(i), 'png', 10, 10);
  end loop;
  v := pg_temp.lv_falla(format('select public.logo_variante_crear(gen_random_uuid(), %L, %L, %L, 10, 10)', 'Una más', pg_temp.lv_ruta(13), 'png'));
  if v <> '22023/tope' then raise exception 'la 13 esperaba 22023/tope, dio %', v; end if;
  if jsonb_array_length(public.logos_empresa_leer() -> 'variantes') <> 14 then raise exception 'la lista no trae las 12 y las dos primeras'; end if;
end $$;
rollback;

-- @test empresa: renombrar y quitar piden la versión (PT409), ordenar pide la lista entera y quitar limpia la ventana de cámara
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000f0031';
  s constant uuid := '00000000-0000-4000-8000-0000000f0032';
  a constant uuid := '00000000-0000-4000-8000-0000000f0131';
  b constant uuid := '00000000-0000-4000-8000-0000000f0132';
  c constant uuid := '00000000-0000-4000-8000-0000000f0133';
  r jsonb; v text; v_ver timestamptz; v_viejo timestamptz;
begin
  perform pg_temp.lv_terreno(g, s);
  perform pg_temp.lv_como(g);
  r := public.logo_variante_crear(a, 'Uno', pg_temp.lv_ruta(1), 'png', 10, 10);
  perform public.logo_variante_crear(b, 'Dos', pg_temp.lv_ruta(2, 'svg'), 'svg', 10, 10);
  perform public.logo_variante_crear(c, 'Tres', pg_temp.lv_ruta(3, 'webp'), 'webp', 10, 10);
  v_viejo := (r ->> 'actualizado_en')::timestamptz;

  -- Renombrar sube la versión; con la vieja, PT409.
  r := public.logo_variante_renombrar(a, v_viejo, 'Uno bis');
  v_ver := (r ->> 'actualizado_en')::timestamptz;
  if v_ver <= v_viejo then raise exception 'renombrar no subió la versión'; end if;
  v := pg_temp.lv_falla(format('select public.logo_variante_renombrar(%L, %L, %L)', a, v_viejo, 'Otra vez'));
  if v not like 'PT409/%' then raise exception 'renombrar con la versión vieja esperaba PT409, dio %', v; end if;
  v := pg_temp.lv_falla(format('select public.logo_variante_renombrar(%L, %L, %L)', a, v_ver, ' dos '));
  if v <> '22023/nombre' then raise exception 'renombrar con un nombre repetido esperaba 22023/nombre, dio %', v; end if;
  -- Dejarlo como estaba no es un error ni mueve la versión.
  r := public.logo_variante_renombrar(a, v_ver, 'Uno bis');
  if (r ->> 'actualizado_en')::timestamptz <> v_ver then raise exception 'renombrar sin cambios movió la versión'; end if;
  v := pg_temp.lv_falla(format('select public.logo_variante_renombrar(gen_random_uuid(), %L, %L)', v_ver, 'Fantasma'));
  if v not like 'PT409/%' then raise exception 'renombrar una que no está esperaba PT409, dio %', v; end if;

  -- Ordenar: la lista entera, en el orden nuevo; una lista que no es la de ahora, PT409.
  r := public.logo_variantes_ordenar(array[c, a, b]);
  if r #>> '{lista,variantes,2,id}' <> c::text or r #>> '{lista,variantes,4,id}' <> b::text then raise exception 'el orden nuevo no quedó: %', r; end if;
  v := pg_temp.lv_falla(format('select public.logo_variantes_ordenar(array[%L, %L]::uuid[])', c, a));
  if v not like 'PT409/%' then raise exception 'ordenar con una lista incompleta esperaba PT409, dio %', v; end if;
  v := pg_temp.lv_falla(format('select public.logo_variantes_ordenar(array[%L, %L, %L, %L]::uuid[])', c, a, b, gen_random_uuid()));
  if v not like 'PT409/%' then raise exception 'ordenar con una lista de más esperaba PT409, dio %', v; end if;
  v := pg_temp.lv_falla('select public.logo_variantes_ordenar((select array_agg(gen_random_uuid()) from generate_series(1, 13)))');
  if v not like 'PT409/%' then raise exception 'ordenar con más ids que el tope esperaba PT409, dio %', v; end if;
  v := pg_temp.lv_falla(format('select public.logo_variantes_ordenar(array[%L, %L, %L, %L]::uuid[])', c, a, b, b));
  if v not like 'PT409/%' then raise exception 'ordenar con un id repetido esperaba PT409, dio %', v; end if;

  -- Dos personas eligieron la `a` en su ventana de cámara; una tercera, la `b`.
  reset role;
  insert into public.preferencias_usuario (usuario_id, clave, valor) values
    (g, 'live.ventana', jsonb_build_object('logo', a)),
    (s, 'live.ventana', jsonb_build_object('logo', b, 'espejo', false));
  perform pg_temp.lv_como(g);
  if (public.logo_variante_usos(a::text) ->> 'ventanas_de_camara')::integer <> 1 then raise exception 'los usos de la a no son 1'; end if;
  if (public.logo_variante_usos('oscuro') ->> 'ventanas_de_camara')::integer <> 0 then raise exception 'los usos de oscuro no son 0'; end if;

  -- Quitar con la versión vieja, PT409; con la de ahora, se va, devuelve su ruta y limpia sólo la ventana que la elegía.
  v := pg_temp.lv_falla(format('select public.logo_variante_quitar(%L, %L)', a, v_viejo));
  if v not like 'PT409/%' then raise exception 'quitar con la versión vieja esperaba PT409, dio %', v; end if;
  r := public.logo_variante_quitar(a, v_ver);
  if r ->> 'ruta' <> pg_temp.lv_ruta(1) then raise exception 'quitar no devolvió la ruta'; end if;
  if exists (select 1 from public.logos_empresa where id = a) then raise exception 'la quitada sigue en la tabla'; end if;
  reset role;
  if (select valor from public.preferencias_usuario where usuario_id = g and clave = 'live.ventana') ? 'logo' then
    raise exception 'la ventana de quien había elegido la quitada conserva su logo';
  end if;
  if (select valor ->> 'logo' from public.preferencias_usuario where usuario_id = s and clave = 'live.ventana') <> b::text then
    raise exception 'quitar tocó la ventana de quien eligió otra';
  end if;
  -- Quitar una que ya no está no es un error.
  perform pg_temp.lv_como(g);
  r := public.logo_variante_quitar(a, v_ver);
  if r ->> 'ruta' is not null then raise exception 'quitar una que no está devolvió una ruta'; end if;
end $$;
rollback;

-- @test empresa: storage_refcount del bucket marca cuenta las variantes
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000f0041';
  s constant uuid := '00000000-0000-4000-8000-0000000f0042';
  a constant uuid := '00000000-0000-4000-8000-0000000f0141';
begin
  perform pg_temp.lv_terreno(g, s);
  perform pg_temp.lv_como(g);
  perform public.logo_variante_crear(a, 'Uno', pg_temp.lv_ruta(1), 'png', 10, 10);
  reset role;
  if public.storage_refcount('marca', pg_temp.lv_ruta(1)) <> 1 then raise exception 'el refcount no cuenta la variante'; end if;
  if public.storage_refcount('vehiculos', pg_temp.lv_ruta(1)) <> 0 then raise exception 'el refcount cuenta la variante en otro bucket'; end if;
  -- Si «Principal» usa el mismo archivo (mismo hash), son dos referencias: borrar una no borra el objeto.
  update public.ajustes_empresa set logo_ruta = pg_temp.lv_ruta(1) where id = 1;
  if public.storage_refcount('marca', pg_temp.lv_ruta(1)) <> 2 then raise exception 'el refcount no suma Principal y la variante'; end if;
  delete from public.logos_empresa where id = a;
  if public.storage_refcount('marca', pg_temp.lv_ruta(1)) <> 1 then raise exception 'el refcount no baja al quitar la variante'; end if;
end $$;
rollback;

-- @test empresa: «Principal» y «Para fondo oscuro» de la lista salen de las columnas de ajustes
begin;
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-0000000f0051';
  s constant uuid := '00000000-0000-4000-8000-0000000f0052';
  r jsonb;
begin
  perform pg_temp.lv_terreno(g, s);
  reset role;
  update public.ajustes_empresa set logo_ruta = pg_temp.lv_ruta(7, 'svg'), logo_oscuro_ruta = null where id = 1;
  perform pg_temp.lv_como(s);
  r := public.logos_empresa_leer();
  if r #>> '{variantes,0,ruta}' <> pg_temp.lv_ruta(7, 'svg') or r #>> '{variantes,0,tipo}' <> 'svg' then raise exception 'Principal no sale de logo_ruta: %', r; end if;
  if r #> '{variantes,1,ruta}' <> 'null'::jsonb then raise exception 'Para fondo oscuro sin logo no viene sin archivo: %', r; end if;
end $$;
rollback;

-- @test equipo: la ventana de cámara elige su logo (`logo`: oscuro, el id de una variante o null)
begin;
do $$
declare p uuid := gen_random_uuid(); v text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
  insert into public.preferencias_usuario (usuario_id, clave, valor) values (p, 'live.ventana', '{"logo": null}');
  update public.preferencias_usuario set valor = '{"logo": "oscuro"}' where usuario_id = p and clave = 'live.ventana';
  update public.preferencias_usuario set valor = jsonb_build_object('logo', gen_random_uuid()) where usuario_id = p and clave = 'live.ventana';
  v := pg_temp.lv_falla(format('update public.preferencias_usuario set valor = %L where usuario_id = %L and clave = ''live.ventana''', '{"logo": "otro"}', p));
  if v not like '23514/%' then raise exception 'un logo que no es oscuro ni un id esperaba 23514, dio %', v; end if;
  v := pg_temp.lv_falla(format('update public.preferencias_usuario set valor = %L where usuario_id = %L and clave = ''live.ventana''', '{"logo": 3}', p));
  if v not like '23514/%' then raise exception 'un logo que no es texto esperaba 23514, dio %', v; end if;
end $$;
rollback;
