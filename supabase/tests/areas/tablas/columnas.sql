-- Cambiar las columnas de una tabla de referencia (`tabla_referencia_columnas()`): sumar, renombrar y mover suben la versión con una nota automática
-- sin tocar filas ni publicar la N+1; quitar una sin uso la borra de las filas; quitar una que nombra la publicada o el borrador de un origen que
-- recibe la tabla es 23503 con quién; el tipo no cambia; PT409, 42501 y la versión que después pide publicar.
-- docs/COTIZADOR.md › «Crear, columnas y desactivar». Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno con
-- `tk_preparar()` en su transacción y la revierte.

-- @test tablas columnas: los ayudantes
reset role;
create or replace function pg_temp.tk_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

create or replace function pg_temp.tk_persona(p_id uuid, p_nombre text, p_concesiones jsonb) returns void language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = p_nombre, invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('tk_' || substr(p_id::text, 25, 12), 'TK ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c ->> 'clave', (c ->> 'origen')::uuid, 'todos');
  end loop;
end $f$;

-- Una fórmula del origen con esos nodos (publicada con un diseño vacío, o borrador).
create or replace function pg_temp.tk_formula(p_origen uuid, p_estado text, p_nodos jsonb) returns void language sql as $f$
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (p_origen, case when p_estado = 'publicada' then 1 end, p_estado::public.estado_version, jsonb_build_object('nodos', p_nodos), '{}',
          case when p_estado = 'publicada' then '{"secciones": []}'::jsonb end, case when p_estado = 'publicada' then '{}'::jsonb end,
          case when p_estado = 'publicada' then now() end)
$f$;

-- El terreno: los orígenes `prueba_tk` («Prueba tk») y `prueba_tk2` («Prueba tk dos»), y sus tablas:
--   tk_tarifas (propia de tk): pais, anio, monto, factor, desde, hasta, libre; dos filas. La publicada de tk la usa por un nodo `tabla`
--     (match pais, columna monto) y un `tramo` (columna factor: también desde y hasta); el borrador de tk, por un `tabla` con columna anio.
--   tk_comun (compartida): pais, monto, nota. Las publicadas de tk y tk2 la usan con columna monto.
--   tk_libre (propia de tk2): clave, monto; una fila; nadie la usa.
-- Las personas: a configura los dos orígenes; b sólo `prueba_tk`.
create or replace function pg_temp.tk_preparar() returns void language plpgsql as $f$
declare o uuid; o2 uuid; t uuid;
begin
  insert into public.origenes (clave, nombre) values ('prueba_tk', 'Prueba tk') returning id into o;
  insert into public.origenes (clave, nombre) values ('prueba_tk2', 'Prueba tk dos') returning id into o2;
  perform pg_temp.tk_persona('00000000-0000-4000-8000-00000000d00a', 'Ana Tk', jsonb_build_array(
    jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o), jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o2)));
  perform pg_temp.tk_persona('00000000-0000-4000-8000-00000000d00b', 'Beto Tk', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o)));
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values (o, 'tk_tarifas', 'Tarifas tk',
    '[{"clave":"pais","etiqueta":"País","tipo":"texto"},{"clave":"anio","etiqueta":"Año","tipo":"anio"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"},
      {"clave":"factor","etiqueta":"Factor","tipo":"numero"},{"clave":"desde","etiqueta":"Desde","tipo":"numero"},{"clave":"hasta","etiqueta":"Hasta","tipo":"numero"},
      {"clave":"libre","etiqueta":"Libre","tipo":"texto"}]') returning id into t;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) values
    (t, '{"pais":"jp","anio":2020,"monto":1,"factor":0.5,"desde":0,"hasta":10,"libre":"x"}', 0),
    (t, '{"pais":"us","anio":2021,"monto":2,"factor":0.7,"desde":11,"hasta":20}', 1);
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values (null, 'tk_comun', 'Común tk',
    '[{"clave":"pais","etiqueta":"País","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"},{"clave":"nota","etiqueta":"Nota","tipo":"texto"}]');
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values (o2, 'tk_libre', 'Libre tk',
    '[{"clave":"clave","etiqueta":"Clave","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"}]') returning id into t;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) values (t, '{"clave":"a","monto":1}', 0);
  perform pg_temp.tk_formula(o, 'publicada', '[
    {"id":"remate","tipo":"input"},
    {"id":"arancel","tipo":"tabla","tabla":"tk_tarifas","match":{"pais":"remate"},"columna":"monto"},
    {"id":"tramo","tipo":"tramo","tabla":"tk_tarifas","sobre":"remate","columna":"factor"},
    {"id":"comun","tipo":"tabla","tabla":"tk_comun","match":{"pais":"remate"},"columna":"monto"}]');
  perform pg_temp.tk_formula(o, 'borrador', '[{"id":"remate","tipo":"input"},{"id":"anio","tipo":"tabla","tabla":"tk_tarifas","match":{"pais":"remate"},"columna":"anio"}]');
  perform pg_temp.tk_formula(o2, 'publicada', '[{"id":"remate","tipo":"input"},{"id":"comun","tipo":"tabla","tabla":"tk_comun","match":{"pais":"remate"},"columna":"monto"}]');
