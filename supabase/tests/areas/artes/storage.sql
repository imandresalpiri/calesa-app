-- El bucket `artes`: `storage_refcount('artes', …)` cuenta las tres columnas con ruta (la miniatura de un SVG es su ruta y cuenta una vez), el barrido
-- tiene su rama y pasa por él cada hora, el rescate saca de la cola una ruta que vuelve a usarse, y las policies de `storage.objects` dejan subir a
-- quien ve Artes y leer lo que nombra una fila que se ve (o lo que uno subió). Corre en PGlite (`pnpm db:probar`, después de la lista fija; su
-- `storage.objects` es un remedo con `owner`); cada bloque arma su terreno y revierte.

create or replace function pg_temp.arts_como(p_id uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

-- Un id de este archivo: `e` personas, `c` plantillas, `d` imágenes.
create or replace function pg_temp.arts_id(p_letra text, n integer) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-8000-000000a74' || p_letra || lpad(n::text, 2, '0'))::uuid
$$;

create or replace function pg_temp.arts_u(n integer) returns uuid language sql immutable as $$ select pg_temp.arts_id('e', n) $$;

-- Las personas: 1 gestiona las artes de la empresa y ve cotizaciones de todo origen; 2 y 3 ven cotizaciones del origen 1; 4, del origen 2;
-- 5 no ve cotizaciones.
create or replace function pg_temp.arts_terreno() returns void language plpgsql as $$
declare v_rol uuid; v_o1 uuid; v_o2 uuid;
begin
  reset role;
  insert into auth.users (id, email, raw_app_meta_data)
  select pg_temp.arts_u(n), 'as' || n || '@ejemplo.com', '{"invitado": true}' from generate_series(1, 5) n;
  update public.perfiles set invitacion_aceptada_en = now() where id in (select pg_temp.arts_u(n) from generate_series(1, 5) n);
  delete from public.usuarios_roles where usuario_id in (select pg_temp.arts_u(n) from generate_series(1, 5) n);
  insert into public.origenes (clave, nombre) values ('as_o1', 'AS uno') returning id into v_o1;
  insert into public.origenes (clave, nombre) values ('as_o2', 'AS dos') returning id into v_o2;
  insert into public.roles (clave, nombre) values ('as_gestiona', 'AS gestiona') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.arts_u(1), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values
    (v_rol, 'cotizaciones.ver', 'todos'), (v_rol, 'artes.empresa.gestionar', 'todos');
  insert into public.roles (clave, nombre) values ('as_uno', 'AS origen uno') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.arts_u(2), v_rol, true), (pg_temp.arts_u(3), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.ver', v_o1, 'todos');
  insert into public.roles (clave, nombre) values ('as_dos', 'AS origen dos') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.arts_u(4), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.ver', v_o2, 'todos');
  insert into public.roles (clave, nombre) values ('as_sin', 'AS sin cotizaciones') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.arts_u(5), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'leads.ver', 'todos');
  -- El barrido de `artes` empieza de cero y la cola, vacía para este bucket.
  delete from public.cola_gc_barrido where bucket = 'artes';
  delete from public.cola_gc_storage where bucket = 'artes';
end;
$$;

create or replace function pg_temp.arts_o(n integer) returns uuid language sql stable as $$
  select id from public.origenes where clave = 'as_o' || n
$$;

create or replace function pg_temp.arts_falla(p_sql text) returns text language plpgsql as $$
declare v_estado text; v_hint text;
begin
  execute p_sql;
  return 'no cayó';
exception when others then
  get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
  return v_estado || '/' || coalesce(v_hint, '');
end;
$$;

create or replace function pg_temp.arts_ruta(p_carpeta text, n integer, p_ext text default 'png') returns text language sql immutable as $$
  select p_carpeta || '/' || md5(n::text) || md5((n + 1000)::text) || '.' || p_ext
$$;

create or replace function pg_temp.arts_v(r jsonb) returns timestamptz language sql immutable as $$ select (r ->> 'actualizado_en')::timestamptz $$;

