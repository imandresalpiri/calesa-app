-- La tarjeta del total como pieza del diseño en la lectura que abre la hoja (glosario: «Tarjeta del total»; docs/COTIZADOR.md › «La lectura que abre la
-- hoja»). La pieza (`{tipo: 'total'}`, sin nodo) dice en qué sección y lugar se dibuja la tarjeta; su nodo es el de `tarjeta_total`. Las fórmulas se publican por
-- `_preparar_publicacion()` (valida el diseño y compila la visibilidad). No depende de otro archivo (`SOLO=areas/cotizaciones/pieza-del-total.sql`); cada bloque
-- abre su transacción y la revierte. La matriz por nivel (`cotizacion-hoja.sql`) también la lleva.
--
-- Qué asegura:
--   P1. `cotizacion_hoja` manda la pieza a todos (con y sin el nivel de la sección reservada) en su sección y su lugar, como {tipo, nodo, etiqueta, formato} más
--       su aspecto y su posición, una sola vez; en una sección propia, la sección viaja con ella y sin sus niveles.
--   P2. Sin la pieza, la respuesta es la misma menos la pieza (lo demás queda en su lugar de la rejilla), para quien tiene el nivel y para quien no.
--   P3. Con una variante en par la pieza no viaja: la respuesta es la del diseño sin ella, y ninguna sección viaja vacía.

