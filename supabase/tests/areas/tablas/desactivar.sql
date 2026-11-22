-- Desactivar una tabla de referencia (`tabla_referencia_desactivar()`): sin uso queda inactiva (no se lista, su clave sigue tomada y no se publica);
-- en uso por un nodo, por la copia congelada, por la ayuda del diseño o por el borrador es 23503 con quién, también la propia que tapa una compartida
-- que el origen usa; PT409 y el 42501 de un origen que la usa sin permiso.
-- docs/COTIZADOR.md › «Crear, columnas y desactivar». Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno con
-- `td_preparar()` en su transacción y la revierte.

-- @test tablas desactivar: los ayudantes
reset role;
create or replace function pg_temp.td_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

create or replace function pg_temp.td_persona(p_id uuid, p_nombre text, p_concesiones jsonb) returns void language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = p_nombre, invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('td_' || substr(p_id::text, 25, 12), 'TD ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c ->> 'clave', (c ->> 'origen')::uuid, 'todos');
  end loop;
end $f$;

-- Una fórmula del origen (publicada con su diseño, o borrador) con esos nodos, params y diseño.
create or replace function pg_temp.td_formula(p_origen uuid, p_estado text, p_nodos jsonb, p_params jsonb default '{}', p_diseno jsonb default '{"secciones": []}')
returns void language sql as $f$
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (p_origen, case when p_estado = 'publicada' then 1 end, p_estado::public.estado_version, jsonb_build_object('nodos', p_nodos), p_params,
          p_diseno, case when p_estado = 'publicada' then '{}'::jsonb end, case when p_estado = 'publicada' then now() end)
$f$;

-- El terreno: los orígenes `prueba_td` («Prueba td») y `prueba_td2` («Prueba td dos»); `td_sola` (propia de td) y `td_comun` (compartida), nadie las usa.
-- Las personas: a configura los dos orígenes; b sólo `prueba_td`.
create or replace function pg_temp.td_preparar() returns void language plpgsql as $f$
declare o uuid; o2 uuid;
begin
  insert into public.origenes (clave, nombre) values ('prueba_td', 'Prueba td') returning id into o;
  insert into public.origenes (clave, nombre) values ('prueba_td2', 'Prueba td dos') returning id into o2;
  perform pg_temp.td_persona('00000000-0000-4000-8000-00000000e00a', 'Ana Td', jsonb_build_array(
    jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o), jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o2)));
  perform pg_temp.td_persona('00000000-0000-4000-8000-00000000e00b', 'Beto Td', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o)));
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
  values (o, 'td_sola', 'Sola td', '[{"clave":"pais","etiqueta":"País","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"}]'),
         (null, 'td_comun', 'Común td', '[{"clave":"pais","etiqueta":"País","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"}]');
  insert into public.tablas_referencia_filas (tabla_id, valores, orden)
  select id, '{"pais":"jp","monto":1}', 0 from public.tablas_referencia where clave = 'td_sola';
end $f$;

create or replace function pg_temp.td_origen(p_clave text) returns uuid language sql as $f$ select id from public.origenes where clave = p_clave $f$;
create or replace function pg_temp.td_tabla(p_clave text, p_origen uuid default null) returns public.tablas_referencia language sql as $f$
  select * from public.tablas_referencia where clave = p_clave and origen_id is not distinct from p_origen
$f$;

create or replace function pg_temp.td_sql(p_tabla uuid, p_version int) returns text language sql as $f$
  select format('select public.tabla_referencia_desactivar(%L, %L)', p_tabla, p_version)
$f$;

