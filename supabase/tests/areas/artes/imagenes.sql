-- La biblioteca de imágenes de las artes (`artes_imagenes`, escrita por `artes_imagen_*`): quién lee cada una (la de la empresa, quien ve Artes; la
-- personal, su dueño), crear con su permiso y su archivo, quitar que no borra una en uso y encola sus objetos, el conteo de usos con tope y renombrar
-- con su versión. Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y revierte.

create or replace function pg_temp.arti_como(p_id uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

-- Un id de este archivo: `e` personas, `c` plantillas, `d` imágenes.
create or replace function pg_temp.arti_id(p_letra text, n integer) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-8000-000000a72' || p_letra || lpad(n::text, 2, '0'))::uuid
$$;

create or replace function pg_temp.arti_u(n integer) returns uuid language sql immutable as $$ select pg_temp.arti_id('e', n) $$;

-- Las personas: 1 gestiona las artes de la empresa y ve cotizaciones de todo origen; 2 y 3 ven cotizaciones del origen 1; 4, del origen 2;
-- 5 no ve cotizaciones.
create or replace function pg_temp.arti_terreno() returns void language plpgsql as $$
declare v_rol uuid; v_o1 uuid; v_o2 uuid;
begin
  reset role;
  insert into auth.users (id, email, raw_app_meta_data)
  select pg_temp.arti_u(n), 'ai' || n || '@ejemplo.com', '{"invitado": true}' from generate_series(1, 5) n;
  update public.perfiles set invitacion_aceptada_en = now() where id in (select pg_temp.arti_u(n) from generate_series(1, 5) n);
  delete from public.usuarios_roles where usuario_id in (select pg_temp.arti_u(n) from generate_series(1, 5) n);
  insert into public.origenes (clave, nombre) values ('ai_o1', 'AI uno') returning id into v_o1;
  insert into public.origenes (clave, nombre) values ('ai_o2', 'AI dos') returning id into v_o2;
  insert into public.roles (clave, nombre) values ('ai_gestiona', 'AI gestiona') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.arti_u(1), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values
    (v_rol, 'cotizaciones.ver', 'todos'), (v_rol, 'artes.empresa.gestionar', 'todos');
  insert into public.roles (clave, nombre) values ('ai_uno', 'AI origen uno') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.arti_u(2), v_rol, true), (pg_temp.arti_u(3), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.ver', v_o1, 'todos');
  insert into public.roles (clave, nombre) values ('ai_dos', 'AI origen dos') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.arti_u(4), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.ver', v_o2, 'todos');
  insert into public.roles (clave, nombre) values ('ai_sin', 'AI sin cotizaciones') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.arti_u(5), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'leads.ver', 'todos');
end;
$$;

create or replace function pg_temp.arti_o(n integer) returns uuid language sql stable as $$
  select id from public.origenes where clave = 'ai_o' || n
$$;

create or replace function pg_temp.arti_falla(p_sql text) returns text language plpgsql as $$
declare v_estado text; v_hint text;
begin
  execute p_sql;
  return 'no cayó';
exception when others then
  get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
  return v_estado || '/' || coalesce(v_hint, '');
end;
$$;

create or replace function pg_temp.arti_ruta(p_carpeta text, n integer, p_ext text default 'png') returns text language sql immutable as $$
  select p_carpeta || '/' || md5(n::text) || md5((n + 1000)::text) || '.' || p_ext
$$;

create or replace function pg_temp.arti_doc(variadic p_ids uuid[]) returns jsonb language sql immutable as $$
  select jsonb_build_object('version', 1, 'paginas', jsonb_build_array(jsonb_build_object('capas',
    coalesce((select jsonb_agg(jsonb_build_object('tipo', 'imagen', 'imagenId', x) order by o)
                from unnest(p_ids) with ordinality u(x, o)), '[]'::jsonb))))
$$;

create or replace function pg_temp.arti_doc() returns jsonb language sql immutable as $$ select pg_temp.arti_doc(variadic '{}'::uuid[]) $$;