-- Una imagen de la biblioteca de quien llama (png, con su miniatura); devuelve su versión.
create or replace function pg_temp.arts_imagen(p_id uuid, n integer, p_ambito text) returns timestamptz language sql as $$
  select pg_temp.arts_v(public.artes_imagen_crear(p_id, 'Imagen ' || n, pg_temp.arts_ruta('imagenes', n), pg_temp.arts_ruta('miniaturas', n), 'png', 800, 600, p_ambito))
$$;

-- Una plantilla de arte de quien llama, sin imágenes; devuelve su versión.
create or replace function pg_temp.arts_plantilla(p_id uuid, p_origen uuid) returns timestamptz language sql as $$
  select pg_temp.arts_v(public.artes_plantilla_crear(p_id, 'Plantilla ' || right(p_id::text, 3), 'cuadrado', 1080, 1080, p_origen,
    '{"version": 1, "paginas": [{"capas": []}]}'::jsonb))
$$;

create or replace function pg_temp.arts_en_cola(p_ruta text) returns boolean language sql stable as $$
  select exists (select 1 from public.cola_gc_storage where bucket = 'artes' and ruta = p_ruta)
$$;

-- Los objetos del bucket `artes` que ve quien llama, ordenados.
create or replace function pg_temp.arts_vistos() returns text[] language sql stable as $$
  select coalesce(array_agg(name order by name collate "C"), '{}') from storage.objects where bucket_id = 'artes'
$$;

create or replace function pg_temp.arts_orden(p text[]) returns text[] language sql immutable as $$
  select coalesce(array_agg(x order by x collate "C"), '{}') from unnest(p) x
$$;

-- @test artes: storage_refcount('artes', …) cuenta la ruta y la miniatura de las imágenes (la de un SVG una vez) y la miniatura de las plantillas
begin;
do $$
declare
  a uuid := pg_temp.arts_u(2);
  r1 text := pg_temp.arts_ruta('imagenes', 1); m1 text := pg_temp.arts_ruta('miniaturas', 1);
  svg text := pg_temp.arts_ruta('imagenes', 2, 'svg'); m2 text := pg_temp.arts_ruta('miniaturas', 3);
  o1 uuid;
begin
  perform pg_temp.arts_terreno();
  o1 := pg_temp.arts_o(1);
  insert into public.artes_imagenes (id, nombre, ruta, miniatura_ruta, tipo, ancho, alto, ambito, dueno_id) values
    (pg_temp.arts_id('d', 1), 'Foto', r1, m1, 'png', 10, 10, 'empresa', null),
    (pg_temp.arts_id('d', 2), 'Logo', svg, svg, 'svg', 10, 10, 'personal', a);
  insert into public.artes_plantillas (id, nombre, formato, ancho, alto, origen_id, autor_id, documento, miniatura_ruta) values
    (pg_temp.arts_id('c', 1), 'Uno', 'cuadrado', 1080, 1080, o1, a, '{"version": 1, "paginas": [{"capas": []}]}', m2);

  if public.storage_refcount('artes', r1) <> 1 then raise exception 'la ruta de una imagen contó %', public.storage_refcount('artes', r1); end if;
  if public.storage_refcount('artes', m1) <> 1 then raise exception 'la miniatura de una imagen contó %', public.storage_refcount('artes', m1); end if;
  if public.storage_refcount('artes', svg) <> 1 then raise exception 'un SVG contó %, esperaba una vez', public.storage_refcount('artes', svg); end if;
  if public.storage_refcount('artes', m2) <> 1 then raise exception 'la miniatura de una plantilla contó %', public.storage_refcount('artes', m2); end if;
  if public.storage_refcount('artes', pg_temp.arts_ruta('imagenes', 9)) <> 0 then raise exception 'una ruta que nadie nombra contó'; end if;
  if public.storage_refcount('cotizaciones', r1) <> 0 then raise exception 'la ruta contó en otro bucket'; end if;

  -- La misma foto en otra fila y la misma miniatura en otra plantilla: cuentan las dos.
  insert into public.artes_imagenes (id, nombre, ruta, miniatura_ruta, tipo, ancho, alto, ambito, dueno_id) values
    (pg_temp.arts_id('d', 3), 'Foto mía', r1, m1, 'png', 10, 10, 'personal', a);
  insert into public.artes_plantillas (id, nombre, formato, ancho, alto, origen_id, autor_id, documento, miniatura_ruta) values
    (pg_temp.arts_id('c', 2), 'Dos', 'cuadrado', 1080, 1080, o1, a, '{"version": 1, "paginas": [{"capas": []}]}', m2);
  if public.storage_refcount('artes', r1) <> 2 or public.storage_refcount('artes', m1) <> 2 or public.storage_refcount('artes', m2) <> 2 then
    raise exception 'dos filas con la misma ruta no contaron 2 (%, %, %)',
      public.storage_refcount('artes', r1), public.storage_refcount('artes', m1), public.storage_refcount('artes', m2);
  end if;
