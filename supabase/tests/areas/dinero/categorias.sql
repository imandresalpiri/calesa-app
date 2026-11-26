-- Categorías de gasto propias de un origen o compartidas, escritas sólo por RPC. No depende de otro archivo (`SOLO=areas/dinero/categorias.sql`).
-- Los ayudantes son copia de `gastos.sql`. Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   C1. Crear (propia y compartida, con sus validaciones), guardar con versión y eliminar: sin gastos se elimina; con gastos, 23503 con hint `uso`.
--   C2. `gasto_registrar` con una categoría propia de otro origen: 22023 con hint `categoria_id`; con la del origen o una compartida, pasa.
--   C3. Corregir un gasto sin cambiar su categoría (aunque ya no valga) pasa; cambiarla a la de otro origen, 22023.
--   C4. `gastos_prorratear` con vehículos de A y B y una categoría propia de A: 22023 y ninguna fila; con los de A, pasa.

create or replace function pg_temp.dcg_persona(variadic p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  -- La primera cuenta de la base es la dueña (con `SOLO=` no hay otra antes): una de relleno, para que ninguna de la prueba lo sea.
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email) values (gen_random_uuid(), 'dcg-primera-' || substr(v_id::text, 1, 8) || '@ejemplo.com');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('dcg_' || substr(v_id::text, 1, 8), 'DCG ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance, origen_id)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso, nullif(split_part(c, ':', 3), '')::uuid);
  end loop;
  return v_id;
end $f$;

-- Dos orígenes: A con dos vehículos, B con uno; la moneda base.
create or replace function pg_temp.dcg_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; v uuid; v2 uuid; v3 uuid; s text := substr(gen_random_uuid()::text, 1, 8);
begin
  insert into public.origenes (clave, nombre) values ('dcg_' || s, 'DCG origen ' || s) returning id into o;
  insert into public.origenes (clave, nombre) values ('dcg2_' || s, 'DCG origen 2 ' || s) returning id into o2;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'DCG vehículo', 'toyota') returning id into v;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'DCG vehículo 3', 'nissan') returning id into v3;
  insert into public.vehiculos (origen_id, titulo, marca) values (o2, 'DCG vehículo 2', 'mazda') returning id into v2;
  return jsonb_build_object('o', o, 'o2', o2, 'v', v, 'v2', v2, 'v3', v3, 's', s, 'base', (select moneda_base::text from public.ajustes_empresa where id = 1));
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.dcg_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

create or replace function pg_temp.dcg_da(p_que text, p_r jsonb, p_estado text, p_hint text default null, p_mensaje text default null) returns void
language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint)
     or (p_mensaje is not null and p_r ->> 'mensaje' is distinct from p_mensaje) then
    raise exception '%: debía dar % (hint %, «%») y dio %', p_que, p_estado, p_hint, p_mensaje, p_r;
  end if;
end $f$;

-- Crear una categoría como esa persona: su id (o falla la prueba).
create or replace function pg_temp.dcg_categoria(p_quien uuid, p_origen uuid, p_datos jsonb) returns uuid language plpgsql as $f$
declare r jsonb := pg_temp.dcg_corre(p_quien, format('select public.categoria_gasto_crear(%L, %L, %L)', gen_random_uuid(), p_origen, p_datos));
begin
  if r ? 'error' then raise exception 'debía crear la categoría % y dio %', p_datos, r; end if;
  return (r ->> 'id')::uuid;
end $f$;