create or replace function pg_temp.td_error(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v_m text; v_h text;
begin
  perform pg_temp.td_como(p_quien);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
  return sqlstate || '|' || v_m || '|' || coalesce(v_h, '');
end $f$;

create or replace function pg_temp.td_igual(p_dio text, p_esperado text) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_esperado then raise exception 'esperaba «%», dio «%»', p_esperado, p_dio; end if;
end $f$;

-- Cuántas tablas con esa clave ve esa persona por la policy de lectura.
create or replace function pg_temp.td_ve(p_quien uuid, p_clave text) returns int language plpgsql as $f$
declare n int;
begin
  perform pg_temp.td_como(p_quien);
  set local role authenticated;
  select count(*) into n from public.tablas_referencia where clave = p_clave and activa;
  reset role;
  return n;
end $f$;

-- @test tablas desactivar: sin uso queda inactiva con su actividad; no se lista, su clave sigue tomada y publicarla da 42501
begin;
select pg_temp.td_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000e00a'; o uuid := pg_temp.td_origen('prueba_td'); t public.tablas_referencia := pg_temp.td_tabla('td_sola', pg_temp.td_origen('prueba_td'));
begin
  perform pg_temp.td_igual(pg_temp.td_ve(a, 'td_sola')::text, '1');
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql(t.id, 1)), 'sin error');
  t := pg_temp.td_tabla('td_sola', o);
  perform pg_temp.td_igual(t.activa::text, 'false');
  perform pg_temp.td_igual(t.version::text, '1');
  perform pg_temp.td_igual((select count(*)::text from public.tablas_referencia_filas where tabla_id = t.id), '1');
  perform pg_temp.td_igual((select a2.antes::text || ' ' || a2.despues::text from public.actividad a2 where a2.accion = 'tabla_referencia.desactivada' and a2.registro_id = t.id::text),
    '{"version": 1} {"activa": false}');
  perform pg_temp.td_igual(pg_temp.td_ve(a, 'td_sola')::text, '0');
  perform pg_temp.td_igual(pg_temp.td_error(a, format('select public.tabla_referencia_crear(%L, %L, %L, %L)', gen_random_uuid(), o, 'Td sola',
    '[{"clave":"a","etiqueta":"A","tipo":"texto"}]')), '23505|Ya hay una tabla con la clave «td_sola» (desactivada): elige otro nombre.|nombre');
  perform pg_temp.td_igual(pg_temp.td_error(a, format('select public.tabla_referencia_publicar(%L, %L, %L, %L)', t.id, '[]', 'n', 1)),
    '42501|No tienes el permiso «cotizaciones.configurar».|');
  -- Ya inactiva: el mismo 42501.
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql(t.id, 1)), '42501|No tienes el permiso «cotizaciones.configurar».|');
end $$;
rollback;

-- @test tablas desactivar: en uso por un nodo, por la copia congelada, por la ayuda del diseño (también en bloques) o por el borrador es 23503 con quién
begin;
select pg_temp.td_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000e00a'; o uuid := pg_temp.td_origen('prueba_td'); t public.tablas_referencia := pg_temp.td_tabla('td_sola', pg_temp.td_origen('prueba_td'));
        c_pub constant text := '23503|La usa la fórmula publicada de Prueba td: quítala de esa fórmula para desactivarla.|tabla';
begin
  -- Un nodo `tramo`.
  perform pg_temp.td_formula(o, 'publicada', '[{"id":"r","tipo":"input"},{"id":"t","tipo":"tramo","tabla":"td_sola","sobre":"r","columna":"monto"}]');
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql(t.id, 1)), c_pub);
  -- Sólo la copia congelada.
  delete from public.formulas where origen_id = o;
  perform pg_temp.td_formula(o, 'publicada', '[{"id":"r","tipo":"input"}]', '{"tablas": {"td_sola": []}}');
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql(t.id, 1)), c_pub);
  -- Sólo la ayuda de una celda del diseño.
  delete from public.formulas where origen_id = o;
  perform pg_temp.td_formula(o, 'publicada', '[{"id":"r","tipo":"input"}]', '{}',
    '{"secciones": [{"titulo": "S", "items": [{"tipo": "celda", "nodo": "r", "ayuda": {"tabla": "td_sola"}}]}]}');
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql(t.id, 1)), c_pub);
  -- Sólo un bloque de la ayuda en bloques, después de otro (el jsonpath `lax` recorre el arreglo).
  delete from public.formulas where origen_id = o;
  perform pg_temp.td_formula(o, 'publicada', '[{"id":"r","tipo":"input"}]', '{}',
    '{"secciones": [{"titulo": "S", "items": [{"tipo": "celda", "nodo": "r", "ayuda": [{"tipo": "titulo", "texto": "Tarifas"},
      {"tipo": "tabla", "tabla": "td_sola", "columnas": [{"columna": "monto"}]}]}]}]}');
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql(t.id, 1)), c_pub);
  -- La publicada y el borrador.
  perform pg_temp.td_formula(o, 'borrador', '[{"id":"r","tipo":"input"},{"id":"d","tipo":"calculo","op":"depreciar","de":["r"],"tabla":"td_sola","sobre":"r","columna":"monto"}]');
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql(t.id, 1)),
    '23503|La usan la fórmula publicada de Prueba td y el borrador de Prueba td: quítala de esas fórmulas para desactivarla.|tabla');
  -- Sólo el borrador.
  delete from public.formulas where origen_id = o and estado = 'publicada';
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql(t.id, 1)),
    '23503|La usa el borrador de Prueba td: quítala de esa fórmula para desactivarla.|tabla');
  perform pg_temp.td_igual((pg_temp.td_tabla('td_sola', o)).activa::text, 'true');
