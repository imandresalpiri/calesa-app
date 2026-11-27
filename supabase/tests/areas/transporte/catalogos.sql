-- Puertos y navieras propios de un origen o compartidos con todos, escritos sólo por RPC. No depende de otro archivo
-- (`SOLO=areas/transporte/catalogos.sql`). Cada bloque abre su transacción y la revierte. Dos sesiones a la vez: `scripts/carreras/catalogos-de-logistica.mjs`.
--
-- Qué asegura:
--   K1. Lo que había quedó compartido (`origen_id` nulo) y con su nombre; `_catalogo_clave` ignora mayúsculas, tildes y espacios de más.
--   K2. Unicidad por (origen, clave): « Aríca », «ARICA» y «arica» chocan (23505, hint `nombre`, con dónde está el otro y si está desactivado); sin
--       país choca con otro sin país; con otro país, o en otro origen, o propio frente al compartido (lo tapa), se permite.
--   K3. Permisos: con la clave sólo en A crea en A y no en B; un compartido pide la clave en cada origen que lo usaría o lo usa («lo usa <B>») salvo
--       los que lo tapan; al renombrarlo cuentan los que lo tapan antes y después.
--   K4. Versión vieja → PT409; sin cambios no pide versión; el mismo id es idempotente y en otro origen da 42501; claves y validaciones cerradas
--       (`orden` 10.0 es 10; la clave de lo guardado es la de lo tipeado, también con un espacio duro); `uso` sólo al desactivar, con
--       transportes y embarques.
--   K5. Un propio de otro origen no entra en `transporte_guardar`, `embarque_guardar` ni `flujo_oferta_guardar` (22023 y su hint); el flujo de
--       repuestos sólo ofrece compartidos; lo ya guardado sin cambiar sigue pasando.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.cat_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-cat@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('cat_' || substr(v_id::text, 1, 8), 'cat ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, 'todos');
  end loop;
  return v_id;
end $f$;

-- Dos orígenes (cada uno con su flujo) y una fase inicial en el de A.
create or replace function pg_temp.cat_terreno() returns jsonb language plpgsql as $f$
declare a uuid; b uuid; fa uuid; fb uuid; fase uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('cat_a_' || s, 'cat A ' || s, 'manual') returning id into a;
  insert into public.origenes (clave, nombre, tipo) values ('cat_b_' || s, 'cat B ' || s, 'manual') returning id into b;
  select id into fa from public.flujos where origen_id = a;
  select id into fb from public.flujos where origen_id = b;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fa, 'cat en tránsito', 1, true) returning id into fase;
  return jsonb_build_object('a', a, 'b', b, 'fa', fa, 'fb', fb, 'fase', fase, 's', s);
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.cat_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

-- `p_que` = puerto | naviera.
create or replace function pg_temp.cat_crear(p_quien uuid, p_que text, p_origen uuid, p_datos jsonb, p_id uuid default gen_random_uuid()) returns jsonb
language sql as $f$
  select pg_temp.cat_corre(p_quien, format('select public.%s_crear(%L, %L, %L)', p_que, p_id, p_origen, p_datos));
$f$;

create or replace function pg_temp.cat_guardar(p_quien uuid, p_que text, p_id uuid, p_esperada timestamptz, p_cambios jsonb) returns jsonb
language sql as $f$
  select pg_temp.cat_corre(p_quien, format('select public.%s_guardar(%L, %L, %L)', p_que, p_id, p_esperada, p_cambios));
$f$;

create or replace function pg_temp.cat_es(p_que text, p_r jsonb, p_estado text, p_hint text default null, p_mensaje text default null) returns void
language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint)
     or (p_mensaje is not null and p_r ->> 'mensaje' is distinct from p_mensaje) then
    raise exception '%: debía dar % (hint %, «%») y dio %', p_que, p_estado, p_hint, p_mensaje, p_r;
  end if;
end $f$;

