-- Los grupos de campos de cada origen como catálogo (`origenes_campos_grupos`): nombre único normalizado por origen, el campo guarda
-- `grupo_id` con una FK compuesta que no deja usar el grupo de otro origen, y todo se escribe por `origen_campo_grupo_*` con
-- `origenes.gestionar`. Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y lo revierte.
--
-- Qué asegura:
--   O1. Un origen manual nace con «Vehículo» y «Venta», en el orden de su primer campo, y cada campo de fábrica con el suyo; uno de subasta,
--       con los grupos del catálogo de apibara en el orden de su primer campo; completar el catálogo asegura los grupos que falten.
--   O2. El nombre es único por origen (23505/nombre), y el mismo nombre en otro origen vale.
--   O3. Un campo no usa el grupo de otro origen: 22023/grupo_id por RPC y la FK compuesta, directo.
--   O4. Renombrar, mover y quitar moviendo los campos, acotado al origen: el grupo de otro origen es PT409.
--   O5. Borrar un origen se lleva sus grupos y sus campos en la misma cascada.
--   O6. Sin `origenes.gestionar`, 42501.
--   O7. Una sola versión de cada RPC, definer con search_path y sus grants; las ayudas no se llaman desde afuera.

-- @test grupos de orígenes: los ayudantes
reset role;
create or replace function pg_temp.ogc_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- El error de un SQL corrido como esa persona: «sqlstate», «sqlstate/hint» o «sin error»; con `p_mensaje`, además «: mensaje».
create or replace function pg_temp.ogc_codigo(p_quien uuid, p_sql text, p_mensaje boolean default false) returns text language plpgsql as $f$
declare v_hint text; v_mensaje text;
begin
  perform pg_temp.ogc_como(p_quien);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint, v_mensaje = message_text;
  reset role;
  return sqlstate || coalesce('/' || nullif(v_hint, ''), '') || case when p_mensaje then ': ' || v_mensaje else '' end;
end $f$;

create or replace function pg_temp.ogc_json(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform pg_temp.ogc_como(p_quien);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  return r;
end $f$;

-- Dos orígenes manuales (nacen con sus campos y grupos de fábrica) y dos personas con rol propio (la primera cuenta nace dueña: se le
-- quita): Pía gestiona los orígenes y Ana no tiene claves.
create or replace function pg_temp.ogc_preparar() returns void language plpgsql as $f$
declare p uuid; v_rol uuid; i int := 0;
begin
  insert into public.origenes (clave, nombre) values ('prueba_ogc1', 'Prueba ogc 1'), ('prueba_ogc2', 'Prueba ogc 2');
  foreach p in array array['00000000-0000-4000-8000-00000009940f', '00000000-0000-4000-8000-00000009940a']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'OGC ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('ogc_rol_' || i, 'OGC rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    if i = 1 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'origenes.gestionar', null, 'todos');
    end if;
  end loop;
end $f$;

create or replace function pg_temp.ogc_origen(p_clave text) returns uuid language sql as $f$
  select id from public.origenes where clave = p_clave
$f$;

create or replace function pg_temp.ogc_grupo(p_origen text, p_nombre text) returns uuid language sql as $f$
  select g.id from public.origenes_campos_grupos g where g.origen_id = pg_temp.ogc_origen(p_origen) and g.nombre = p_nombre
$f$;

create or replace function pg_temp.ogc_campo(p_origen text, p_clave text) returns uuid language sql as $f$
  select c.id from public.origenes_campos c where c.origen_id = pg_temp.ogc_origen(p_origen) and c.clave = p_clave
$f$;

create or replace function pg_temp.ogc_version(p_id uuid) returns timestamptz language sql as $f$
  select coalesce((select actualizado_en from public.origenes_campos_grupos where id = p_id),
                  (select actualizado_en from public.origenes_campos where id = p_id))
$f$;

