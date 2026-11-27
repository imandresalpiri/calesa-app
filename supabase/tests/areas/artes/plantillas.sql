-- Las plantillas de arte (`artes_plantillas`, escritas por `artes_plantilla_*`): quién las lee (la privada, su autor; la de la empresa, quien ve
-- cotizaciones de su origen), crear idempotente por id y sus validaciones, guardar con su versión y la tabla puente igual al documento, duplicar,
-- hacerla de la empresa o privada, eliminar con sus cascadas y la miniatura sin uso en la cola, y que nadie escriba directo. Corre en PGlite
-- (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y revierte.

create or replace function pg_temp.artp_como(p_id uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

-- Un id de este archivo: `e` personas, `c` plantillas, `d` imágenes.
create or replace function pg_temp.artp_id(p_letra text, n integer) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-8000-000000a71' || p_letra || lpad(n::text, 2, '0'))::uuid
$$;

create or replace function pg_temp.artp_u(n integer) returns uuid language sql immutable as $$ select pg_temp.artp_id('e', n) $$;

-- Las personas: 1 gestiona las artes de la empresa y ve cotizaciones de todo origen; 2 y 3 ven cotizaciones del origen 1; 4, del origen 2;
-- 5 no ve cotizaciones. Los dos orígenes son de la prueba (`ap_o1`, `ap_o2`).
create or replace function pg_temp.artp_terreno() returns void language plpgsql as $$
declare v_rol uuid; v_o1 uuid; v_o2 uuid;
begin
  reset role;
  insert into auth.users (id, email, raw_app_meta_data)
  select pg_temp.artp_u(n), 'ap' || n || '@ejemplo.com', '{"invitado": true}' from generate_series(1, 5) n;
  update public.perfiles set invitacion_aceptada_en = now() where id in (select pg_temp.artp_u(n) from generate_series(1, 5) n);
  delete from public.usuarios_roles where usuario_id in (select pg_temp.artp_u(n) from generate_series(1, 5) n);
  insert into public.origenes (clave, nombre) values ('ap_o1', 'AP uno') returning id into v_o1;
  insert into public.origenes (clave, nombre) values ('ap_o2', 'AP dos') returning id into v_o2;
  insert into public.roles (clave, nombre) values ('ap_gestiona', 'AP gestiona') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.artp_u(1), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values
    (v_rol, 'cotizaciones.ver', 'todos'), (v_rol, 'artes.empresa.gestionar', 'todos');
  insert into public.roles (clave, nombre) values ('ap_uno', 'AP origen uno') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.artp_u(2), v_rol, true), (pg_temp.artp_u(3), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.ver', v_o1, 'todos');
  insert into public.roles (clave, nombre) values ('ap_dos', 'AP origen dos') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.artp_u(4), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.ver', v_o2, 'todos');
  insert into public.roles (clave, nombre) values ('ap_sin', 'AP sin cotizaciones') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.artp_u(5), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'leads.ver', 'todos');
end;
$$;

create or replace function pg_temp.artp_o(n integer) returns uuid language sql stable as $$
  select id from public.origenes where clave = 'ap_o' || n
$$;

create or replace function pg_temp.artp_falla(p_sql text) returns text language plpgsql as $$
declare v_estado text; v_hint text;
begin
  execute p_sql;
  return 'no cayó';
exception when others then
  get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
  return v_estado || '/' || coalesce(v_hint, '');
end;
$$;

-- Una ruta del bucket `artes` distinta por número.
create or replace function pg_temp.artp_ruta(p_carpeta text, n integer, p_ext text default 'png') returns text language sql immutable as $$
  select p_carpeta || '/' || md5(n::text) || md5((n + 1000)::text) || '.' || p_ext
$$;

-- Un documento de una página con una capa de imagen por id (en ese orden); sin ids, sin capas.
create or replace function pg_temp.artp_doc(variadic p_ids uuid[]) returns jsonb language sql immutable as $$
  select jsonb_build_object('version', 1, 'paginas', jsonb_build_array(jsonb_build_object('fondo', '#ffffff', 'capas',
    coalesce((select jsonb_agg(jsonb_build_object('id', 'c' || o, 'tipo', 'imagen', 'imagenId', x) order by o)
                from unnest(p_ids) with ordinality u(x, o)), '[]'::jsonb))))
$$;

create or replace function pg_temp.artp_doc() returns jsonb language sql immutable as $$ select pg_temp.artp_doc(variadic '{}'::uuid[]) $$;

create or replace function pg_temp.artp_v(r jsonb) returns timestamptz language sql immutable as $$ select (r ->> 'actualizado_en')::timestamptz $$;

create or replace function pg_temp.artp_claves(r jsonb) returns text[] language sql immutable as $$
  select array_agg(k order by k collate "C") from jsonb_object_keys(r) k
$$;

-- Una imagen de la biblioteca de quien llama (png, con su miniatura).
create or replace function pg_temp.artp_imagen(p_id uuid, n integer, p_ambito text) returns timestamptz language sql as $$
  select pg_temp.artp_v(public.artes_imagen_crear(p_id, 'Imagen ' || n, pg_temp.artp_ruta('imagenes', n), pg_temp.artp_ruta('miniaturas', n), 'png', 800, 600, p_ambito))
$$;

-- Una plantilla de arte de quien llama; devuelve su versión.
create or replace function pg_temp.artp_plantilla(p_id uuid, p_origen uuid, p_documento jsonb, p_formato text default 'cuadrado') returns timestamptz
  language sql as $$
  select pg_temp.artp_v(public.artes_plantilla_crear(p_id, 'Plantilla ' || right(p_id::text, 3), p_formato,
    case when p_formato = 'carta' then 612 else 1080 end, case when p_formato = 'carta' then 792 else 1080 end, p_origen, p_documento))
$$;

-- Lo que ve quien llama entre unas plantillas, por el final de su id.
create or replace function pg_temp.artp_vistas(p_ids uuid[]) returns text language sql stable as $$
  select coalesce(string_agg(right(id::text, 3), ',' order by right(id::text, 3) collate "C"), '') from public.artes_plantillas where id = any (p_ids)
$$;

-- Las imágenes que la tabla puente dice que nombra una plantilla, ordenadas.
create or replace function pg_temp.artp_refs(p_plantilla uuid) returns uuid[] language sql stable as $$
  select coalesce(array_agg(imagen_id order by imagen_id), '{}') from public.artes_plantillas_imagenes where plantilla_id = p_plantilla
$$;

create or replace function pg_temp.artp_orden(p_ids uuid[]) returns uuid[] language sql immutable as $$
  select coalesce(array_agg(x order by x), '{}') from unnest(p_ids) x
$$;

create or replace function pg_temp.artp_en_cola(p_ruta text) returns boolean language sql stable as $$
  select exists (select 1 from public.cola_gc_storage where bucket = 'artes' and ruta = p_ruta)
$$;

-- @test artes: la privada la lee sólo su autor; la de la empresa, quien ve cotizaciones de su origen; sin ese origen, nadie
begin;
do $$
declare
  g uuid := pg_temp.artp_u(1); a uuid := pg_temp.artp_u(2); b uuid := pg_temp.artp_u(3); c uuid := pg_temp.artp_u(4); n uuid := pg_temp.artp_u(5);
  pa uuid := pg_temp.artp_id('c', 1); pe uuid := pg_temp.artp_id('c', 2); ie uuid := pg_temp.artp_id('d', 1);
  o1 uuid; o2 uuid; v timestamptz; k integer;
begin
  perform pg_temp.artp_terreno();
  o1 := pg_temp.artp_o(1);
  o2 := pg_temp.artp_o(2);
  perform pg_temp.artp_como(g);
  perform pg_temp.artp_imagen(ie, 1, 'empresa');
  v := pg_temp.artp_plantilla(pe, o1, pg_temp.artp_doc(ie));
  perform public.artes_plantilla_visibilidad(pe, v, 'empresa');
  perform pg_temp.artp_como(a);
  perform pg_temp.artp_plantilla(pa, o1, pg_temp.artp_doc());

  if pg_temp.artp_vistas(array[pa, pe]) <> 'c01,c02' then raise exception 'el autor ve %, esperaba su privada y la de la empresa', pg_temp.artp_vistas(array[pa, pe]); end if;
  perform pg_temp.artp_como(b);
  if pg_temp.artp_vistas(array[pa, pe]) <> 'c02' then raise exception 'otra persona del origen ve %, esperaba sólo la de la empresa', pg_temp.artp_vistas(array[pa, pe]); end if;
  select count(*) into k from public.artes_plantillas_imagenes where plantilla_id = pe;
  if k <> 1 then raise exception 'quien ve la de la empresa no lee su tabla puente (%)', k; end if;
  perform pg_temp.artp_como(g);
  if pg_temp.artp_vistas(array[pa, pe]) <> 'c02' then raise exception 'quien gestiona las artes ve %: la privada de otra persona no se ve', pg_temp.artp_vistas(array[pa, pe]); end if;
  perform pg_temp.artp_como(c);
  if pg_temp.artp_vistas(array[pa, pe]) <> '' then raise exception 'quien no ve cotizaciones del origen ve %', pg_temp.artp_vistas(array[pa, pe]); end if;
  select count(*) into k from public.artes_plantillas_imagenes where plantilla_id = pe;
  if k <> 0 then raise exception 'quien no ve el origen lee la tabla puente (%)', k; end if;
  perform pg_temp.artp_como(n);
  if pg_temp.artp_vistas(array[pa, pe]) <> '' then raise exception 'quien no ve cotizaciones ve %', pg_temp.artp_vistas(array[pa, pe]); end if;

  -- Sin el origen a la vista, el autor tampoco lee su privada.
  reset role;
  update public.roles_permisos set origen_id = o2 where rol_id = (select id from public.roles where clave = 'ap_uno');
  perform pg_temp.artp_como(a);
  if pg_temp.artp_vistas(array[pa, pe]) <> '' then raise exception 'el autor sin el origen ve %', pg_temp.artp_vistas(array[pa, pe]); end if;

  -- Una cuenta bloqueada no lee.
  reset role;
  update public.roles_permisos set origen_id = o1 where rol_id = (select id from public.roles where clave = 'ap_uno');
  update public.perfiles set bloqueado = true where id = b;
  perform pg_temp.artp_como(b);
  if pg_temp.artp_vistas(array[pa, pe]) <> '' then raise exception 'una cuenta bloqueada ve %', pg_temp.artp_vistas(array[pa, pe]); end if;
  reset role;
end $$;
rollback;

-- @test artes: crear es idempotente por id y valida el origen, el formato, las medidas, el nombre, el documento y sus imágenes
begin;
do $$
declare
  a uuid := pg_temp.artp_u(2); b uuid := pg_temp.artp_u(3); n uuid := pg_temp.artp_u(5);
  p1 uuid := pg_temp.artp_id('c', 1); p2 uuid := pg_temp.artp_id('c', 2); p3 uuid := pg_temp.artp_id('c', 3); px uuid := pg_temp.artp_id('c', 9);
  ia uuid := pg_temp.artp_id('d', 1); ib uuid := pg_temp.artp_id('d', 2);
  o1 uuid; o2 uuid; r jsonb; r2 jsonb; v text; vacio jsonb := pg_temp.artp_doc(); grande jsonb; muchas jsonb;
  crear constant text := 'select public.artes_plantilla_crear(%L, %L, %L, %s, %s, %L, %L)';
begin
  perform pg_temp.artp_terreno();
  o1 := pg_temp.artp_o(1);
  o2 := pg_temp.artp_o(2);
  perform pg_temp.artp_como(b);
  perform pg_temp.artp_imagen(ib, 2, 'personal');
  perform pg_temp.artp_como(a);
  perform pg_temp.artp_imagen(ia, 1, 'personal');

  r := public.artes_plantilla_crear(p1, '  Uno  ', 'cuadrado', 1080, 1080, o1, pg_temp.artp_doc(ia, ia));
  if pg_temp.artp_claves(r) is distinct from array['actualizado_en', 'id'] or r ->> 'id' <> p1::text then raise exception 'crear devolvió %', r; end if;
  if not exists (select 1 from public.artes_plantillas
                  where id = p1 and nombre = 'Uno' and visibilidad = 'privada' and autor_id = a and origen_id = o1 and miniatura_ruta is null) then
    raise exception 'crear no la dejó privada de su autor, en su origen y con el nombre recortado';
  end if;
  if pg_temp.artp_refs(p1) is distinct from array[ia] then raise exception 'la tabla puente quedó %, esperaba la imagen una vez', pg_temp.artp_refs(p1); end if;

  -- Repetir el id devuelve la misma, sin cambiarla.
  r2 := public.artes_plantilla_crear(p1, 'Otro nombre', 'vertical', 1080, 1350, o1, vacio);
  if pg_temp.artp_claves(r2) is distinct from array['actualizado_en', 'id', 'repetido'] or r2 -> 'repetido' is distinct from 'true'::jsonb
     or r2 -> 'actualizado_en' is distinct from r -> 'actualizado_en' then
    raise exception 'repetir el id devolvió %', r2;
  end if;
  if (select nombre from public.artes_plantillas where id = p1) <> 'Uno' then raise exception 'repetir el id cambió la plantilla'; end if;

  -- El mismo id, de otra persona.
  perform pg_temp.artp_como(b);
  v := pg_temp.artp_falla(format(crear, p1, 'Uno', 'cuadrado', 1080, 1080, o1, vacio));
  if v <> '23505/' then raise exception 'el id de otra persona esperaba 23505, dio %', v; end if;

  -- El origen: uno que no ve, o ninguno.
  perform pg_temp.artp_como(a);
  v := pg_temp.artp_falla(format(crear, p2, 'Dos', 'cuadrado', 1080, 1080, o2, vacio));
  if v <> '42501/origen' then raise exception 'un origen sin cotizaciones a la vista esperaba 42501 origen, dio %', v; end if;
  v := pg_temp.artp_falla(format(crear, p2, 'Dos', 'cuadrado', 1080, 1080, null, vacio));
  if v <> '42501/origen' then raise exception 'sin origen esperaba 42501 origen, dio %', v; end if;
  perform pg_temp.artp_como(n);
  v := pg_temp.artp_falla(format(crear, p2, 'Dos', 'cuadrado', 1080, 1080, o1, vacio));
  if v <> '42501/origen' then raise exception 'quien no ve cotizaciones esperaba 42501 origen, dio %', v; end if;
  perform pg_temp.artp_como(a);
  v := pg_temp.artp_falla(format(crear, null, 'Dos', 'cuadrado', 1080, 1080, o1, vacio));
  if v <> '22023/' then raise exception 'sin id esperaba 22023, dio %', v; end if;

  -- El formato y sus medidas.
  v := pg_temp.artp_falla(format(crear, p2, 'Dos', 'cuadrado', 1000, 1000, o1, vacio));
  if v <> '22023/formato' then raise exception 'medidas que no son las del formato esperaban 22023 formato, dio %', v; end if;
  v := pg_temp.artp_falla(format(crear, p2, 'Dos', 'raro', 1080, 1080, o1, vacio));
  if v <> '22023/formato' then raise exception 'un formato desconocido esperaba 22023 formato, dio %', v; end if;
  v := pg_temp.artp_falla(format(crear, p2, 'Dos', 'personalizado', 319, 500, o1, vacio));
  if v <> '22023/formato' then raise exception 'un lado de 319 px esperaba 22023 formato, dio %', v; end if;
  v := pg_temp.artp_falla(format(crear, p2, 'Dos', 'personalizado', 500, 4097, o1, vacio));
  if v <> '22023/formato' then raise exception 'un lado de 4097 px esperaba 22023 formato, dio %', v; end if;
  v := pg_temp.artp_falla(format(crear, p2, 'Dos', 'a4', 612, 792, o1, vacio));
  if v <> '22023/formato' then raise exception 'A4 con las medidas de Carta esperaba 22023 formato, dio %', v; end if;
  perform public.artes_plantilla_crear(p2, 'Dos', 'personalizado', 4096, 320, o1, vacio);
  perform public.artes_plantilla_crear(p3, 'Tres', 'carta', 612, 792, o1, vacio);

  -- El nombre.
  v := pg_temp.artp_falla(format(crear, px, '   ', 'cuadrado', 1080, 1080, o1, vacio));
  if v <> '22023/nombre' then raise exception 'un nombre vacío esperaba 22023 nombre, dio %', v; end if;
  v := pg_temp.artp_falla(format(crear, px, repeat('ñ', 81), 'cuadrado', 1080, 1080, o1, vacio));
  if v <> '22023/nombre' then raise exception 'un nombre de 81 letras esperaba 22023 nombre, dio %', v; end if;

  -- El documento: su forma mínima y su tope.
  grande := jsonb_build_object('version', 1, 'paginas', jsonb_build_array(jsonb_build_object('capas', '[]'::jsonb, 'nota', repeat('x', 524288))));
  v := pg_temp.artp_falla(format(crear, px, 'X', 'cuadrado', 1080, 1080, o1, grande));
  if v <> '23514/documento' then raise exception 'un documento de más de 512 KiB esperaba 23514 documento, dio %', v; end if;
  v := pg_temp.artp_falla(format(crear, px, 'X', 'cuadrado', 1080, 1080, o1, '{"paginas": [{"capas": []}]}'));
  if v <> '22023/documento' then raise exception 'un documento sin versión esperaba 22023 documento, dio %', v; end if;
  v := pg_temp.artp_falla(format(crear, px, 'X', 'cuadrado', 1080, 1080, o1, '{"version": 0, "paginas": [{"capas": []}]}'));
  if v <> '22023/documento' then raise exception 'un documento con versión 0 esperaba 22023 documento, dio %', v; end if;
  v := pg_temp.artp_falla(format(crear, px, 'X', 'cuadrado', 1080, 1080, o1, '{"version": "1", "paginas": [{"capas": []}]}'));
  if v <> '22023/documento' then raise exception 'una versión de texto esperaba 22023 documento, dio %', v; end if;
  v := pg_temp.artp_falla(format(crear, px, 'X', 'cuadrado', 1080, 1080, o1, '{"version": 1, "paginas": []}'));
  if v <> '22023/documento' then raise exception 'un documento sin páginas esperaba 22023 documento, dio %', v; end if;
  v := pg_temp.artp_falla(format(crear, px, 'X', 'cuadrado', 1080, 1080, o1,
    jsonb_build_object('version', 1, 'paginas', (select jsonb_agg('{"capas": []}'::jsonb) from generate_series(1, 21)))));
  if v <> '22023/documento' then raise exception 'un documento de 21 páginas esperaba 22023 documento, dio %', v; end if;
  v := pg_temp.artp_falla(format(crear, px, 'X', 'cuadrado', 1080, 1080, o1, null));
  if v <> '22023/documento' then raise exception 'sin documento esperaba 22023 documento, dio %', v; end if;
  v := pg_temp.artp_falla(format(crear, px, 'X', 'cuadrado', 1080, 1080, o1,
    '{"version": 1, "paginas": [{"capas": [{"tipo": "imagen", "imagenId": "no-es-un-id"}]}]}'));
  if v <> '22023/documento' then raise exception 'un imagenId que no es uuid esperaba 22023 documento, dio %', v; end if;

  -- Sus imágenes: la personal de otra persona, una que no existe, más de 100.
  v := pg_temp.artp_falla(format(crear, px, 'X', 'cuadrado', 1080, 1080, o1, pg_temp.artp_doc(ib)));
  if v <> '22023/imagenes' then raise exception 'la imagen personal de otra persona esperaba 22023 imagenes, dio %', v; end if;
  v := pg_temp.artp_falla(format(crear, px, 'X', 'cuadrado', 1080, 1080, o1, pg_temp.artp_doc(pg_temp.artp_id('d', 99))));
  if v <> '22023/imagenes' then raise exception 'una imagen que no existe esperaba 22023 imagenes, dio %', v; end if;
  muchas := pg_temp.artp_doc(variadic array(select pg_temp.artp_id('f', i) from generate_series(1, 99) i) || array[ia, pg_temp.artp_id('d', 98)]);
  v := pg_temp.artp_falla(format(crear, px, 'X', 'cuadrado', 1080, 1080, o1, muchas));
  if v <> '22023/imagenes' then raise exception '101 imágenes esperaban 22023 imagenes, dio %', v; end if;
  if exists (select 1 from public.artes_plantillas where id = px) then raise exception 'un crear que cayó dejó la plantilla'; end if;
  reset role;
end $$;
rollback;

-- @test artes: nadie escribe las tablas de Artes directo, ni la plantilla, ni la tabla puente, ni la biblioteca, ni la por defecto
begin;
do $$
declare
  a uuid := pg_temp.artp_u(2);
  p1 uuid := pg_temp.artp_id('c', 1); ia uuid := pg_temp.artp_id('d', 1);
  o1 uuid; v text;
begin
  perform pg_temp.artp_terreno();
  o1 := pg_temp.artp_o(1);
  perform pg_temp.artp_como(a);
  perform pg_temp.artp_imagen(ia, 1, 'personal');
  perform pg_temp.artp_plantilla(p1, o1, pg_temp.artp_doc());

  v := pg_temp.artp_falla(format('insert into public.artes_plantillas (id, nombre, formato, ancho, alto, origen_id, autor_id, documento) values (%L, %L, %L, 1080, 1080, %L, %L, %L)',
    pg_temp.artp_id('c', 2), 'X', 'cuadrado', o1, a, pg_temp.artp_doc()));
  if v <> '42501/' then raise exception 'el insert directo de una plantilla esperaba 42501, dio %', v; end if;
  v := pg_temp.artp_falla(format('update public.artes_plantillas set visibilidad = %L where id = %L', 'empresa', p1));
  if v <> '42501/' then raise exception 'el update directo de una plantilla esperaba 42501, dio %', v; end if;
  v := pg_temp.artp_falla(format('delete from public.artes_plantillas where id = %L', p1));
  if v <> '42501/' then raise exception 'el delete directo de una plantilla esperaba 42501, dio %', v; end if;
  v := pg_temp.artp_falla(format('insert into public.artes_plantillas_imagenes (plantilla_id, imagen_id) values (%L, %L)', p1, ia));
  if v <> '42501/' then raise exception 'el insert directo en la tabla puente esperaba 42501, dio %', v; end if;
  v := pg_temp.artp_falla(format('update public.artes_imagenes set ambito = %L, dueno_id = null where id = %L', 'empresa', ia));
  if v <> '42501/' then raise exception 'el update directo de una imagen esperaba 42501, dio %', v; end if;
  v := pg_temp.artp_falla(format('insert into public.artes_por_defecto (usuario_id, origen_id, tipo, plantilla_id) values (%L, %L, %L, %L)', a, o1, 'imagen', p1));
  if v <> '42501/' then raise exception 'el insert directo de una por defecto esperaba 42501, dio %', v; end if;
  reset role;
end $$;
rollback;

-- @test artes: guardar mueve la versión, no pisa una vieja, respeta quién edita y deja la tabla puente igual al documento
begin;
do $$
declare
  g uuid := pg_temp.artp_u(1); a uuid := pg_temp.artp_u(2); b uuid := pg_temp.artp_u(3);
  p1 uuid := pg_temp.artp_id('c', 1); pe uuid := pg_temp.artp_id('c', 2);
  i1 uuid := pg_temp.artp_id('d', 1); i2 uuid := pg_temp.artp_id('d', 2); ie uuid := pg_temp.artp_id('d', 3); ig uuid := pg_temp.artp_id('d', 4);
  m1 text := pg_temp.artp_ruta('miniaturas', 51); m2 text := pg_temp.artp_ruta('miniaturas', 52);
  o1 uuid; r jsonb; v text; v0 timestamptz; v1 timestamptz; v2 timestamptz; v3 timestamptz; ve timestamptz;
  guardar constant text := 'select public.artes_plantilla_guardar(%L, %L, %L, %L, %L)';
begin
  perform pg_temp.artp_terreno();
  o1 := pg_temp.artp_o(1);
  perform pg_temp.artp_como(g);
  perform pg_temp.artp_imagen(ie, 3, 'empresa');
  perform pg_temp.artp_imagen(ig, 4, 'personal');
  ve := pg_temp.artp_plantilla(pe, o1, pg_temp.artp_doc(ie));
  ve := pg_temp.artp_v(public.artes_plantilla_visibilidad(pe, ve, 'empresa'));
  perform pg_temp.artp_como(a);
  perform pg_temp.artp_imagen(i1, 1, 'personal');
  perform pg_temp.artp_imagen(i2, 2, 'personal');
  v0 := pg_temp.artp_plantilla(p1, o1, pg_temp.artp_doc(i1));

  r := public.artes_plantilla_guardar(p1, v0, '  Dos  ', pg_temp.artp_doc(i1, i2, i1), m1);
  if pg_temp.artp_claves(r) is distinct from array['actualizado_en'] then raise exception 'guardar devolvió %', r; end if;
  v1 := pg_temp.artp_v(r);
  if v1 <= v0 then raise exception 'guardar no movió la versión (% → %)', v0, v1; end if;
  if (select actualizado_en from public.artes_plantillas where id = p1) is distinct from v1 then raise exception 'la versión devuelta no es la guardada'; end if;
  if not exists (select 1 from public.artes_plantillas where id = p1 and nombre = 'Dos' and miniatura_ruta = m1 and documento = pg_temp.artp_doc(i1, i2, i1)) then
    raise exception 'guardar no dejó el nombre recortado, el documento y la miniatura';
  end if;
  if pg_temp.artp_refs(p1) is distinct from pg_temp.artp_orden(array[i1, i2]) then raise exception 'la tabla puente quedó % tras sumar una imagen', pg_temp.artp_refs(p1); end if;

  -- Una versión vieja, o ninguna, no pisa.
  v := pg_temp.artp_falla(format(guardar, p1, v0, 'Tres', pg_temp.artp_doc(), null));
  if v <> 'PT409/' then raise exception 'la versión de antes esperaba PT409, dio %', v; end if;
  v := pg_temp.artp_falla(format(guardar, p1, v1 - interval '1 microsecond', 'Tres', pg_temp.artp_doc(), null));
  if v <> 'PT409/' then raise exception 'la versión menos 1 µs esperaba PT409, dio %', v; end if;
  v := pg_temp.artp_falla(format(guardar, p1, null, 'Tres', pg_temp.artp_doc(), null));
  if v <> 'P0001/' then raise exception 'sin versión esperaba el error de _exigir_version, dio %', v; end if;
  if (select nombre from public.artes_plantillas where id = p1) <> 'Dos' then raise exception 'un guardar que cayó cambió la plantilla'; end if;

  -- Miniatura nula: conserva la que tenía. La tabla puente quita lo que el documento ya no nombra y suma lo nuevo (una de la empresa).
  v2 := pg_temp.artp_v(public.artes_plantilla_guardar(p1, v1, 'Dos', pg_temp.artp_doc(i2, ie), null));
  if (select miniatura_ruta from public.artes_plantillas where id = p1) is distinct from m1 then raise exception 'la miniatura nula no conservó la de antes'; end if;
  if pg_temp.artp_refs(p1) is distinct from pg_temp.artp_orden(array[i2, ie]) then raise exception 'la tabla puente quedó % tras cambiar las imágenes', pg_temp.artp_refs(p1); end if;

  -- Una miniatura nueva: la de antes, que ya nadie usa, va a la cola; volver a usarla la rescata.
  v3 := pg_temp.artp_v(public.artes_plantilla_guardar(p1, v2, 'Dos', pg_temp.artp_doc(), m2));
  if pg_temp.artp_refs(p1) <> '{}' then raise exception 'la tabla puente quedó % con un documento sin imágenes', pg_temp.artp_refs(p1); end if;
  reset role;
  if not pg_temp.artp_en_cola(m1) or pg_temp.artp_en_cola(m2) then raise exception 'la miniatura de antes no quedó en la cola (o la nueva sí)'; end if;
  perform pg_temp.artp_como(a);
  perform public.artes_plantilla_guardar(p1, v3, 'Dos', pg_temp.artp_doc(), m1);
  reset role;
  if pg_temp.artp_en_cola(m1) or not pg_temp.artp_en_cola(m2) then raise exception 'volver a usar la miniatura no la sacó de la cola (o no encoló la otra)'; end if;

  perform pg_temp.artp_como(a);
  v := pg_temp.artp_falla(format(guardar, p1, v3, 'Dos', pg_temp.artp_doc(), 'miniaturas/no-es-un-hash.png'));
  if v <> '22023/miniatura' then raise exception 'una miniatura inválida esperaba 22023 miniatura, dio %', v; end if;
  v := pg_temp.artp_falla(format(guardar, pg_temp.artp_id('c', 9), v3, 'Dos', pg_temp.artp_doc(), null));
  if v <> 'P0002/' then raise exception 'una plantilla que no existe esperaba P0002, dio %', v; end if;

  -- La privada de otra persona no se ve; la de la empresa, sin el permiso, no se edita.
  perform pg_temp.artp_como(b);
  v := pg_temp.artp_falla(format(guardar, p1, v3, 'Ajena', pg_temp.artp_doc(), null));
  if v <> 'P0002/' then raise exception 'la privada de otra persona esperaba P0002, dio %', v; end if;
  v := pg_temp.artp_falla(format(guardar, pe, ve, 'Ajena', pg_temp.artp_doc(ie), null));
  if v <> '42501/' then raise exception 'la de la empresa sin el permiso esperaba 42501, dio %', v; end if;

  -- Quien gestiona la edita, pero no le pone una imagen personal.
  perform pg_temp.artp_como(g);
  v := pg_temp.artp_falla(format(guardar, pe, ve, 'Empresa', pg_temp.artp_doc(ie, ig), null));
  if v <> '22023/imagenes' then raise exception 'una imagen personal en la de la empresa esperaba 22023 imagenes, dio %', v; end if;
  v := pg_temp.artp_falla(format(guardar, pe, ve, 'Empresa', pg_temp.artp_doc(i1), null));
  if v <> '22023/imagenes' then raise exception 'la imagen personal de otra persona esperaba 22023 imagenes, dio %', v; end if;
  perform public.artes_plantilla_guardar(pe, ve, 'Empresa', pg_temp.artp_doc(), null);
  if pg_temp.artp_refs(pe) <> '{}' or (select nombre from public.artes_plantillas where id = pe) <> 'Empresa' then
    raise exception 'quien gestiona no guardó la de la empresa';
  end if;
  reset role;
end $$;
rollback;

-- @test artes: duplicar nace privada de quien duplica, en el mismo origen y formato, con el documento, la miniatura y las referencias
begin;
do $$
declare
  g uuid := pg_temp.artp_u(1); a uuid := pg_temp.artp_u(2); b uuid := pg_temp.artp_u(3); c uuid := pg_temp.artp_u(4);
  pe uuid := pg_temp.artp_id('c', 1); pa uuid := pg_temp.artp_id('c', 2);
  d1 uuid := pg_temp.artp_id('c', 11); d2 uuid := pg_temp.artp_id('c', 12); d3 uuid := pg_temp.artp_id('c', 13);
  ie uuid := pg_temp.artp_id('d', 1); ia uuid := pg_temp.artp_id('d', 2);
  m text := pg_temp.artp_ruta('miniaturas', 51);
  o1 uuid; r jsonb; v text; ve timestamptz;
  duplicar constant text := 'select public.artes_plantilla_duplicar(%L, %L, %L)';
begin
  perform pg_temp.artp_terreno();
  o1 := pg_temp.artp_o(1);
  perform pg_temp.artp_como(g);
  perform pg_temp.artp_imagen(ie, 1, 'empresa');
  ve := pg_temp.artp_plantilla(pe, o1, pg_temp.artp_doc(ie), 'carta');
  ve := pg_temp.artp_v(public.artes_plantilla_guardar(pe, ve, 'Folleto', pg_temp.artp_doc(ie), m));
  perform public.artes_plantilla_visibilidad(pe, ve, 'empresa');

  perform pg_temp.artp_como(b);
  r := public.artes_plantilla_duplicar(d1, pe, '  Folleto (copia)  ');
  if pg_temp.artp_claves(r) is distinct from array['actualizado_en', 'id'] or r ->> 'id' <> d1::text then raise exception 'duplicar devolvió %', r; end if;
  if not exists (
    select 1 from public.artes_plantillas d join public.artes_plantillas f on f.id = pe
     where d.id = d1 and d.nombre = 'Folleto (copia)' and d.visibilidad = 'privada' and d.autor_id = b and d.origen_id = f.origen_id
       and d.formato = 'carta' and d.ancho = 612 and d.alto = 792 and d.documento = f.documento and d.miniatura_ruta = m
  ) then
    raise exception 'la copia no es privada de quien duplica con el origen, el formato, las medidas, el documento y la miniatura de la fuente';
  end if;
  if pg_temp.artp_refs(d1) is distinct from array[ie] then raise exception 'la copia no trae las referencias (%)', pg_temp.artp_refs(d1); end if;
  r := public.artes_plantilla_duplicar(d1, pe, 'Otro nombre');
  if r -> 'repetido' is distinct from 'true'::jsonb then raise exception 'repetir el id al duplicar devolvió %', r; end if;

  -- El id de otra persona; la privada ajena; un origen que no se ve; sin id.
  perform pg_temp.artp_como(a);
  v := pg_temp.artp_falla(format(duplicar, d1, pe, 'Mía'));
  if v <> '23505/' then raise exception 'el id de otra persona esperaba 23505, dio %', v; end if;
  v := pg_temp.artp_falla(format(duplicar, d2, d1, 'Mía'));
  if v <> 'P0002/' then raise exception 'duplicar la privada de otra persona esperaba P0002, dio %', v; end if;
  v := pg_temp.artp_falla(format(duplicar, null, pe, 'Mía'));
  if v <> '22023/' then raise exception 'duplicar sin id esperaba 22023, dio %', v; end if;
  perform pg_temp.artp_como(c);
  v := pg_temp.artp_falla(format(duplicar, d3, pe, 'Mía'));
  if v <> 'P0002/' then raise exception 'duplicar sin ver el origen esperaba P0002, dio %', v; end if;

  -- La propia, con una imagen personal: la copia la nombra también.
  perform pg_temp.artp_como(a);
  perform pg_temp.artp_imagen(ia, 2, 'personal');
  perform pg_temp.artp_plantilla(pa, o1, pg_temp.artp_doc(ia, ie));
  perform public.artes_plantilla_duplicar(d2, pa, 'Mía (copia)');
  if pg_temp.artp_refs(d2) is distinct from pg_temp.artp_orden(array[ia, ie]) then raise exception 'la copia de la propia no trae sus referencias (%)', pg_temp.artp_refs(d2); end if;
  if (select autor_id from public.artes_plantillas where id = d2) is distinct from a then raise exception 'la copia de la propia no es de quien duplica'; end if;
  reset role;
end $$;
rollback;

-- @test artes: hacerla de la empresa pide el permiso y sólo imágenes de la empresa; hacerla privada quita la por defecto de las demás personas
begin;
do $$
declare
  g uuid := pg_temp.artp_u(1); a uuid := pg_temp.artp_u(2); b uuid := pg_temp.artp_u(3);
  pe uuid := pg_temp.artp_id('c', 1); pg uuid := pg_temp.artp_id('c', 2); pa uuid := pg_temp.artp_id('c', 3);
  ie uuid := pg_temp.artp_id('d', 1); ig uuid := pg_temp.artp_id('d', 2);
  o1 uuid; r jsonb; v text; v0 timestamptz; v1 timestamptz; vg timestamptz; va timestamptz; quedan uuid[];
  hacer constant text := 'select public.artes_plantilla_visibilidad(%L, %L, %L)';
begin
  perform pg_temp.artp_terreno();
  o1 := pg_temp.artp_o(1);
  perform pg_temp.artp_como(a);
  va := pg_temp.artp_plantilla(pa, o1, pg_temp.artp_doc());
  v := pg_temp.artp_falla(format(hacer, pa, va, 'empresa'));
  if v <> '42501/' then raise exception 'sin el permiso esperaba 42501, dio %', v; end if;

  perform pg_temp.artp_como(g);
  perform pg_temp.artp_imagen(ie, 1, 'empresa');
  perform pg_temp.artp_imagen(ig, 2, 'personal');
  v0 := pg_temp.artp_plantilla(pe, o1, pg_temp.artp_doc(ie));
  vg := pg_temp.artp_plantilla(pg, o1, pg_temp.artp_doc(ie, ig));
  v := pg_temp.artp_falla(format(hacer, pg, vg, 'empresa'));
  if v <> '22023/imagenes' then raise exception 'de la empresa con una imagen personal esperaba 22023 imagenes, dio %', v; end if;
  v := pg_temp.artp_falla(format(hacer, pe, v0, 'publica'));
  if v <> '22023/visibilidad' then raise exception 'una visibilidad desconocida esperaba 22023 visibilidad, dio %', v; end if;
  v := pg_temp.artp_falla(format(hacer, pa, va, 'empresa'));
  if v <> 'P0002/' then raise exception 'la privada de otra persona esperaba P0002 también para quien gestiona, dio %', v; end if;

  r := public.artes_plantilla_visibilidad(pe, v0, 'empresa');
  if pg_temp.artp_claves(r) is distinct from array['actualizado_en'] then raise exception 'visibilidad devolvió %', r; end if;
  v1 := pg_temp.artp_v(r);
  if v1 <= v0 or (select visibilidad from public.artes_plantillas where id = pe) <> 'empresa' then raise exception 'no quedó de la empresa con otra versión'; end if;
  v := pg_temp.artp_falla(format(hacer, pe, v0, 'privada'));
  if v <> 'PT409/' then raise exception 'la versión de antes esperaba PT409, dio %', v; end if;
  v := pg_temp.artp_falla(format(hacer, pe, null, 'privada'));
  if v <> 'P0001/' then raise exception 'sin versión esperaba el error de _exigir_version, dio %', v; end if;
  if pg_temp.artp_v(public.artes_plantilla_visibilidad(pe, v1, 'empresa')) is distinct from v1 then raise exception 'la misma visibilidad movió la versión'; end if;

  -- Tres personas la eligen por defecto; al hacerla privada sólo queda la de su autor.
  perform public.artes_por_defecto_poner(o1, 'imagen', pe, null);
  perform pg_temp.artp_como(a);
  perform public.artes_por_defecto_poner(o1, 'imagen', pe, null);
  perform public.artes_por_defecto_poner(o1, 'pdf', null, null);
  perform pg_temp.artp_como(b);
  perform public.artes_por_defecto_poner(o1, 'imagen', pe, null);
  perform pg_temp.artp_como(g);
  perform public.artes_plantilla_visibilidad(pe, v1, 'privada');
  reset role;
  select coalesce(array_agg(usuario_id), '{}') into quedan from public.artes_por_defecto where plantilla_id = pe;
  if quedan is distinct from array[g] then raise exception 'al hacerla privada quedaron por defecto de %', quedan; end if;
  perform pg_temp.artp_como(a);
  if pg_temp.artp_vistas(array[pe]) <> '' then raise exception 'otra persona sigue viendo la que se hizo privada'; end if;
  reset role;
end $$;
rollback;

-- @test artes: eliminar respeta quién edita y su versión, cae en cascada la tabla puente y la por defecto, y encola la miniatura que nadie usa
begin;
do $$
declare
  g uuid := pg_temp.artp_u(1); a uuid := pg_temp.artp_u(2); b uuid := pg_temp.artp_u(3);
  p1 uuid := pg_temp.artp_id('c', 1); d1 uuid := pg_temp.artp_id('c', 2); pe uuid := pg_temp.artp_id('c', 3);
  ia uuid := pg_temp.artp_id('d', 1);
  m text := pg_temp.artp_ruta('miniaturas', 51);
  o1 uuid; r jsonb; v text; v1 timestamptz; vd timestamptz; ve timestamptz;
  eliminar constant text := 'select public.artes_plantilla_eliminar(%L, %L)';
begin
  perform pg_temp.artp_terreno();
  o1 := pg_temp.artp_o(1);
  perform pg_temp.artp_como(g);
  ve := pg_temp.artp_plantilla(pe, o1, pg_temp.artp_doc());
  ve := pg_temp.artp_v(public.artes_plantilla_visibilidad(pe, ve, 'empresa'));
  perform pg_temp.artp_como(a);
  perform pg_temp.artp_imagen(ia, 1, 'personal');
  v1 := pg_temp.artp_plantilla(p1, o1, pg_temp.artp_doc(ia));
  v1 := pg_temp.artp_v(public.artes_plantilla_guardar(p1, v1, 'Uno', pg_temp.artp_doc(ia), m));
  perform public.artes_por_defecto_poner(o1, 'imagen', p1, null);
  vd := pg_temp.artp_v(public.artes_plantilla_duplicar(d1, p1, 'Uno (copia)'));

  v := pg_temp.artp_falla(format(eliminar, pe, ve));
  if v <> '42501/' then raise exception 'eliminar la de la empresa sin el permiso esperaba 42501, dio %', v; end if;
  v := pg_temp.artp_falla(format(eliminar, p1, v1 - interval '1 microsecond'));
  if v <> 'PT409/' then raise exception 'eliminar con una versión vieja esperaba PT409, dio %', v; end if;
  v := pg_temp.artp_falla(format(eliminar, p1, null));
  if v <> 'P0001/' then raise exception 'eliminar sin versión esperaba el error de _exigir_version, dio %', v; end if;
  perform pg_temp.artp_como(b);
  v := pg_temp.artp_falla(format(eliminar, p1, v1));
  if v <> 'P0002/' then raise exception 'eliminar la privada de otra persona esperaba P0002, dio %', v; end if;

  perform pg_temp.artp_como(a);
  r := public.artes_plantilla_eliminar(p1, v1);
  if pg_temp.artp_claves(r) is distinct from array['eliminada', 'id'] or r -> 'eliminada' is distinct from 'true'::jsonb or r ->> 'id' <> p1::text then
    raise exception 'eliminar devolvió %', r;
  end if;
  reset role;
  if exists (select 1 from public.artes_plantillas where id = p1) then raise exception 'la plantilla sigue'; end if;
  if exists (select 1 from public.artes_plantillas_imagenes where plantilla_id = p1) then raise exception 'la tabla puente no cayó en cascada'; end if;
  if exists (select 1 from public.artes_por_defecto where plantilla_id = p1) then raise exception 'la por defecto no cayó en cascada'; end if;
  -- La copia usa la misma miniatura: no va a la cola hasta que se elimina también.
  if pg_temp.artp_en_cola(m) then raise exception 'encoló una miniatura que la copia todavía usa'; end if;
  perform pg_temp.artp_como(a);
  perform public.artes_plantilla_eliminar(d1, vd);
  reset role;
  if not pg_temp.artp_en_cola(m) then raise exception 'la miniatura que ya nadie usa no quedó en la cola'; end if;

  -- Quien gestiona elimina la de la empresa.
  perform pg_temp.artp_como(g);
  perform public.artes_plantilla_eliminar(pe, ve);
  reset role;
  if exists (select 1 from public.artes_plantillas where id = pe) then raise exception 'quien gestiona no eliminó la de la empresa'; end if;
end $$;
rollback;