end $$;
rollback;

-- @test artes: el barrido de cada hora pasa por el bucket artes
begin;
do $$
begin
  if pg_get_functiondef('public.storage_gc_reclamar(integer)'::regprocedure) not like '%storage_gc_encolar_huerfanos(''artes''%' then
    raise exception 'storage_gc_reclamar no barre el bucket artes';
  end if;
end $$;
rollback;

-- @test artes: el barrido encola el objeto viejo que nadie nombra, no el que está en uso ni el recién subido, y reclamar devuelve sólo el huérfano
begin;
do $$
declare
  a uuid := pg_temp.arts_u(2);
  r1 text := pg_temp.arts_ruta('imagenes', 1); m1 text := pg_temp.arts_ruta('miniaturas', 1); m2 text := pg_temp.arts_ruta('miniaturas', 2);
  huerfana text := pg_temp.arts_ruta('imagenes', 3); nueva text := pg_temp.arts_ruta('imagenes', 4);
  o1 uuid; k integer; cola text[]; devueltos text[];
begin
  perform pg_temp.arts_terreno();
  o1 := pg_temp.arts_o(1);
  insert into public.artes_imagenes (id, nombre, ruta, miniatura_ruta, tipo, ancho, alto, ambito, dueno_id) values
    (pg_temp.arts_id('d', 1), 'Foto', r1, m1, 'png', 10, 10, 'empresa', null);
  insert into public.artes_plantillas (id, nombre, formato, ancho, alto, origen_id, autor_id, documento, miniatura_ruta) values
    (pg_temp.arts_id('c', 1), 'Uno', 'cuadrado', 1080, 1080, o1, a, '{"version": 1, "paginas": [{"capas": []}]}', m2);
  insert into storage.objects (bucket_id, name, owner, created_at) values
    ('artes', r1, a, now() - interval '48 hours'), ('artes', m1, a, now() - interval '48 hours'), ('artes', m2, a, now() - interval '48 hours'),
    ('artes', huerfana, a, now() - interval '48 hours'), ('artes', nueva, a, now());

  k := public.storage_gc_encolar_huerfanos('artes', interval '24 hours');
  select coalesce(array_agg(ruta order by ruta collate "C"), '{}') into cola from public.cola_gc_storage where bucket = 'artes';
  if k <> 1 or cola is distinct from array[huerfana] then raise exception 'el barrido encoló % (%), esperaba sólo el huérfano viejo', cola, k; end if;

  -- Un objeto en uso que quedó en la cola: reclamar lo saca sin devolverlo; el huérfano sí sale, marcado.
  insert into public.cola_gc_storage (bucket, ruta, encolado_en) values ('artes', r1, now() - interval '48 hours');
  select coalesce(array_agg(c.ruta order by c.ruta collate "C"), '{}') into devueltos from public.storage_gc_reclamar(100) c where c.bucket = 'artes';
  if devueltos is distinct from array[huerfana] then raise exception 'reclamar devolvió %, esperaba sólo el huérfano', devueltos; end if;
  if pg_temp.arts_en_cola(r1) then raise exception 'reclamar dejó en la cola un objeto en uso'; end if;
  if (select reclamado_en from public.cola_gc_storage where bucket = 'artes' and ruta = huerfana) is null then raise exception 'reclamar no marcó el huérfano'; end if;
end $$;
rollback;