create or replace function pg_temp.arti_v(r jsonb) returns timestamptz language sql immutable as $$ select (r ->> 'actualizado_en')::timestamptz $$;

create or replace function pg_temp.arti_claves(r jsonb) returns text[] language sql immutable as $$
  select array_agg(k order by k collate "C") from jsonb_object_keys(r) k
$$;

-- Una imagen de la biblioteca de quien llama (png, con su miniatura); devuelve su versión.
create or replace function pg_temp.arti_imagen(p_id uuid, n integer, p_ambito text) returns timestamptz language sql as $$
  select pg_temp.arti_v(public.artes_imagen_crear(p_id, 'Imagen ' || n, pg_temp.arti_ruta('imagenes', n), pg_temp.arti_ruta('miniaturas', n), 'png', 800, 600, p_ambito))
$$;

-- Las que ve quien llama entre unas imágenes, por el final de su id.
create or replace function pg_temp.arti_vistas(p_ids uuid[]) returns text language sql stable as $$
  select coalesce(string_agg(right(id::text, 3), ',' order by right(id::text, 3) collate "C"), '') from public.artes_imagenes where id = any (p_ids)
$$;

create or replace function pg_temp.arti_en_cola(p_ruta text) returns boolean language sql stable as $$
  select exists (select 1 from public.cola_gc_storage where bucket = 'artes' and ruta = p_ruta)
$$;

-- @test artes: la imagen de la empresa la lee quien ve cotizaciones en algún origen; la personal, sólo su dueño; sin cotizaciones, ninguna
begin;
do $$
declare
  g uuid := pg_temp.arti_u(1); a uuid := pg_temp.arti_u(2); b uuid := pg_temp.arti_u(3); c uuid := pg_temp.arti_u(4); n uuid := pg_temp.arti_u(5);
  ie uuid := pg_temp.arti_id('d', 1); ig uuid := pg_temp.arti_id('d', 2); ia uuid := pg_temp.arti_id('d', 3); ib uuid := pg_temp.arti_id('d', 4);
  todas uuid[];
begin
  perform pg_temp.arti_terreno();
  todas := array[ie, ig, ia, ib];
  perform pg_temp.arti_como(g);
  perform pg_temp.arti_imagen(ie, 1, 'empresa');
  perform pg_temp.arti_imagen(ig, 2, 'personal');
  perform pg_temp.arti_como(a);
  perform pg_temp.arti_imagen(ia, 3, 'personal');
  perform pg_temp.arti_como(b);
  perform pg_temp.arti_imagen(ib, 4, 'personal');

  reset role;
  if not exists (select 1 from public.artes_imagenes where id = ie and ambito = 'empresa' and dueno_id is null and creado_por = g) then
    raise exception 'la de la empresa no quedó sin dueño y con quien la cargó';
  end if;
  if not exists (select 1 from public.artes_imagenes where id = ia and ambito = 'personal' and dueno_id = a and creado_por = a) then
    raise exception 'la personal no quedó de quien la subió';
  end if;

  perform pg_temp.arti_como(a);
  if pg_temp.arti_vistas(todas) <> 'd01,d03' then raise exception 'una persona ve %, esperaba la de la empresa y la suya', pg_temp.arti_vistas(todas); end if;
  perform pg_temp.arti_como(b);
  if pg_temp.arti_vistas(todas) <> 'd01,d04' then raise exception 'otra persona ve %, esperaba la de la empresa y la suya', pg_temp.arti_vistas(todas); end if;
  perform pg_temp.arti_como(g);
  if pg_temp.arti_vistas(todas) <> 'd01,d02' then raise exception 'quien gestiona ve %: las personales ajenas no se ven', pg_temp.arti_vistas(todas); end if;
  perform pg_temp.arti_como(c);
  if pg_temp.arti_vistas(todas) <> 'd01' then raise exception 'quien ve cotizaciones de otro origen ve %, esperaba la de la empresa', pg_temp.arti_vistas(todas); end if;
  perform pg_temp.arti_como(n);
  if pg_temp.arti_vistas(todas) <> '' then raise exception 'quien no ve cotizaciones ve %', pg_temp.arti_vistas(todas); end if;
  reset role;
