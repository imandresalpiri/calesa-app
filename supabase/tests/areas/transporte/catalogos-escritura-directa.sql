-- Puertos, navieras y categorías de gasto sin escritura directa: sólo por sus RPC. No depende de otro archivo
-- (`SOLO=areas/transporte/catalogos-escritura-directa.sql`). Los ayudantes son copia de `catalogos.sql`. Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   E1. Como authenticated con `logistica.catalogos.gestionar` en todos los orígenes, insert, update y delete directos en las tres tablas dan 42501; sin
--       INSERT, UPDATE ni DELETE de tabla ni de columna para authenticated; ninguna policy de INSERT, UPDATE, DELETE o ALL; el select sigue; los
--       ayudantes no los ejecuta ningún rol de la app; `aplicado_en` nombra las RPC.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.ced_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-ced@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ced_' || substr(v_id::text, 1, 8), 'ced ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.ced_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- @test transporte: puertos, navieras y categorías de gasto no se escriben directo, sólo por sus RPC (E1)
begin;
do $$
declare p uuid; r jsonb; v_sql text; v_tabla text; v_id uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  p := pg_temp.ced_persona(array['logistica.catalogos.gestionar']);
  r := pg_temp.ced_corre(p, format('select public.naviera_crear(%L, null, %L)', gen_random_uuid(), jsonb_build_object('nombre', 'ced ' || s)));
  if r ? 'error' then raise exception 'E1: por la RPC debía crear y dio %', r; end if;
  v_id := (r ->> 'id')::uuid;
  foreach v_tabla in array array['puertos', 'navieras', 'categorias_gasto'] loop
    foreach v_sql in array array[
      format('insert into public.%I (nombre) values (%L) returning to_jsonb(id)', v_tabla, 'ced directo ' || s),
      format('update public.%I set nombre = nombre || %L where id = %L returning to_jsonb(id)', v_tabla, ' x', v_id),
      format('delete from public.%I where id = %L returning to_jsonb(id)', v_tabla, v_id)
    ] loop
      r := pg_temp.ced_corre(p, v_sql);
      if r ->> 'error' is distinct from '42501' then raise exception 'E1 %: % debía dar 42501 y dio %', v_tabla, split_part(v_sql, ' ', 1), r; end if;
    end loop;
    if exists (select 1 from information_schema.role_table_grants
                where table_schema = 'public' and table_name = v_tabla and grantee in ('authenticated', 'anon')
                  and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')) then
      raise exception 'E1: authenticated no debía tener escritura de tabla en %', v_tabla;
    end if;
    if exists (select 1 from information_schema.column_privileges
                where table_schema = 'public' and table_name = v_tabla and grantee in ('authenticated', 'anon') and privilege_type in ('INSERT', 'UPDATE')) then
      raise exception 'E1: authenticated no debía tener escritura de columna en %', v_tabla;
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = v_tabla and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')) then
      raise exception 'E1: no debía quedar una policy de escritura en %', v_tabla;
    end if;
  end loop;
  r := pg_temp.ced_corre(p, format('select to_jsonb(nombre) from public.navieras where id = %L', v_id));
  if r is distinct from to_jsonb('ced ' || s) then raise exception 'E1: el select debía seguir y dio %', r; end if;
  r := pg_temp.ced_corre(p, 'select to_jsonb(count(*)) from (select 1 from public.puertos limit 1) x');
  if r is distinct from '1'::jsonb then raise exception 'E1: debía leer los puertos y dio %', r; end if;
  -- Los ayudantes (permisos, validaciones, usos) no los llama la app.
  if exists (select 1 from pg_proc f where f.pronamespace = 'public'::regnamespace
               and f.proname in ('_catalogo_logistica_origen', '_catalogo_logistica_exigir', '_catalogo_logistica_repetido', '_catalogo_logistica_texto',
                                 '_catalogo_logistica_claves', '_puerto_de_jsonb', '_naviera_de_jsonb', '_categoria_gasto_de_jsonb', '_puerto_tapan',
                                 '_naviera_tapan', '_categoria_gasto_tapan', '_puerto_uso', '_naviera_uso', '_categoria_gasto_uso',
                                 '_gasto_categoria_del_origen', 'catalogo_logistica_version')
               and (has_function_privilege('authenticated', f.oid, 'execute') or has_function_privilege('anon', f.oid, 'execute'))) then
    raise exception 'E1: un ayudante de los catálogos quedó ejecutable por la app';
  end if;
  if (select aplicado_en from public.permisos where clave = 'logistica.catalogos.gestionar') not like 'puerto_crear, puerto_guardar, naviera_crear%'
     or not (select por_origen from public.permisos where clave = 'logistica.catalogos.gestionar') then
    raise exception 'E1: el permiso debía ser por origen y nombrar las RPC';
  end if;
end $$;
rollback;