create or replace function pg_temp.ogc_grupos(p_origen text) returns text[] language sql as $f$
  select array_agg(g.nombre order by g.orden) from public.origenes_campos_grupos g where g.origen_id = pg_temp.ogc_origen(p_origen)
$f$;

-- @test grupos de orígenes: un origen nace con sus grupos en el orden de su primer campo, y completar apibara asegura los que falten (O1)
begin;
select pg_temp.ogc_preparar();
do $$
declare s uuid; v_esperados text[]; n int;
begin
  if pg_temp.ogc_grupos('prueba_ogc1') <> array['Vehículo', 'Venta'] then raise exception 'manual: %', pg_temp.ogc_grupos('prueba_ogc1'); end if;
  if exists (select 1 from public.origenes_campos c where c.origen_id = pg_temp.ogc_origen('prueba_ogc1') and c.grupo_id is null) then
    raise exception 'un campo de fábrica nació sin grupo'; end if;
  if (select c.grupo_id from public.origenes_campos c where c.id = pg_temp.ogc_campo('prueba_ogc1', 'condicion'))
     <> pg_temp.ogc_grupo('prueba_ogc1', 'Venta') then raise exception 'la condición no quedó en «Venta»'; end if;

  insert into public.origenes (clave, nombre, tipo) values ('prueba_ogcs', 'Prueba ogc subasta', 'subasta') returning id into s;
  select array_agg(x.grupo order by x.primero) into v_esperados
    from (select c.grupo, min(c.orden) as primero from public._apibara_catalogo() c where c.grupo is not null group by c.grupo) x;
  if pg_temp.ogc_grupos('prueba_ogcs') <> v_esperados then
    raise exception 'subasta: % (esperaba %)', pg_temp.ogc_grupos('prueba_ogcs'), v_esperados; end if;
  if exists (select 1 from public.origenes_campos c join public._apibara_catalogo() a on a.clave = c.clave
             where c.origen_id = s and a.grupo is not null and c.grupo_id is null) then
    raise exception 'un campo de apibara nació sin su grupo'; end if;

  -- Sin un grupo y sus campos, completar los vuelve a crear.
  delete from public.origenes_campos c using public.origenes_campos_grupos g
   where g.id = c.grupo_id and g.origen_id = s and g.nombre = v_esperados[1];
  delete from public.origenes_campos_grupos where origen_id = s and nombre = v_esperados[1];
  n := public.origen_apibara_completar(s);
  if n = 0 or not (v_esperados[1] = any (pg_temp.ogc_grupos('prueba_ogcs'))) then
    raise exception 'completar no aseguró el grupo: % / %', n, pg_temp.ogc_grupos('prueba_ogcs'); end if;
  if exists (select 1 from public.origenes_campos c join public._apibara_catalogo() a on a.clave = c.clave
             where c.origen_id = s and a.grupo is not null and c.grupo_id is null) then
    raise exception 'completar dejó un campo sin su grupo'; end if;
end $$;
rollback;

-- @test grupos de orígenes: el nombre es único por origen y otro origen puede repetirlo (O2)
begin;
select pg_temp.ogc_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-00000009940f'; j jsonb; r text;
begin
  r := pg_temp.ogc_codigo(pia, format('select public.origen_campo_grupo_crear(%L, %L)', pg_temp.ogc_origen('prueba_ogc1'), ' VEHICULO '), true);
  if r <> '23505/nombre: Ya existe «Vehículo».' then raise exception 'el repetido sin tilde: %', r; end if;
  j := pg_temp.ogc_json(pia, format('select public.origen_campo_grupo_crear(%L, %L)', pg_temp.ogc_origen('prueba_ogc1'), 'OGC Extras'));
  if jsonb_path_query_first(j, '$.nombre') <> '"OGC Extras"'::jsonb or (j ->> 'orden')::int <> 30 then raise exception 'crear: %', j; end if;
  j := pg_temp.ogc_json(pia, format('select public.origen_campo_grupo_crear(%L, %L)', pg_temp.ogc_origen('prueba_ogc2'), 'ogc extras'));
  if jsonb_path_query_first(j, '$.nombre') <> '"ogc extras"'::jsonb then raise exception 'el mismo nombre en otro origen: %', j; end if;
  r := pg_temp.ogc_codigo(pia, format('select public.origen_campo_grupo_crear(%L, %L)', gen_random_uuid(), 'OGC Nada'));
  if r <> 'PT409' then raise exception 'en un origen que no existe: %', r; end if;