end $$;
rollback;

-- @test artes: crear una imagen pide ver Artes, el permiso para la de la empresa y un archivo válido (un SVG es su propia miniatura); repetir el id devuelve la misma
begin;
do $$
declare
  g uuid := pg_temp.arti_u(1); a uuid := pg_temp.arti_u(2); b uuid := pg_temp.arti_u(3); n uuid := pg_temp.arti_u(5);
  ia uuid := pg_temp.arti_id('d', 1); ie uuid := pg_temp.arti_id('d', 2); isvg uuid := pg_temp.arti_id('d', 3); ix uuid := pg_temp.arti_id('d', 9);
  r jsonb; r2 jsonb; v text; svg text := pg_temp.arti_ruta('imagenes', 3, 'svg');
  crear constant text := 'select public.artes_imagen_crear(%L, %L, %L, %L, %L, %s, %s, %L)';
begin
  perform pg_temp.arti_terreno();

  perform pg_temp.arti_como(a);
  v := pg_temp.arti_falla(format(crear, ix, 'X', pg_temp.arti_ruta('imagenes', 9), pg_temp.arti_ruta('miniaturas', 9), 'png', 10, 10, 'empresa'));
  if v <> '42501/' then raise exception 'cargar una de la empresa sin el permiso esperaba 42501, dio %', v; end if;
  perform pg_temp.arti_como(n);
  v := pg_temp.arti_falla(format(crear, ix, 'X', pg_temp.arti_ruta('imagenes', 9), pg_temp.arti_ruta('miniaturas', 9), 'png', 10, 10, 'personal'));
  if v <> '42501/' then raise exception 'quien no ve cotizaciones esperaba 42501, dio %', v; end if;

  -- El archivo: el SVG con otra miniatura, el tipo que no es el de la ruta, rutas que no son por hash, sin medidas.
  perform pg_temp.arti_como(a);
  v := pg_temp.arti_falla(format(crear, ix, 'X', svg, pg_temp.arti_ruta('miniaturas', 3), 'svg', 10, 10, 'personal'));
  if v <> '22023/archivo' then raise exception 'un SVG con otra miniatura esperaba 22023 archivo, dio %', v; end if;
  v := pg_temp.arti_falla(format(crear, ix, 'X', pg_temp.arti_ruta('imagenes', 9), pg_temp.arti_ruta('miniaturas', 9), 'webp', 10, 10, 'personal'));
  if v <> '22023/archivo' then raise exception 'un tipo distinto del de la ruta esperaba 22023 archivo, dio %', v; end if;
  v := pg_temp.arti_falla(format(crear, ix, 'X', 'imagenes/foto.png', pg_temp.arti_ruta('miniaturas', 9), 'png', 10, 10, 'personal'));
  if v <> '22023/archivo' then raise exception 'una ruta que no es por hash esperaba 22023 archivo, dio %', v; end if;
  v := pg_temp.arti_falla(format(crear, ix, 'X', pg_temp.arti_ruta('imagenes', 9), pg_temp.arti_ruta('miniaturas', 9, 'svg'), 'png', 10, 10, 'personal'));
  if v <> '22023/archivo' then raise exception 'una miniatura svg de un PNG esperaba 22023 archivo, dio %', v; end if;
  v := pg_temp.arti_falla(format(crear, ix, 'X', pg_temp.arti_ruta('imagenes', 9), null, 'png', 10, 10, 'personal'));
  if v <> '22023/archivo' then raise exception 'sin miniatura esperaba 22023 archivo, dio %', v; end if;
  v := pg_temp.arti_falla(format(crear, ix, 'X', pg_temp.arti_ruta('imagenes', 9), pg_temp.arti_ruta('miniaturas', 9), 'png', 0, 10, 'personal'));
  if v <> '22023/archivo' then raise exception 'un ancho de 0 esperaba 22023 archivo, dio %', v; end if;
  v := pg_temp.arti_falla(format(crear, ix, 'X', pg_temp.arti_ruta('imagenes', 9), pg_temp.arti_ruta('miniaturas', 9), 'png', 10, 20001, 'personal'));
  if v <> '22023/archivo' then raise exception 'un alto de 20001 esperaba 22023 archivo, dio %', v; end if;
  v := pg_temp.arti_falla(format(crear, ix, 'X', pg_temp.arti_ruta('imagenes', 9), pg_temp.arti_ruta('miniaturas', 9), 'png', 10, 10, 'compartida'));
  if v <> '22023/ambito' then raise exception 'un ámbito desconocido esperaba 22023 ambito, dio %', v; end if;
  v := pg_temp.arti_falla(format(crear, ix, ' ', pg_temp.arti_ruta('imagenes', 9), pg_temp.arti_ruta('miniaturas', 9), 'png', 10, 10, 'personal'));
  if v <> '22023/nombre' then raise exception 'un nombre vacío esperaba 22023 nombre, dio %', v; end if;
  v := pg_temp.arti_falla(format(crear, null, 'X', pg_temp.arti_ruta('imagenes', 9), pg_temp.arti_ruta('miniaturas', 9), 'png', 10, 10, 'personal'));
  if v <> '22023/' then raise exception 'sin id esperaba 22023, dio %', v; end if;
  if exists (select 1 from public.artes_imagenes where id = ix) then raise exception 'un crear que cayó dejó la imagen'; end if;

  r := public.artes_imagen_crear(isvg, '  Logo  ', svg, svg, 'svg', 300, 100, 'personal');
  if pg_temp.arti_claves(r) is distinct from array['actualizado_en', 'id'] then raise exception 'crear una imagen devolvió %', r; end if;
  if not exists (select 1 from public.artes_imagenes where id = isvg and nombre = 'Logo' and tipo = 'svg' and miniatura_ruta = svg) then
    raise exception 'el SVG no quedó como su propia miniatura';
  end if;

  r := public.artes_imagen_crear(ia, 'Foto', pg_temp.arti_ruta('imagenes', 1), pg_temp.arti_ruta('miniaturas', 1), 'png', 800, 600, 'personal');
  r2 := public.artes_imagen_crear(ia, 'Otra', pg_temp.arti_ruta('imagenes', 1), pg_temp.arti_ruta('miniaturas', 1), 'png', 800, 600, 'personal');
  if pg_temp.arti_claves(r2) is distinct from array['actualizado_en', 'id', 'repetido'] or r2 -> 'actualizado_en' is distinct from r -> 'actualizado_en' then
    raise exception 'repetir el id devolvió %', r2;
  end if;
  if (select nombre from public.artes_imagenes where id = ia) <> 'Foto' then raise exception 'repetir el id cambió la imagen'; end if;
  perform pg_temp.arti_como(b);
  v := pg_temp.arti_falla(format(crear, ia, 'Foto', pg_temp.arti_ruta('imagenes', 1), pg_temp.arti_ruta('miniaturas', 1), 'png', 800, 600, 'personal'));
  if v <> '23505/' then raise exception 'el id de otra persona esperaba 23505, dio %', v; end if;

  perform pg_temp.arti_como(g);
  perform public.artes_imagen_crear(ie, 'Fondo', pg_temp.arti_ruta('imagenes', 2), pg_temp.arti_ruta('miniaturas', 2, 'webp'), 'png', 800, 600, 'empresa');
  if (select ambito from public.artes_imagenes where id = ie) is distinct from 'empresa' then raise exception 'quien gestiona no cargó la de la empresa'; end if;
  reset role;