-- Lo creado: su id.
create or replace function pg_temp.cat_pasa(p_que text, p_r jsonb) returns uuid language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'id' is null then raise exception '%: debía crear y dio %', p_que, p_r; end if;
  return (p_r ->> 'id')::uuid;
end $f$;

create or replace function pg_temp.cat_version(p_que text, p_id uuid) returns timestamptz language plpgsql as $f$
declare v timestamptz;
begin
  execute format('select actualizado_en from public.%I where id = $1', case p_que when 'puerto' then 'puertos' else 'navieras' end) into v using p_id;
  return v;
end $f$;

-- @test transporte: lo que había quedó compartido y con su nombre; la clave ignora mayúsculas, tildes y espacios (K1)
begin;
do $$
begin
  if exists (select 1 from public.puertos where origen_id is not null) or exists (select 1 from public.navieras where origen_id is not null)
     or exists (select 1 from public.categorias_gasto where origen_id is not null) then
    raise exception 'K1: lo que había debía quedar compartido';
  end if;
  if (select array_agg(nombre order by orden) from public.puertos where nombre in ('Iquique', 'Arica') and pais = 'Chile') is distinct from array['Iquique', 'Arica']
     or not exists (select 1 from public.categorias_gasto where nombre = 'Grúa' and origen_id is null) then
    raise exception 'K1: los nombres no debían cambiar';
  end if;
  if public._catalogo_clave(E'  Ñandú \t GRÚA\n') <> 'nandu grua' or public._catalogo_clave(null) <> '' or public._catalogo_clave('ÁÉÍÓÚ Çé') <> 'aeiou ce' then
    raise exception 'K1: la clave no normaliza';
  end if;
  if (select count(*) from pg_indexes where schemaname = 'public' and indexdef like '%NULLS NOT DISTINCT%'
        and indexname in ('puertos_origen_clave_key', 'navieras_origen_clave_key', 'categorias_gasto_origen_clave_key')) <> 3 then
    raise exception 'K1: faltan los únicos por origen y clave';
  end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: un nombre se repite sin importar mayúsculas, tildes ni espacios, salvo con otro país, en otro origen o propio frente al compartido (K2)
begin;
do $$
declare t jsonb := pg_temp.cat_terreno(); p uuid; s text := t ->> 's'; a uuid := (t ->> 'a')::uuid; b uuid := (t ->> 'b')::uuid;
  n text := 'Aríca ' || s; id1 uuid; r jsonb;
