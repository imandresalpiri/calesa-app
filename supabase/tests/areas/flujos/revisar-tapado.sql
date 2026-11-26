-- «Revisar» un flujo avisa (info) del requisito que pide un tipo de documento compartido que el flujo tapa con un propio activo de la misma clave
-- (`tipo_documento_tapado`). No depende de otro archivo (`SOLO=areas/flujos/revisar-tapado.sql`); los ayudantes son copia de `flujos-revisar.sql`.
-- Cada bloque abre su transacción y la revierte. El conjunto se compara como `codigo:fase_id`; el texto, entero (no lleva ids ni fechas).
--
-- Qué asegura:
--   T1. En el flujo de un origen: sin propio, nada; con un propio activo de la misma clave (otras mayúsculas, tildes y espacios), el aviso en la
--       fase del requisito con «este origen»; con el propio inactivo, de otro flujo o pedido él mismo, nada.
--   T2. En el flujo de repuestos el texto dice «este flujo».

-- Una persona activa con un rol propio y estas concesiones: 'clave' (global) o 'clave@<origen>'.
create or replace function pg_temp.frt_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('frt_' || substr(v_id::text, 1, 8), 'FRT ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.frt_fase(p_flujo uuid, p_nombre text, p_orden int, p_inicial boolean default false, p_final boolean default false)
returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, es_inicial, es_final) values (p_flujo, p_nombre, p_orden, p_inicial, p_final) returning id;
$f$;

create or replace function pg_temp.frt_salida(p_de uuid, p_a uuid) returns uuid language sql as $f$
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) select flujo_id, p_de, p_a from public.fases where id = p_de returning id;
$f$;

-- Un origen manual nuevo con su flujo I (inicial) → A → F (final), todo conectado: no da avisos.
create or replace function pg_temp.frt_flujo() returns uuid language plpgsql as $f$
declare o uuid; fl uuid; i uuid; a uuid; f uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('frt_' || s, 'FRT origen ' || s, 'manual') returning id into o;
  fl := (select id from public.flujos where origen_id = o);
  i := pg_temp.frt_fase(fl, 'I', 10, true, false);
  a := pg_temp.frt_fase(fl, 'A', 20);
  f := pg_temp.frt_fase(fl, 'F', 30, false, true);
  perform pg_temp.frt_salida(i, a);
  perform pg_temp.frt_salida(a, f);
  return fl;
end $f$;

-- Lo que devuelve `revisar_flujo` a esa persona, como `codigo:fase_id` ordenados; con `p_codigo`, los mensajes de ese código. Un error hace caer el bloque.
create or replace function pg_temp.frt_avisos(p_quien uuid, p_flujo uuid, p_codigo text default null) returns text[] language plpgsql as $f$
declare v text[];
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  if p_codigo is null then
    execute $q$select coalesce(array_agg(r.codigo || ':' || coalesce(r.fase_id::text, '-') order by r.codigo || ':' || coalesce(r.fase_id::text, '-') collate "C"), '{}')
               from public.revisar_flujo($1) r$q$ into v using p_flujo;
  else
    execute $q$select coalesce(array_agg(r.mensaje order by r.mensaje collate "C"), '{}') from public.revisar_flujo($1) r where r.codigo = $2$q$
      into v using p_flujo, p_codigo;
  end if;
  reset role;
  return v;
end $f$;

create or replace function pg_temp.frt_es(p_que text, p_dio text[], p_esperado text[]) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_esperado then raise exception '%: debía dar % y dio %', p_que, p_esperado, p_dio; end if;
end $f$;

-- @test revisar: tipo_documento_tapado cuando un requisito pide un compartido que el origen tapa con un propio activo (T1)
begin;
do $$
declare
  fl uuid := pg_temp.frt_flujo(); otro uuid := pg_temp.frt_flujo(); config uuid := pg_temp.frt_persona(array['flujos.configurar']);
  a uuid := (select id from public.fases where flujo_id = fl and nombre = 'A');
  s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8); g uuid; p uuid; q uuid;
begin
  insert into public.tipos_documento (nombre) values ('FRT Póliza ' || s) returning id into g;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, tipo_documento_id) values (a, 'documento', true, g);
  perform pg_temp.frt_es('T1 sin propio', pg_temp.frt_avisos(config, fl), '{}');
  insert into public.tipos_documento (flujo_id, nombre) values (otro, 'frt poliza ' || s);
  perform pg_temp.frt_es('T1 con el propio en otro flujo', pg_temp.frt_avisos(config, fl), '{}');
  insert into public.tipos_documento (flujo_id, nombre) values (fl, ' frt  POLIZA ' || s) returning id into p;
  perform pg_temp.frt_es('T1 tapado', pg_temp.frt_avisos(config, fl), array['tipo_documento_tapado:' || a]);
  perform pg_temp.frt_es('T1 el texto', pg_temp.frt_avisos(config, fl, 'tipo_documento_tapado'),
    array['La fase «A» pide «FRT Póliza ' || s || '», compartido, que este origen tapa con su « frt  POLIZA ' || s || '».']);
  update public.tipos_documento set activo = false where id = p;
  perform pg_temp.frt_es('T1 con el propio inactivo', pg_temp.frt_avisos(config, fl), '{}');
  update public.tipos_documento set activo = true where id = p;
  -- Un requisito que pide el propio no avisa.
  update public.fases_requisitos set tipo_documento_id = p where fase_id = a returning id into q;
  perform pg_temp.frt_es('T1 pide el propio', pg_temp.frt_avisos(config, fl), '{}');
end $$;
rollback;

-- @test revisar: en el flujo de repuestos el aviso de tapado dice «este flujo» (T2)
begin;
do $$
declare
  rep uuid := (select id from public.flujos where ambito = 'repuestos'); config uuid := pg_temp.frt_persona(array['repuestos.configurar']);
  s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8); f uuid; g uuid;
begin
  f := pg_temp.frt_fase(rep, 'FRT fase ' || s, 990);
  insert into public.tipos_documento (nombre) values ('FRT Factura ' || s) returning id into g;
  insert into public.fases_requisitos (fase_id, tipo, tipo_documento_id) values (f, 'documento', g);
  insert into public.tipos_documento (flujo_id, nombre) values (rep, 'FRT factura ' || s);
  perform pg_temp.frt_es('T2 el texto', pg_temp.frt_avisos(config, rep, 'tipo_documento_tapado'),
    array['La fase «FRT fase ' || s || '» pide «FRT Factura ' || s || '», compartido, que este flujo tapa con su «FRT factura ' || s || '».']);
end $$;
rollback;