end $$;
rollback;

-- @test artes: quitar una imagen en uso no la borra y dice sus usos; sin usos la borra y encola sus objetos; la ajena o la que ya no está, no es error
begin;
do $$
declare
  g uuid := pg_temp.arti_u(1); a uuid := pg_temp.arti_u(2); b uuid := pg_temp.arti_u(3);
  ie uuid := pg_temp.arti_id('d', 1); ia uuid := pg_temp.arti_id('d', 2); isvg uuid := pg_temp.arti_id('d', 3);
  ia7 uuid := pg_temp.arti_id('d', 7); ib7 uuid := pg_temp.arti_id('d', 8); ib uuid := pg_temp.arti_id('d', 4);
  p1 uuid := pg_temp.arti_id('c', 1);
  svg text := pg_temp.arti_ruta('imagenes', 3, 'svg');
  o1 uuid; r jsonb; v text; va timestamptz; vp timestamptz; ve timestamptz; vs timestamptz; vb timestamptz; vb7 timestamptz;
  quitar constant text := 'select public.artes_imagen_quitar(%L, %L)';
begin
  perform pg_temp.arti_terreno();
  o1 := pg_temp.arti_o(1);
  perform pg_temp.arti_como(g);
  ve := pg_temp.arti_imagen(ie, 1, 'empresa');
  perform pg_temp.arti_como(b);
  vb := pg_temp.arti_imagen(ib, 4, 'personal');
  vb7 := pg_temp.arti_imagen(ib7, 7, 'personal');
  perform pg_temp.arti_como(a);
  va := pg_temp.arti_imagen(ia, 2, 'personal');
  -- La misma foto subida por dos personas: un objeto (por hash), dos filas.
  perform pg_temp.arti_imagen(ia7, 7, 'personal');
  vs := pg_temp.arti_v(public.artes_imagen_crear(isvg, 'Logo', svg, svg, 'svg', 300, 100, 'personal'));
  vp := pg_temp.arti_v(public.artes_plantilla_crear(p1, 'Uno', 'cuadrado', 1080, 1080, o1, pg_temp.arti_doc(ia)));

  r := public.artes_imagen_quitar(ia, va);
  if r is distinct from '{"usos": 1}'::jsonb then raise exception 'quitar una en uso devolvió %', r; end if;
  if not exists (select 1 from public.artes_imagenes where id = ia) then raise exception 'quitar una en uso la borró'; end if;
  if public.artes_imagen_usos(ia) <> 1 then raise exception 'los usos dieron %, esperaba 1', public.artes_imagen_usos(ia); end if;

  v := pg_temp.arti_falla(format(quitar, ia, va - interval '1 microsecond'));
  if v <> 'PT409/' then raise exception 'quitar con una versión vieja esperaba PT409, dio %', v; end if;
  v := pg_temp.arti_falla(format(quitar, ia, null));
  if v <> 'P0001/' then raise exception 'quitar sin versión esperaba el error de _exigir_version, dio %', v; end if;
  v := pg_temp.arti_falla(format(quitar, ie, ve));
  if v <> '42501/' then raise exception 'quitar la de la empresa sin el permiso esperaba 42501, dio %', v; end if;

  -- La plantilla deja de nombrarla: ahora se borra y su original y su miniatura van a la cola.
  perform public.artes_plantilla_guardar(p1, vp, 'Uno', pg_temp.arti_doc(), null);
  if public.artes_imagen_usos(ia) <> 0 then raise exception 'sin plantillas los usos dieron %', public.artes_imagen_usos(ia); end if;
  r := public.artes_imagen_quitar(ia, va);
  if r is distinct from '{"quitada": true}'::jsonb then raise exception 'quitar una sin usos devolvió %', r; end if;
  reset role;
  if exists (select 1 from public.artes_imagenes where id = ia) then raise exception 'quitar una sin usos no la borró'; end if;
  if not pg_temp.arti_en_cola(pg_temp.arti_ruta('imagenes', 2)) or not pg_temp.arti_en_cola(pg_temp.arti_ruta('miniaturas', 2)) then
    raise exception 'el original y la miniatura no quedaron en la cola';
  end if;

  -- El SVG: una sola ruta en la cola.
  perform pg_temp.arti_como(a);
  perform public.artes_imagen_quitar(isvg, vs);
  reset role;
  if (select count(*) from public.cola_gc_storage where bucket = 'artes' and ruta = svg) <> 1 then raise exception 'el SVG no quedó una vez en la cola'; end if;

  -- El objeto que otra fila todavía nombra no va a la cola.
  perform pg_temp.arti_como(b);
  perform public.artes_imagen_quitar(ib7, vb7);
  reset role;
  if pg_temp.arti_en_cola(pg_temp.arti_ruta('imagenes', 7)) or pg_temp.arti_en_cola(pg_temp.arti_ruta('miniaturas', 7)) then
    raise exception 'encoló un objeto que otra imagen todavía usa';
  end if;
  if not exists (select 1 from public.artes_imagenes where id = ia7) then raise exception 'quitar la de una persona borró la de otra'; end if;

  -- La personal de otra persona (que no se ve) y la que ya no está: «quitada», sin tocar nada.
  perform pg_temp.arti_como(a);
  r := public.artes_imagen_quitar(ib, vb);
  if r is distinct from '{"quitada": true}'::jsonb then raise exception 'quitar la personal de otra persona devolvió %', r; end if;
  r := public.artes_imagen_quitar(pg_temp.arti_id('d', 99), va);
  if r is distinct from '{"quitada": true}'::jsonb then raise exception 'quitar una que no existe devolvió %', r; end if;
  reset role;
  if not exists (select 1 from public.artes_imagenes where id = ib) then raise exception 'quitar la personal de otra persona la borró'; end if;

  -- Quien gestiona quita la de la empresa.
  perform pg_temp.arti_como(g);
  r := public.artes_imagen_quitar(ie, ve);
  if r is distinct from '{"quitada": true}'::jsonb then raise exception 'quien gestiona no quitó la de la empresa: %', r; end if;
  reset role;