begin
  p := pg_temp.cat_persona(array['logistica.catalogos.gestionar']);
  r := pg_temp.cat_crear(p, 'puerto', null, jsonb_build_object('nombre', '  Aríca   ' || s || ' ', 'pais', 'Chile', 'codigo', ' cl ari '));
  id1 := pg_temp.cat_pasa('K2 compartido', r);
  if (select (nombre, pais, codigo, origen_id) from public.puertos where id = id1) is distinct from (n, 'Chile'::text, 'CLARI'::text, null::uuid) then
    raise exception 'K2: debía guardar el nombre y el código normalizados: %', (select to_jsonb(x) from public.puertos x where x.id = id1);
  end if;
  perform pg_temp.cat_es('K2 mayúsculas', pg_temp.cat_crear(p, 'puerto', null, jsonb_build_object('nombre', 'ARICA ' || upper(s), 'pais', 'chile')),
                         '23505', 'nombre', 'Ya hay un puerto «' || n || '» compartido con todos los orígenes.');
  perform pg_temp.cat_es('K2 sin tilde y con espacios', pg_temp.cat_crear(p, 'puerto', null, jsonb_build_object('nombre', ' arica  ' || s, 'pais', 'CHILE ')),
                         '23505', 'nombre');
  perform pg_temp.cat_pasa('K2 otro país', pg_temp.cat_crear(p, 'puerto', null, jsonb_build_object('nombre', n, 'pais', 'Perú')));
  -- Sin país: choca con otro sin país (también con el país vacío).
  perform pg_temp.cat_pasa('K2 sin país', pg_temp.cat_crear(p, 'puerto', null, jsonb_build_object('nombre', 'Sin país ' || s)));
  perform pg_temp.cat_es('K2 sin país dos veces', pg_temp.cat_crear(p, 'puerto', null, jsonb_build_object('nombre', 'sin pais ' || s, 'pais', '')), '23505', 'nombre');
  -- Desactivado: lo dice.
  perform pg_temp.cat_guardar(p, 'puerto', id1, pg_temp.cat_version('puerto', id1), '{"activo": false}');
  perform pg_temp.cat_es('K2 desactivado', pg_temp.cat_crear(p, 'puerto', null, jsonb_build_object('nombre', 'arica ' || s, 'pais', 'Chile')),
                         '23505', 'nombre', 'Ya hay un puerto «' || n || '» (desactivado) compartido con todos los orígenes.');
  -- Propio frente al compartido (lo tapa) y el mismo en dos orígenes: se permite; dos veces en el mismo origen, no.
  perform pg_temp.cat_pasa('K2 propio en A', pg_temp.cat_crear(p, 'puerto', a, jsonb_build_object('nombre', 'ARICA ' || s, 'pais', 'Chile')));
  perform pg_temp.cat_pasa('K2 propio en B', pg_temp.cat_crear(p, 'puerto', b, jsonb_build_object('nombre', n, 'pais', 'Chile')));
  perform pg_temp.cat_es('K2 dos en A', pg_temp.cat_crear(p, 'puerto', a, jsonb_build_object('nombre', n, 'pais', 'Chile')),
                         '23505', 'nombre', 'Ya hay un puerto «ARICA ' || s || '» en cat A ' || s || '.');
  -- Navieras: en femenino.
  perform pg_temp.cat_pasa('K2 naviera compartida', pg_temp.cat_crear(p, 'naviera', null, jsonb_build_object('nombre', 'Mærsk Línea ' || s)));
  perform pg_temp.cat_pasa('K2 naviera propia', pg_temp.cat_crear(p, 'naviera', a, jsonb_build_object('nombre', 'mærsk linea ' || s)));
  perform pg_temp.cat_es('K2 naviera dos en A', pg_temp.cat_crear(p, 'naviera', a, jsonb_build_object('nombre', 'mærsk  LÍNEA ' || s)),
                         '23505', 'nombre', 'Ya hay una naviera «mærsk linea ' || s || '» en cat A ' || s || '.');
  perform pg_temp.cat_es('K2 naviera compartida dos veces', pg_temp.cat_crear(p, 'naviera', null, jsonb_build_object('nombre', 'mærsk línea ' || s)),
                         '23505', 'nombre', 'Ya hay una naviera «Mærsk Línea ' || s || '» compartida con todos los orígenes.');
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: un propio pide la clave en su origen; un compartido, en cada origen que lo usa salvo los que lo tapan (K3)
begin;
do $$
declare t jsonb := pg_temp.cat_terreno(); s text := t ->> 's'; a uuid := (t ->> 'a')::uuid; b uuid := (t ->> 'b')::uuid;
  admin uuid; pa uuid; menos_b uuid; id1 uuid; id2 uuid; r jsonb;