-- La primera persona de la base es la dueña (la crea `humo.sql`; sola, este archivo la crea): las de las pruebas tienen que ser las siguientes.
create or replace function pg_temp.pt_duena() returns void language plpgsql as $f$
declare v uuid := gen_random_uuid();
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (v, v || '@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio y esas claves en todos los orígenes.
create or replace function pg_temp.pt_persona(p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.pt_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('pt_' || substr(replace(v_id::text, '-', ''), 1, 12), 'pt ' || substr(v_id::text, 1, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- `cotizacion_hoja` del origen como esa persona (authenticated), o {error, mensaje} si falla.
create or replace function pg_temp.pt_hoja(p_quien uuid, p_origen uuid) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    v := public.cotizacion_hoja(p_origen);
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return v;
end $f$;

-- Un origen con su fórmula publicada: la variante `v` (en par con `p_en_par`), `precio` y `flete` abiertos, `reservado` en una sección que sólo ve «costos»
-- y el total que los suma. `p_total` dice dónde va la pieza: 'datos' (entre precio y flete, con todo su aspecto), 'sola' (en una sección propia, sin aspecto,
-- que se ve abierta y se edita con «costos») o nulo (sin pieza: el de 'datos' en la rejilla y sin ella, con lo demás en su lugar).
create or replace function pg_temp.pt_terreno(p_total text, p_en_par boolean default false) returns uuid language plpgsql as $f$
declare o uuid; v_def jsonb; v_dis jsonb; v_datos jsonb; v_secs jsonb;
begin
  v_def := jsonb_build_object('nodos', jsonb_build_array(
      jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
      jsonb_build_object('id', 'v', 'tipo', 'opcion', 'etiqueta', 'Contenedor', 'opciones', jsonb_build_array(
          jsonb_build_object('clave', 'c20', 'etiqueta', '20 pies', 'titulo', 'Un vehículo en 20 pies'),
          jsonb_build_object('clave', 'c40', 'etiqueta', '40 pies', 'titulo', 'Dos vehículos en 40 pies')))
        || case when p_en_par then '{"en_par": true}'::jsonb else '{"por_defecto": "c20"}'::jsonb end,
      jsonb_build_object('id', 'precio', 'tipo', 'input', 'etiqueta', 'Precio', 'bucket', 'origen'),
      jsonb_build_object('id', 'flete', 'tipo', 'input', 'etiqueta', 'Flete', 'bucket', 'origen', 'solo_en', jsonb_build_array('c40')),
      jsonb_build_object('id', 'reservado', 'tipo', 'input', 'etiqueta', 'RESERVADO-PT', 'bucket', 'origen'),
      jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('precio', 'flete', 'reservado'), 'etiqueta', 'Total PT',
                         'salida', 'total', 'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'));
  v_datos := jsonb_build_array(jsonb_build_object('tipo', 'variante', 'nodo', 'v'), jsonb_build_object('tipo', 'celda', 'nodo', 'precio', 'ancho', 'mitad'))
          || case when coalesce(p_total, 'datos') = 'datos' then '[{"tipo": "total", "ancho": 4, "alto": 2, "letra": "grande", "enfasis": "fuerte"}]'::jsonb else '[]'::jsonb end
          || jsonb_build_array(jsonb_build_object('tipo', 'celda', 'nodo', 'flete', 'ancho', 'mitad'));
  v_secs := jsonb_build_array(jsonb_build_object('id', 'datos', 'titulo', 'Datos', 'presentacion', 'principal', 'items', v_datos))
         || case when p_total = 'sola'
                 then '[{"id": "resumen", "presentacion": "principal", "nivel_editar": "costos", "items": [{"tipo": "total"}]}]'::jsonb else '[]'::jsonb end
         || jsonb_build_array(jsonb_build_object('id', 'reservada', 'titulo', 'RESERVADA-PT', 'presentacion', 'principal', 'nivel_ver', 'costos', 'nivel_editar', 'costos',
                                                 'items', '[{"tipo": "celda", "nodo": "reservado", "ancho": "completo"}]'::jsonb));
  v_dis := jsonb_build_object('cabecera', jsonb_build_object('ver_total_bs', false, 'modos', '[]'::jsonb), 'secciones', v_secs,
                              'tarjeta_total', jsonb_build_object('nodo', 'total', 'secundarios', '[]'::jsonb));
  if p_total is null then
    v_dis := public._diseno_en_rejilla(v_dis);
    v_dis := jsonb_set(v_dis, '{secciones,0,items}', (select jsonb_agg(x.i order by x.o) from jsonb_array_elements(v_dis -> 'secciones' -> 0 -> 'items') with ordinality x (i, o)
                                                       where x.i ->> 'tipo' is distinct from 'total'));
  end if;
  insert into public.origenes (clave, nombre) values ('pt_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 20), 'pt origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', v_dis, public._preparar_publicacion(v_def, '{}'::jsonb, v_dis, false));
  return o;
end $f$;

-- Los ítems de una hoja, en orden: «sección/tipo:nodo».
create or replace function pg_temp.pt_items(p jsonb) returns text[] language sql as $f$
  select coalesce(array_agg((s.v ->> 'id') || '/' || (i.v ->> 'tipo') || ':' || (i.v ->> 'nodo') order by s.o, i.o), '{}')
    from jsonb_array_elements(coalesce(p -> 'secciones', '[]'::jsonb)) with ordinality s (v, o),
         jsonb_array_elements(s.v -> 'items') with ordinality i (v, o)
$f$;

-- La respuesta sin lo que cambia de un origen a otro (su id y nombre, la versión y la hoja abierta) y sin las piezas del total (las secciones, en su orden).
create or replace function pg_temp.pt_comparable(p jsonb, p_sin_pieza boolean) returns jsonb language sql as $f$
  select jsonb_set(p - array['origen', 'formula', 'abierta', 'abierta_en'], '{secciones}', coalesce((
    select jsonb_agg(jsonb_set(s.v, '{items}', coalesce((select jsonb_agg(i.v order by i.o) from jsonb_array_elements(s.v -> 'items') with ordinality i (v, o)
                                                          where not (p_sin_pieza and i.v ->> 'tipo' = 'total')), '[]'::jsonb)) order by s.o)
      from jsonb_array_elements(p -> 'secciones') with ordinality s (v, o)), '[]'::jsonb))
$f$;

-- @test pieza del total: P1 viaja a todos en su sección y su lugar, con el nodo de la tarjeta, su aspecto y su posición; en una sección propia, la sección viaja sin sus niveles
begin;
do $$
declare
  o uuid := pg_temp.pt_terreno('datos'); o_sola uuid := pg_temp.pt_terreno('sola');
  sin uuid := pg_temp.pt_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar']);
  con uuid := pg_temp.pt_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'cotizaciones.nivel.costos.ver', 'cotizaciones.nivel.costos.editar']);
  v_quien uuid; r jsonb; v_con boolean;
  v_pieza constant jsonb := '{"tipo": "total", "nodo": "total", "etiqueta": "Total PT", "formato": "usd", "ancho": 4, "alto": 2, "letra": "grande", "enfasis": "fuerte",
                                "posicion": {"columna": 7, "fila": 2}}';
  v_abierta constant text[] := array['datos/variante:v', 'datos/celda:precio', 'datos/total:total', 'datos/celda:flete'];
begin
  foreach v_quien in array array[sin, con] loop
    v_con := v_quien = con;
    r := pg_temp.pt_hoja(v_quien, o);
    if r ? 'error' or r ->> 'estado' is distinct from 'lista' then raise exception 'P1: no hay hoja (con el nivel: %): %', v_con, r; end if;
    if pg_temp.pt_items(r) is distinct from (case when v_con then v_abierta || array['reservada/celda:reservado'] else v_abierta end) then
      raise exception 'P1: los ítems (con el nivel: %): %', v_con, pg_temp.pt_items(r);
    end if;
    if r -> 'secciones' -> 0 -> 'items' -> 2 is distinct from v_pieza then raise exception 'P1: la pieza (con el nivel: %): %', v_con, r -> 'secciones' -> 0 -> 'items' -> 2; end if;
    if r -> 'tarjeta_total' ->> 'nodo' is distinct from 'total' or jsonb_typeof(r -> 'par') is distinct from 'null' then
      raise exception 'P1: la tarjeta o el par (con el nivel: %): % %', v_con, r -> 'tarjeta_total', r -> 'par';
    end if;
    -- En una sección propia (ver abierto, editar con «costos»): la sección viaja con la pieza sola, sin su nivel ni título, igual para los dos.
    r := pg_temp.pt_hoja(v_quien, o_sola);
    if r ? 'error' then raise exception 'P1: no hay hoja con la pieza sola (con el nivel: %): %', v_con, r; end if;
    if r -> 'secciones' -> 1 is distinct from '{"id": "resumen", "presentacion": "principal", "posicion": {"columna": 7, "fila": 1},
                                           "items": [{"tipo": "total", "nodo": "total", "etiqueta": "Total PT", "formato": "usd", "posicion": {"columna": 1, "fila": 1}}]}'::jsonb then
      raise exception 'P1: la sección de la pieza sola (con el nivel: %): %', v_con, r -> 'secciones' -> 1;
    end if;
    if pg_temp.pt_items(r) is distinct from (array['datos/variante:v', 'datos/celda:precio', 'datos/celda:flete', 'resumen/total:total']
                                             || case when v_con then array['reservada/celda:reservado'] else '{}'::text[] end) then
      raise exception 'P1: los ítems con la pieza sola (con el nivel: %): %', v_con, pg_temp.pt_items(r);
    end if;
  end loop;
end $$;
rollback;

-- @test pieza del total: P2 sin la pieza la respuesta es la misma menos la pieza, para quien tiene el nivel y para quien no
begin;
do $$
declare
  o_con uuid := pg_temp.pt_terreno('datos'); o_sin uuid := pg_temp.pt_terreno(null);
  sin uuid := pg_temp.pt_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar']);
  con uuid := pg_temp.pt_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'cotizaciones.nivel.costos.ver', 'cotizaciones.nivel.costos.editar']);
  v_quien uuid; r_con jsonb; r_sin jsonb;
