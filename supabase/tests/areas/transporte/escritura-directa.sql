-- Transporte sin escritura directa (paso 6.07-1, C13). No depende de otro archivo (`SOLO=areas/transporte/escritura-directa.sql`). Los ayudantes son
-- copia de `guardar.sql`. Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   E1. Como authenticated con todas las claves, insert, update y delete directos en `transportes`, `embarques`, `contenedores` y `tipos_contenedor`
--       dan 42501; sin INSERT, UPDATE ni DELETE de tabla ni de columna para authenticated; ninguna policy de INSERT, UPDATE, DELETE o ALL; el select
--       sigue (el booking, en su embarque); `aplicado_en` nombra `transporte_guardar`.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.trn_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-tr@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('tr_' || substr(v_id::text, 1, 8), 'tr ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, 'todos');
  end loop;
  return v_id;
end $f$;

-- Un origen (con su flujo y sus reglas encendidas), una fase y un vehículo en ella.
create or replace function pg_temp.trn_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fa uuid; v uuid; v2 uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('tr_' || s, 'tr origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('tr2_' || s, 'tr origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl, 'tr en tránsito', 1, true) returning id into fa;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'tr vehículo', fa) returning id into v;
  insert into public.vehiculos (origen_id, titulo) values (o2, 'tr vehículo 2') returning id into v2;
  return jsonb_build_object('o', o, 'o2', o2, 'flujo', fl, 'fase', fa, 'v', v, 'v2', v2);
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.trn_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.trn_guardar(p_quien uuid, p_v uuid, p_esperada timestamptz, p_cambios jsonb, p_r uuid default null) returns jsonb
language sql as $f$
  -- Con una esperada, también las versiones vigentes de su embarque y su contenedor: quien guarda vio lo de ahora (el PT409 por el embarque o el
  -- contenedor, en `con-embarque.sql`).
  select pg_temp.trn_corre(p_quien, format('select public.transporte_guardar(%L, %L, %L, %L, %L, %L)', p_v, p_r, p_esperada, p_cambios,
    (select x.embarque_actualizado_en from public.transportes_con_embarque x where p_esperada is not null and (x.vehiculo_id = p_v or x.repuesto_id = p_r)),
    (select x.contenedor_actualizado_en from public.transportes_con_embarque x where p_esperada is not null and (x.vehiculo_id = p_v or x.repuesto_id = p_r))));
$f$;

create or replace function pg_temp.trn_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.trn_pasa(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'actualizado_en' is null then raise exception '%: debía guardar y dio %', p_que, p_r; end if;
  return (p_r ->> 'actualizado_en')::timestamptz;
end $f$;

-- @test transporte: transportes no se escribe directo, sólo por sus RPC (E1)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; r jsonb; v_sql text; v_tabla text;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar', 'repuestos.ver', 'repuestos.editar']);
  perform pg_temp.trn_pasa('E1 por la RPC', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, null, '{"booking": "BK1"}'));
  foreach v_sql in array array[
    format('insert into public.transportes (vehiculo_id) values (%L) returning to_jsonb(id)', t ->> 'v2'),
    format('update public.transportes set notas = %L where vehiculo_id = %L returning to_jsonb(id)', 'x', t ->> 'v'),
    format('delete from public.transportes where vehiculo_id = %L returning to_jsonb(id)', t ->> 'v'),
    format('insert into public.embarques (origen_id, booking) values (%L, %L) returning to_jsonb(id)', t ->> 'o', 'BK2'),
    format('update public.embarques set notas = %L where booking = %L returning to_jsonb(id)', 'x', 'BK1'),
    format('delete from public.embarques where booking = %L returning to_jsonb(id)', 'BK1'),
    format('insert into public.contenedores (origen_id, numero) values (%L, %L) returning to_jsonb(id)', t ->> 'o', 'C2'),
    'update public.contenedores set notas = ''x'' returning to_jsonb(id)',
    'delete from public.contenedores returning to_jsonb(id)',
    'insert into public.tipos_contenedor (clave, nombre) values (''ZZ'', ''zz'') returning to_jsonb(clave)',
    'update public.tipos_contenedor set nombre = ''x'' returning to_jsonb(clave)',
    'delete from public.tipos_contenedor returning to_jsonb(clave)'
  ] loop
    r := pg_temp.trn_corre(p, v_sql);
    perform pg_temp.trn_es('E1 ' || split_part(v_sql, ' ', 1), r, '42501');
  end loop;
  foreach v_tabla in array array['transportes', 'embarques', 'contenedores', 'tipos_contenedor'] loop
    if exists (select 1 from information_schema.role_table_grants
                where table_schema = 'public' and table_name = v_tabla and grantee = 'authenticated'
                  and privilege_type in ('INSERT', 'UPDATE', 'DELETE')) then
      raise exception 'E1: authenticated no debía tener escritura de tabla en %', v_tabla;
    end if;
    if exists (select 1 from information_schema.column_privileges
                where table_schema = 'public' and table_name = v_tabla and grantee = 'authenticated'
                  and privilege_type in ('INSERT', 'UPDATE')) then
      raise exception 'E1: authenticated no debía tener escritura de columna en %', v_tabla;
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = v_tabla and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')) then
      raise exception 'E1: no debía quedar una policy de escritura en %', v_tabla;
    end if;
  end loop;
  r := pg_temp.trn_corre(p, format('select to_jsonb(e.booking) from public.transportes t join public.embarques e on e.id = t.embarque_id '
                                   'where t.vehiculo_id = %L', t ->> 'v'));
  if r is distinct from '"BK1"'::jsonb then raise exception 'E1: el select debía seguir y dio %', r; end if;
  if (select aplicado_en from public.permisos where clave = 'logistica.transporte.editar') not like 'transporte_guardar%' then
    raise exception 'E1: aplicado_en debía nombrar transporte_guardar';
  end if;
end $$;
rollback;