end $f$;

create or replace function pg_temp.tk_tabla(p_clave text) returns public.tablas_referencia language sql as $f$
  select * from public.tablas_referencia where clave = p_clave
$f$;

-- Las columnas de la tabla con un cambio: `p_sin` quita esas claves; `p_mas` suma columnas al final.
create or replace function pg_temp.tk_cols(p_clave text, p_sin text[] default '{}', p_mas jsonb default '[]') returns jsonb language sql as $f$
  select coalesce(jsonb_agg(c.value order by c.n) filter (where not (c.value ->> 'clave') = any (p_sin)), '[]'::jsonb) || p_mas
    from jsonb_array_elements((pg_temp.tk_tabla(p_clave)).columnas) with ordinality c (value, n)
$f$;

create or replace function pg_temp.tk_sql(p_tabla uuid, p_columnas jsonb, p_version int) returns text language sql as $f$
  select format('select public.tabla_referencia_columnas(%L, %L, %L)', p_tabla, p_columnas, p_version)
$f$;

create or replace function pg_temp.tk_error(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v_m text; v_h text;
begin
  perform pg_temp.tk_como(p_quien);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
  return sqlstate || '|' || v_m || '|' || coalesce(v_h, '');
end $f$;

create or replace function pg_temp.tk_cambiar(p_quien uuid, p_tabla uuid, p_columnas jsonb, p_version int) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform pg_temp.tk_como(p_quien);
  set local role authenticated;
  r := public.tabla_referencia_columnas(p_tabla, p_columnas, p_version);
  reset role;
  return r;
end $f$;

create or replace function pg_temp.tk_igual(p_dio text, p_esperado text) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_esperado then raise exception 'esperaba «%», dio «%»', p_esperado, p_dio; end if;
end $f$;

-- Lo que la base guarda de las tablas, sus filas y las fórmulas del terreno, para comparar antes y después de un error.
create or replace function pg_temp.tk_foto() returns text language sql as $f$
  select jsonb_build_object(
    'tablas', (select jsonb_agg(to_jsonb(r) order by r.id) from public.tablas_referencia r where r.clave like 'tk_%'),
    'filas', (select jsonb_agg(to_jsonb(x) order by x.id) from public.tablas_referencia_filas x join public.tablas_referencia r on r.id = x.tabla_id where r.clave like 'tk_%'),
    'formulas', (select jsonb_agg(to_jsonb(f) order by f.id) from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave like 'prueba_tk%'))::text
$f$;

-- @test tablas columnas: sumar, renombrar y mover suben la versión con su nota y autor, sin tocar filas ni publicar la N+1
begin;
select pg_temp.tk_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000d00a'; t public.tablas_referencia := pg_temp.tk_tabla('tk_tarifas'); v_filas text; v_formulas int; r jsonb;
        v_nuevas jsonb; v_act record;
begin
  select jsonb_agg(to_jsonb(x) order by x.id)::text into v_filas from public.tablas_referencia_filas x where x.tabla_id = t.id;
  select count(*) into v_formulas from public.formulas f where f.origen_id = t.origen_id;
  -- Renombra «Monto» a «Monto USD», pone «Libre» primero y suma «Cilindrada» (con una llave de más que se descarta).
  select jsonb_build_array((t.columnas -> 6)) || jsonb_agg(case when c.value ->> 'clave' = 'monto' then c.value || '{"etiqueta":" Monto USD "}' else c.value end order by c.n)
         || '[{"clave":"cc","etiqueta":"Cilindrada","tipo":"numero","x":1}]'::jsonb
    into v_nuevas from jsonb_array_elements(t.columnas) with ordinality c (value, n) where c.n <= 6;
  r := pg_temp.tk_cambiar(a, t.id, v_nuevas, 1);
  perform pg_temp.tk_igual(r::text, '{"version": 2}');
  t := pg_temp.tk_tabla('tk_tarifas');
  perform pg_temp.tk_igual(t.version::text, '2');
  perform pg_temp.tk_igual(t.nota, 'Columnas: sumó «Cilindrada»; renombró «Monto» a «Monto USD»; cambió el orden.');
  perform pg_temp.tk_igual(t.publicado_por::text, a::text);
  perform pg_temp.tk_igual((t.publicado_en is not null)::text, 'true');
  perform pg_temp.tk_igual((select string_agg(c.value ->> 'clave' || ':' || (c.value ->> 'etiqueta'), ',' order by c.n) from jsonb_array_elements(t.columnas) with ordinality c (value, n)),
    'libre:Libre,pais:País,anio:Año,monto:Monto USD,factor:Factor,desde:Desde,hasta:Hasta,cc:Cilindrada');
  perform pg_temp.tk_igual((t.columnas -> 7)::text, '{"tipo": "numero", "clave": "cc", "etiqueta": "Cilindrada"}');
  perform pg_temp.tk_igual((select jsonb_agg(to_jsonb(x) order by x.id)::text from public.tablas_referencia_filas x where x.tabla_id = t.id), v_filas);
  perform pg_temp.tk_igual((select count(*)::int from public.formulas f where f.origen_id = t.origen_id)::text, v_formulas::text);
  -- La actividad: la versión y la nota, nunca las columnas.
  select a2.antes, a2.despues into v_act from public.actividad a2 where a2.accion = 'tabla_referencia.columnas' and a2.registro_id = t.id::text;
  perform pg_temp.tk_igual(v_act.antes::text, '{"version": 1}');
  perform pg_temp.tk_igual(v_act.despues::text, jsonb_build_object('version', 2, 'nota', t.nota)::text);
  -- Sólo mover.
  r := pg_temp.tk_cambiar(a, t.id, (t.columnas - 0) || jsonb_build_array(t.columnas -> 0), 2);
  perform pg_temp.tk_igual((pg_temp.tk_tabla('tk_tarifas')).nota, 'Columnas: cambió el orden.');
end $$;
rollback;

-- @test tablas columnas: quitar una columna sin uso la borra de las filas, aunque la muestre la ayuda en bloques de una celda
begin;
select pg_temp.tk_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000d00a'; t public.tablas_referencia := pg_temp.tk_tabla('tk_tarifas'); r jsonb;
begin
  -- Una ayuda no retiene la columna: su bloque deja de mostrarla y publicar a mano lo marca (`ayuda_columna_inexistente`).
  update public.formulas f set diseno = '{"secciones": [{"titulo": "S", "items": [{"tipo": "celda", "nodo": "remate", "ayuda":
      [{"tipo": "tabla", "tabla": "tk_tarifas", "columnas": [{"columna": "pais"}, {"columna": "libre"}]}]}]}]}'
   where f.origen_id = t.origen_id and f.estado = 'publicada';
  r := pg_temp.tk_cambiar(a, t.id, pg_temp.tk_cols('tk_tarifas', '{libre}'), 1);
  perform pg_temp.tk_igual((pg_temp.tk_tabla('tk_tarifas')).nota, 'Columnas: quitó «Libre».');
  perform pg_temp.tk_igual((select count(*)::text from public.tablas_referencia_filas x where x.tabla_id = t.id and x.valores ? 'libre'), '0');
  perform pg_temp.tk_igual((select count(*)::text from public.tablas_referencia_filas x where x.tabla_id = t.id and x.valores ? 'pais'), '2');
