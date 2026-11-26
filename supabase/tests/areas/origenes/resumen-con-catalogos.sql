-- `origenes_resumen()` también lo lee quien sólo gestiona los catálogos de logística de un origen (abre la pestaña Fases de ese origen, donde se configuran
-- puertos, navieras, categorías de gasto y tipos de documento): devuelve las filas. Sin ninguno de los cuatro permisos, 42501; con sólo
-- `cotizaciones.configurar`, sigue igual. Cada bloque arma su terreno y lo revierte.

-- @test resumen con los catálogos: los ayudantes
reset role;
create or replace function pg_temp.rcc_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Cuántas filas del resumen ve esa persona, o el sqlstate si falla.
create or replace function pg_temp.rcc_leer(p_quien uuid) returns text language plpgsql as $f$
declare n int;
begin
  perform pg_temp.rcc_como(p_quien);
  set local role authenticated;
  select count(*) into n from public.origenes_resumen();
  reset role;
  return n::text;
exception when others then
  reset role;
  return sqlstate;
end $f$;

-- Dos orígenes y tres personas con rol propio (la cuenta nace dueña: se le quita): Lía gestiona los catálogos sólo en A, Pía configura el cotizador y
-- Ana no tiene claves.
create or replace function pg_temp.rcc_preparar() returns void language plpgsql as $f$
declare p uuid; v_rol uuid; i int := 0; a uuid;
begin
  insert into public.origenes (clave, nombre) values ('prueba_rcc_a', 'Prueba rcc A') returning id into a;
  insert into public.origenes (clave, nombre) values ('prueba_rcc_b', 'Prueba rcc B');
  foreach p in array array['00000000-0000-4000-8000-00000007ec01', '00000000-0000-4000-8000-00000007ec02', '00000000-0000-4000-8000-00000007ec03']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'RCC ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('rcc_rol_' || i, 'RCC rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    if i = 1 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'logistica.catalogos.gestionar', a, 'todos');
    elsif i = 2 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.configurar', null, 'todos');
    end if;
  end loop;
end $f$;

-- @test resumen con los catálogos: R1 con sólo los catálogos de logística en A, devuelve las filas
begin;
select pg_temp.rcc_preparar();
do $$
declare r text := pg_temp.rcc_leer('00000000-0000-4000-8000-00000007ec01');
begin
  if r !~ '^[0-9]+$' or r::int < 2 then raise exception 'con sólo los catálogos de logística no leyó el resumen: %', r; end if;
end $$;
rollback;

-- @test resumen con los catálogos: R2 sin ninguno de los cuatro permisos, 42501
begin;
select pg_temp.rcc_preparar();
do $$
declare r text := pg_temp.rcc_leer('00000000-0000-4000-8000-00000007ec03');
begin
  if r <> '42501' then raise exception 'sin permisos leyó el resumen: %', r; end if;
end $$;
rollback;

-- @test resumen con los catálogos: R3 con sólo cotizaciones.configurar, sigue igual
begin;
select pg_temp.rcc_preparar();
do $$
declare r text := pg_temp.rcc_leer('00000000-0000-4000-8000-00000007ec02');
begin
  if r !~ '^[0-9]+$' or r::int < 2 then raise exception 'con cotizaciones.configurar no leyó el resumen: %', r; end if;
end $$;
rollback;