begin
  foreach v_quien in array array[sin, con] loop
    r_con := pg_temp.pt_hoja(v_quien, o_con);
    r_sin := pg_temp.pt_hoja(v_quien, o_sin);
    if r_con ? 'error' or r_sin ? 'error' then raise exception 'P2: no hay hoja: % %', r_con, r_sin; end if;
    if pg_temp.pt_comparable(r_con, true) is distinct from pg_temp.pt_comparable(r_sin, false) then
      raise exception 'P2: sin la pieza cambia algo más (con el nivel: %): % contra %', v_quien = con, pg_temp.pt_comparable(r_con, true), pg_temp.pt_comparable(r_sin, false);
    end if;
    if exists (select 1 from jsonb_path_query(r_sin, 'strict $.secciones[*].items[*]') i where i ->> 'tipo' = 'total') then raise exception 'P2: sin la pieza viaja una'; end if;
  end loop;
end $$;
rollback;

-- @test pieza del total: P3 con una variante en par la pieza no viaja, la respuesta es la del diseño sin ella y ninguna sección viaja vacía
begin;
do $$
declare
  o_con uuid := pg_temp.pt_terreno('datos', true); o_sin uuid := pg_temp.pt_terreno(null, true); o_sola uuid := pg_temp.pt_terreno('sola', true);
  sin uuid := pg_temp.pt_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar']);
  con uuid := pg_temp.pt_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'cotizaciones.nivel.costos.ver', 'cotizaciones.nivel.costos.editar']);
  v_quien uuid; r_con jsonb; r_sin jsonb; r jsonb;
begin
  foreach v_quien in array array[sin, con] loop
    r_con := pg_temp.pt_hoja(v_quien, o_con);
    r_sin := pg_temp.pt_hoja(v_quien, o_sin);
    if r_con ? 'error' or r_sin ? 'error' then raise exception 'P3: no hay hoja: % %', r_con, r_sin; end if;
    if r_con -> 'par' ->> 'nodo' is distinct from 'v' then raise exception 'P3: la hoja no está en par: %', r_con -> 'par'; end if;
    if pg_temp.pt_comparable(r_con, false) is distinct from pg_temp.pt_comparable(r_sin, false) then
      raise exception 'P3: en par la pieza cambia la respuesta (con el nivel: %): % contra %', v_quien = con, pg_temp.pt_comparable(r_con, false), pg_temp.pt_comparable(r_sin, false);
    end if;
    r := pg_temp.pt_hoja(v_quien, o_sola);
    if r ? 'error' or pg_temp.pt_items(r) is distinct from (array['datos/celda:precio', 'datos/celda:flete']
                                                           || case when v_quien = con then array['reservada/celda:reservado'] else '{}'::text[] end) then
      raise exception 'P3: con la pieza sola en par (con el nivel: %): %', v_quien = con, coalesce(pg_temp.pt_items(r)::text, r::text);
    end if;
    if exists (select 1 from jsonb_array_elements(r -> 'secciones') s where jsonb_array_length(s -> 'items') = 0) then raise exception 'P3: una sección viaja vacía'; end if;
  end loop;
end $$;
rollback;