end $$;
rollback;

-- @test tablas columnas: quitar una que nombra la publicada (match, columna, desde de un tramo) o el borrador es 23503 con quién, y nada cambia
begin;
select pg_temp.tk_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000d00a'; t public.tablas_referencia := pg_temp.tk_tabla('tk_tarifas'); v_antes text := pg_temp.tk_foto();
begin
  perform pg_temp.tk_igual(pg_temp.tk_error(a, pg_temp.tk_sql(t.id, pg_temp.tk_cols('tk_tarifas', '{pais}'), 1)),
    '23503|La columna «País» la usan la fórmula publicada de Prueba tk y el borrador de Prueba tk.|columnas');
  perform pg_temp.tk_igual(pg_temp.tk_error(a, pg_temp.tk_sql(t.id, pg_temp.tk_cols('tk_tarifas', '{monto}'), 1)),
    '23503|La columna «Monto» la usa la fórmula publicada de Prueba tk.|columnas');
  perform pg_temp.tk_igual(pg_temp.tk_error(a, pg_temp.tk_sql(t.id, pg_temp.tk_cols('tk_tarifas', '{desde}'), 1)),
    '23503|La columna «Desde» la usa la fórmula publicada de Prueba tk.|columnas');
  perform pg_temp.tk_igual(pg_temp.tk_error(a, pg_temp.tk_sql(t.id, pg_temp.tk_cols('tk_tarifas', '{anio}'), 1)),
    '23503|La columna «Año» la usa el borrador de Prueba tk.|columnas');
  -- Varias, con la publicada y el borrador; la sin uso que va con ellas tampoco se quita.
  perform pg_temp.tk_igual(pg_temp.tk_error(a, pg_temp.tk_sql(t.id, pg_temp.tk_cols('tk_tarifas', '{anio,factor,libre}'), 1)),
    '23503|Las columnas «Año» y «Factor» las usan la fórmula publicada de Prueba tk y el borrador de Prueba tk.|columnas');
  perform pg_temp.tk_igual(pg_temp.tk_foto(), v_antes);