end $$;
rollback;

-- @test grupos de orígenes: un campo no usa el grupo de otro origen (O3)
begin;
select pg_temp.ogc_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-00000009940f'; c uuid := pg_temp.ogc_campo('prueba_ogc1', 'color');
        ajeno uuid := pg_temp.ogc_grupo('prueba_ogc2', 'Venta'); r text;
begin
  r := pg_temp.ogc_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', c, pg_temp.ogc_version(c), jsonb_build_object('grupo_id', ajeno)));
  if r <> '22023/grupo_id' then raise exception 'guardar con el grupo de otro origen: %', r; end if;
  r := pg_temp.ogc_codigo(pia, format('select public.origen_campo_crear(%L, %L, %L, %L, p_grupo_id => %L)',
                                      pg_temp.ogc_origen('prueba_ogc1'), 'ogc_nuevo', 'OGC Nuevo', 'texto', ajeno));
  if r <> '22023/grupo_id' then raise exception 'crear con el grupo de otro origen: %', r; end if;
  begin
    update public.origenes_campos set grupo_id = ajeno where id = c;
    raise exception 'la FK dejó usar el grupo de otro origen';
  exception when foreign_key_violation then null;
  end;
  r := pg_temp.ogc_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', c, pg_temp.ogc_version(c),
                                      jsonb_build_object('grupo_id', pg_temp.ogc_grupo('prueba_ogc1', 'Venta'))));
  if r <> 'sin error' or (select grupo_id from public.origenes_campos where id = c) <> pg_temp.ogc_grupo('prueba_ogc1', 'Venta') then
    raise exception 'cambiar a un grupo del mismo origen: %', r; end if;
  if (select clave from public.origenes_campos where grupo_id = pg_temp.ogc_grupo('prueba_ogc1', 'Venta') order by orden desc limit 1) <> 'color' then
    raise exception 'no quedó al final del grupo nuevo'; end if;
end $$;
rollback;

-- @test grupos de orígenes: renombrar, mover y quitar moviendo los campos, acotado al origen (O4)
begin;
select pg_temp.ogc_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-00000009940f'; o1 uuid := pg_temp.ogc_origen('prueba_ogc1'); o2 uuid := pg_temp.ogc_origen('prueba_ogc2');
        veh uuid := pg_temp.ogc_grupo('prueba_ogc1', 'Vehículo'); venta uuid := pg_temp.ogc_grupo('prueba_ogc1', 'Venta'); r text;