create or replace function pg_temp.dcg_version(p_id uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.categorias_gasto where id = p_id;
$f$;

-- Registrar un gasto de vehículo en la moneda base como esa persona.
create or replace function pg_temp.dcg_gasto(p_quien uuid, t jsonb, p_vehiculo uuid, p_cat uuid) returns jsonb language sql as $f$
  select pg_temp.dcg_corre(p_quien, format('select public.gasto_registrar(%L, %L, null, %L, %L, 100, null, null, null, null, null)',
                                           gen_random_uuid(), p_vehiculo, p_cat, t ->> 'base'));
$f$;

-- @test dinero: una categoría de gasto se crea, se corrige con su versión y se elimina sólo sin gastos (C1)
begin;
do $$
declare t jsonb := pg_temp.dcg_terreno(); s text := t ->> 's'; o uuid := (t ->> 'o')::uuid; admin uuid; p uuid; cat uuid; cat2 uuid; r jsonb; ver timestamptz;
begin
  admin := pg_temp.dcg_persona('logistica.catalogos.gestionar');
  p := pg_temp.dcg_persona('logistica.gastos.editar', 'logistica.gastos.ver');
  cat := pg_temp.dcg_categoria(admin, o, jsonb_build_object('nombre', ' DCG  flete ' || s, 'proposito', 'flete', 'orden', 3));
  if (select (nombre, proposito, orden, origen_id) from public.categorias_gasto where id = cat)
     is distinct from ('DCG flete ' || s, 'flete'::text, 3::smallint, o) then
    raise exception 'C1: debía guardar la categoría normalizada: %', (select to_jsonb(x) from public.categorias_gasto x where x.id = cat);
  end if;
  cat2 := pg_temp.dcg_categoria(admin, null, jsonb_build_object('nombre', 'DCG compartida ' || s));
  if (select origen_id from public.categorias_gasto where id = cat2) is not null then raise exception 'C1: debía quedar compartida'; end if;
  perform pg_temp.dcg_da('C1 propósito', pg_temp.dcg_corre(admin, format('select public.categoria_gasto_crear(%L, null, %L)', gen_random_uuid(),
                         jsonb_build_object('nombre', 'DCG x ' || s, 'proposito', 'magia'))), '22023', 'proposito');
  perform pg_temp.dcg_da('C1 nombre largo', pg_temp.dcg_corre(admin, format('select public.categoria_gasto_crear(%L, null, %L)', gen_random_uuid(),
                         jsonb_build_object('nombre', repeat('x', 61)))), '22023', 'nombre');
  perform pg_temp.dcg_da('C1 repetida', pg_temp.dcg_corre(admin, format('select public.categoria_gasto_crear(%L, %L, %L)', gen_random_uuid(), o,
                         jsonb_build_object('nombre', 'dcg flete ' || upper(s)))), '23505', 'nombre',
                         'Ya hay una categoría «DCG flete ' || s || '» en DCG origen ' || s || '.');
  -- Guardar con versión.
  ver := pg_temp.dcg_version(cat);
  r := pg_temp.dcg_corre(admin, format('select public.categoria_gasto_guardar(%L, %L, %L)', cat, ver, '{"proposito": "grua"}'));
  if r ? 'error' or (select proposito from public.categorias_gasto where id = cat) <> 'grua' then raise exception 'C1: debía guardar el propósito: %', r; end if;
  perform pg_temp.dcg_da('C1 versión vieja', pg_temp.dcg_corre(admin, format('select public.categoria_gasto_guardar(%L, %L, %L)', cat, ver, '{"orden": 9}')), 'PT409');
  perform pg_temp.dcg_da('C1 eliminar con versión vieja', pg_temp.dcg_corre(admin, format('select public.categoria_gasto_eliminar(%L, %L)', cat, ver)), 'PT409');
  -- Con gastos no se elimina: se desactiva y dice el uso.
  r := pg_temp.dcg_gasto(p, t, (t ->> 'v')::uuid, cat);
  if r ? 'error' then raise exception 'C1: el gasto con la categoría de su origen debía registrarse: %', r; end if;
  perform pg_temp.dcg_da('C1 eliminar con gastos', pg_temp.dcg_corre(admin, format('select public.categoria_gasto_eliminar(%L, %L)', cat, pg_temp.dcg_version(cat))),
                         '23503', 'uso', '«DCG flete ' || s || '» tiene gastos: desactívala.');
  r := pg_temp.dcg_corre(admin, format('select public.categoria_gasto_guardar(%L, %L, %L)', cat, pg_temp.dcg_version(cat), '{"activo": false}'));
  if (r ->> 'uso')::int is distinct from 1 then raise exception 'C1: al desactivar debía decir el uso: %', r; end if;
  -- Sin gastos, se elimina.
  r := pg_temp.dcg_corre(admin, format('select public.categoria_gasto_eliminar(%L, %L)', cat2, pg_temp.dcg_version(cat2)));
  if r is distinct from '{"accion": "eliminada"}'::jsonb or exists (select 1 from public.categorias_gasto where id = cat2) then
    raise exception 'C1: sin gastos debía eliminarse: %', r;
  end if;
  -- Quien no tiene la clave no la toca.
  perform pg_temp.dcg_da('C1 sin la clave', pg_temp.dcg_corre(p, format('select public.categoria_gasto_guardar(%L, %L, %L)', cat, pg_temp.dcg_version(cat),
                         '{"activo": true}')), '42501');
end $$;
reset role;
rollback;

-- @test dinero: una categoría propia vale sólo en su origen al registrar, corregir y prorratear; lo guardado sin cambiar sigue (C2, C3, C4)
begin;
do $$
declare t jsonb := pg_temp.dcg_terreno(); s text := t ->> 's'; o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid;
  admin uuid; p uuid; cat_a uuid; cat_b uuid; comp uuid; r jsonb; gid uuid; v_lote uuid := gen_random_uuid();
begin
  admin := pg_temp.dcg_persona('logistica.catalogos.gestionar');
  p := pg_temp.dcg_persona('logistica.gastos.editar', 'logistica.gastos.ver');
  cat_a := pg_temp.dcg_categoria(admin, o, jsonb_build_object('nombre', 'DCG de A ' || s, 'proposito', 'flete'));
  cat_b := pg_temp.dcg_categoria(admin, o2, jsonb_build_object('nombre', 'DCG de B ' || s, 'proposito', 'flete'));
  comp := pg_temp.dcg_categoria(admin, null, jsonb_build_object('nombre', 'DCG compartida ' || s, 'proposito', 'otro'));
  -- C2 · registrar.
  perform pg_temp.dcg_da('C2 la de B en un vehículo de A', pg_temp.dcg_gasto(p, t, (t ->> 'v')::uuid, cat_b), '22023', 'categoria_id',
                         'Esa categoría es de otro origen.');
  r := pg_temp.dcg_gasto(p, t, (t ->> 'v')::uuid, comp);
  if r ? 'error' then raise exception 'C2: la compartida debía valer en A: %', r; end if;
  r := pg_temp.dcg_gasto(p, t, (t ->> 'v')::uuid, cat_a);
  if r ? 'error' then raise exception 'C2: la de A debía valer en A: %', r; end if;
  gid := (r ->> 'id')::uuid;
  -- C3 · corregir sin cambiar una categoría que ya no vale (la de B, de antes) pasa; cambiarla a la de B, no.
  update public.gastos set categoria_id = cat_b where id = gid;
  r := pg_temp.dcg_corre(p, format('select public.gasto_guardar(%L, %L, %L)', gid, (select actualizado_en from public.gastos where id = gid), '{"proveedor": "DCG"}'));
  if r ? 'error' then raise exception 'C3: lo guardado sin cambiar la categoría debía seguir pasando: %', r; end if;
  update public.gastos set categoria_id = cat_a where id = gid;
  r := pg_temp.dcg_corre(p, format('select public.gasto_guardar(%L, %L, %L)', gid, (select actualizado_en from public.gastos where id = gid),
                                   jsonb_build_object('categoria_id', cat_b)));
  perform pg_temp.dcg_da('C3 cambiar a la de B', r, '22023', 'categoria_id');
  -- C4 · prorratear entre A y B con la de A: ninguna fila; entre los dos de A, sí.
  r := pg_temp.dcg_corre(p, format('select public.gastos_prorratear(%L, %L::uuid[], %L, %L, 100, null, null, null, null, null)',
                                   v_lote, array[(t ->> 'v')::uuid, (t ->> 'v2')::uuid], cat_a, t ->> 'base'));
  perform pg_temp.dcg_da('C4 A y B con la de A', r, '22023', 'categoria_id');
  if exists (select 1 from public.gastos where lote_id = v_lote) then raise exception 'C4: no debía quedar ninguna fila'; end if;
  r := pg_temp.dcg_corre(p, format('select public.gastos_prorratear(%L, %L::uuid[], %L, %L, 100, null, null, null, null, null)',
                                   v_lote, array[(t ->> 'v2')::uuid, (t ->> 'v')::uuid], cat_a, t ->> 'base'));
  perform pg_temp.dcg_da('C4 B primero con la de A', r, '22023', 'categoria_id');
  r := pg_temp.dcg_corre(p, format('select public.gastos_prorratear(%L, %L::uuid[], %L, %L, 100, null, null, null, null, null)',
                                   v_lote, array[(t ->> 'v')::uuid, (t ->> 'v3')::uuid], cat_a, t ->> 'base'));
  if r ? 'error' or jsonb_array_length(r -> 'ids') <> 2 then raise exception 'C4: entre los dos de A debía repartir: %', r; end if;
end $$;
reset role;
rollback;