end $$;
rollback;

-- @test tablas columnas: una compartida que usan dos orígenes los nombra a los dos; sin permiso en uno que la usa (publicada o borrador), 42501 con su nombre
begin;
select pg_temp.tk_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000d00a'; b uuid := '00000000-0000-4000-8000-00000000d00b'; t public.tablas_referencia := pg_temp.tk_tabla('tk_comun');
        v_antes text := pg_temp.tk_foto(); r jsonb;
begin
  perform pg_temp.tk_igual(pg_temp.tk_error(a, pg_temp.tk_sql(t.id, pg_temp.tk_cols('tk_comun', '{monto}'), 1)),
    '23503|La columna «Monto» la usan la fórmula publicada de Prueba tk y la fórmula publicada de Prueba tk dos.|columnas');
  perform pg_temp.tk_igual(pg_temp.tk_error(b, pg_temp.tk_sql(t.id, pg_temp.tk_cols('tk_comun', '{nota}'), 1)),
    '42501|La usa la fórmula de Prueba tk dos, donde no tienes «cotizaciones.configurar».|');
  perform pg_temp.tk_igual(pg_temp.tk_foto(), v_antes);
  -- Quien configura los dos quita la que nadie usa.
  r := pg_temp.tk_cambiar(a, t.id, pg_temp.tk_cols('tk_comun', '{nota}'), 1);
  perform pg_temp.tk_igual(r::text, '{"version": 2}');
  -- Si en tk dos sólo la usa el borrador, también pide su permiso: el 23503 no nombra el borrador de un origen ajeno.
  delete from public.formulas where origen_id = (select id from public.origenes where clave = 'prueba_tk2');
  perform pg_temp.tk_formula((select id from public.origenes where clave = 'prueba_tk2'), 'borrador',
    '[{"id":"remate","tipo":"input"},{"id":"comun","tipo":"tabla","tabla":"tk_comun","match":{"pais":"remate"},"columna":"pais"}]');
  perform pg_temp.tk_igual(pg_temp.tk_error(b, pg_temp.tk_sql(t.id, pg_temp.tk_cols('tk_comun', '{pais}'), 2)),
    '42501|La usa la fórmula de Prueba tk dos, donde no tienes «cotizaciones.configurar».|');
end $$;
rollback;