begin
  r := pg_temp.ogc_codigo(pia, format('select public.origen_campo_grupo_guardar(%L, %L, %L, %L)', o2, veh, pg_temp.ogc_version(veh), '{"nombre": "OGC X"}'));
  if r <> 'PT409' then raise exception 'renombrar el grupo de otro origen: %', r; end if;
  r := pg_temp.ogc_codigo(pia, format('select public.origen_campo_grupo_guardar(%L, %L, %L, %L)', o1, veh, pg_temp.ogc_version(veh), '{"nombre": "venta"}'), true);
  if r <> '23505/nombre: Ya existe «Venta».' then raise exception 'renombrar al de otro: %', r; end if;
  r := pg_temp.ogc_codigo(pia, format('select public.origen_campo_grupo_guardar(%L, %L, %L, %L)', o1, veh, pg_temp.ogc_version(veh), '{"nombre": "Ficha técnica"}'));
  if r <> 'sin error' or pg_temp.ogc_grupos('prueba_ogc1') <> array['Ficha técnica', 'Venta'] then raise exception 'renombrar: % / %', r, pg_temp.ogc_grupos('prueba_ogc1'); end if;
  if pg_temp.ogc_grupos('prueba_ogc2') <> array['Vehículo', 'Venta'] then raise exception 'renombrar tocó otro origen'; end if;

  r := pg_temp.ogc_codigo(pia, format('select public.origen_campo_grupo_mover(%L, %L, %L)', o1, venta, pg_temp.ogc_version(venta)));
  if r <> 'sin error' or pg_temp.ogc_grupos('prueba_ogc1') <> array['Venta', 'Ficha técnica'] then raise exception 'mover: % / %', r, pg_temp.ogc_grupos('prueba_ogc1'); end if;
  r := pg_temp.ogc_codigo(pia, format('select public.origen_campo_grupo_mover(%L, %L, %L, %L)', o1, venta, pg_temp.ogc_version(venta),
                                      pg_temp.ogc_grupo('prueba_ogc2', 'Venta')));
  if r <> 'PT409' then raise exception 'mover después del grupo de otro origen: %', r; end if;

  r := pg_temp.ogc_codigo(pia, format('select public.origen_campo_grupo_eliminar(%L, %L, %L)', o1, venta, pg_temp.ogc_version(venta)), true);
  if r <> '23503/campos: Tiene 2 campos: muévelos a otro grupo antes de quitarlo.' then raise exception 'quitar con campos: %', r; end if;
  r := pg_temp.ogc_codigo(pia, format('select public.origen_campo_grupo_eliminar(%L, %L, %L, true, %L)', o1, venta, pg_temp.ogc_version(venta),
                                      pg_temp.ogc_grupo('prueba_ogc2', 'Vehículo')));
  if r <> '22023/destino' then raise exception 'mover a un grupo de otro origen: %', r; end if;
  r := pg_temp.ogc_codigo(pia, format('select public.origen_campo_grupo_eliminar(%L, %L, %L, true, %L)', o1, venta, pg_temp.ogc_version(venta), veh));
  if r <> 'sin error' or pg_temp.ogc_grupos('prueba_ogc1') <> array['Ficha técnica'] then raise exception 'mover y quitar: %', r; end if;
  if (select array_agg(clave order by orden) from public.origenes_campos where origen_id = o1)
     <> array['color', 'transmision', 'combustible', 'motor', 'traccion', 'carroceria', 'condicion', 'descripcion'] then
    raise exception 'los campos movidos no quedaron al final, en su orden'; end if;
  if exists (select 1 from public.origenes_campos where origen_id = o1 and (grupo_id is distinct from veh or orden % 10 <> 0)) then
    raise exception 'quedó un campo fuera del destino o sin renumerar'; end if;
end $$;
rollback;

-- @test grupos de orígenes: borrar un origen se lleva sus grupos y sus campos (O5)
begin;
select pg_temp.ogc_preparar();
do $$
declare o uuid := pg_temp.ogc_origen('prueba_ogc1');
begin
  delete from public.origenes where id = o;
  if exists (select 1 from public.origenes_campos_grupos where origen_id = o) or exists (select 1 from public.origenes_campos where origen_id = o) then
    raise exception 'quedaron grupos o campos del origen borrado'; end if;
end $$;
rollback;

-- @test grupos de orígenes: sin origenes.gestionar, 42501 (O6)
begin;
select pg_temp.ogc_preparar();
do $$
declare ana uuid := '00000000-0000-4000-8000-00000009940a'; o1 uuid := pg_temp.ogc_origen('prueba_ogc1');
        veh uuid := pg_temp.ogc_grupo('prueba_ogc1', 'Vehículo'); r text;