begin
  admin := pg_temp.cat_persona(array['logistica.catalogos.gestionar']);
  pa := pg_temp.cat_persona(array['logistica.catalogos.gestionar@' || a]);
  menos_b := pg_temp.cat_persona(array(select 'logistica.catalogos.gestionar@' || o.id from public.origenes o where o.id <> b));
  -- Propio.
  id1 := pg_temp.cat_pasa('K3 propio en A', pg_temp.cat_crear(pa, 'naviera', a, jsonb_build_object('nombre', 'K3 propia ' || s)));
  perform pg_temp.cat_es('K3 propio en B', pg_temp.cat_crear(pa, 'naviera', b, jsonb_build_object('nombre', 'K3 propia ' || s)),
                         '42501', null, 'No puedes configurar la logística de cat B ' || s || '.');
  perform pg_temp.cat_es('K3 origen que no existe', pg_temp.cat_crear(admin, 'naviera', gen_random_uuid(), jsonb_build_object('nombre', 'K3 ' || s)),
                         '22023', 'origen');
  -- Compartido: sin la clave en B no lo crea; con B tapándolo, sí.
  perform pg_temp.cat_es('K3 compartido sin B', pg_temp.cat_crear(menos_b, 'naviera', null, jsonb_build_object('nombre', 'K3 compartida ' || s)),
                         '42501', null, 'No puedes cambiar «K3 compartida ' || s || '»: la usaría cat B ' || s || ', donde no puedes configurar la logística.');
  perform pg_temp.cat_pasa('K3 propia de B', pg_temp.cat_crear(admin, 'naviera', b, jsonb_build_object('nombre', 'k3 compartida ' || s)));
  id2 := pg_temp.cat_pasa('K3 compartido tapado en B', pg_temp.cat_crear(menos_b, 'naviera', null, jsonb_build_object('nombre', 'K3 compartida ' || s)));
  -- Renombrarlo a algo que B no tapa: lo usaría B.
  r := pg_temp.cat_guardar(menos_b, 'naviera', id2, pg_temp.cat_version('naviera', id2), jsonb_build_object('nombre', 'K3 otra ' || s));
  perform pg_temp.cat_es('K3 renombrar fuera de lo tapado', r, '42501', null,
                         'No puedes cambiar «K3 compartida ' || s || '»: la usa cat B ' || s || ', donde no puedes configurar la logística.');
  -- Desactivarlo sin renombrar: B lo sigue tapando.
  r := pg_temp.cat_guardar(menos_b, 'naviera', id2, pg_temp.cat_version('naviera', id2), '{"activo": false}');
  if r ? 'error' or (r ->> 'sin_cambios')::boolean then raise exception 'K3: debía desactivarla y dio %', r; end if;
  -- Quien tiene la clave sólo en A no toca un compartido (lo usa otro origen).
  perform pg_temp.cat_es('K3 compartido con la clave sólo en A', pg_temp.cat_guardar(pa, 'naviera', id2, pg_temp.cat_version('naviera', id2), '{"activo": true}'),
                         '42501');
  -- Sin la clave en ningún origen.
  perform pg_temp.cat_es('K3 sin la clave', pg_temp.cat_crear(pg_temp.cat_persona(array['logistica.ver']), 'puerto', null, jsonb_build_object('nombre', 'K3 ' || s)),
                         '42501');
  -- Un propio no pide la clave en otros orígenes.
  r := pg_temp.cat_guardar(pa, 'naviera', id1, pg_temp.cat_version('naviera', id1), jsonb_build_object('nombre', 'K3 propia renombrada ' || s));
  if r ? 'error' then raise exception 'K3: el propio de A debía guardarse con la clave en A: %', r; end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: versión, idempotencia, claves cerradas, validaciones y uso al desactivar (K4)
begin;
do $$
declare t jsonb := pg_temp.cat_terreno(); s text := t ->> 's'; a uuid := (t ->> 'a')::uuid; b uuid := (t ->> 'b')::uuid;
  p uuid; editor uuid; v uuid; id1 uuid := gen_random_uuid(); r jsonb; ver timestamptz; ver2 timestamptz;