-- @test tablas columnas: el tipo no cambia; una nacida por SQL con otro tipo se conserva si no cambia; sin cambios, 22023
begin;
select pg_temp.tk_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000d00a'; t public.tablas_referencia := pg_temp.tk_tabla('tk_libre'); r jsonb;
begin
  perform pg_temp.tk_igual(pg_temp.tk_error(a, pg_temp.tk_sql(t.id, '[{"clave":"clave","etiqueta":"Clave","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"texto"}]', 1)),
    '22023|La columna 2: su tipo no cambia; quítala y súmala de nuevo.|columnas.1.tipo');
  perform pg_temp.tk_igual(pg_temp.tk_error(a, pg_temp.tk_sql(t.id, t.columnas, 1)), '22023|Las columnas no cambiaron.|columnas');
  -- Una etiqueta con espacios en los bordes es la misma etiqueta.
  perform pg_temp.tk_igual(pg_temp.tk_error(a, pg_temp.tk_sql(t.id, '[{"clave":"clave","etiqueta":" Clave ","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"}]', 1)),
    '22023|Las columnas no cambiaron.|columnas');
  -- La nacida por SQL con el tipo «moneda» y una llave propia: se renombra y conserva las dos; otra con «moneda» no se suma.
  update public.tablas_referencia set columnas = '[{"clave":"clave","etiqueta":"Clave","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"moneda","formato":"usd"}]' where id = t.id;
  r := pg_temp.tk_cambiar(a, t.id, '[{"clave":"clave","etiqueta":"Clave","tipo":"texto"},{"clave":"monto","etiqueta":"Monto USD","tipo":"moneda"}]', 1);
  perform pg_temp.tk_igual(((pg_temp.tk_tabla('tk_libre')).columnas -> 1)::text, '{"tipo": "moneda", "clave": "monto", "formato": "usd", "etiqueta": "Monto USD"}');
  perform pg_temp.tk_igual(pg_temp.tk_error(a, pg_temp.tk_sql(t.id, pg_temp.tk_cols('tk_libre', '{}', '[{"clave":"otra","etiqueta":"Otra","tipo":"moneda"}]'), 2)),
    '22023|La columna 3: el tipo es número, año o texto.|columnas.2.tipo');
end $$;
rollback;

-- @test tablas columnas: con otra versión, PT409 que dice quién y cuál; una tabla que no existe o inactiva da el mismo 42501; la esperada nula, 22023
begin;
select pg_temp.tk_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000d00a'; t public.tablas_referencia := pg_temp.tk_tabla('tk_libre'); r jsonb; v_antes text;
        c_no constant text := '42501|No tienes el permiso «cotizaciones.configurar».|';
begin
  r := pg_temp.tk_cambiar(a, t.id, pg_temp.tk_cols('tk_libre', '{}', '[{"clave":"x","etiqueta":"X","tipo":"texto"}]'), 1);
  update public.tablas_referencia set publicado_en = null where id = t.id;
  update public.perfiles set nombre = 'Otra Tk' where id = a;
  v_antes := pg_temp.tk_foto();
  -- Lo cambió otra cuenta: su nombre; sin fecha, sin «hace».
  update public.tablas_referencia set publicado_por = '00000000-0000-4000-8000-00000000d00b' where id = t.id;
  perform pg_temp.tk_igual(pg_temp.tk_error(a, pg_temp.tk_sql(t.id, pg_temp.tk_cols('tk_libre', '{x}'), 1)),
    'PT409|Beto Tk publicó la versión 2 de esta tabla.|');
  perform pg_temp.tk_igual(pg_temp.tk_error(a, pg_temp.tk_sql(t.id, pg_temp.tk_cols('tk_libre', '{x}'), null)), '22023|Falta la versión de la tabla que tenías.|version');
  perform pg_temp.tk_igual(pg_temp.tk_error(a, pg_temp.tk_sql(gen_random_uuid(), pg_temp.tk_cols('tk_libre', '{x}'), 2)), c_no);
  update public.tablas_referencia set activa = false where id = t.id;
  perform pg_temp.tk_igual(pg_temp.tk_error(a, pg_temp.tk_sql(t.id, pg_temp.tk_cols('tk_libre', '{x}'), 2)), c_no);
end $$;
rollback;

-- @test tablas columnas: después de cambiar las columnas, publicar con la versión de antes es PT409 y con la nueva entra
begin;
select pg_temp.tk_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000000d00a'; t public.tablas_referencia := pg_temp.tk_tabla('tk_libre'); r jsonb; v text;
begin
  r := pg_temp.tk_cambiar(a, t.id, '[{"clave":"clave","etiqueta":"Clave","tipo":"texto"},{"clave":"monto","etiqueta":"Monto USD","tipo":"numero"}]', 1);
  v := pg_temp.tk_error(a, format('select public.tabla_referencia_publicar(%L, %L, %L, %L)', t.id, '[{"clave":"a","monto":5}]', 'nueva', 1));
  perform pg_temp.tk_igual(split_part(v, '|', 1), 'PT409');
  perform pg_temp.tk_igual(pg_temp.tk_error(a, format('select public.tabla_referencia_publicar(%L, %L, %L, %L)', t.id, '[{"clave":"a","monto":5}]', 'nueva', 2)), 'sin error');
  perform pg_temp.tk_igual((pg_temp.tk_tabla('tk_libre')).version::text, '3');
end $$;
rollback;