end $$;
rollback;

-- @test tablas desactivar: la propia que tapa una compartida que el origen usa es 23503; la compartida tapada en ese origen no está en uso ahí
begin;
select pg_temp.td_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000e00a'; o uuid := pg_temp.td_origen('prueba_td'); v_propia uuid;
begin
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
  values (o, 'td_comun', 'Común propia td', '[{"clave":"pais","etiqueta":"País","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"}]')
  returning id into v_propia;
  perform pg_temp.td_formula(o, 'publicada', '[{"id":"r","tipo":"input"},{"id":"c","tipo":"tabla","tabla":"td_comun","match":{"pais":"r"},"columna":"monto"}]');
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql(v_propia, 1)),
    '23503|La usa la fórmula publicada de Prueba td: quítala de esa fórmula para desactivarla.|tabla');
  -- La compartida: td la tapa con la propia, y ningún otro origen la usa.
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql((pg_temp.td_tabla('td_comun')).id, 1)), 'sin error');
end $$;
rollback;

-- @test tablas desactivar: con otra versión, PT409; sin permiso en un origen cuya publicada usa la compartida, 42501 con su nombre
begin;
select pg_temp.td_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000e00a'; b uuid := '00000000-0000-4000-8000-00000000e00b'; o2 uuid := pg_temp.td_origen('prueba_td2');
        t public.tablas_referencia := pg_temp.td_tabla('td_sola', pg_temp.td_origen('prueba_td'));
begin
  update public.tablas_referencia set version = 2, publicado_por = a, publicado_en = null where id = t.id;
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql(t.id, 1)), 'PT409|Publicaste la versión 2 de esta tabla.|');
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql(t.id, null)), '22023|Falta la versión de la tabla que tenías.|version');
  perform pg_temp.td_formula(o2, 'publicada', '[{"id":"r","tipo":"input"},{"id":"c","tipo":"tabla","tabla":"td_comun","match":{"pais":"r"},"columna":"monto"}]');
  perform pg_temp.td_igual(pg_temp.td_error(b, pg_temp.td_sql((pg_temp.td_tabla('td_comun')).id, 1)),
    '42501|La usa la fórmula de Prueba td dos, donde no tienes «cotizaciones.configurar».|');
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql((pg_temp.td_tabla('td_comun')).id, 1)),
    '23503|La usa la fórmula publicada de Prueba td dos: quítala de esa fórmula para desactivarla.|tabla');
end $$;
rollback;

-- @test tablas desactivar: la publicada de una fórmula del origen archivada no la usa; la de otra sin archivar del mismo origen sí
begin;
select pg_temp.td_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000e00a'; o uuid := pg_temp.td_origen('prueba_td'); t public.tablas_referencia := pg_temp.td_tabla('td_sola', pg_temp.td_origen('prueba_td'));
        v_vieja uuid; v_nueva uuid;
begin
  perform pg_temp.td_formula(o, 'publicada', '[{"id":"r","tipo":"input"},{"id":"t","tipo":"tramo","tabla":"td_sola","sobre":"r","columna":"monto"}]');
  select formula_del_origen_id into v_vieja from public.formulas where origen_id = o and estado = 'publicada';
  insert into public.formulas_del_origen (origen_id, nombre) values (o, 'Otra td') returning id into v_nueva;
  update public.formulas_del_origen set activa = false where id = v_vieja;
  update public.formulas_del_origen set archivada_en = now() where id = v_vieja;
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql(t.id, 1)), 'sin error');
  update public.tablas_referencia set activa = true where id = t.id;
  insert into public.formulas (origen_id, formula_del_origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (o, v_nueva, 1, 'publicada', '{"nodos":[{"id":"r","tipo":"input"},{"id":"t","tipo":"tramo","tabla":"td_sola","sobre":"r","columna":"monto"}]}',
          '{}', '{"secciones": []}', '{}', now());
  perform pg_temp.td_igual(pg_temp.td_error(a, pg_temp.td_sql(t.id, 1)),
    '23503|La usa la fórmula publicada de Prueba td: quítala de esa fórmula para desactivarla.|tabla');
end $$;
rollback;
