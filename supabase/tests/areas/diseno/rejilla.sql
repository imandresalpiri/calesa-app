-- La hoja en una rejilla libre (docs/COTIZADOR.md › «El diseño de la hoja»; docs/GLOSARIO.md › «Posición (en la rejilla)»): la conversión de un diseño de
-- flujo (`_diseno_en_rejilla()`, espejo de `disenoEnRejilla()`) contra el juego que genera TS, que es idempotente, que la hoja sembrada trae sus posiciones
-- y su bloque «Avanzado» sin que se reescriba ninguna versión, y la geometría por las RPC de siempre: guardar el borrador sólo revisa la forma y publicar,
-- la rejilla. Las reglas, su orden y su `donde` los cubre el juego compartido (`validar-diseno.sql`); acá, el camino de cada RPC.
-- `scripts/probar-schema.mjs` carga antes el juego en una tabla temporal (la base no lee archivos del repo):
--   _juego_de_rejilla ← src/modules/cotizaciones/entities/casos-de-rejilla.json (lo genera diseno-en-rejilla.test.ts con ACTUALIZAR_CASOS_DE_REJILLA=1)
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno dentro de su transacción y la revierte.

create or replace function pg_temp.rj_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_m text; v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
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
create or replace function pg_temp.rj_persona(p_id uuid, p_origen uuid, p_claves text[]) returns void language plpgsql as $f$
declare v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Rejilla ' || right(p_id::text, 4), invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('rj_' || right(p_id::text, 4), 'Rejilla ' || right(p_id::text, 4)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c, case when c like 'cotizaciones.nivel.%' then null else p_origen end, 'todos');
  end loop;
end $f$;

create or replace function pg_temp.rj_semilla() returns public.formulas language sql as $f$
  select f.* from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave = 'subasta_usa' and f.estado = 'publicada'
$f$;

-- El diseño en la rejilla con la posición de una pieza cambiada (una sección por su id o un ítem por su nodo).
create or replace function pg_temp.rj_con_posicion(p_diseno jsonb, p_pieza text, p_posicion jsonb) returns jsonb language plpgsql as $f$
declare d jsonb := public._diseno_en_rejilla(p_diseno); i int; k int; v_hecho boolean := false;
begin
  for i in 0 .. jsonb_array_length(d -> 'secciones') - 1 loop
    if d -> 'secciones' -> i ->> 'id' = p_pieza then
      d := jsonb_set(d, array['secciones', i::text, 'posicion'], p_posicion);
      v_hecho := true;
    end if;
    for k in 0 .. jsonb_array_length(d -> 'secciones' -> i -> 'items') - 1 loop
      if d -> 'secciones' -> i -> 'items' -> k ->> 'nodo' = p_pieza then
        d := jsonb_set(d, array['secciones', i::text, 'items', k::text, 'posicion'], p_posicion);
        v_hecho := true;
      end if;
    end loop;
  end loop;
  if not v_hecho then raise exception 'no hay una pieza «%» en el diseño', p_pieza; end if;
  return d;
end $f$;

-- El rechazo de publicar ese diseño (`_preparar_publicacion()` valida el diseño): «regla@donde», o «válido».
create or replace function pg_temp.rj_rechazo(p_formula public.formulas, p_diseno jsonb) returns text language plpgsql as $f$
declare v_d text; v_h text;
begin
  perform public._preparar_publicacion(p_formula.definicion, p_formula.params, p_diseno, false);
  return 'válido';
exception when sqlstate '22023' then
  get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint;
  return v_d || '@' || coalesce(v_h, '');
end $f$;

-- @test rejilla: _diseno_en_rejilla da lo mismo que disenoEnRejilla en cada caso de casos-de-rejilla.json
do $$
declare c jsonb; v_n int := 0; v_visto jsonb;
begin
  for c in select x from _juego_de_rejilla, jsonb_array_elements(doc -> 'casos') x loop
    v_visto := public._diseno_en_rejilla(c -> 'entrada');
    if v_visto is distinct from c -> 'salida' then
      raise exception 'rejilla «%»: se esperaba % y dio %', c ->> 'nombre', c -> 'salida', v_visto;
    end if;
    v_n := v_n + 1;
  end loop;
  if v_n < 200 then raise exception 'el juego de la rejilla tiene % casos, se esperaban al menos 200', v_n; end if;
end $$;

-- @test rejilla: la conversión es idempotente: una segunda pasada sobre la salida da la misma salida
do $$
declare c jsonb;
begin
  for c in select x from _juego_de_rejilla, jsonb_array_elements(doc -> 'casos') x loop
    if public._diseno_en_rejilla(c -> 'salida') is distinct from c -> 'salida' then
      raise exception 'rejilla «%»: la segunda pasada cambia el diseño', c ->> 'nombre';
    end if;
  end loop;
end $$;

-- @test rejilla: la hoja de la subasta sembrada trae la posición de cada sección y la fila del bloque «Avanzado», y las avanzadas apiladas
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000b701';
  o uuid := (select x.id from public.origenes x where x.clave = 'subasta_usa');
  r jsonb; v_lugares text[]; v_avanzadas text[];