end $$;
rollback;

-- @test artes: los usos de una imagen cuentan todas las plantillas (también las privadas ajenas) con tope de 100 (101 = «100+»); la que no se ve, 0
begin;
do $$
declare
  g uuid := pg_temp.arti_u(1); a uuid := pg_temp.arti_u(2); b uuid := pg_temp.arti_u(3); n uuid := pg_temp.arti_u(5);
  ie uuid := pg_temp.arti_id('d', 1);
  o1 uuid; ve timestamptz; r jsonb;
begin
  perform pg_temp.arti_terreno();
  o1 := pg_temp.arti_o(1);
  perform pg_temp.arti_como(g);
  ve := pg_temp.arti_imagen(ie, 1, 'empresa');
  reset role;
  insert into public.artes_plantillas (id, nombre, formato, ancho, alto, origen_id, visibilidad, autor_id, documento)
  select gen_random_uuid(), 'AI masa ' || i, 'cuadrado', 1080, 1080, o1, 'privada', a, pg_temp.arti_doc(ie) from generate_series(1, 101) i;
  insert into public.artes_plantillas_imagenes (plantilla_id, imagen_id)
  select id, ie from public.artes_plantillas where autor_id = a and nombre like 'AI masa %';

  perform pg_temp.arti_como(g);
  if public.artes_imagen_usos(ie) <> 101 then raise exception 'con 101 usos dio %, esperaba el tope de 101', public.artes_imagen_usos(ie); end if;
  r := public.artes_imagen_quitar(ie, ve);
  if r is distinct from '{"usos": 101}'::jsonb then raise exception 'quitar con 101 usos devolvió %', r; end if;
  perform pg_temp.arti_como(b);
  if public.artes_imagen_usos(ie) <> 101 then raise exception 'quien no ve las privadas ajenas contó %, esperaba 101', public.artes_imagen_usos(ie); end if;
  perform pg_temp.arti_como(n);
  if public.artes_imagen_usos(ie) <> 0 then raise exception 'quien no ve la imagen contó %', public.artes_imagen_usos(ie); end if;
  perform pg_temp.arti_como(a);
  if public.artes_imagen_usos(pg_temp.arti_id('d', 99)) <> 0 then raise exception 'una imagen que no existe dio usos'; end if;
  reset role;