begin
  r := pg_temp.ogc_codigo(ana, format('select public.origen_campo_grupo_crear(%L, %L)', o1, 'OGC de Ana'));
  if r <> '42501' then raise exception 'crear sin la clave: %', r; end if;
  r := pg_temp.ogc_codigo(ana, format('select public.origen_campo_grupo_guardar(%L, %L, %L, %L)', o1, veh, pg_temp.ogc_version(veh), '{"activo": false}'));
  if r <> '42501' then raise exception 'guardar sin la clave: %', r; end if;
  r := pg_temp.ogc_codigo(ana, format('select public.origen_campo_grupo_mover(%L, %L, %L)', o1, veh, pg_temp.ogc_version(veh)));
  if r <> '42501' then raise exception 'mover sin la clave: %', r; end if;
  r := pg_temp.ogc_codigo(ana, format('select public.origen_campo_grupo_eliminar(%L, %L, %L, true)', o1, veh, pg_temp.ogc_version(veh)));
  if r <> '42501' then raise exception 'quitar sin la clave: %', r; end if;
  r := pg_temp.ogc_codigo(ana, format('insert into public.origenes_campos_grupos (origen_id, nombre, orden) values (%L, %L, 1)', o1, 'OGC directo'));
  if r <> '42501' then raise exception 'insertó directo: %', r; end if;
end $$;
rollback;

-- @test grupos de orígenes: una sola versión de cada RPC, con sus grants; las ayudas no se llaman desde afuera (O7)
do $$
declare v_nombre text; v_n int; p record;
begin
  foreach v_nombre in array array['origen_campo_grupo_crear', 'origen_campo_grupo_guardar', 'origen_campo_grupo_mover',
                                  'origen_campo_grupo_eliminar', 'origen_apibara_agregar'] loop
    select count(*)::int into v_n from pg_proc x join pg_namespace n on n.oid = x.pronamespace where n.nspname = 'public' and x.proname = v_nombre;
    if v_n <> 1 then raise exception '% tiene % versiones', v_nombre, v_n; end if;
    select x.oid, x.prosecdef, x.proconfig, x.prosrc into p
      from pg_proc x join pg_namespace n on n.oid = x.pronamespace where n.nspname = 'public' and x.proname = v_nombre;
    if not p.prosecdef or not ('search_path=""' = any (coalesce(p.proconfig, '{}'))) then raise exception '% sin definer o search_path', v_nombre; end if;
    if position('''origenes.gestionar''' in p.prosrc) = 0 then raise exception '% no pide origenes.gestionar', v_nombre; end if;
    if has_function_privilege('anon', p.oid, 'execute') then raise exception '% ejecutable por anon', v_nombre; end if;
    if exists (select 1 from aclexplode((select proacl from pg_proc where oid = p.oid)) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception '% ejecutable por PUBLIC', v_nombre;
    end if;
    if not has_function_privilege('authenticated', p.oid, 'execute') then raise exception '% sin execute para authenticated', v_nombre; end if;
  end loop;
  foreach v_nombre in array array['_origen_campo_grupo_asegurar', '_origen_campo_grupo_exigir', 'origen_apibara_completar',
                                  'origen_preconfigurar_campos'] loop
    select x.oid, x.proconfig into p from pg_proc x join pg_namespace n on n.oid = x.pronamespace where n.nspname = 'public' and x.proname = v_nombre;
    if p.oid is null then raise exception 'falta la ayuda %', v_nombre; end if;
    if has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute') then
      raise exception 'la ayuda % se llama desde afuera', v_nombre;
    end if;
    if not ('search_path=""' = any (coalesce(p.proconfig, '{}'))) then raise exception 'la ayuda % sin search_path', v_nombre; end if;
  end loop;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'origenes_campos' and column_name = 'grupo') then
    raise exception 'la columna de texto de antes sigue en origenes_campos';
  end if;
end $$;