-- @test artes: una ruta en la cola que vuelve a usarse (imagen nueva o miniatura de una plantilla) sale de la cola; la que ya se está borrando avisa
begin;
do $$
declare
  a uuid := pg_temp.arts_u(2);
  r5 text := pg_temp.arts_ruta('imagenes', 5); m5 text := pg_temp.arts_ruta('miniaturas', 5); m6 text := pg_temp.arts_ruta('miniaturas', 6);
  m8 text := pg_temp.arts_ruta('miniaturas', 8);
  p1 uuid := pg_temp.arts_id('c', 1); d1 uuid := pg_temp.arts_id('c', 2);
  o1 uuid; v1 timestamptz; v text;
begin
  perform pg_temp.arts_terreno();
  o1 := pg_temp.arts_o(1);
  insert into public.cola_gc_storage (bucket, ruta) values ('artes', r5), ('artes', m5), ('artes', m6);
  insert into public.cola_gc_storage (bucket, ruta, reclamado_en) values ('artes', pg_temp.arts_ruta('imagenes', 7), now()), ('artes', m8, now());

  perform pg_temp.arts_como(a);
  perform pg_temp.arts_imagen(pg_temp.arts_id('d', 5), 5, 'personal');
  v1 := pg_temp.arts_plantilla(p1, o1);
  v1 := pg_temp.arts_v(public.artes_plantilla_guardar(p1, v1, 'Uno', '{"version": 1, "paginas": [{"capas": []}]}', m6));
  reset role;
  if pg_temp.arts_en_cola(r5) or pg_temp.arts_en_cola(m5) then raise exception 'la imagen nueva no sacó su ruta y su miniatura de la cola'; end if;
  if pg_temp.arts_en_cola(m6) then raise exception 'la miniatura de la plantilla no salió de la cola'; end if;

  -- Duplicar copia la miniatura: también la rescata.
  insert into public.cola_gc_storage (bucket, ruta) values ('artes', m6) on conflict do nothing;
  perform pg_temp.arts_como(a);
  perform public.artes_plantilla_duplicar(d1, p1, 'Uno (copia)');
  reset role;
  if pg_temp.arts_en_cola(m6) then raise exception 'duplicar no sacó la miniatura de la cola'; end if;

  -- Una ruta que el barrido ya reclamó: subirla otra vez avisa (y no deja la fila).
  perform pg_temp.arts_como(a);
  v := pg_temp.arts_falla(format('select public.artes_imagen_crear(%L, %L, %L, %L, %L, 10, 10, %L)',
    pg_temp.arts_id('d', 7), 'Otra', pg_temp.arts_ruta('imagenes', 7), pg_temp.arts_ruta('miniaturas', 7), 'png', 'personal'));
  if v <> 'P0001/' then raise exception 'una ruta que se está borrando esperaba el aviso del rescate, dio %', v; end if;
  v := pg_temp.arts_falla(format('select public.artes_plantilla_guardar(%L, %L, %L, %L, %L)', p1, v1, 'Uno', '{"version": 1, "paginas": [{"capas": []}]}', m8));
  if v <> 'P0001/' then raise exception 'una miniatura que se está borrando esperaba el aviso del rescate, dio %', v; end if;
  reset role;
end $$;
rollback;

-- @test artes: sube quien ve Artes a una ruta por hash; lee lo que nombra una fila que ve o lo que subió; nadie cambia ni borra un objeto
begin;
do $$
declare
  g uuid := pg_temp.arts_u(1); a uuid := pg_temp.arts_u(2); b uuid := pg_temp.arts_u(3); c uuid := pg_temp.arts_u(4); n uuid := pg_temp.arts_u(5);
  pa uuid := pg_temp.arts_id('c', 1); pe uuid := pg_temp.arts_id('c', 2);
  re text := pg_temp.arts_ruta('imagenes', 1); me text := pg_temp.arts_ruta('miniaturas', 1);
  ra text := pg_temp.arts_ruta('imagenes', 2); ma text := pg_temp.arts_ruta('miniaturas', 2);
  rb text := pg_temp.arts_ruta('imagenes', 3); mb text := pg_temp.arts_ruta('miniaturas', 3);
  mpa text := pg_temp.arts_ruta('miniaturas', 10); mpe text := pg_temp.arts_ruta('miniaturas', 11);
  subida text := pg_temp.arts_ruta('imagenes', 20);
  o1 uuid; v1 timestamptz; v text; k integer;
