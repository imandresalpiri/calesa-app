-- La ayuda en bloques en la hoja (docs/COTIZADOR.md › «La lectura que abre la hoja», «El diseño de la hoja (D7)»): lo que `cotizacion_hoja()` manda de cada
-- bloque según quien mira (lo que llena sólo hacia un nodo que se ve, el id de la viva sólo a quien configura, una tabla sólo si quien mira puede leerla),
-- cómo casa una fila con la hoja (`casa`, sólo si todo el `match` se resuelve con lo que se ve) y las columnas que `cotizacion_tabla()` suma por la ayuda de
-- una celda que se ve. La guardada usa la misma `_cotizacion_hoja()` con `p_edita` falso. Sobre la semilla `subasta_usa` publicada en un origen propio,
-- con tablas propias: la sección «Componentes CIF» es del nivel «costos».
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno dentro de su transacción y la revierte.

create or replace function pg_temp.aeh_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, detail, hint, mensaje} si falla.
create or replace function pg_temp.aeh_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_m text; v_e text;
begin
  perform pg_temp.aeh_como(p_quien);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'detail', v_d, 'hint', v_h, 'mensaje', v_m);
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

-- Una persona con un rol propio y esas claves en ese origen.
create or replace function pg_temp.aeh_persona(p_id uuid, p_origen uuid, p_claves text[]) returns void language plpgsql as $f$
declare v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Ayuda ' || right(p_id::text, 4), invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('aeh_' || right(p_id::text, 4), 'Ayuda ' || right(p_id::text, 4)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c, case when c like 'cotizaciones.nivel.%' then null else p_origen end, 'todos');
  end loop;
end $f$;

-- Una tabla de referencia del origen con esas columnas (claves de tipo texto) y esas filas; su id.
create or replace function pg_temp.aeh_tabla(p_origen uuid, p_clave text, p_columnas text[], p_filas jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
  values (p_origen, p_clave, 'Ayuda ' || p_clave,
          (select jsonb_agg(jsonb_build_object('clave', c, 'etiqueta', initcap(c), 'tipo', 'texto') order by o) from unnest(p_columnas) with ordinality x (c, o)))
  returning id into v;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) select v, f.value, (f.ord - 1)::smallint from jsonb_array_elements(p_filas) with ordinality f (value, ord);
  return v;
end $f$;

-- El origen `p_clave` con la persona que lo configura (`q`, con «costos»), la asesora (`a`, sin «costos») y quien ve «costos» sin configurar (`c`); sus
-- tablas (`aeh_tarifas` a, b, c; `aeh_solo_cfg`, que no lee nadie; y las de la semilla que nombra la prueba, con sus filas) y la semilla `subasta_usa`
-- publicada con cada ayuda de `p_ayudas` (nodo → ayuda) puesta en la celda de ese nodo. Devuelve {o, f, t1, t2}.
create or replace function pg_temp.aeh_terreno(p_clave text, p_ayudas jsonb) returns jsonb language plpgsql as $f$
declare
  o uuid; s public.formulas; d jsonb; i int; k int; r jsonb; t1 uuid; t2 uuid; f uuid;
  q constant uuid := '00000000-0000-4000-8000-00000000ae01';
begin
  insert into public.origenes (clave, nombre) values (p_clave, 'Ayuda ' || p_clave) returning id into o;
  perform pg_temp.aeh_persona(q, o, array['cotizaciones.configurar', 'cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.nivel.costos.ver']);
  perform pg_temp.aeh_persona('00000000-0000-4000-8000-00000000ae02', o, array['cotizaciones.ver', 'cotizaciones.crear']);
  perform pg_temp.aeh_persona('00000000-0000-4000-8000-00000000ae03', o, array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.nivel.costos.ver']);
  t1 := pg_temp.aeh_tabla(o, 'aeh_tarifas', array['a', 'b', 'c'], '[{"a": "x", "b": "1", "c": "2"}, {"a": "y", "b": "3", "c": "4"}]');
  t2 := pg_temp.aeh_tabla(o, 'aeh_solo_cfg', array['z'], '[{"z": "9"}]');
  select f.* into s from public.formulas f join public.origenes x on x.id = f.origen_id where x.clave = 'subasta_usa' and f.estado = 'publicada';
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
  select o, t.clave, t.nombre, t.columnas from public.tablas_referencia t join public.origenes x on x.id = t.origen_id
   where x.clave = 'subasta_usa' and t.clave in ('transporte_usa_bolivia', 'depreciacion') and t.activa;
  d := s.diseno;
  for i in 0 .. jsonb_array_length(d -> 'secciones') - 1 loop
    for k in 0 .. jsonb_array_length(d -> 'secciones' -> i -> 'items') - 1 loop
      if d -> 'secciones' -> i -> 'items' -> k ->> 'tipo' = 'celda' and p_ayudas ? (d -> 'secciones' -> i -> 'items' -> k ->> 'nodo') then
        d := jsonb_set(d, array['secciones', i::text, 'items', k::text, 'ayuda'], p_ayudas -> (d -> 'secciones' -> i -> 'items' -> k ->> 'nodo'));
      end if;
    end loop;
  end loop;
  r := pg_temp.aeh_corre(q, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_actualizado_en_esperado => null)',
                                   o, s.definicion, s.params, d));
  if r ? 'error' then raise exception 'guardar el borrador: %', r; end if;
  r := pg_temp.aeh_corre(q, format('select to_jsonb(public.formula_publicar(p_origen => %L, p_nota => %L))', o, 'Ayuda'));
  if r ? 'error' then raise exception 'publicar: %', r; end if;
  select x.id into f from public.formulas x where x.origen_id = o and x.estado = 'publicada';
  return jsonb_build_object('o', o, 'f', f, 't1', t1, 't2', t2);