begin
  p := pg_temp.cat_persona(array['logistica.catalogos.gestionar']);
  editor := pg_temp.cat_persona(array['logistica.ver', 'logistica.transporte.editar']);
  -- Idempotencia por id.
  r := pg_temp.cat_crear(p, 'puerto', a, jsonb_build_object('nombre', 'K4 ' || s, 'orden', 5), id1);
  if pg_temp.cat_pasa('K4 crear', r) <> id1 or (r ->> 'repetido')::boolean then raise exception 'K4: debía crear con ese id: %', r; end if;
  r := pg_temp.cat_crear(p, 'puerto', a, jsonb_build_object('nombre', 'K4 ' || s, 'orden', 5), id1);
  if (r ->> 'repetido')::boolean is not true or (r ->> 'id')::uuid <> id1 then raise exception 'K4: el mismo intento debía devolver lo creado: %', r; end if;
  perform pg_temp.cat_es('K4 el mismo id en otro origen', pg_temp.cat_crear(p, 'puerto', b, jsonb_build_object('nombre', 'K4 ' || s), id1), '42501');
  perform pg_temp.cat_es('K4 sin id', pg_temp.cat_corre(p, format('select public.puerto_crear(null, %L, %L)', a, '{"nombre": "x"}')), '22023', 'id');
  -- Claves y validaciones.
  perform pg_temp.cat_es('K4 clave ajena', pg_temp.cat_crear(p, 'puerto', a, jsonb_build_object('nombre', 'K4b ' || s, 'origen_id', b)), '22023', 'origen_id');
  perform pg_temp.cat_es('K4 nombre vacío', pg_temp.cat_crear(p, 'naviera', a, '{"nombre": "   "}'), '22023', 'nombre');
  perform pg_temp.cat_es('K4 nombre largo', pg_temp.cat_crear(p, 'naviera', a, jsonb_build_object('nombre', repeat('x', 81))), '22023', 'nombre');
  perform pg_temp.cat_es('K4 código largo', pg_temp.cat_crear(p, 'puerto', a, jsonb_build_object('nombre', 'K4c ' || s, 'codigo', repeat('x', 13))), '22023', 'codigo');
  perform pg_temp.cat_es('K4 orden', pg_temp.cat_crear(p, 'puerto', a, jsonb_build_object('nombre', 'K4c ' || s, 'orden', 1.5)), '22023', 'orden');
  perform pg_temp.cat_es('K4 orden texto', pg_temp.cat_crear(p, 'puerto', a, jsonb_build_object('nombre', 'K4c ' || s, 'orden', 'uno')), '22023', 'orden');
  perform pg_temp.cat_es('K4 activo', pg_temp.cat_crear(p, 'naviera', a, jsonb_build_object('nombre', 'K4c ' || s, 'activo', 'si')), '22023', 'activo');
  r := pg_temp.cat_crear(p, 'puerto', a, jsonb_build_object('nombre', E'  K4\u00a0duro  ' || s, 'orden', 10.0));
  if (select orden from public.puertos where id = pg_temp.cat_pasa('K4 orden 10.0', r)) <> 10 then raise exception 'K4: el orden 10.0 debía guardar 10'; end if;
  if (select public._catalogo_clave(nombre) from public.puertos where id = (r ->> 'id')::uuid) <> public._catalogo_clave(E'  K4\u00a0duro  ' || s) then
    raise exception 'K4: la clave de lo guardado debía ser la de lo tipeado';
  end if;
  -- Sin orden: al final.
  r := pg_temp.cat_crear(p, 'puerto', null, jsonb_build_object('nombre', 'K4 último ' || s));
  if (select orden from public.puertos where id = (r ->> 'id')::uuid) <> (select max(orden) from public.puertos) then
    raise exception 'K4: sin orden debía ir al final';
  end if;
  -- Versión.
  ver := pg_temp.cat_version('puerto', id1);
  r := pg_temp.cat_guardar(p, 'puerto', id1, ver, '{"pais": "Japón"}');
  ver2 := (r ->> 'actualizado_en')::timestamptz;
  if r ? 'error' or ver2 <= ver or r -> 'uso' <> 'null'::jsonb then raise exception 'K4: debía guardar y mover la versión: %', r; end if;
  perform pg_temp.cat_es('K4 versión vieja', pg_temp.cat_guardar(p, 'puerto', id1, ver, '{"pais": "Corea"}'), 'PT409');
  r := pg_temp.cat_guardar(p, 'puerto', id1, ver, '{"pais": " Japón "}');
  if (r ->> 'sin_cambios')::boolean is not true or (r ->> 'actualizado_en')::timestamptz <> ver2 then
    raise exception 'K4: sin cambios no debía pedir la versión ni moverla: %', r;
  end if;
  perform pg_temp.cat_es('K4 ya no existe', pg_temp.cat_guardar(p, 'naviera', gen_random_uuid(), ver, '{"activo": false}'), 'PT409', null, 'Esa naviera ya no existe.');
  perform pg_temp.cat_es('K4 guardar el origen', pg_temp.cat_guardar(p, 'puerto', id1, ver2, jsonb_build_object('origen_id', null)), '22023', 'origen_id');
  -- Uso al desactivar: un transporte lo usa.
  insert into public.vehiculos (origen_id, titulo, fase_id) values (a, 'cat K4', (t ->> 'fase')::uuid) returning id into v;
  r := pg_temp.cat_corre(editor, format('select public.transporte_guardar(%L, null, null, %L)', v, jsonb_build_object('puerto_origen_id', id1)));
  if r ? 'error' then raise exception 'K4: el transporte debía guardar el puerto propio de su origen: %', r; end if;
  -- Y un embarque (el puerto es suyo, no de la unidad).
  insert into public.vehiculos (origen_id, titulo, fase_id) values (a, 'cat K4 2', (t ->> 'fase')::uuid) returning id into v;
  r := pg_temp.cat_corre(editor, format('select public.transporte_guardar(%L, null, null, %L)', v,
                                        jsonb_build_object('booking', 'K4' || s, 'puerto_origen_id', id1)));
  if r ? 'error' or not exists (select 1 from public.embarques where puerto_origen_id = id1) then
    raise exception 'K4: el embarque debía guardar el puerto: %', r;
  end if;
  r := pg_temp.cat_guardar(p, 'puerto', id1, ver2, '{"activo": false}');
  if (r ->> 'uso')::int is distinct from 2 then raise exception 'K4: al desactivar debía decir el uso (transporte y embarque): %', r; end if;
  r := pg_temp.cat_guardar(p, 'puerto', id1, (r ->> 'actualizado_en')::timestamptz, '{"activo": true}');
  if r -> 'uso' <> 'null'::jsonb then raise exception 'K4: al activar no debía contar el uso: %', r; end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: un propio de otro origen no entra en el transporte, el embarque ni la oferta; lo guardado sin cambiar sigue (K5)