begin
  perform pg_temp.arts_terreno();
  o1 := pg_temp.arts_o(1);
  perform pg_temp.arts_como(g);
  perform pg_temp.arts_imagen(pg_temp.arts_id('d', 1), 1, 'empresa');
  v1 := pg_temp.arts_plantilla(pe, o1);
  v1 := pg_temp.arts_v(public.artes_plantilla_guardar(pe, v1, 'Empresa', '{"version": 1, "paginas": [{"capas": []}]}', mpe));
  perform public.artes_plantilla_visibilidad(pe, v1, 'empresa');
  perform pg_temp.arts_como(a);
  perform pg_temp.arts_imagen(pg_temp.arts_id('d', 2), 2, 'personal');
  v1 := pg_temp.arts_plantilla(pa, o1);
  perform public.artes_plantilla_guardar(pa, v1, 'Mía', '{"version": 1, "paginas": [{"capas": []}]}', mpa);
  perform pg_temp.arts_como(b);
  perform pg_temp.arts_imagen(pg_temp.arts_id('d', 3), 3, 'personal');
  reset role;
  insert into storage.objects (bucket_id, name, owner) values
    ('artes', re, g), ('artes', me, g), ('artes', ra, a), ('artes', ma, a), ('artes', rb, b), ('artes', mb, b),
    ('artes', mpa, a), ('artes', mpe, g), ('artes', subida, a);

  perform pg_temp.arts_como(a);
  if pg_temp.arts_vistos() is distinct from pg_temp.arts_orden(array[re, me, ra, ma, mpa, mpe, subida]) then
    raise exception 'una persona ve % objetos, esperaba los de la empresa, los suyos y lo que subió', cardinality(pg_temp.arts_vistos());
  end if;
  perform pg_temp.arts_como(b);
  if pg_temp.arts_vistos() is distinct from pg_temp.arts_orden(array[re, me, rb, mb, mpe]) then
    raise exception 'otra persona ve % objetos, esperaba los de la empresa y los suyos', cardinality(pg_temp.arts_vistos());
  end if;
  perform pg_temp.arts_como(c);
  if pg_temp.arts_vistos() is distinct from pg_temp.arts_orden(array[re, me]) then
    raise exception 'quien ve otro origen ve % objetos, esperaba sólo la imagen de la empresa', cardinality(pg_temp.arts_vistos());
  end if;
  perform pg_temp.arts_como(n);
  if pg_temp.arts_vistos() <> '{}' then raise exception 'quien no ve cotizaciones ve % objetos', cardinality(pg_temp.arts_vistos()); end if;

  -- Subir: una ruta por hash, quien ve Artes.
  perform pg_temp.arts_como(a);
  insert into storage.objects (bucket_id, name, owner) values ('artes', pg_temp.arts_ruta('miniaturas', 30, 'webp'), a);
  v := pg_temp.arts_falla(format('insert into storage.objects (bucket_id, name, owner) values (%L, %L, %L)', 'artes', 'otra/' || md5('x') || md5('y') || '.png', a));
  if v <> '42501/' then raise exception 'subir fuera de imagenes/ y miniaturas/ esperaba 42501, dio %', v; end if;
  v := pg_temp.arts_falla(format('insert into storage.objects (bucket_id, name, owner) values (%L, %L, %L)', 'artes', 'imagenes/foto.png', a));
  if v <> '42501/' then raise exception 'subir con un nombre que no es hash esperaba 42501, dio %', v; end if;
  perform pg_temp.arts_como(n);
  v := pg_temp.arts_falla(format('insert into storage.objects (bucket_id, name, owner) values (%L, %L, %L)', 'artes', pg_temp.arts_ruta('imagenes', 31), n));
  if v <> '42501/' then raise exception 'subir sin ver cotizaciones esperaba 42501, dio %', v; end if;

  -- Ni cambiar ni borrar: ninguna policy lo deja.
  perform pg_temp.arts_como(a);
  with u as (update storage.objects set name = name where bucket_id = 'artes' returning 1) select count(*) into k from u;
  if k <> 0 then raise exception 'una persona cambió % objetos del bucket', k; end if;
  with d as (delete from storage.objects where bucket_id = 'artes' returning 1) select count(*) into k from d;
  if k <> 0 then raise exception 'una persona borró % objetos del bucket', k; end if;
  reset role;
end $$;
rollback;