end $$;
rollback;

-- @test artes: renombrar una imagen mueve su versión, no pisa una vieja y respeta quién la gestiona
begin;
do $$
declare
  g uuid := pg_temp.arti_u(1); a uuid := pg_temp.arti_u(2); b uuid := pg_temp.arti_u(3); n uuid := pg_temp.arti_u(5);
  ia uuid := pg_temp.arti_id('d', 1); ie uuid := pg_temp.arti_id('d', 2);
  r jsonb; v text; v0 timestamptz; v1 timestamptz; ve timestamptz;
  renombrar constant text := 'select public.artes_imagen_renombrar(%L, %L, %L)';
begin
  perform pg_temp.arti_terreno();
  perform pg_temp.arti_como(g);
  ve := pg_temp.arti_imagen(ie, 2, 'empresa');
  perform pg_temp.arti_como(a);
  v0 := pg_temp.arti_imagen(ia, 1, 'personal');

  r := public.artes_imagen_renombrar(ia, v0, '  Atardecer  ');
  if pg_temp.arti_claves(r) is distinct from array['actualizado_en'] then raise exception 'renombrar devolvió %', r; end if;
  v1 := pg_temp.arti_v(r);
  if v1 <= v0 or (select nombre from public.artes_imagenes where id = ia) <> 'Atardecer' then raise exception 'renombrar no dejó el nombre con otra versión'; end if;
  v := pg_temp.arti_falla(format(renombrar, ia, v0, 'Otro'));
  if v <> 'PT409/' then raise exception 'renombrar con la versión de antes esperaba PT409, dio %', v; end if;
  v := pg_temp.arti_falla(format(renombrar, ia, null, 'Otro'));
  if v <> 'P0001/' then raise exception 'renombrar sin versión esperaba el error de _exigir_version, dio %', v; end if;
  if pg_temp.arti_v(public.artes_imagen_renombrar(ia, v1, 'Atardecer')) is distinct from v1 then raise exception 'el mismo nombre movió la versión'; end if;
  v := pg_temp.arti_falla(format(renombrar, ia, v1, ''));
  if v <> '22023/nombre' then raise exception 'un nombre vacío esperaba 22023 nombre, dio %', v; end if;
  v := pg_temp.arti_falla(format(renombrar, ia, v1, repeat('a', 81)));
  if v <> '22023/nombre' then raise exception 'un nombre de 81 letras esperaba 22023 nombre, dio %', v; end if;
  v := pg_temp.arti_falla(format(renombrar, ie, ve, 'Mía'));
  if v <> '42501/' then raise exception 'renombrar la de la empresa sin el permiso esperaba 42501, dio %', v; end if;

  perform pg_temp.arti_como(b);
  v := pg_temp.arti_falla(format(renombrar, ia, v1, 'Ajena'));
  if v <> 'P0002/' then raise exception 'renombrar la personal de otra persona esperaba P0002, dio %', v; end if;
  perform pg_temp.arti_como(n);
  v := pg_temp.arti_falla(format(renombrar, ie, ve, 'Sin ver'));
  if v <> 'P0002/' then raise exception 'renombrar sin ver Artes esperaba P0002, dio %', v; end if;

  perform pg_temp.arti_como(g);
  perform public.artes_imagen_renombrar(ie, ve, 'Fondo de la empresa');
  if (select nombre from public.artes_imagenes where id = ie) <> 'Fondo de la empresa' then raise exception 'quien gestiona no renombró la de la empresa'; end if;
  reset role;
end $$;
rollback;