begin;
do $$
declare t jsonb := pg_temp.cat_terreno(); s text := t ->> 's'; a uuid := (t ->> 'a')::uuid; b uuid := (t ->> 'b')::uuid;
  admin uuid; editor uuid; conf uuid; nav_a uuid; nav_b uuid; pto_b uuid; v1 uuid; v2 uuid; r jsonb; fl_rep uuid;
begin
  admin := pg_temp.cat_persona(array['logistica.catalogos.gestionar']);
  editor := pg_temp.cat_persona(array['logistica.ver', 'logistica.transporte.editar']);
  conf := pg_temp.cat_persona(array['flujos.configurar@' || a, 'repuestos.configurar']);
  nav_a := pg_temp.cat_pasa('K5 naviera de A', pg_temp.cat_crear(admin, 'naviera', a, jsonb_build_object('nombre', 'K5 A ' || s)));
  nav_b := pg_temp.cat_pasa('K5 naviera de B', pg_temp.cat_crear(admin, 'naviera', b, jsonb_build_object('nombre', 'K5 B ' || s)));
  pto_b := pg_temp.cat_pasa('K5 puerto de B', pg_temp.cat_crear(admin, 'puerto', b, jsonb_build_object('nombre', 'K5 B ' || s)));
  insert into public.vehiculos (origen_id, titulo, fase_id) values (a, 'cat K5 1', (t ->> 'fase')::uuid) returning id into v1;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (a, 'cat K5 2', (t ->> 'fase')::uuid) returning id into v2;
  -- transporte_guardar.
  r := pg_temp.cat_corre(editor, format('select public.transporte_guardar(%L, null, null, %L)', v1, jsonb_build_object('naviera_id', nav_b, 'booking', 'K5' || s)));
  perform pg_temp.cat_es('K5 naviera de B en A', r, '22023', 'naviera_id', 'Esa naviera es de otro origen.');
  r := pg_temp.cat_corre(editor, format('select public.transporte_guardar(%L, null, null, %L)', v1, jsonb_build_object('puerto_destino_id', pto_b)));
  perform pg_temp.cat_es('K5 puerto de B en A', r, '22023', 'puerto_destino_id', 'Ese puerto de destino es de otro origen.');
  foreach v1 in array array[v1, v2] loop
    r := pg_temp.cat_corre(editor, format('select public.transporte_guardar(%L, null, null, %L)', v1, jsonb_build_object('naviera_id', nav_a, 'booking', 'K5' || s)));
    if r ? 'error' then raise exception 'K5: la naviera de A debía entrar en un vehículo de A: %', r; end if;
  end loop;
  -- embarque_guardar rechaza la de B: la naviera del embarque es la de sus dos unidades de A.
  r := pg_temp.cat_corre(editor, format('select public.embarque_guardar(%L, %L, %L)',
                                        (select id from public.embarques where booking = upper('K5' || s) and origen_id = a),
                                        (select actualizado_en from public.embarques where booking = upper('K5' || s) and origen_id = a),
                                        jsonb_build_object('naviera_id', nav_b)));
  perform pg_temp.cat_es('K5 embarque con la de B', r, '22023', 'naviera_id', 'Esa naviera es de otro origen.');
  -- Lo ya guardado sin cambiar sigue: un transporte que apunta a la de B (de antes) se corrige en otro campo.
  -- La naviera es de su embarque.
  update public.embarques set naviera_id = nav_b where booking = upper('K5' || s) and origen_id = a;
  r := pg_temp.cat_corre(editor, format('select public.transporte_guardar(%L, null, %L, %L, %L)', v2,
                                        (select actualizado_en from public.transportes where vehiculo_id = v2), '{"contenedor": null, "eta_el": "2026-12-24"}',
                                        (select actualizado_en from public.embarques where booking = upper('K5' || s) and origen_id = a)));
  if r ? 'error' then raise exception 'K5: lo guardado sin cambiar debía seguir pasando: %', r; end if;
  -- flujo_oferta_guardar.
  r := pg_temp.cat_corre(conf, format('select to_jsonb(public.flujo_oferta_guardar(%L, %L::timestamptz, %L::uuid[], %L::uuid[], %L::uuid[]))',
                                      t ->> 'fa', (select actualizado_en from public.flujos where id = (t ->> 'fa')::uuid), '{}', array[pto_b], array[nav_a]));
  perform pg_temp.cat_es('K5 oferta con un puerto de B', r, '22023', 'puertos_destino', '«K5 B ' || s || '» es de otro origen.');
  r := pg_temp.cat_corre(conf, format('select to_jsonb(public.flujo_oferta_guardar(%L, %L::timestamptz, %L::uuid[], %L::uuid[], %L::uuid[]))',
                                      t ->> 'fa', (select actualizado_en from public.flujos where id = (t ->> 'fa')::uuid), '{}', '{}', array[nav_a]));
  if r ? 'error' then raise exception 'K5: la oferta con la naviera de A debía guardarse: %', r; end if;
  -- El flujo de repuestos (sin origen) sólo ofrece compartidos.
  select id into fl_rep from public.flujos where ambito = 'repuestos';
  update public.flujos_reglas set activa = true where flujo_id = fl_rep and regla = 'transporte';
  r := pg_temp.cat_corre(conf, format('select to_jsonb(public.flujo_oferta_guardar(%L, %L::timestamptz, %L::uuid[], %L::uuid[], %L::uuid[]))',
                                      fl_rep, (select actualizado_en from public.flujos where id = fl_rep), '{}', '{}', array[nav_a]));
  perform pg_temp.cat_es('K5 repuestos con una propia', r, '22023', 'navieras');
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;
