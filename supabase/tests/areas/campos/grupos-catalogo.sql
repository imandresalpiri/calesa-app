-- Los grupos de campos de los leads como catálogo (`leads_campos_grupos`): el mismo nombre es el mismo grupo sin importar mayúsculas,
-- tildes ni espacios, el campo guarda `grupo_id` y todo se escribe por `lead_campo_grupo_*` con `leads.campos.gestionar`. Corre en PGlite
-- (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y lo revierte.
--
-- Qué asegura:
--   G1. La clave normalizada (`_nombre_de_catalogo()`) es la de `claveDeNombre()` (`src/shared/lib/catalogo/nombre.test.ts`).
--   G2. Crear guarda el nombre limpio y al final; el mismo nombre escrito de otra forma es 23505/nombre «Ya existe «X».»; vacío o largo,
--       23514/nombre; el tope de 100.
--   G3. Guardar pide la versión; renombrar no choca con otro; desactivar deja de ofrecerlo a un campo (22023/grupo_id), pero el campo que
--       ya lo tiene lo conserva.
--   G4. Mover cambia el orden de los bloques.
--   G5. Quitar: sin campos, directo; con campos pide moverlos (23503/campos) y los manda al final de un grupo activo o a «Sin grupo».
--   G6. Un campo elige un grupo que existe; cambiar de grupo lo manda al final del nuevo.
--   G7. Sin `leads.campos.gestionar`, 42501; nadie escribe la tabla directo.
--   G8. Una sola versión de cada RPC, definer con search_path y sus grants; las ayudas no se llaman desde afuera.

-- @test grupos de leads: los ayudantes
reset role;
create or replace function pg_temp.gc_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- El error de un SQL corrido como esa persona: «sqlstate», «sqlstate/hint» o «sin error»; con `p_mensaje`, además «: mensaje».
create or replace function pg_temp.gc_codigo(p_quien uuid, p_sql text, p_mensaje boolean default false) returns text language plpgsql as $f$
declare v_hint text; v_mensaje text;
begin
  perform pg_temp.gc_como(p_quien);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint, v_mensaje = message_text;
  reset role;
  return sqlstate || coalesce('/' || nullif(v_hint, ''), '') || case when p_mensaje then ': ' || v_mensaje else '' end;
end $f$;

create or replace function pg_temp.gc_json(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform pg_temp.gc_como(p_quien);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  return r;
end $f$;

-- Dos personas con rol propio (la primera cuenta nace dueña: se le quita): Gala gestiona los campos de leads y Cora sólo tiene
-- `leads.configurar`. Tres grupos al final («GC Uno» con dos campos, «GC Dos» con uno, «GC Tres» vacío) y un campo sin grupo.
create or replace function pg_temp.gc_preparar() returns void language plpgsql as $f$
declare p uuid; v_rol uuid; i int := 0; v_base int := coalesce((select max(orden) from public.leads_campos_grupos), 0);
begin
  insert into public.leads_campos_grupos (id, nombre, orden) values
    ('00000000-0000-4000-8000-0000000993a1', 'GC Uno', v_base + 10),
    ('00000000-0000-4000-8000-0000000993a2', 'GC Dos', v_base + 20),
    ('00000000-0000-4000-8000-0000000993a3', 'GC Tres', v_base + 30);
  insert into public.leads_campos (id, clave, etiqueta, tipo, orden, grupo_id) values
    ('00000000-0000-4000-8000-0000000993c1', 'gc_uno_a', 'GC Uno A', 'texto', 3001, '00000000-0000-4000-8000-0000000993a1'),
    ('00000000-0000-4000-8000-0000000993c2', 'gc_uno_b', 'GC Uno B', 'texto', 3002, '00000000-0000-4000-8000-0000000993a1'),
    ('00000000-0000-4000-8000-0000000993c3', 'gc_dos_a', 'GC Dos A', 'texto', 3003, '00000000-0000-4000-8000-0000000993a2'),
    ('00000000-0000-4000-8000-0000000993c4', 'gc_suelto', 'GC Suelto', 'texto', 3004, null);
  foreach p in array array['00000000-0000-4000-8000-00000009930f', '00000000-0000-4000-8000-00000009930c']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'GC ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('gc_rol_' || i, 'GC rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
      values (v_rol, case when i = 1 then 'leads.campos.gestionar' else 'leads.configurar' end, null, 'todos');
  end loop;
end $f$;

create or replace function pg_temp.gc_version(p_id uuid) returns timestamptz language sql as $f$
  select coalesce((select actualizado_en from public.leads_campos_grupos where id = p_id),
                  (select actualizado_en from public.leads_campos where id = p_id))
$f$;

create or replace function pg_temp.gc_guardar(p_quien uuid, p_grupo uuid, p_cambios jsonb, p_mensaje boolean default false) returns text language sql as $f$
  select pg_temp.gc_codigo(p_quien, format('select public.lead_campo_grupo_guardar(%L, %L, %L)', p_grupo, pg_temp.gc_version(p_grupo), p_cambios), p_mensaje)
$f$;

create or replace function pg_temp.gc_eliminar(p_quien uuid, p_grupo uuid, p_mover boolean default false, p_destino uuid default null,
                                               p_mensaje boolean default false) returns text language sql as $f$
  select pg_temp.gc_codigo(p_quien, format('select public.lead_campo_grupo_eliminar(%L, %L, %L, %L)', p_grupo, pg_temp.gc_version(p_grupo),
                                           p_mover, p_destino), p_mensaje)
$f$;

create or replace function pg_temp.gc_campo_guardar(p_quien uuid, p_campo uuid, p_cambios jsonb) returns text language sql as $f$
  select pg_temp.gc_codigo(p_quien, format('select public.lead_campo_guardar(%L, %L, %L)', p_campo, pg_temp.gc_version(p_campo), p_cambios))
$f$;

-- Los nombres de los grupos de la prueba en el orden de los bloques.
create or replace function pg_temp.gc_orden() returns text[] language sql as $f$
  select array_agg(nombre order by orden) from public.leads_campos_grupos where nombre like 'GC %'
$f$;

-- @test grupos de leads: la clave normalizada es la de claveDeNombre() (G1)
do $$
declare v text;
begin
  foreach v in array array['Datos', 'datos ', 'Dátos', 'DATOS', '  datos'] loop
    if public._nombre_de_catalogo(v) <> 'datos' then raise exception '«%» dio «%»', v, public._nombre_de_catalogo(v); end if;
  end loop;
  if public._nombre_de_catalogo(E'Datos\t del  cliente') <> 'datos del cliente' then
    raise exception 'los espacios de más: «%»', public._nombre_de_catalogo(E'Datos\t del  cliente'); end if;
  if public._nombre_de_catalogo('Año') <> 'ano' or public._nombre_de_catalogo('Ano') <> 'ano' then
    raise exception 'la ñ pierde la virgulilla: «%»', public._nombre_de_catalogo('Año'); end if;
  if public._nombre_de_catalogo('Datos del cliente') = public._nombre_de_catalogo('Datosdel cliente') then
    raise exception 'juntó nombres distintos'; end if;
  if public._nombre_limpio(E'  Datos\t del \n cliente  ') <> 'Datos del cliente' or public._nombre_limpio(' Ubicación ') <> 'Ubicación' then
    raise exception 'el nombre limpio: «%»', public._nombre_limpio(E'  Datos\t del \n cliente  '); end if;
end $$;

-- @test grupos de leads: crear guarda el nombre limpio y rechaza el repetido, el vacío, el largo y el que pasa del tope (G2)
begin;
select pg_temp.gc_preparar();
do $$
declare gala uuid := '00000000-0000-4000-8000-00000009930f'; j jsonb; r text;
begin
  j := pg_temp.gc_json(gala, 'select public.lead_campo_grupo_crear(''  GC   Extras  del lead '')');
  if jsonb_path_query_first(j, '$.nombre') <> '"GC Extras del lead"'::jsonb or jsonb_path_query_first(j, '$.activo') <> 'true'::jsonb then
    raise exception 'crear: %', j; end if;
  if (j ->> 'orden')::int <> (select max(orden) from public.leads_campos_grupos) then raise exception 'no nació al final: %', j; end if;
  if (select actualizado_en from public.leads_campos_grupos where id = (j ->> 'id')::uuid) <> (j ->> 'actualizado_en')::timestamptz then
    raise exception 'no devolvió la versión: %', j; end if;
  r := pg_temp.gc_codigo(gala, 'select public.lead_campo_grupo_crear(''gc extras DÉL  lead'')', true);
  if r <> '23505/nombre: Ya existe «GC Extras del lead».' then raise exception 'el repetido con otras mayúsculas y tildes: %', r; end if;
  r := pg_temp.gc_codigo(gala, 'select public.lead_campo_grupo_crear(''GC uno '')', true);
  if r <> '23505/nombre: Ya existe «GC Uno».' then raise exception 'el repetido con un espacio de más: %', r; end if;
  r := pg_temp.gc_codigo(gala, 'select public.lead_campo_grupo_crear(''   '')', true);
  if r <> '23514/nombre: Escribe un nombre.' then raise exception 'el vacío: %', r; end if;
  r := pg_temp.gc_codigo(gala, 'select public.lead_campo_grupo_crear(null)');
  if r <> '23514/nombre' then raise exception 'el nulo: %', r; end if;
  r := pg_temp.gc_codigo(gala, format('select public.lead_campo_grupo_crear(%L)', repeat('x', 41)), true);
  if r <> '23514/nombre: Hasta 40 caracteres.' then raise exception 'el largo: %', r; end if;
  -- El tope: con 100 grupos, uno más es 23514.
  insert into public.leads_campos_grupos (nombre, orden)
  select 'GC tope ' || i, 5000 + i from generate_series(1, greatest(0, 100 - (select count(*)::int from public.leads_campos_grupos))) i;
  r := pg_temp.gc_codigo(gala, 'select public.lead_campo_grupo_crear(''GC uno más'')', true);
  if r <> '23514/nombre: Ya hay 100 grupos, el máximo: quita uno que no uses.' then raise exception 'el tope: %', r; end if;
end $$;
rollback;

-- @test grupos de leads: guardar pide la versión, no choca al renombrar y desactivar no saca el grupo a quien lo tiene (G3)
begin;
select pg_temp.gc_preparar();
do $$
declare gala uuid := '00000000-0000-4000-8000-00000009930f'; uno uuid := '00000000-0000-4000-8000-0000000993a1';
        c1 uuid := '00000000-0000-4000-8000-0000000993c1'; suelto uuid := '00000000-0000-4000-8000-0000000993c4'; r text;
begin
  r := pg_temp.gc_codigo(gala, format('select public.lead_campo_grupo_guardar(%L, %L, %L)', uno, pg_temp.gc_version(uno) - interval '1 second',
                                      '{"nombre": "GC Otro"}'), true);
  if r <> 'PT409: Otra persona cambió este grupo mientras lo editabas.' then raise exception 'con una versión vieja: %', r; end if;
  r := pg_temp.gc_guardar(gala, uno, '{"nombre": " gc  DOS "}', true);
  if r <> '23505/nombre: Ya existe «GC Dos».' then raise exception 'renombrar al nombre de otro: %', r; end if;
  r := pg_temp.gc_guardar(gala, uno, '{"nombre": "gc   uno"}');
  if r <> 'sin error' or (select nombre from public.leads_campos_grupos where id = uno) <> 'gc uno' then
    raise exception 'renombrar a sí mismo con otras mayúsculas: %', r; end if;
  r := pg_temp.gc_guardar(gala, uno, '{"orden": 5}');
  if r <> '22023' then raise exception 'un dato que no se cambia así: %', r; end if;
  r := pg_temp.gc_guardar(gala, uno, '{"activo": null}');
  if r <> '22023/activo' then raise exception 'activo nulo: %', r; end if;
  r := pg_temp.gc_codigo(gala, format('select public.lead_campo_grupo_guardar(%L, now(), %L)', gen_random_uuid(), '{"activo": false}'));
  if r <> 'PT409' then raise exception 'un grupo que no existe: %', r; end if;

  r := pg_temp.gc_guardar(gala, uno, '{"activo": false}');
  if r <> 'sin error' or (select activo from public.leads_campos_grupos where id = uno) then raise exception 'desactivar: %', r; end if;
  r := pg_temp.gc_campo_guardar(gala, suelto, jsonb_build_object('grupo_id', uno));
  if r <> '22023/grupo_id' then raise exception 'un campo eligió un grupo desactivado: %', r; end if;
  r := pg_temp.gc_codigo(gala, format('select public.lead_campo_crear(%L, %L, %L, p_grupo_id => %L)', 'gc_nuevo', 'GC Nuevo', 'texto', uno));
  if r <> '22023/grupo_id' then raise exception 'un campo nuevo nació en un grupo desactivado: %', r; end if;
  r := pg_temp.gc_campo_guardar(gala, c1, '{"etiqueta": "GC Uno A bis"}');
  if r <> 'sin error' or (select grupo_id from public.leads_campos where id = c1) <> uno then
    raise exception 'el campo que ya estaba en el grupo desactivado no lo conservó: %', r; end if;
  r := pg_temp.gc_guardar(gala, uno, '{"activo": true}');
  r := pg_temp.gc_campo_guardar(gala, suelto, jsonb_build_object('grupo_id', uno));
  if r <> 'sin error' then raise exception 'reactivado, se vuelve a elegir: %', r; end if;
end $$;
rollback;

-- @test grupos de leads: mover cambia el orden de los bloques (G4)
begin;
select pg_temp.gc_preparar();
do $$
declare gala uuid := '00000000-0000-4000-8000-00000009930f'; uno uuid := '00000000-0000-4000-8000-0000000993a1';
        tres uuid := '00000000-0000-4000-8000-0000000993a3'; r text;
begin
  r := pg_temp.gc_codigo(gala, format('select public.lead_campo_grupo_mover(%L, %L)', tres, pg_temp.gc_version(tres)));
  if r <> 'sin error' or pg_temp.gc_orden() <> array['GC Tres', 'GC Uno', 'GC Dos'] then raise exception 'primero: % / %', r, pg_temp.gc_orden(); end if;
  if (select min(orden) from public.leads_campos_grupos) <> (select orden from public.leads_campos_grupos where id = tres) then
    raise exception 'no quedó primero de todo el catálogo'; end if;
  r := pg_temp.gc_codigo(gala, format('select public.lead_campo_grupo_mover(%L, %L, %L)', tres, pg_temp.gc_version(tres), uno));
  if r <> 'sin error' or pg_temp.gc_orden() <> array['GC Uno', 'GC Tres', 'GC Dos'] then raise exception 'después de Uno: % / %', r, pg_temp.gc_orden(); end if;
  r := pg_temp.gc_codigo(gala, format('select public.lead_campo_grupo_mover(%L, %L, %L)', tres, pg_temp.gc_version(tres), tres));
  if r <> '22023' then raise exception 'después de sí mismo: %', r; end if;
  r := pg_temp.gc_codigo(gala, format('select public.lead_campo_grupo_mover(%L, %L, %L)', tres, pg_temp.gc_version(tres), gen_random_uuid()));
  if r <> 'PT409' then raise exception 'después de uno que no existe: %', r; end if;
  r := pg_temp.gc_codigo(gala, format('select public.lead_campo_grupo_mover(%L, %L)', tres, pg_temp.gc_version(tres) - interval '1 second'));
  if r <> 'PT409' then raise exception 'con una versión vieja: %', r; end if;
end $$;
rollback;

-- @test grupos de leads: quitar pide mover los campos y los manda al final de otro grupo o a «Sin grupo» (G5)
begin;
select pg_temp.gc_preparar();
do $$
declare gala uuid := '00000000-0000-4000-8000-00000009930f'; uno uuid := '00000000-0000-4000-8000-0000000993a1';
        dos uuid := '00000000-0000-4000-8000-0000000993a2'; tres uuid := '00000000-0000-4000-8000-0000000993a3'; r text; v_ordenes int[];
begin
  r := pg_temp.gc_eliminar(gala, tres);
  if r <> 'sin error' or exists (select 1 from public.leads_campos_grupos where id = tres) then raise exception 'quitar uno vacío: %', r; end if;
  r := pg_temp.gc_eliminar(gala, uno, p_mensaje => true);
  if r <> '23503/campos: Tiene 2 campos: muévelos a otro grupo antes de quitarlo.' then raise exception 'quitar con campos: %', r; end if;
  r := pg_temp.gc_eliminar(gala, dos, p_mensaje => true);
  if r <> '23503/campos: Tiene 1 campo: muévelo a otro grupo antes de quitarlo.' then raise exception 'quitar con un campo: %', r; end if;
  r := pg_temp.gc_eliminar(gala, uno, true, uno);
  if r <> '22023/destino' then raise exception 'mover a sí mismo: %', r; end if;
  perform pg_temp.gc_guardar(gala, dos, '{"activo": false}');
  r := pg_temp.gc_eliminar(gala, uno, true, dos);
  if r <> '22023/destino' then raise exception 'mover a uno desactivado: %', r; end if;
  perform pg_temp.gc_guardar(gala, dos, '{"activo": true}');
  r := pg_temp.gc_eliminar(gala, uno, true, dos);
  if r <> 'sin error' or exists (select 1 from public.leads_campos_grupos where id = uno) then raise exception 'mover y quitar: %', r; end if;
  select array_agg(orden order by orden) into v_ordenes from public.leads_campos where grupo_id = dos;
  if (select array_agg(clave order by orden) from public.leads_campos where grupo_id = dos) <> array['gc_dos_a', 'gc_uno_a', 'gc_uno_b'] then
    raise exception 'los campos movidos no quedaron al final del destino, en su orden: %',
      (select array_agg(clave order by orden) from public.leads_campos where grupo_id = dos); end if;
  if exists (select 1 from public.leads_campos where orden % 10 <> 0) then raise exception 'no renumeró el layout: %', v_ordenes; end if;
  r := pg_temp.gc_eliminar(gala, dos, true, null);
  if r <> 'sin error' or (select count(*) from public.leads_campos where clave like 'gc_%' and grupo_id is null) <> 4 then
    raise exception 'mover a «Sin grupo»: %', r; end if;
end $$;
rollback;

-- @test grupos de leads: un campo elige un grupo que existe y al cambiar va al final del nuevo (G6)
begin;
select pg_temp.gc_preparar();
do $$
declare gala uuid := '00000000-0000-4000-8000-00000009930f'; dos uuid := '00000000-0000-4000-8000-0000000993a2';
        c1 uuid := '00000000-0000-4000-8000-0000000993c1'; j jsonb; r text;
begin
  j := pg_temp.gc_json(gala, format('select public.lead_campo_crear(%L, %L, %L, p_grupo_id => %L)', 'gc_nuevo', 'GC Nuevo', 'texto', dos));
  if (select grupo_id from public.leads_campos where id = (j ->> 'id')::uuid) <> dos then raise exception 'crear con grupo: %', j; end if;
  r := pg_temp.gc_codigo(gala, format('select public.lead_campo_crear(%L, %L, %L, p_grupo_id => %L)', 'gc_otro', 'GC Otro', 'texto', gen_random_uuid()), true);
  if r <> '22023/grupo_id: Ese grupo ya no existe: recarga.' then raise exception 'crear con un grupo que no existe: %', r; end if;
  r := pg_temp.gc_campo_guardar(gala, c1, jsonb_build_object('grupo_id', dos));
  if r <> 'sin error' or (select grupo_id from public.leads_campos where id = c1) <> dos then raise exception 'cambiar de grupo: %', r; end if;
  if (select clave from public.leads_campos where grupo_id = dos order by orden desc limit 1) <> 'gc_uno_a' then
    raise exception 'no quedó al final del grupo nuevo: %', (select array_agg(clave order by orden) from public.leads_campos where grupo_id = dos); end if;
  r := pg_temp.gc_campo_guardar(gala, c1, '{"grupo_id": null}');
  if r <> 'sin error' or (select grupo_id from public.leads_campos where id = c1) is not null then raise exception 'pasar a «Sin grupo»: %', r; end if;
end $$;
rollback;

-- @test grupos de leads: sin leads.campos.gestionar, 42501; nadie escribe la tabla directo (G7)
begin;
select pg_temp.gc_preparar();
do $$
declare cora uuid := '00000000-0000-4000-8000-00000009930c'; gala uuid := '00000000-0000-4000-8000-00000009930f';
        uno uuid := '00000000-0000-4000-8000-0000000993a1'; tres uuid := '00000000-0000-4000-8000-0000000993a3'; r text;
begin
  r := pg_temp.gc_codigo(cora, 'select public.lead_campo_grupo_crear(''GC de Cora'')');
  if r <> '42501' then raise exception 'crear sin la clave: %', r; end if;
  r := pg_temp.gc_guardar(cora, uno, '{"nombre": "GC de Cora"}');
  if r <> '42501' then raise exception 'guardar sin la clave: %', r; end if;
  r := pg_temp.gc_codigo(cora, format('select public.lead_campo_grupo_mover(%L, %L)', uno, pg_temp.gc_version(uno)));
  if r <> '42501' then raise exception 'mover sin la clave: %', r; end if;
  r := pg_temp.gc_eliminar(cora, tres);
  if r <> '42501' then raise exception 'quitar sin la clave: %', r; end if;
  r := pg_temp.gc_codigo(gala, 'insert into public.leads_campos_grupos (nombre, orden) values (''GC directo'', 1)');
  if r <> '42501' then raise exception 'insertó directo: %', r; end if;
  r := pg_temp.gc_codigo(gala, format('update public.leads_campos_grupos set nombre = ''GC directo'' where id = %L', uno));
  if r <> '42501' then raise exception 'actualizó directo: %', r; end if;
  if (select count(*) from public.leads_campos_grupos where nombre like 'GC%') <> 3 then raise exception 'algo se escribió sin la clave'; end if;
end $$;
rollback;

-- @test grupos de leads: una sola versión de cada RPC, con sus grants; las ayudas no se llaman desde afuera (G8)
do $$
declare v_nombre text; v_n int; p record;
begin
  foreach v_nombre in array array['lead_campo_grupo_crear', 'lead_campo_grupo_guardar', 'lead_campo_grupo_mover', 'lead_campo_grupo_eliminar',
                                  'lead_campo_crear', 'lead_campo_guardar'] loop
    select count(*)::int into v_n from pg_proc x join pg_namespace n on n.oid = x.pronamespace where n.nspname = 'public' and x.proname = v_nombre;
    if v_n <> 1 then raise exception '% tiene % versiones (¿falta un drop de la firma vieja?)', v_nombre, v_n; end if;
    select x.oid, x.prosecdef, x.proconfig, x.prosrc into p
      from pg_proc x join pg_namespace n on n.oid = x.pronamespace where n.nspname = 'public' and x.proname = v_nombre;
    if not p.prosecdef or not ('search_path=""' = any (coalesce(p.proconfig, '{}'))) then raise exception '% sin definer o search_path', v_nombre; end if;
    if position('''leads.campos.gestionar''' in p.prosrc) = 0 then raise exception '% no pide leads.campos.gestionar', v_nombre; end if;
    if has_function_privilege('anon', p.oid, 'execute') then raise exception '% ejecutable por anon', v_nombre; end if;
    if exists (select 1 from aclexplode((select proacl from pg_proc where oid = p.oid)) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception '% ejecutable por PUBLIC', v_nombre;
    end if;
    if not has_function_privilege('authenticated', p.oid, 'execute') then raise exception '% sin execute para authenticated', v_nombre; end if;
  end loop;
  foreach v_nombre in array array['_catalogo_nombre', '_lead_campo_grupo_asegurar', '_lead_campo_grupo_exigir'] loop
    select x.oid, x.proconfig into p from pg_proc x join pg_namespace n on n.oid = x.pronamespace where n.nspname = 'public' and x.proname = v_nombre;
    if p.oid is null then raise exception 'falta la ayuda %', v_nombre; end if;
    if has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute') then
      raise exception 'la ayuda % se llama desde afuera', v_nombre;
    end if;
    if not ('search_path=""' = any (coalesce(p.proconfig, '{}'))) then raise exception 'la ayuda % sin search_path', v_nombre; end if;
  end loop;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'leads_campos_grupos_nombre_key'
                 and indexdef like '%UNIQUE%_nombre_de_catalogo(nombre)%') then
    raise exception 'falta el índice único por la clave del nombre';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'leads_campos' and column_name = 'grupo') then
    raise exception 'la columna de texto de antes sigue en leads_campos';
  end if;
end $$;