end $f$;

-- La ayuda de la celda de ese nodo en la hoja que esa persona abre (nula si la celda no viaja o va sin ayuda).
create or replace function pg_temp.aeh_ayuda(p_quien uuid, p_origen uuid, p_nodo text) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  r := pg_temp.aeh_corre(p_quien, format('select public.cotizacion_hoja(%L)', p_origen));
  if r ? 'error' or r ->> 'estado' is distinct from 'lista' then raise exception 'la hoja de %: %', p_quien, left(r::text, 300); end if;
  return (select i -> 'ayuda' from jsonb_path_query(r, 'strict $.secciones[*].items[*]') i where i ->> 'tipo' = 'celda' and i ->> 'nodo' = p_nodo limit 1);
end $f$;

-- Las claves de columna que `cotizacion_tabla()` da a esa persona, en orden, o el código del error.
create or replace function pg_temp.aeh_columnas(p_quien uuid, p_origen uuid, p_tabla text) returns text language plpgsql as $f$
declare r jsonb;
begin
  r := pg_temp.aeh_corre(p_quien, format('select public.cotizacion_tabla(%L, null, %L)', p_tabla, p_origen));
  if r ? 'error' then return r ->> 'error'; end if;
  -- Las filas no traen otras claves que las columnas.
  if exists (select 1 from jsonb_array_elements(r -> 'filas') x, jsonb_object_keys(x) k
              where k not in (select c ->> 'clave' from jsonb_array_elements(r -> 'columnas') c)) then
    raise exception 'una fila de % trae una columna que no se da: %', p_tabla, r;
  end if;
  return (select string_agg(c ->> 'clave', ',' order by o) from jsonb_array_elements(r -> 'columnas') with ordinality x (c, o));
end $f$;

-- @test ayuda en la hoja: los bloques llegan en orden; lo que llena un nodo que quien mira no ve no llena nada, el id de la viva va sólo a quien configura y una tabla sin lista que ningún nodo que se ve lee, sólo a quien configura
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000ae01';
  a constant uuid := '00000000-0000-4000-8000-00000000ae02';
  c constant uuid := '00000000-0000-4000-8000-00000000ae03';
  t jsonb; o uuid; v jsonb; v_titulo jsonb; v_texto jsonb;