begin
  perform pg_temp.rj_persona(q, o, array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.nivel.costos.ver']);
  r := pg_temp.rj_corre(q, format('select public.cotizacion_hoja(%L)', o));
  if r ? 'error' then raise exception 'la hoja: %', r; end if;
  select array_agg((x ->> 'id') || ' ' || (x -> 'posicion' ->> 'columna') || ',' || (x -> 'posicion' ->> 'fila'))
    into v_lugares from jsonb_path_query(r, 'strict $.secciones[*] ? (@.presentacion != "avanzado")') x;
  if v_lugares is distinct from array['hoja 1,1', 'cambio 7,1', 'compra 1,2', 'logistica 7,2', 'aduana 1,3', 'garantia 1,5'] then
    raise exception 'las principales de la semilla: %', v_lugares;
  end if;
  if r -> 'avanzado' is distinct from '{"fila": 4}'::jsonb then raise exception 'el bloque «Avanzado» de la semilla: %', r -> 'avanzado'; end if;
  select array_agg((x ->> 'id') || ' ' || (x -> 'posicion' ->> 'columna') || ',' || (x -> 'posicion' ->> 'fila'))
    into v_avanzadas from jsonb_path_query(r, 'strict $.secciones[*] ? (@.presentacion == "avanzado")') x;
  if v_avanzadas is distinct from array['cif 1,1', 'impuestos 1,2', 'poliza 1,3'] then raise exception 'las avanzadas de la semilla: %', v_avanzadas; end if;
  if (select array_agg((x ->> 'nodo') || ' ' || (x -> 'posicion' ->> 'columna') || ',' || (x -> 'posicion' ->> 'fila'))
        from jsonb_path_query(r, 'strict $.secciones[*] ? (@.id == "compra").items[*]') x)
     is distinct from array['remate 1,1', 'fees 1,2', 'transferencia 7,2', 'cuenta_especial 1,3'] then
    raise exception 'los ítems de «compra»: %', jsonb_path_query_array(r, 'strict $.secciones[*] ? (@.id == "compra").items[*].posicion');
  end if;
end $$;
rollback;

-- @test rejilla: ninguna versión sembrada se reescribe: su diseño sigue sin posición ni bloque
do $$
begin
  if (select count(*) from public.formulas where estado = 'publicada') < 3 then raise exception 'no están las publicadas de la semilla'; end if;
  if exists (select 1 from public.formulas where diseno ? 'avanzado' or jsonb_path_exists(diseno, 'lax $.secciones[*].posicion')
                or jsonb_path_exists(diseno, 'lax $.secciones[*].items[*].posicion')) then
    raise exception 'un diseño guardado trae posiciones: se reescribió';
  end if;
end $$;

-- @test rejilla: un borrador con dos piezas encimadas se guarda (sólo se revisa la forma) y publicarlo da 22023 piezas_se_pisan con su donde
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000b702';
  o uuid;
  s public.formulas := pg_temp.rj_semilla();
  d jsonb := pg_temp.rj_con_posicion(s.diseno, 'transferencia', '{"columna": 1, "fila": 2}');
  r jsonb;
begin
  insert into public.origenes (clave, nombre) values ('rj_pisa', 'Rejilla pisa') returning id into o;
  perform pg_temp.rj_persona(q, o, array['cotizaciones.configurar']);
  r := pg_temp.rj_corre(q, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_actualizado_en_esperado => null)',
                                  o, s.definicion, s.params, d));
  if r ? 'error' then raise exception 'no guardó el borrador encimado: %', r; end if;
  if (select f.diseno from public.formulas f where f.origen_id = o and f.estado = 'borrador') is distinct from d then
    raise exception 'el borrador no es lo que se mandó';
  end if;
  r := pg_temp.rj_corre(q, format('select to_jsonb(public.formula_publicar(p_origen => %L, p_nota => %L))', o, 'Encimadas'));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'piezas_se_pisan' or r ->> 'hint' is distinct from 'transferencia'
     or r ->> 'mensaje' is distinct from 'La pieza «transferencia» se pisa con otra en la rejilla.' then
    raise exception 'publicar las encimadas: %', r;
  end if;
end $$;
rollback;

-- @test rejilla: una pieza en la columna 9 con 6 columnas se sale (pieza_fuera_de_la_rejilla) y una principal en la fila del bloque se pisa con él
do $$
declare s public.formulas := pg_temp.rj_semilla(); v text;
begin
  v := pg_temp.rj_rechazo(s, pg_temp.rj_con_posicion(s.diseno, 'fees', '{"columna": 9, "fila": 5}'));
  if v is distinct from 'pieza_fuera_de_la_rejilla@fees' then raise exception 'la pieza en la columna 9: %', v; end if;
  v := pg_temp.rj_rechazo(s, pg_temp.rj_con_posicion(s.diseno, 'garantia', '{"columna": 1, "fila": 4}'));
  if v is distinct from 'piezas_se_pisan@garantia' then raise exception 'la principal en la fila del bloque: %', v; end if;
  -- Un hueco se respeta: la misma sección más abajo, con filas vacías en el medio, vale.
  v := pg_temp.rj_rechazo(s, pg_temp.rj_con_posicion(s.diseno, 'garantia', '{"columna": 1, "fila": 9}'));
  if v is distinct from 'válido' then raise exception 'la principal más abajo, con un hueco: %', v; end if;
end $$;
