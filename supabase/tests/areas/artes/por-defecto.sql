-- La plantilla de arte por defecto de cada persona (`artes_por_defecto`, escrita por `artes_por_defecto_poner`): poner y quitar con su versión (la
-- esperada nula dice «no tenía» y nunca pisa), que la plantilla se vea y sea de ese origen y de ese tipo, que hacerla privada quite la de las demás
-- personas y que cada una lea sólo la suya. Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y revierte.

create or replace function pg_temp.artd_como(p_id uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

-- Un id de este archivo: `e` personas, `c` plantillas.
create or replace function pg_temp.artd_id(p_letra text, n integer) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-8000-000000a73' || p_letra || lpad(n::text, 2, '0'))::uuid
$$;

create or replace function pg_temp.artd_u(n integer) returns uuid language sql immutable as $$ select pg_temp.artd_id('e', n) $$;

-- Las personas: 1 gestiona las artes de la empresa y ve cotizaciones de todo origen; 2 y 3 ven cotizaciones del origen 1; 4, del origen 2.
create or replace function pg_temp.artd_terreno() returns void language plpgsql as $$
declare v_rol uuid; v_o1 uuid; v_o2 uuid;
begin
  reset role;
  insert into auth.users (id, email, raw_app_meta_data)
  select pg_temp.artd_u(n), 'ad' || n || '@ejemplo.com', '{"invitado": true}' from generate_series(1, 4) n;
  update public.perfiles set invitacion_aceptada_en = now() where id in (select pg_temp.artd_u(n) from generate_series(1, 4) n);
  delete from public.usuarios_roles where usuario_id in (select pg_temp.artd_u(n) from generate_series(1, 4) n);
  insert into public.origenes (clave, nombre) values ('ad_o1', 'AD uno') returning id into v_o1;
  insert into public.origenes (clave, nombre) values ('ad_o2', 'AD dos') returning id into v_o2;
  insert into public.roles (clave, nombre) values ('ad_gestiona', 'AD gestiona') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.artd_u(1), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values
    (v_rol, 'cotizaciones.ver', 'todos'), (v_rol, 'artes.empresa.gestionar', 'todos');
  insert into public.roles (clave, nombre) values ('ad_uno', 'AD origen uno') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.artd_u(2), v_rol, true), (pg_temp.artd_u(3), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.ver', v_o1, 'todos');
  insert into public.roles (clave, nombre) values ('ad_dos', 'AD origen dos') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.artd_u(4), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.ver', v_o2, 'todos');
end;
$$;

create or replace function pg_temp.artd_o(n integer) returns uuid language sql stable as $$
  select id from public.origenes where clave = 'ad_o' || n
$$;

create or replace function pg_temp.artd_falla(p_sql text) returns text language plpgsql as $$
declare v_estado text; v_hint text;
begin
  execute p_sql;
  return 'no cayó';
exception when others then
  get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
  return v_estado || '/' || coalesce(v_hint, '');
end;
$$;

create or replace function pg_temp.artd_v(r jsonb) returns timestamptz language sql immutable as $$ select (r ->> 'actualizado_en')::timestamptz $$;

-- Una plantilla de arte de quien llama, sin imágenes: Carta es de PDF; las demás, de imagen. Devuelve su versión.
create or replace function pg_temp.artd_plantilla(p_id uuid, p_origen uuid, p_formato text default 'cuadrado') returns timestamptz language sql as $$
  select pg_temp.artd_v(public.artes_plantilla_crear(p_id, 'Plantilla ' || right(p_id::text, 3), p_formato,
    case when p_formato = 'carta' then 612 else 1080 end, case when p_formato = 'carta' then 792 else 1080 end, p_origen,
    '{"version": 1, "paginas": [{"capas": []}]}'::jsonb))
$$;

-- La plantilla por defecto de una persona en un origen y un tipo (nula: sin fila). Se lee como postgres.
create or replace function pg_temp.artd_de(p_usuario uuid, p_origen uuid, p_tipo text) returns uuid language sql stable as $$
  select plantilla_id from public.artes_por_defecto where usuario_id = p_usuario and origen_id = p_origen and tipo = p_tipo
$$;

-- @test artes: poner la plantilla por defecto crea la fila, cambiarla mueve su versión y quitarla la borra, por origen y por tipo
begin;
do $$
declare
  a uuid := pg_temp.artd_u(2);
  pi1 uuid := pg_temp.artd_id('c', 1); pi2 uuid := pg_temp.artd_id('c', 2); pp uuid := pg_temp.artd_id('c', 3);
  o1 uuid; r jsonb; v1 timestamptz; v2 timestamptz;
begin
  perform pg_temp.artd_terreno();
  o1 := pg_temp.artd_o(1);
  perform pg_temp.artd_como(a);
  perform pg_temp.artd_plantilla(pi1, o1);
  perform pg_temp.artd_plantilla(pi2, o1);
  perform pg_temp.artd_plantilla(pp, o1, 'carta');

  r := public.artes_por_defecto_poner(o1, 'imagen', pi1, null);
  if (select array_agg(k) from jsonb_object_keys(r) k) is distinct from array['actualizado_en'] then raise exception 'poner devolvió %', r; end if;
  v1 := pg_temp.artd_v(r);
  r := public.artes_por_defecto_poner(o1, 'imagen', pi2, v1);
  v2 := pg_temp.artd_v(r);
  if v2 <= v1 then raise exception 'cambiar la por defecto no movió la versión (% → %)', v1, v2; end if;
  perform public.artes_por_defecto_poner(o1, 'pdf', pp, null);
  reset role;
  if pg_temp.artd_de(a, o1, 'imagen') is distinct from pi2 or pg_temp.artd_de(a, o1, 'pdf') is distinct from pp then
    raise exception 'no quedaron la de imagen y la de PDF';
  end if;
  if (select actualizado_en from public.artes_por_defecto where usuario_id = a and origen_id = o1 and tipo = 'imagen') is distinct from v2 then
    raise exception 'la versión devuelta no es la guardada';
  end if;

  perform pg_temp.artd_como(a);
  r := public.artes_por_defecto_poner(o1, 'imagen', null, v2);
  if r is distinct from '{"quitada": true}'::jsonb then raise exception 'quitar la por defecto devolvió %', r; end if;
  -- Sin fila, quitar con la esperada nula tampoco es error.
  r := public.artes_por_defecto_poner(o1, 'imagen', null, null);
  if r is distinct from '{"quitada": true}'::jsonb then raise exception 'quitar sin fila devolvió %', r; end if;
  reset role;
  if pg_temp.artd_de(a, o1, 'imagen') is not null or pg_temp.artd_de(a, o1, 'pdf') is distinct from pp then
    raise exception 'quitar la de imagen tocó otra cosa que esa fila';
  end if;
end $$;
rollback;

-- @test artes: la esperada nula con una fila, una esperada sin fila o una versión vieja dan PT409 y no pisan la por defecto
begin;
do $$
declare
  a uuid := pg_temp.artd_u(2);
  pi1 uuid := pg_temp.artd_id('c', 1); pi2 uuid := pg_temp.artd_id('c', 2); pp uuid := pg_temp.artd_id('c', 3);
  o1 uuid; v text; v1 timestamptz;
  poner constant text := 'select public.artes_por_defecto_poner(%L, %L, %L, %L)';
begin
  perform pg_temp.artd_terreno();
  o1 := pg_temp.artd_o(1);
  perform pg_temp.artd_como(a);
  perform pg_temp.artd_plantilla(pi1, o1);
  perform pg_temp.artd_plantilla(pi2, o1);
  perform pg_temp.artd_plantilla(pp, o1, 'carta');
  v1 := pg_temp.artd_v(public.artes_por_defecto_poner(o1, 'imagen', pi1, null));

  v := pg_temp.artd_falla(format(poner, o1, 'imagen', pi2, null));
  if v <> 'PT409/' then raise exception 'la esperada nula con una fila esperaba PT409, dio %', v; end if;
  v := pg_temp.artd_falla(format(poner, o1, 'imagen', null, null));
  if v <> 'PT409/' then raise exception 'quitar con la esperada nula y una fila esperaba PT409, dio %', v; end if;
  v := pg_temp.artd_falla(format(poner, o1, 'pdf', pp, v1));
  if v <> 'PT409/' then raise exception 'una esperada sin fila esperaba PT409, dio %', v; end if;
  v := pg_temp.artd_falla(format(poner, o1, 'imagen', pi2, v1 - interval '1 microsecond'));
  if v <> 'PT409/' then raise exception 'una versión vieja esperaba PT409, dio %', v; end if;
  reset role;
  if pg_temp.artd_de(a, o1, 'imagen') is distinct from pi1 or pg_temp.artd_de(a, o1, 'pdf') is not null then
    raise exception 'un poner que cayó pisó la por defecto';
  end if;
end $$;
rollback;

-- @test artes: la por defecto pide una plantilla que se vea, de ese origen y de ese tipo (imagen o PDF)
begin;
do $$
declare
  g uuid := pg_temp.artd_u(1); a uuid := pg_temp.artd_u(2); b uuid := pg_temp.artd_u(3); c uuid := pg_temp.artd_u(4);
  pi1 uuid := pg_temp.artd_id('c', 1); pp uuid := pg_temp.artd_id('c', 2); p2 uuid := pg_temp.artd_id('c', 3); pe uuid := pg_temp.artd_id('c', 4);
  o1 uuid; o2 uuid; v text; ve timestamptz;
  poner constant text := 'select public.artes_por_defecto_poner(%L, %L, %L, %L)';
begin
  perform pg_temp.artd_terreno();
  o1 := pg_temp.artd_o(1);
  o2 := pg_temp.artd_o(2);
  perform pg_temp.artd_como(g);
  perform pg_temp.artd_plantilla(p2, o2);
  ve := pg_temp.artd_plantilla(pe, o1);
  perform public.artes_plantilla_visibilidad(pe, ve, 'empresa');
  v := pg_temp.artd_falla(format(poner, o1, 'imagen', p2, null));
  if v <> '22023/plantilla' then raise exception 'una plantilla de otro origen esperaba 22023 plantilla, dio %', v; end if;

  perform pg_temp.artd_como(a);
  perform pg_temp.artd_plantilla(pi1, o1);
  perform pg_temp.artd_plantilla(pp, o1, 'carta');
  v := pg_temp.artd_falla(format(poner, o1, 'pdf', pi1, null));
  if v <> '22023/plantilla' then raise exception 'una de imagen para PDF esperaba 22023 plantilla, dio %', v; end if;
  v := pg_temp.artd_falla(format(poner, o1, 'imagen', pp, null));
  if v <> '22023/plantilla' then raise exception 'una de PDF para imagen esperaba 22023 plantilla, dio %', v; end if;
  v := pg_temp.artd_falla(format(poner, o1, 'video', pi1, null));
  if v <> '22023/tipo' then raise exception 'un tipo desconocido esperaba 22023 tipo, dio %', v; end if;
  v := pg_temp.artd_falla(format(poner, null, 'imagen', pi1, null));
  if v <> '22023/tipo' then raise exception 'sin origen esperaba 22023 tipo, dio %', v; end if;
  v := pg_temp.artd_falla(format(poner, o1, 'imagen', pg_temp.artd_id('c', 99), null));
  if v <> 'P0002/' then raise exception 'una plantilla que no existe esperaba P0002, dio %', v; end if;

  -- La privada de otra persona y la de la empresa de un origen que no se ve: no se encuentran.
  perform pg_temp.artd_como(b);
  v := pg_temp.artd_falla(format(poner, o1, 'imagen', pi1, null));
  if v <> 'P0002/' then raise exception 'la privada de otra persona esperaba P0002, dio %', v; end if;
  perform pg_temp.artd_como(c);
  v := pg_temp.artd_falla(format(poner, o1, 'imagen', pe, null));
  if v <> 'P0002/' then raise exception 'la de la empresa de un origen que no se ve esperaba P0002, dio %', v; end if;
  reset role;
  if exists (select 1 from public.artes_por_defecto where usuario_id in (g, a, b, c)) then raise exception 'un poner que cayó dejó una fila'; end if;
end $$;
rollback;

-- @test artes: hacer privada una plantilla quita la por defecto de las demás personas y deja la de su autor; eliminarla quita la de todas
begin;
do $$
declare
  g uuid := pg_temp.artd_u(1); a uuid := pg_temp.artd_u(2); b uuid := pg_temp.artd_u(3);
  pe uuid := pg_temp.artd_id('c', 1); pp uuid := pg_temp.artd_id('c', 2);
  o1 uuid; ve timestamptz;
begin
  perform pg_temp.artd_terreno();
  o1 := pg_temp.artd_o(1);
  perform pg_temp.artd_como(g);
  ve := pg_temp.artd_plantilla(pe, o1);
  ve := pg_temp.artd_v(public.artes_plantilla_visibilidad(pe, ve, 'empresa'));
  perform public.artes_por_defecto_poner(o1, 'imagen', pe, null);
  perform pg_temp.artd_como(a);
  perform public.artes_por_defecto_poner(o1, 'imagen', pe, null);
  perform pg_temp.artd_plantilla(pp, o1, 'carta');
  perform public.artes_por_defecto_poner(o1, 'pdf', pp, null);
  perform pg_temp.artd_como(b);
  perform public.artes_por_defecto_poner(o1, 'imagen', pe, null);

  perform pg_temp.artd_como(g);
  ve := pg_temp.artd_v(public.artes_plantilla_visibilidad(pe, ve, 'privada'));
  reset role;
  if pg_temp.artd_de(g, o1, 'imagen') is distinct from pe then raise exception 'hacerla privada quitó la por defecto de su autor'; end if;
  if pg_temp.artd_de(a, o1, 'imagen') is not null or pg_temp.artd_de(b, o1, 'imagen') is not null then
    raise exception 'hacerla privada no quitó la por defecto de las demás personas';
  end if;
  if pg_temp.artd_de(a, o1, 'pdf') is distinct from pp then raise exception 'hacerla privada quitó una por defecto de otra plantilla'; end if;

  perform pg_temp.artd_como(g);
  perform public.artes_plantilla_eliminar(pe, ve);
  reset role;
  if pg_temp.artd_de(g, o1, 'imagen') is not null then raise exception 'eliminar la plantilla no quitó la por defecto de su autor'; end if;
end $$;
rollback;

-- @test artes: cada persona lee sólo su plantilla por defecto y nadie la escribe directo
begin;
do $$
declare
  g uuid := pg_temp.artd_u(1); a uuid := pg_temp.artd_u(2); b uuid := pg_temp.artd_u(3); c uuid := pg_temp.artd_u(4);
  pe uuid := pg_temp.artd_id('c', 1);
  o1 uuid; ve timestamptz; vistas uuid[]; v text;
begin
  perform pg_temp.artd_terreno();
  o1 := pg_temp.artd_o(1);
  perform pg_temp.artd_como(g);
  ve := pg_temp.artd_plantilla(pe, o1);
  perform public.artes_plantilla_visibilidad(pe, ve, 'empresa');
  perform public.artes_por_defecto_poner(o1, 'imagen', pe, null);
  perform pg_temp.artd_como(a);
  perform public.artes_por_defecto_poner(o1, 'imagen', pe, null);
  perform pg_temp.artd_como(b);
  perform public.artes_por_defecto_poner(o1, 'imagen', pe, null);

  perform pg_temp.artd_como(a);
  select coalesce(array_agg(usuario_id), '{}') into vistas from public.artes_por_defecto;
  if vistas is distinct from array[a] then raise exception 'una persona lee las por defecto de %', vistas; end if;
  perform pg_temp.artd_como(g);
  select coalesce(array_agg(usuario_id), '{}') into vistas from public.artes_por_defecto;
  if vistas is distinct from array[g] then raise exception 'quien gestiona lee las por defecto de %', vistas; end if;
  perform pg_temp.artd_como(c);
  select coalesce(array_agg(usuario_id), '{}') into vistas from public.artes_por_defecto;
  if vistas <> '{}' then raise exception 'quien no tiene ninguna lee las de %', vistas; end if;

  perform pg_temp.artd_como(a);
  v := pg_temp.artd_falla(format('update public.artes_por_defecto set plantilla_id = %L where usuario_id = %L', pe, b));
  if v <> '42501/' then raise exception 'el update directo esperaba 42501, dio %', v; end if;
  v := pg_temp.artd_falla(format('delete from public.artes_por_defecto where usuario_id = %L', a));
  if v <> '42501/' then raise exception 'el delete directo esperaba 42501, dio %', v; end if;

  -- Una cuenta bloqueada no lee la suya.
  reset role;
  update public.perfiles set bloqueado = true where id = b;
  perform pg_temp.artd_como(b);
  if exists (select 1 from public.artes_por_defecto) then raise exception 'una cuenta bloqueada lee su por defecto'; end if;
  reset role;
end $$;
rollback;