begin
  t := pg_temp.aeh_terreno('aeh_bloques', jsonb_build_object('remate', '[
    {"tipo": "titulo", "texto": "Tarifas"},
    {"tipo": "texto", "texto": "Mira **la tarifa**."},
    {"tipo": "tabla", "tabla": "aeh_tarifas", "columnas": [{"columna": "a", "llena": "remate"}, {"columna": "b", "llena": "seguro_pct"}], "resaltar": true},
    {"tipo": "tabla", "tabla": "aeh_solo_cfg"}]'::jsonb));
  o := (t ->> 'o')::uuid;
  v_titulo := '{"tipo": "titulo", "texto": "Tarifas"}';
  v_texto := '{"tipo": "texto", "texto": "Mira **la tarifa**."}';

  -- Quien configura (y ve «costos»): todo, con el id de cada viva; ninguna casa (ningún nodo lee esas tablas).
  v := pg_temp.aeh_ayuda(q, o, 'remate');
  if v is distinct from jsonb_build_array(v_titulo, v_texto,
       jsonb_build_object('tipo', 'tabla', 'tabla', 'aeh_tarifas', 'columnas', '[{"columna": "a", "llena": "remate"}, {"columna": "b", "llena": "seguro_pct"}]'::jsonb,
                          'resaltar', true, 'id', t -> 't1'),
       jsonb_build_object('tipo', 'tabla', 'tabla', 'aeh_solo_cfg', 'id', t -> 't2')) then
    raise exception 'la ayuda de quien configura: %', v;
  end if;

  -- La asesora no ve «costos» (ni `seguro_pct`): la columna b va sin llenar; ni ids ni la tabla que sólo lee quien configura.
  v := pg_temp.aeh_ayuda(a, o, 'remate');
  if v is distinct from jsonb_build_array(v_titulo, v_texto,
       '{"tipo": "tabla", "tabla": "aeh_tarifas", "columnas": [{"columna": "a", "llena": "remate"}, {"columna": "b"}], "resaltar": true}'::jsonb) then
    raise exception 'la ayuda de la asesora: %', v;
  end if;
  -- La guardada: la misma ayuda (`_cotizacion_hoja()` sin editar).
  perform pg_temp.aeh_como(a);
  if (select i -> 'ayuda' from jsonb_path_query(public._cotizacion_hoja((t ->> 'f')::uuid, o, false), 'strict $.secciones[*].items[*]') i where i ->> 'nodo' = 'remate') is distinct from v then
    raise exception 'la ayuda de la guardada no es la de la hoja';
  end if;

  -- Quien ve «costos» sin configurar: b llena `seguro_pct`; sin ids ni la tabla que sólo lee quien configura.
  v := pg_temp.aeh_ayuda(c, o, 'remate');
  if v is distinct from jsonb_build_array(v_titulo, v_texto,
       '{"tipo": "tabla", "tabla": "aeh_tarifas", "columnas": [{"columna": "a", "llena": "remate"}, {"columna": "b", "llena": "seguro_pct"}], "resaltar": true}'::jsonb) then
    raise exception 'la ayuda de quien ve costos: %', v;
  end if;

  -- Una tabla que ya no existe (ni viva ni congelada) no viaja: queda el resto de la ayuda.
  update public.tablas_referencia set activa = false where id = (t ->> 't1')::uuid;
  v := pg_temp.aeh_ayuda(q, o, 'remate');
  if v is distinct from jsonb_build_array(v_titulo, v_texto, jsonb_build_object('tipo', 'tabla', 'tabla', 'aeh_solo_cfg', 'id', t -> 't2')) then
    raise exception 'la ayuda sin la tabla: %', v;
  end if;
end $$;
rollback;

-- @test ayuda en la hoja: «Tu vehículo» casa por el match del nodo que lee la tabla, con un nodo que se ve o un dato del vehículo; si una entrada no se resuelve para quien mira, no casa
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000ae01';
  a constant uuid := '00000000-0000-4000-8000-00000000ae02';
  c constant uuid := '00000000-0000-4000-8000-00000000ae03';
  t jsonb; o uuid; f uuid; v jsonb;
begin
  t := pg_temp.aeh_terreno('aeh_casa', jsonb_build_object(
    'transporte_bolivia', '[{"tipo": "tabla", "tabla": "transporte_usa_bolivia", "columnas": [{"columna": "tipo"}, {"columna": "cliente", "llena": "transporte_bolivia"}], "resaltar": true}]'::jsonb,
    'factor_dp', '[{"tipo": "tabla", "tabla": "depreciacion", "resaltar": true}]'::jsonb,
    'grua', '[{"tipo": "tabla", "tabla": "depreciacion", "columnas": [{"columna": "factor"}]}]'::jsonb));
  o := (t ->> 'o')::uuid;
  f := (t ->> 'f')::uuid;

  -- «Factor DP» lee la depreciación por el año, un nodo `campo_vehiculo` sin celda (sólo lo ve quien configura): casa por su dato del vehículo, también
  -- para quien no ve el nodo. Sin `resaltar`, sin casa (la de la grúa).
  v := pg_temp.aeh_ayuda(c, o, 'factor_dp');
  if v -> 0 -> 'resaltar' is distinct from 'true'::jsonb or v -> 0 -> 'casa' is distinct from '[{"columna": "anio", "campo": "anio"}]'::jsonb then
    raise exception 'la casa de la depreciación: %', v;
  end if;
  v := pg_temp.aeh_ayuda(a, o, 'grua');
  if v is distinct from '[{"tipo": "tabla", "tabla": "depreciacion", "columnas": [{"columna": "factor"}]}]'::jsonb then raise exception 'la ayuda de la grúa: %', v; end if;

  -- El transporte casa por `tipo_vehiculo`: sin ese dato en el origen, no casa (se resalta nada).
  v := pg_temp.aeh_ayuda(q, o, 'transporte_bolivia');
  if v -> 0 -> 'resaltar' is distinct from 'true'::jsonb or v -> 0 ? 'casa' then raise exception 'casa sin el dato del vehículo: %', v; end if;
  -- Con el dato activo del origen, casa por el dato, para todos.
  insert into public.origenes_campos (origen_id, clave, etiqueta, tipo) values (o, 'tipo_vehiculo', 'Tipo de vehículo', 'texto');
  if pg_temp.aeh_ayuda(a, o, 'transporte_bolivia') -> 0 -> 'casa' is distinct from '[{"columna": "tipo", "campo": "tipo_vehiculo"}]'::jsonb then
    raise exception 'la casa por el dato del vehículo: %', pg_temp.aeh_ayuda(a, o, 'transporte_bolivia');
  end if;

  -- Un match que también nombra un nodo de «costos»: casa para quien lo ve (en orden de columna), no para la asesora.
  update public.formulas set definicion = jsonb_set(definicion, '{nodos}',
           (select jsonb_agg(case when n ->> 'id' = 'transporte_bolivia' then jsonb_set(n, '{match}', '{"tipo": "tipo_vehiculo", "oficina": "flete"}') else n end order by x)
              from jsonb_array_elements(definicion -> 'nodos') with ordinality y (n, x)))
   where id = f;
  if pg_temp.aeh_ayuda(c, o, 'transporte_bolivia') -> 0 -> 'casa' is distinct from '[{"columna": "oficina", "nodo": "flete"}, {"columna": "tipo", "campo": "tipo_vehiculo"}]'::jsonb then
    raise exception 'la casa con un nodo de costos: %', pg_temp.aeh_ayuda(c, o, 'transporte_bolivia');
  end if;
  v := pg_temp.aeh_ayuda(a, o, 'transporte_bolivia');
  if v -> 0 ? 'casa' or v -> 0 -> 'resaltar' is distinct from 'true'::jsonb then raise exception 'la asesora casa con un nodo que no ve: %', v; end if;

  -- Un dato que no es del vehículo ni un nodo: no casa ni para quien configura.
  update public.formulas set definicion = jsonb_set(definicion, '{nodos}',
           (select jsonb_agg(case when n ->> 'id' = 'transporte_bolivia' then jsonb_set(n, '{match}', '{"tipo": "aeh_no_existe"}') else n end order by x)
              from jsonb_array_elements(definicion -> 'nodos') with ordinality y (n, x)))
   where id = f;
  if pg_temp.aeh_ayuda(q, o, 'transporte_bolivia') -> 0 ? 'casa' then raise exception 'casa con un dato que no existe'; end if;
end $$;
rollback;

-- @test ayuda en la hoja: cotizacion_tabla suma las columnas que nombra la ayuda de una celda que quien llama ve; un bloque sin lista no suma nada
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000ae01';
  a constant uuid := '00000000-0000-4000-8000-00000000ae02';
  c constant uuid := '00000000-0000-4000-8000-00000000ae03';
  t jsonb; o uuid;
begin
  t := pg_temp.aeh_terreno('aeh_columnas', jsonb_build_object(
    'remate', '[{"tipo": "tabla", "tabla": "aeh_tarifas", "columnas": [{"columna": "a"}]}]'::jsonb,
    'flete', '[{"tipo": "tabla", "tabla": "aeh_tarifas", "columnas": [{"columna": "b"}]}]'::jsonb,
    'grua', '[{"tipo": "tabla", "tabla": "aeh_solo_cfg"}]'::jsonb));
  o := (t ->> 'o')::uuid;
  -- La asesora ve «Remate», no «Flete» (de «costos»); quien ve «costos», las dos; quien configura, la tabla entera.
  if pg_temp.aeh_columnas(a, o, 'aeh_tarifas') is distinct from 'a' then raise exception 'la asesora: %', pg_temp.aeh_columnas(a, o, 'aeh_tarifas'); end if;
  if pg_temp.aeh_columnas(c, o, 'aeh_tarifas') is distinct from 'a,b' then raise exception 'quien ve costos: %', pg_temp.aeh_columnas(c, o, 'aeh_tarifas'); end if;
  if pg_temp.aeh_columnas(q, o, 'aeh_tarifas') is distinct from 'a,b,c' then raise exception 'quien configura: %', pg_temp.aeh_columnas(q, o, 'aeh_tarifas'); end if;
  -- La ayuda de la grúa no nombra columnas y ningún nodo lee esa tabla: para quien no configura, no existe (y la celda va sin ayuda).
  if pg_temp.aeh_columnas(a, o, 'aeh_solo_cfg') is distinct from '42501' then raise exception 'la asesora lee una tabla sin columnas: %', pg_temp.aeh_columnas(a, o, 'aeh_solo_cfg'); end if;
  if pg_temp.aeh_ayuda(a, o, 'grua') is not null then raise exception 'la grúa trae una ayuda que la asesora no puede leer: %', pg_temp.aeh_ayuda(a, o, 'grua'); end if;
  if pg_temp.aeh_columnas(q, o, 'aeh_solo_cfg') is distinct from 'z' then raise exception 'quien configura no lee la tabla: %', pg_temp.aeh_columnas(q, o, 'aeh_solo_cfg'); end if;
end $$;
rollback;
