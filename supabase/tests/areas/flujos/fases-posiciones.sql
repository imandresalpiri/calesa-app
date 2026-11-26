-- La posición de cada fase en el diagrama: `fase_posiciones_guardar` (permiso, versión del flujo, forma, todo o nada, sin auditoría ni web) y
-- `fase_crear` con `posicion`. No depende de otro archivo (`SOLO=humo.sql,areas/flujos/fases-posiciones.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   P1. Sin `flujos.configurar` (un asesor, quien configura otro origen) → 42501, sin cambiar posiciones ni versión.
--   P2. Con la versión vieja → PT409 «Otra persona cambió este flujo mientras lo editabas.».
--   P3. Un lote escribe sólo esas filas y devuelve una versión mayor; no toca orden, nombre ni `fases.actualizado_en`.
--   P4. Guardar posiciones no deja filas de `fases` en `actividad`; un `fase_guardar` después sí deja `fases.update`.
--   P5. Forma: vacío, 201, repetida, x sin y, fuera de rango, clave de más, fase que no es uuid → 22023 hint `posiciones`.
--   P6. Una fase de otro flujo → PT409, sin escribir nada.
--   P7. En repuestos, `repuestos.configurar` guarda y `flujos.configurar` de un origen no.
--   P8. x e y nulas vuelven la fase a «sin posición».
--   P9. `fase_crear` con `posicion` la guarda; mal formada → 22023 hint `posicion`.
--   P10. Guardar posiciones no anota la revalidación de la web; renombrar una fase sí.

create or replace function pg_temp.fp_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('fp_' || substr(v_id::text, 1, 8), 'FP ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.fp_asesor() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = 'asesor';
  return v_id;
end $f$;

create or replace function pg_temp.fp_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('fp_' || s, 'FP origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.fp_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.fp_version(p_flujo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.fp_fase(p_flujo uuid, p_nombre text, p_orden int) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden) values (p_flujo, p_nombre, p_orden) returning id;
$f$;

-- Las posiciones del flujo, en el orden de las fases.
create or replace function pg_temp.fp_posiciones(p_flujo uuid) returns text language sql as $f$
  select string_agg(nombre || ':' || coalesce(posicion_x::text, '-') || ',' || coalesce(posicion_y::text, '-'), ' ' order by orden, nombre)
  from public.fases where flujo_id = p_flujo;
$f$;

create or replace function pg_temp.fp_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.fp_guardar(p_quien uuid, p_flujo uuid, p_version timestamptz, p_posiciones jsonb) returns jsonb language sql as $f$
  select pg_temp.fp_corre(p_quien, format('select jsonb_build_object(''version'', public.fase_posiciones_guardar(%L, %L, %L::jsonb))',
    p_flujo, p_version, p_posiciones));
$f$;

create or replace function pg_temp.fp_da_error(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.fp_pasa(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'version' is null then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return (p_r ->> 'version')::timestamptz;
end $f$;

-- @test fases: fase_posiciones_guardar da 42501 sin flujos.configurar y PT409 con la versión vieja, sin cambiar nada (P1, P2)
begin;
do $$
declare
  -- Sin cuentas previas la primera queda dueña: se crea una antes de las que se prueban.
  primera uuid := pg_temp.fp_persona(array['vehiculos.ver']);
  a uuid := pg_temp.fp_flujo(); b uuid := pg_temp.fp_flujo();
  config_a uuid := pg_temp.fp_persona(array['flujos.configurar@' || pg_temp.fp_origen_de(a)]);
  config_b uuid := pg_temp.fp_persona(array['flujos.configurar@' || pg_temp.fp_origen_de(b)]);
  asesor uuid := pg_temp.fp_asesor();
  f1 uuid := pg_temp.fp_fase(a, 'FP uno', 10);
  va timestamptz := pg_temp.fp_version(a); antes text := pg_temp.fp_posiciones(a);
  lote jsonb := jsonb_build_array(jsonb_build_object('fase', f1, 'x', 4, 'y', 6)); r jsonb;
begin
  r := pg_temp.fp_guardar(asesor, a, va, lote);
  perform pg_temp.fp_da_error('P1 asesor', r, '42501');
  r := pg_temp.fp_guardar(config_b, a, va, lote);
  perform pg_temp.fp_da_error('P1 otro origen', r, '42501');
  if pg_temp.fp_posiciones(a) is distinct from antes or pg_temp.fp_version(a) is distinct from va then
    raise exception 'P1: un 42501 cambió algo: % → %', antes, pg_temp.fp_posiciones(a);
  end if;
  perform public._flujo_tocar(a);
  r := pg_temp.fp_guardar(config_a, a, va, lote);
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' is distinct from 'Otra persona cambió este flujo mientras lo editabas.' then
    raise exception 'P2: la versión vieja dio %', r;
  end if;
  if pg_temp.fp_posiciones(a) is distinct from antes then raise exception 'P2: el PT409 escribió %', pg_temp.fp_posiciones(a); end if;
end $$;
rollback;

-- @test fases: un lote escribe sólo esas filas, sin orden, nombre ni actualizado_en, sin actividad; fase_guardar sí audita (P3, P4, P8)
begin;
do $$
declare
  -- Sin cuentas previas la primera queda dueña: se crea una antes de las que se prueban.
  primera uuid := pg_temp.fp_persona(array['vehiculos.ver']);
  a uuid := pg_temp.fp_flujo();
  config_a uuid := pg_temp.fp_persona(array['flujos.configurar@' || pg_temp.fp_origen_de(a)]);
  f1 uuid := pg_temp.fp_fase(a, 'FP a', 10); f2 uuid := pg_temp.fp_fase(a, 'FP b', 20);
  f3 uuid := pg_temp.fp_fase(a, 'FP c', 30); f4 uuid := pg_temp.fp_fase(a, 'FP d', 40);
  v0 timestamptz := pg_temp.fp_version(a); v1 timestamptz; v2 timestamptz;
  tocadas_antes timestamptz[] := array(select actualizado_en from public.fases where flujo_id = a order by orden);
  actividad_antes bigint := (select coalesce(max(id), 0) from public.actividad);
begin
  v1 := pg_temp.fp_pasa('P3', pg_temp.fp_guardar(config_a, a, v0, jsonb_build_array(
    jsonb_build_object('fase', f1, 'x', 2, 'y', 2),
    jsonb_build_object('fase', f2, 'x', 22.5, 'y', -4),
    jsonb_build_object('fase', f3, 'x', 42, 'y', 2))));
  if not (v1 > v0 and v1 = pg_temp.fp_version(a)) then raise exception 'P3: devolvió % y el flujo tiene %', v1, pg_temp.fp_version(a); end if;
  if pg_temp.fp_posiciones(a) is distinct from 'FP a:2.00,2.00 FP b:22.50,-4.00 FP c:42.00,2.00 FP d:-,-' then
    raise exception 'P3: quedó %', pg_temp.fp_posiciones(a);
  end if;
  if array(select actualizado_en from public.fases where flujo_id = a order by orden) is distinct from tocadas_antes
     or (select string_agg(nombre || orden, ' ' order by orden) from public.fases where flujo_id = a) is distinct from 'FP a10 FP b20 FP c30 FP d40' then
    raise exception 'P3: guardar posiciones tocó actualizado_en, el orden o el nombre';
  end if;
  if exists (select 1 from public.actividad x where x.id > actividad_antes and x.tabla = 'fases') then
    raise exception 'P4: guardar posiciones dejó actividad de fases';
  end if;

  -- P8: nulas vuelven a «sin posición».
  v2 := pg_temp.fp_pasa('P8', pg_temp.fp_guardar(config_a, a, v1, jsonb_build_array(jsonb_build_object('fase', f2, 'x', null, 'y', null))));
  if pg_temp.fp_posiciones(a) is distinct from 'FP a:2.00,2.00 FP b:-,- FP c:42.00,2.00 FP d:-,-' then
    raise exception 'P8: quedó %', pg_temp.fp_posiciones(a);
  end if;

  -- P4: la auditoría de lo demás sigue.
  perform pg_temp.fp_pasa('P4 guardar', pg_temp.fp_corre(config_a, format(
    'select jsonb_build_object(''version'', public.fase_guardar(%L, %L, %L::jsonb))', f1, v2, '{"nombre": "FP a2"}')));
  if not exists (select 1 from public.actividad x where x.id > actividad_antes and x.tabla = 'fases' and x.accion = 'fases.update'
                 and x.registro_id = f1::text) then
    raise exception 'P4: fase_guardar no dejó fases.update';
  end if;
end $$;
rollback;

-- @test fases: la forma del lote da 22023 hint posiciones y una fase ajena PT409, sin escribir nada (P5, P6)
begin;
do $$
declare
  -- Sin cuentas previas la primera queda dueña: se crea una antes de las que se prueban.
  primera uuid := pg_temp.fp_persona(array['vehiculos.ver']);
  a uuid := pg_temp.fp_flujo(); b uuid := pg_temp.fp_flujo();
  config_a uuid := pg_temp.fp_persona(array['flujos.configurar@' || pg_temp.fp_origen_de(a)]);
  f1 uuid := pg_temp.fp_fase(a, 'FP uno', 10); ajena uuid := pg_temp.fp_fase(b, 'FP ajena', 10);
  va timestamptz := pg_temp.fp_version(a); antes text := pg_temp.fp_posiciones(a); r jsonb; mal jsonb;
begin
  foreach mal in array array[
    '[]'::jsonb,
    '{"fase": 1}'::jsonb,
    (select jsonb_agg(jsonb_build_object('fase', gen_random_uuid(), 'x', 1, 'y', 1)) from generate_series(1, 201)),
    jsonb_build_array(jsonb_build_object('fase', f1, 'x', 1, 'y', 1), jsonb_build_object('fase', f1, 'x', 2, 'y', 2)),
    jsonb_build_array(jsonb_build_object('fase', f1, 'x', 1, 'y', null)),
    jsonb_build_array(jsonb_build_object('fase', f1, 'x', 1)),
    jsonb_build_array(jsonb_build_object('fase', f1, 'x', 10001, 'y', 1)),
    jsonb_build_array(jsonb_build_object('fase', f1, 'x', 1, 'y', 1, 'z', 1)),
    jsonb_build_array(jsonb_build_object('fase', 'no-es-un-uuid', 'x', 1, 'y', 1)),
    jsonb_build_array(jsonb_build_object('fase', f1, 'x', '1', 'y', 1))
  ] loop
    r := pg_temp.fp_guardar(config_a, a, va, mal);
    perform pg_temp.fp_da_error('P5 ' || left(mal::text, 60), r, '22023', 'posiciones');
  end loop;
  r := pg_temp.fp_guardar(config_a, a, va, jsonb_build_array(
    jsonb_build_object('fase', f1, 'x', 3, 'y', 3), jsonb_build_object('fase', ajena, 'x', 1, 'y', 1)));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' is distinct from 'Esa fase ya no está en este flujo. Recarga e intenta de nuevo.' then
    raise exception 'P6: una fase ajena dio %', r;
  end if;
  if pg_temp.fp_posiciones(a) is distinct from antes or pg_temp.fp_version(a) is distinct from va
     or (select posicion_x from public.fases where id = ajena) is not null then
    raise exception 'P5/P6: un rechazo escribió algo';
  end if;
end $$;
rollback;

-- @test fases: en repuestos guarda repuestos.configurar y no flujos.configurar de un origen (P7)
begin;
do $$
declare
  -- Sin cuentas previas la primera queda dueña: se crea una antes de las que se prueban.
  primera uuid := pg_temp.fp_persona(array['vehiculos.ver']);
  a uuid := pg_temp.fp_flujo(); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  config_a uuid := pg_temp.fp_persona(array['flujos.configurar@' || pg_temp.fp_origen_de(a)]);
  config_rep uuid := pg_temp.fp_persona(array['repuestos.configurar']);
  r1 uuid := pg_temp.fp_fase(rep, 'FP rep uno', 1000);
  lote jsonb := jsonb_build_array(jsonb_build_object('fase', r1, 'x', 8, 'y', 8)); r jsonb;
begin
  r := pg_temp.fp_guardar(config_a, rep, pg_temp.fp_version(rep), lote);
  perform pg_temp.fp_da_error('P7 origen en repuestos', r, '42501');
  perform pg_temp.fp_pasa('P7 repuestos', pg_temp.fp_guardar(config_rep, rep, pg_temp.fp_version(rep), lote));
  if (select posicion_x from public.fases where id = r1) is distinct from 8 then raise exception 'P7: no guardó la posición en repuestos'; end if;
end $$;
rollback;

-- @test fases: fase_crear con posicion la guarda; mal formada da 22023 hint posicion (P9)
begin;
do $$
declare
  -- Sin cuentas previas la primera queda dueña: se crea una antes de las que se prueban.
  primera uuid := pg_temp.fp_persona(array['vehiculos.ver']);
  a uuid := pg_temp.fp_flujo();
  config_a uuid := pg_temp.fp_persona(array['flujos.configurar@' || pg_temp.fp_origen_de(a)]);
  nueva uuid := gen_random_uuid(); r jsonb; mal jsonb;
begin
  perform pg_temp.fp_pasa('P9', pg_temp.fp_corre(config_a, format(
    'select jsonb_build_object(''version'', public.fase_crear(%L, %L, %L, %L::jsonb))',
    nueva, a, pg_temp.fp_version(a), '{"nombre": "FP nueva", "posicion": {"x": 12, "y": 30.5}}')));
  if (select posicion_x::text || ',' || posicion_y::text from public.fases where id = nueva) is distinct from '12.00,30.50' then
    raise exception 'P9: la fase nueva quedó en %', (select posicion_x || ',' || posicion_y from public.fases where id = nueva);
  end if;
  foreach mal in array array['{"x": 1}'::jsonb, '{"x": 1, "y": null}', '{"x": 1, "y": 2, "z": 3}', '[1, 2]', '{"x": -10001, "y": 0}'] loop
    r := pg_temp.fp_corre(config_a, format(
      'select jsonb_build_object(''version'', public.fase_crear(%L, %L, %L, %L::jsonb))',
      gen_random_uuid(), a, pg_temp.fp_version(a), jsonb_build_object('nombre', 'FP mal ' || mal::text, 'posicion', mal)));
    perform pg_temp.fp_da_error('P9 ' || mal::text, r, '22023', 'posicion');
  end loop;
end $$;
rollback;

-- @test fases: guardar posiciones no anota la revalidación de la web; renombrar una fase sí (P10)
begin;
do $$
declare
  -- Sin cuentas previas la primera queda dueña: se crea una antes de las que se prueban.
  primera uuid := pg_temp.fp_persona(array['vehiculos.ver']);
  a uuid := pg_temp.fp_flujo();
  config_a uuid := pg_temp.fp_persona(array['flujos.configurar@' || pg_temp.fp_origen_de(a)]);
  f1 uuid := pg_temp.fp_fase(a, 'FP uno', 10); v1 timestamptz;
begin
  -- Lo que anotaron las fases de arriba, en esta misma transacción, se va: queda sólo lo que anote lo que sigue.
  delete from interno.web_revalidar_pendiente where transaccion = pg_current_xact_id();
  v1 := pg_temp.fp_pasa('P10', pg_temp.fp_guardar(config_a, a, pg_temp.fp_version(a),
    jsonb_build_array(jsonb_build_object('fase', f1, 'x', 5, 'y', 5))));
  if exists (select 1 from interno.web_revalidar_pendiente where transaccion = pg_current_xact_id()) then
    raise exception 'P10: guardar posiciones anotó la revalidación de la web';
  end if;
  perform pg_temp.fp_pasa('P10 renombrar', pg_temp.fp_corre(config_a, format(
    'select jsonb_build_object(''version'', public.fase_guardar(%L, %L, %L::jsonb))', f1, v1, '{"nombre": "FP otro"}')));
  if not exists (select 1 from interno.web_revalidar_pendiente where transaccion = pg_current_xact_id() and etiqueta = 'vehiculos') then
    raise exception 'P10: renombrar una fase no anotó la revalidación de la web';
  end if;
end $$;
rollback;
