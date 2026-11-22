-- Cotizar pisando un cálculo (glosario: «Pisar un cálculo»; docs/COTIZADOR.md › «Pisar un cálculo»): la hoja manda al motor los cálculos que dibuja en
-- una celda (`pisables`, de su diseño) y así acepta lo escrito sobre ellos. Todo camino de cotizar (evaluar, crear, guardar, cotizar encima y las
-- hermanas) arma la entrada en `_cotizacion_armar()`. La celda de un `tabla`, `tramo` o `calculo` que no es el total se edita con el nivel de siempre;
-- lo guardado de un par por la hoja no lleva su pct; `calculados` viaja recortado por nivel y nunca se guarda; las revisiones nombran qué cálculo se
-- pisó (`etiquetas.calculos`). Sin tablas, columnas, permisos ni datos que migrar.

-- Los cálculos que la hoja dibuja en una celda: el nodo de cada ítem `celda` y el pct de su secundario, si es un `tabla`, un `tramo` o un `calculo`
-- que no es el total (`esPisable()` de entities/nodos.ts). Con un id repetido manda el último nodo, como el índice del motor. Lo que no tiene celda
-- (una franja de subtotal, un atajo, un nodo que el diseño no dibuja) no está.
create function public._cotizacion_pisables(p_def jsonb, p_diseno jsonb) returns jsonb
language sql
stable
set search_path = ''
as $$
  with nodos as (
    select distinct on (x.value ->> 'id') x.value ->> 'id' as id, x.value as n
      from jsonb_array_elements(case when jsonb_typeof(p_def -> 'nodos') = 'array' then p_def -> 'nodos' else '[]'::jsonb end)
           with ordinality as x(value, pos)
     order by x.value ->> 'id', x.pos desc
  ), celdas as (
    select i.value as item
      from jsonb_array_elements(case when jsonb_typeof(p_diseno -> 'secciones') = 'array' then p_diseno -> 'secciones' else '[]'::jsonb end) as s(value)
     cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value -> 'items') = 'array' then s.value -> 'items' else '[]'::jsonb end) as i(value)
     where i.value ->> 'tipo' = 'celda'
  ), ids as (
    select c.item ->> 'nodo' as id from celdas c
    union
    select n.n ->> 'pct' from celdas c join nodos n on n.id = c.item ->> 'nodo' where c.item ? 'secundario'
  )
  select coalesce(jsonb_agg(ids.id order by ids.id collate "C"), '[]'::jsonb)
    from ids
    join nodos n on n.id = ids.id
   where n.n ->> 'tipo' in ('tabla', 'tramo', 'calculo') and (n.n ->> 'salida') is distinct from 'total';
$$;

comment on function public._cotizacion_pisables(jsonb, jsonb) is
  'Interna: los ids de los cálculos (tabla, tramo o calculo que no es el total) que el diseño dibuja en una celda, con el pct de su secundario; la entrada `pisables` del motor. De nadie; la llama _cotizacion_armar. docs/COTIZADOR.md › «Pisar un cálculo».';

revoke all on function public._cotizacion_pisables(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public._cotizacion_pisables(jsonb, jsonb) to service_role;

-- La entrada del motor suma `pisables`, del diseño de la versión que se cotiza.
CREATE OR REPLACE FUNCTION "public"."_cotizacion_armar"("p_entradas" "jsonb", "p_cotizacion" "uuid", "p_origen" "uuid", "p_vehiculo" "uuid", "p_formula" "uuid" DEFAULT NULL::"uuid", "p_abierta_en" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_con_la_abierta" boolean DEFAULT false) RETURNS TABLE("definicion" "jsonb", "params" "jsonb", "entrada" "jsonb", "formula_id" "uuid", "origen_id" "uuid", "visibilidad" "jsonb", "tc_cambiado" boolean, "guardado" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_origen uuid;
  v_formula uuid;
  v_vehiculo uuid;
  v_tc_cot jsonb;
  v_valores jsonb; v_fuentes jsonb; v_clase public.clase_cotizacion;
  v_def jsonb;
  v_par jsonb;
  v_visib jsonb;
  v_dis jsonb;
  v_cong jsonb;
  v_ids text[];
  v_tablas text[];
  v_tcs text[];
  v_campos text[];
  v_match text[];
  v_vivas text[];
  v_extra text;
  v_tc jsonb;
  v_tc_cambiado boolean := false;
  v_tab jsonb;
  v_veh jsonb := '{}'::jsonb;
  v_v_origen uuid;
  v_anio smallint; v_marca text; v_modelo text; v_km int; v_precio numeric; v_attr jsonb;
begin
  perform public.assert_activo();

  -- La llamada: uno de los dos, y el vehículo sólo con un origen (la cotización trae el suyo).
  if (p_cotizacion is null) = (p_origen is null) then
    perform public._motor_fallar('llamada_invalida', null, 'Evaluar pide una cotización o un origen, y no los dos ni ninguno.');
  end if;
  -- La versión de la hoja que se abrió y cuándo (D2) son de un alta: una cotización ya trae su versión y sus tipos de cambio.
  if p_cotizacion is not null and (p_formula is not null or p_abierta_en is not null or p_con_la_abierta) then
    perform public._motor_fallar('llamada_invalida', 'p_formula', 'Una cotización ya trae su versión de la hoja y sus tipos de cambio.');
  end if;
  -- Las entradas: un objeto y sólo lo que la persona puede tipear. Lo demás lo pone la base.
  if p_entradas is null or jsonb_typeof(p_entradas) <> 'object' then
    perform public._motor_fallar('entradas_invalidas', null, 'Las entradas son un objeto con inputs, banderas, overrides y variante.');
  end if;
  select min(k collate "C") into v_extra from jsonb_object_keys(p_entradas) k where k not in ('inputs', 'banderas', 'overrides', 'variante');
  if v_extra is not null then
    perform public._motor_fallar('entradas_invalidas', v_extra, 'Las entradas no llevan «' || v_extra || '»: la base lo pone.');
  end if;

  -- Quién puede, y de dónde sale la fórmula.
  if p_cotizacion is not null then
    -- Una cotización que no existe y una que no se ve dan el mismo error.
    if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    end if;
    select c.origen_id, c.formula_id, c.vehiculo_id, c.tipos_cambio, c.valores, c.fuentes, c.clase into v_origen, v_formula, v_vehiculo, v_tc_cot, v_valores, v_fuentes, v_clase
      from public.cotizaciones c where c.id = p_cotizacion;                                    -- cotizaciones_pkey
    -- Otro vehículo para ese cálculo (lo que daría cambiarlo, antes de guardar): una final no cambia de vehículo.
    if p_vehiculo is not null then
      if v_clase = 'final' and p_vehiculo is distinct from v_vehiculo then
        perform public._motor_fallar('llamada_invalida', 'p_vehiculo', 'Una cotización final no cambia de vehículo.');
      end if;
      v_vehiculo := p_vehiculo;
    end if;
    select f.definicion, f.params, f.visibilidad, f.diseno into v_def, v_par, v_visib, v_dis from public.formulas f where f.id = v_formula;  -- formulas_pkey
  else
    perform public.assert_permiso('cotizaciones.crear', p_origen);
    v_origen := p_origen;
    v_vehiculo := p_vehiculo;
    if p_formula is not null then
      -- La versión que se abrió (D2, «Guardar con la N»): una publicada o archivada de este origen.
      select f.id, f.definicion, f.params, f.visibilidad, f.diseno into v_formula, v_def, v_par, v_visib, v_dis
        from public.formulas f where f.id = p_formula and f.origen_id = p_origen and f.estado in ('publicada', 'archivada');   -- formulas_pkey
      if not found then
        perform public._motor_fallar('llamada_invalida', 'p_formula', 'La versión de la hoja no es de este origen.');
      end if;
    else
      v_formula := public._publicada_de_la_activa(p_origen);                                   -- la publicada de la fórmula activa
      select f.id, f.definicion, f.params, f.visibilidad, f.diseno into v_formula, v_def, v_par, v_visib, v_dis
        from public.formulas f where f.id = v_formula;                                           -- formulas_pkey
      if not found then
        perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
      end if;
    end if;
  end if;

  -- El vehículo: sólo si quien llama lo ve (esto corre con los derechos de la base y no puede devolver lo que él no vería).
  if v_vehiculo is not null then
    if not public.puede_vehiculo(v_vehiculo, 'vehiculos.ver') then
      raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
    end if;
    select v.origen_id, v.anio, v.marca, v.modelo, v.kilometraje, v.precio, v.atributos
      into v_v_origen, v_anio, v_marca, v_modelo, v_km, v_precio, v_attr
      from public.vehiculos v where v.id = v_vehiculo;                                         -- vehiculos_pkey
    if p_vehiculo is not null and v_v_origen <> v_origen then
      perform public._motor_fallar('vehiculo_de_otro_origen', 'p_vehiculo', 'El vehículo no es de este origen.');
    end if;
  end if;

  -- Lo que la fórmula nombra, en una sola pasada por sus nodos (`definicion` se desarma una vez: un jsonb que llega de una columna
  -- comprimida se descomprime entero en cada `->`). Los campos del vehículo son los de `campo_vehiculo` y los valores de un `match` que
  -- no son el id de un nodo.
  select array_agg(distinct n ->> 'id'),
         coalesce(array_agg(distinct n ->> 'tabla') filter (where n ->> 'tabla' is not null), '{}'),
         coalesce(array_agg(distinct n ->> 'clave') filter (where n ->> 'tipo' = 'tipo_cambio'), '{}'),
         coalesce(array_agg(distinct n ->> 'campo') filter (where n ->> 'tipo' = 'campo_vehiculo'), '{}'),
         coalesce(array_agg(distinct m.value) filter (where m.value is not null), '{}')
    into v_ids, v_tablas, v_tcs, v_campos, v_match
    from jsonb_array_elements(v_def -> 'nodos') n
    left join lateral jsonb_each_text(case when jsonb_typeof(n -> 'match') = 'object' then n -> 'match' end) m on true;
  v_campos := array(select distinct c from unnest(v_campos || array(select r from unnest(v_match) r where r <> all (coalesce(v_ids, '{}')))) c);

  -- Las tablas vivas: las que un nodo nombra y la fórmula no congeló.
  v_cong := v_par -> 'tablas';
  v_vivas := array(select t from unnest(v_tablas) t where jsonb_typeof(v_cong) is distinct from 'object' or not (v_cong ? t));
  select coalesce(jsonb_object_agg(x.clave, x.filas), '{}'::jsonb) into v_tab
    from (
      select c.clave,
             -- tablas_referencia_filas_tabla_orden_idx: sus filas activas, en su orden.
             (select coalesce(jsonb_agg(f.valores order by f.orden, f.id), '[]'::jsonb)
                from public.tablas_referencia_filas f where f.tabla_id = t.id and f.activa) as filas
        from unnest(v_vivas) c (clave)
        -- tablas_referencia_origen_id_clave_key: la del origen y, si no hay una activa, la compartida.
        cross join lateral (
          select coalesce(
                   (select r.id from public.tablas_referencia r where r.origen_id = v_origen and r.clave = c.clave and r.activa),
                   (select r.id from public.tablas_referencia r where r.origen_id is null and r.clave = c.clave and r.activa)
                 ) as id
        ) t
       where t.id is not null
    ) x;

  -- Los tipos de cambio: los congelados de la cotización o los vigentes de la empresa, sólo los que un nodo nombra.
  if p_cotizacion is not null then
    select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_tc
      from jsonb_each(case when jsonb_typeof(v_tc_cot) = 'object' then v_tc_cot else '{}'::jsonb end) e
     where e.key = any (v_tcs) and case when jsonb_typeof(e.value) = 'number' then (e.value)::numeric > 0 else false end;
  else
    -- Los vigentes de hoy, los que valían cuando se abrió la hoja (`tipos_cambio_historial_tipo_idx`: el último cambio hasta `p_abierta_en`) y si alguno cambió desde entonces (D2), todo en
    -- una sola lectura: una foto. Uno que no tenía valor entonces (nació después) cuenta como cambiado. «Guardar con la N» congela los de entonces.
    select coalesce(jsonb_object_agg(x.clave, case when p_con_la_abierta and x.entonces is not null then x.entonces else x.valor end), '{}'::jsonb),
           coalesce(bool_or(p_abierta_en is not null and x.entonces is distinct from x.valor), false)
      into v_tc, v_tc_cambiado
      from (select t.clave, t.valor,
                   case when p_abierta_en is not null then
                     (select h.valor_nuevo from public.tipos_cambio_historial h where h.tipo_cambio_id = t.id and h.cambiado_en <= p_abierta_en order by h.cambiado_en desc, h.id desc limit 1)
                   end as entonces
              from public.tipos_cambio t where t.clave = any (v_tcs) and t.activo) x;          -- tipos_cambio_clave_key
  end if;

  -- Los campos del vehículo.
  if v_vehiculo is not null then
    select coalesce(jsonb_object_agg(n.campo, n.valor) filter (where n.valor is not null), '{}'::jsonb) into v_veh
      from (
        select s.campo,
               case when jsonb_typeof(s.x) = 'number' and abs((s.x #>> '{}')::numeric) < 1e308 then s.x
                    when jsonb_typeof(s.x) = 'string' and char_length(s.x #>> '{}') <= 200 then s.x end as valor
          from (
            select k.campo,
                   case k.campo
                     when 'anio' then to_jsonb(v_anio)
                     when 'marca' then to_jsonb(v_marca)
                     when 'modelo' then to_jsonb(v_modelo)
                     when 'kilometraje' then to_jsonb(v_km)
                     when 'precio' then to_jsonb(v_precio)
                     -- origenes_campos_origen_id_clave_key: sólo un campo activo del origen del vehículo.
                     else case when exists (select 1 from public.origenes_campos oc
                                             where oc.origen_id = v_v_origen and oc.clave = k.campo and oc.activo)
                               then v_attr -> k.campo end
                   end as x
              from unnest(v_campos) k (campo)
          ) s
      ) n;
  end if;

  return query select
    v_def,
    v_par,
    jsonb_build_object(
      'inputs', case when p_entradas ? 'inputs' then p_entradas -> 'inputs' else '{}'::jsonb end,
      'banderas', case when p_entradas ? 'banderas' then p_entradas -> 'banderas' else '{}'::jsonb end,
      'tipos_cambio', v_tc,
      'vehiculo', v_veh,
      'tablas', v_tab,
      'overrides', case when p_entradas ? 'overrides' then p_entradas -> 'overrides' else '{}'::jsonb end,
      -- Los cálculos que la hoja de esa versión dibuja en una celda: lo escrito sobre ellos se acepta (docs/COTIZADOR.md › «Pisar un cálculo»).
      'pisables', public._cotizacion_pisables(v_def, v_dis))
    || case when p_entradas ? 'variante' then jsonb_build_object('variante', p_entradas -> 'variante') else '{}'::jsonb end,
    v_formula,
    v_origen,
    coalesce(v_visib, '{}'::jsonb),
    v_tc_cambiado,
    -- Lo guardado, para completar lo que quien llama no ve o no edita (cotizacion_conservar): sólo con una cotización.
    case when p_cotizacion is not null then jsonb_build_object('valores', v_valores, 'fuentes', v_fuentes) end;
end
$$;

comment on function public._cotizacion_armar(jsonb, uuid, uuid, uuid, uuid, timestamptz, boolean) is
  'Arma la fórmula (con su id, su origen y su visibilidad; con p_formula, esa versión), las tablas vivas que ella nombra y no congeló, los tipos de cambio (con p_abierta_en, si alguno cambió desde entonces), los campos del vehículo (con una cotización, el suyo o el p_vehiculo que se pase), los cálculos que su diseño dibuja en una celda (pisables) y, con una cotización, lo guardado, para evaluar_formula(). Comprueba los permisos como la policy. La llaman cotizacion_evaluar, cotizacion_crear, cotizacion_guardar y cotizacion_encima; docs/COTIZADOR.md › «En la base (4.06-2)», «(4.10-1)», «Cómo se guarda (4.10-3)» y «Pisar un cálculo».';

revoke all on function public._cotizacion_armar(jsonb, uuid, uuid, uuid, uuid, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public._cotizacion_armar(jsonb, uuid, uuid, uuid, uuid, timestamptz, boolean) to service_role;

-- Una celda de un `tabla`, `tramo` o `calculo` que no es el total se edita (con el nivel de siempre): lo escrito pisa el cálculo. El total sigue en
-- `se_calcula`.
CREATE OR REPLACE FUNCTION "public"."_hoja_estado"("p_nodo" "jsonb", "p_celda" boolean, "p_edita" boolean, "p_nivel" "text", "p_nombre" "text", "p_cfg" boolean, "p_tc" boolean) RETURNS "jsonb"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select jsonb_build_object('editable', e.ok, 'ajustes', e.tipo = 'constante' and p_cfg or e.tipo = 'tipo_cambio' and p_tc)
         || case when e.ok then '{}'::jsonb else jsonb_build_object('motivo', case
              when p_celda and not e.acepta then jsonb_build_object('codigo', case when e.tipo = 'campo_vehiculo' then 'del_vehiculo' else 'se_calcula' end)
              when p_nivel is null then '{"codigo": "no_se_edita"}'::jsonb
              when p_nivel <> 'todos' then jsonb_build_object('codigo', 'nivel', 'nivel', coalesce(p_nombre, p_nivel))
              else '{"codigo": "no_se_edita"}'::jsonb end) end
    from (select t.tipo, t.acepta, coalesce(p_edita, false) and (not p_celda or t.acepta) as ok
            from (select p_nodo ->> 'tipo' as tipo,
                         (p_nodo ->> 'tipo') in ('input', 'constante', 'tipo_cambio')
                         or ((p_nodo ->> 'tipo') in ('tabla', 'tramo', 'calculo')
                             and (coalesce((p_nodo -> 'sobrescribible') = 'true'::jsonb, false) or (p_nodo ->> 'salida') is distinct from 'total')) as acepta) t) e;
$$;

revoke all on function public._hoja_estado(jsonb, boolean, boolean, text, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public._hoja_estado(jsonb, boolean, boolean, text, text, boolean, boolean) to service_role;

-- Lo guardado como lo tipeó la persona: el pct de un par por la hoja (el monto escrito) no es lo tipeado, como el de un par `sobrescribible`.
CREATE OR REPLACE FUNCTION "public"."_cotizacion_entradas_de"("p_def" "jsonb", "p_valores" "jsonb", "p_fuentes" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  v_nodos jsonb := coalesce(p_def -> 'nodos', '[]'::jsonb);
  v_valores jsonb := case when jsonb_typeof(p_valores) = 'object' then p_valores else '{}'::jsonb end;
  v_fuentes jsonb := case when jsonb_typeof(p_fuentes) = 'object' then p_fuentes else '{}'::jsonb end;
  v_pisados jsonb; v_in jsonb; v_ba jsonb; v_ov jsonb; v_var jsonb;
  v_exclusivos text[] := '{}'::text[];
begin
  -- El pct de un par con el monto escrito lo calculó el par: el de un `sobrescribible` y el de un par por la hoja (un monto escrito que no es
  -- `sobrescribible` tuvo celda, y su pct es exclusivo). Los pcts exclusivos se buscan sólo si hay un monto así.
  if exists (select 1 from jsonb_array_elements(v_nodos) m
              where m ->> 'tipo' = 'calculo' and m ->> 'op' = 'porcentaje_de' and (m -> 'sobrescribible') is distinct from 'true'::jsonb
                and v_fuentes ->> (m ->> 'id') = 'override') then
    v_exclusivos := public._motor_pcts_exclusivos(v_nodos);
  end if;
  select coalesce(jsonb_object_agg(m ->> 'pct', true), '{}'::jsonb) into v_pisados
    from jsonb_array_elements(v_nodos) m
   where m ->> 'tipo' = 'calculo' and m ->> 'op' = 'porcentaje_de' and (m ->> 'pct') is not null and v_fuentes ->> (m ->> 'id') = 'override'
     and ((m -> 'sobrescribible') = 'true'::jsonb or ((m ->> 'salida') is distinct from 'total' and (m ->> 'pct') = any (v_exclusivos)));
  select coalesce(jsonb_object_agg(n ->> 'id', v_valores -> (n ->> 'id')), '{}'::jsonb) into v_in
    from jsonb_array_elements(v_nodos) n
   where n ->> 'tipo' = 'input' and not v_pisados ? (n ->> 'id') and v_fuentes ->> (n ->> 'id') in ('input', 'override') and jsonb_typeof(v_valores -> (n ->> 'id')) = 'number';
  select coalesce(jsonb_object_agg(n ->> 'id', case when jsonb_typeof(v_valores -> (n ->> 'id')) = 'number' then v_valores -> (n ->> 'id') else '0'::jsonb end), '{}'::jsonb) into v_ov
    from jsonb_array_elements(v_nodos) n
   where n ->> 'tipo' in ('constante', 'tipo_cambio', 'tabla', 'tramo', 'calculo') and not v_pisados ? (n ->> 'id') and v_fuentes ->> (n ->> 'id') = 'override'
     and (jsonb_typeof(v_valores -> (n ->> 'id')) = 'number' or n ->> 'tipo' = 'tipo_cambio');
  select coalesce(jsonb_object_agg(n ->> 'id', (v_valores -> (n ->> 'id')) = '1'::jsonb), '{}'::jsonb) into v_ba
    from jsonb_array_elements(v_nodos) n where n ->> 'tipo' = 'bandera' and jsonb_typeof(v_valores -> (n ->> 'id')) = 'number';
  select v_valores -> (n ->> 'id') into v_var from jsonb_array_elements(v_nodos) n where n ->> 'tipo' = 'opcion' limit 1;
  return jsonb_build_object('inputs', v_in, 'banderas', v_ba, 'overrides', v_ov) || case when jsonb_typeof(v_var) = 'string' then jsonb_build_object('variante', v_var) else '{}'::jsonb end;
end
$$;

revoke all on function public._cotizacion_entradas_de(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public._cotizacion_entradas_de(jsonb, jsonb, jsonb) to service_role;

-- El recorte suma `calculados`, con la misma regla que `valores`.
CREATE OR REPLACE FUNCTION "public"."_cotizacion_recorte"("p_res" "jsonb", "p_ctx" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  v_ok jsonb := p_ctx -> 'ok'; v_ids jsonb := p_ctx -> 'ids'; v_grupos jsonb := p_ctx -> 'grupos'; v_tc jsonb := p_ctx -> 'tc_ocultas'; v_tc_oculto boolean := (p_ctx ->> 'tc_oculto')::boolean;
  v_out jsonb := '{}'::jsonb; v_t jsonb; v_hay boolean := false; k text;
begin
  foreach k in array array['valores', 'estados', 'fuentes'] loop
    if jsonb_typeof(p_res -> k) = 'object' then
      v_out := v_out || jsonb_build_object(k, coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(p_res -> k) e where v_ok ? e.key), '{}'::jsonb));
    end if;
  end loop;
  -- Lo calculado de un cálculo pisado (sólo de evaluar_formula): lo que se ve, y nada si no queda ninguno (un objeto vacío diría que hay uno oculto).
  if jsonb_typeof(p_res -> 'calculados') = 'object' then
    v_t := (select jsonb_object_agg(e.key, e.value) from jsonb_each(p_res -> 'calculados') e where v_ok ? e.key);
    if v_t is not null then v_out := v_out || jsonb_build_object('calculados', v_t); end if;
  end if;

  if jsonb_typeof(p_res -> 'tipos_cambio') = 'object' then
    v_out := v_out || jsonb_build_object('tipos_cambio', coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(p_res -> 'tipos_cambio') e where not v_tc ? e.key), '{}'::jsonb));
  end if;

  if jsonb_typeof(p_res -> 'totales') = 'object' then
    v_t := '{}'::jsonb;
    if jsonb_typeof(p_res -> 'totales' -> 'grupos') = 'object' then
      v_t := jsonb_build_object('grupos', coalesce((
        select jsonb_object_agg(e.key,
                 case when jsonb_typeof(e.value) = 'object'
                      then coalesce((select jsonb_object_agg(f.key, f.value) from jsonb_each(e.value) f where f.key in ('usd', 'se_dibuja') or (f.key = 'bs' and not v_tc_oculto)), '{}'::jsonb)
                      else e.value end)
          from jsonb_each(p_res -> 'totales' -> 'grupos') e where v_grupos ? e.key), '{}'::jsonb));
    end if;
    foreach k in array array['bs', 'usd', 'suma_usd'] loop
      if p_res -> 'totales' ? k then v_t := v_t || jsonb_build_object(k, p_res -> 'totales' -> k); end if;
    end loop;
    v_out := v_out || jsonb_build_object('totales', v_t);
  end if;

  if jsonb_typeof(p_res -> 'faltantes') = 'array' then
    select coalesce(jsonb_agg(e.value order by e.ord) filter (where e.viaja), '[]'::jsonb), coalesce(bool_or(not e.viaja), false) into v_t, v_hay
      from (select f.value, f.ord,
                   coalesce(v_ok ? (f.value ->> 'donde') or (f.value ->> 'donde') = 'total' or v_grupos ? (f.value ->> 'donde'), false)
                   and ((f.value ->> 'ref') is null or not v_ids ? (f.value ->> 'ref') or v_ok ? (f.value ->> 'ref')) as viaja
              from jsonb_array_elements(p_res -> 'faltantes') with ordinality f (value, ord)) e;
    v_out := v_out || jsonb_build_object('faltantes', v_t);
    if v_hay then v_out := v_out || jsonb_build_object('hay_faltantes_ocultos', true); end if;
  end if;

  if jsonb_typeof(p_res -> 'overrides_descartados') = 'array' then
    v_out := v_out || jsonb_build_object('overrides_descartados', coalesce((
      select jsonb_agg(e.value order by e.ord) from jsonb_array_elements(p_res -> 'overrides_descartados') with ordinality e (value, ord)
       where v_ok ? (e.value ->> 'id') or not v_ids ? (e.value ->> 'id')), '[]'::jsonb));
  end if;
  return v_out;
end
$$;

comment on function public._cotizacion_recorte(jsonb, jsonb) is
  'El recorte por nivel de lo que tiene una cotización o calcula evaluar_formula(), con el contexto de _cotizacion_contexto(): sólo lo visible (también lo calculado de un cálculo pisado, calculados, que se omite si no queda nada), el total y lo aparte, y los subtotales de los grupos que se ven enteros. De nadie; la llaman cotizacion_leer, cotizacion_evaluar y cotizacion_revisiones. docs/COTIZADOR.md › «En la base (4.10-1)».';

revoke all on function public._cotizacion_recorte(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public._cotizacion_recorte(jsonb, jsonb) to service_role;

-- Las etiquetas de las revisiones suman `calculos` (id → formato) de los cálculos que nombra la página, ya recortada al nivel de quien mira.
CREATE OR REPLACE FUNCTION "public"."_revision_etiquetas"("p_def" "jsonb", "p_filas" "jsonb") RETURNS "jsonb"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  with d as (select f -> 'diff' as diff from jsonb_array_elements(coalesce(p_filas, '[]'::jsonb)) f),
  nodos as (
    select distinct k.key as id
      from d cross join lateral (values ('valores'), ('fuentes')) c (col) cross join lateral (values ('de'), ('a')) l (lado)
     cross join lateral jsonb_each(case when jsonb_typeof(d.diff -> c.col -> l.lado) = 'object' then d.diff -> c.col -> l.lado else '{}'::jsonb end) k
  ),
  grupos as (
    select distinct k.key as id
      from d cross join lateral (values ('de'), ('a')) l (lado)
     cross join lateral jsonb_each(case when jsonb_typeof(d.diff -> 'totales' -> l.lado -> 'grupos') = 'object' then d.diff -> 'totales' -> l.lado -> 'grupos' else '{}'::jsonb end) k
  )
  select jsonb_build_object(
    'nodos', coalesce((select jsonb_object_agg(n.id, coalesce((select x ->> 'etiqueta' from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) x where x ->> 'id' = n.id limit 1), n.id))
                         from nodos n), '{}'::jsonb),
    'grupos', coalesce((select jsonb_object_agg(g.id, coalesce((select x ->> 'etiqueta' from jsonb_array_elements(coalesce(p_def -> 'grupos', '[]'::jsonb)) x where x ->> 'id' = g.id limit 1), g.id))
                          from grupos g), '{}'::jsonb),
    -- Los cálculos (tabla, tramo o calculo) que la página nombra, con su formato: la revisión dice cuál se pisó y de cuánto a cuánto.
    'calculos', coalesce((select jsonb_object_agg(n.id, coalesce(x.n ->> 'formato', 'usd'))
                            from nodos n
                            cross join lateral (select y as n from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) y where y ->> 'id' = n.id limit 1) x
                           where x.n ->> 'tipo' in ('tabla', 'tramo', 'calculo')), '{}'::jsonb));
$$;

comment on function public._revision_etiquetas(jsonb, jsonb) is
  'Las etiquetas de los nodos y los grupos que nombran los diffs de unas revisiones ya recortadas ({nodos: {id: etiqueta}, grupos: {id: etiqueta}}; sin etiqueta, el id) y el formato de los cálculos que nombran (calculos: {id: formato}; tabla, tramo o calculo). Pura y de nadie: la llama cotizacion_revisiones con la página que va a devolver.';

revoke all on function public._revision_etiquetas(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public._revision_etiquetas(jsonb, jsonb) to service_role;

-- La hoja dice en el secundario de un par si su pct sigue al monto escrito (`sigue_al_monto`): el espejo de lo guardado (entradasDeLoGuardado) no ve la
-- definición y así sabe que ese pct no es lo tipeado.
CREATE OR REPLACE FUNCTION "public"."_cotizacion_hoja"("p_formula" "uuid", "p_origen" "uuid", "p_edita" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  fo public.formulas;
  v_cfg boolean; v_tc boolean; v_arr text[]; v_editables jsonb; v_ctx jsonb; v_ok jsonb;
  v_nodos jsonb; v_grupos jsonb; v_niveles jsonb; v_visib jsonb; v_lee jsonb; v_vivas jsonb; v_opcion text; v_opcion_ok boolean;
  v_secciones jsonb; v_claves text[]; v_tarjeta jsonb; v_tonos jsonb; v_moneda_bs text; v_datos jsonb; v_cab jsonb;
  v_par_nodo text; v_en_par text[] := '{}'::text[]; v_par jsonb;
  v_exclusivos text[];
begin
  select * into fo from public.formulas x where x.id = p_formula;
  v_cfg := public.tiene_permiso('cotizaciones.configurar', p_origen);
  v_tc := public.tiene_permiso('empresa.tipos_cambio.gestionar');
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb) into v_arr, v_editables from public._nodos_visibles(p_formula) n;
  v_ctx := public._cotizacion_contexto(v_arr, fo.definicion, fo.visibilidad);
  v_ok := v_ctx -> 'ok';
  v_exclusivos := public._motor_pcts_exclusivos(fo.definicion -> 'nodos');
  -- Copias en memoria de lo que se busca por nodo (un jsonb que viene de la tabla se vuelve a leer entero en cada operador).
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  -- La moneda en que se escribe el total en Bs: la `moneda_a` del tipo de cambio ACTIVO que nombra el `total_en` de esta versión (una fila: tipos_cambio_clave_key).
  -- Nula sin `total_en` o sin ese tipo de cambio; no dice si `totales.bs` tiene valor (el Bs sale del tipo de cambio de cada bucket).
  select t.moneda_a::text into v_moneda_bs from public.tipos_cambio t
   where t.activo and t.clave = ((v_nodos -> (fo.definicion ->> 'total_en')) ->> 'clave');
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', g ->> 'tono') from jsonb_array_elements(coalesce(fo.definicion -> 'grupos', '[]'::jsonb)) g where (g ->> 'tono') is not null), '{}'::jsonb);
  v_niveles := coalesce((select jsonb_object_agg(l.clave, l.nombre) from public.cotizaciones_niveles l), '{}'::jsonb);
  v_visib := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(coalesce(fo.visibilidad, '{}'::jsonb)) e), '{}'::jsonb);
  -- Quien no puede guardar esa cotización (4.15-2, `p_edita` falso): ninguna celda se edita y el motivo no es un nivel (`no_se_edita`, o `se_calcula`/`del_vehiculo`).
  if p_edita is not true then
    v_editables := '{}'::jsonb;
    v_visib := '{}'::jsonb;
  end if;
  -- Las tablas que lee algún nodo que quien llama ve (la regla de `cotizacion_tabla()`) y las que existen vivas para este origen.
  v_lee := coalesce((select jsonb_object_agg(t.nombre, true)
                       from (select distinct n ->> 'tabla' as nombre from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n
                              where (n ->> 'tabla') is not null and n ->> 'id' = any (v_arr)) t), '{}'::jsonb);
  v_vivas := coalesce((select jsonb_object_agg(r.clave, true) from public.tablas_referencia r where r.activa and (r.origen_id = p_origen or r.origen_id is null)), '{}'::jsonb);
  -- El dato del vehículo de cada nodo `tabla` (4.14-2c2), armado una vez; viaja sólo en la celda de un nodo que se ve.
  v_datos := public._hoja_datos_del_vehiculo(v_nodos, p_origen, fo.params -> 'tablas', v_vivas);
  select n ->> 'id' into v_opcion from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'tipo' = 'opcion' limit 1;
  v_opcion_ok := v_opcion is not null and v_ok ? v_opcion;
  -- La variante en par (glosario: «Variante en par»): viaja a todo el que abre la hoja, aunque su nivel esconda el nodo (las etiquetas de sus dos opciones
  -- son configuración, no dinero), con los nodos que cambian según la opción; su ítem `variante` no se dibuja (la opción no la elige la persona).
  v_par_nodo := public._variante_en_par(fo.definicion);
  if v_par_nodo is not null then
    v_en_par := public._nodos_en_par(fo.definicion);
    v_par := jsonb_build_object('nodo', v_par_nodo, 'etiqueta', v_nodos -> v_par_nodo ->> 'etiqueta',
               'opciones', (select jsonb_agg(jsonb_build_object('clave', x.o ->> 'clave', 'etiqueta', x.o ->> 'etiqueta') order by x.k)
                              from jsonb_array_elements(v_nodos -> v_par_nodo -> 'opciones') with ordinality x (o, k)));
  end if;

  -- El aspecto de cada ítem y de cada sección se copia del diseño ya leído (con `->`: un número de columnas sigue siendo un número); sin él,
  -- la clave no viaja. Los niveles de una sección (`nivel_*`) nunca viajan.
  with it as (
    select s.ord as so, i.ord as io, s.value - 'items' as cab, i.value as item, i.value ->> 'tipo' as t, i.value ->> 'nodo' as nid
      from jsonb_array_elements(fo.diseno -> 'secciones') with ordinality s (value, ord)
     cross join lateral jsonb_array_elements(s.value -> 'items') with ordinality i (value, ord)
  ), vis as (
    -- Sólo viaja lo que su nodo (y, en un par, su porcentaje) permite.
    select it.*, v_nodos -> it.nid as n,
           jsonb_strip_nulls(jsonb_build_object('ancho', it.item -> 'ancho', 'alto', it.item -> 'alto', 'letra', it.item -> 'letra',
                                                'enfasis', it.item -> 'enfasis')) as asp
      from it
     where v_ok ? it.nid and v_nodos ? it.nid
       and not (it.t = 'variante' and v_par_nodo is not null)
       and (it.t <> 'celda' or not (it.item ? 'secundario') or v_ok ? (v_nodos -> it.nid ->> 'pct'))
  ), obj as (
    select vis.so, vis.io, vis.cab,
           case when vis.t in ('celda', 'subtotal') then v_grupos ->> (vis.n ->> 'grupo') end as tono,
           case vis.t
             when 'celda' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'celda', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'tipo_nodo', vis.n ->> 'tipo',
                 'formato', coalesce(vis.n ->> 'formato', 'usd'),
                 'tono', v_grupos ->> (vis.n ->> 'grupo'),
                 'ayuda', case
                            when (vis.item -> 'ayuda') ? 'texto' then jsonb_build_object('texto', vis.item -> 'ayuda' ->> 'texto')
                                                                      || jsonb_strip_nulls(jsonb_build_object('enlaces', vis.item -> 'ayuda' -> 'enlaces'))
                            when (vis.item -> 'ayuda') ? 'tabla'
                                 and (v_cfg or v_lee ? (vis.item -> 'ayuda' ->> 'tabla'))
                                 and ((jsonb_typeof(fo.params -> 'tablas') = 'object' and (fo.params -> 'tablas') ? (vis.item -> 'ayuda' ->> 'tabla'))
                                      or v_vivas ? (vis.item -> 'ayuda' ->> 'tabla'))
                              then jsonb_build_object('tabla', vis.item -> 'ayuda' ->> 'tabla') end,
                 'dato_del_vehiculo', v_datos -> vis.nid,
                 'en_par', case when vis.nid = any (v_en_par) then true end,
                 'solo_en', case when v_opcion_ok then vis.n -> 'solo_en' end,
                 'condicion', case when v_ok ? (vis.n ->> 'condicion') then vis.n ->> 'condicion' end,
                 'requerido_si', case when v_ok ? (vis.n ->> 'requerido_si') then vis.n ->> 'requerido_si' end,
                 'secundario', case when vis.item ? 'secundario' then
                     jsonb_build_object('nodo', vis.n ->> 'pct', 'como', vis.item ->> 'secundario', 'tipo_nodo', v_nodos -> (vis.n ->> 'pct') ->> 'tipo',
                                        'formato', coalesce(v_nodos -> (vis.n ->> 'pct') ->> 'formato', 'usd'),
                                        -- Con el monto escrito, el pct lo calcula el par (`sobrescribible`, o por la hoja con su pct exclusivo): no es lo tipeado.
                                        'sigue_al_monto', case when (vis.n -> 'sobrescribible') = 'true'::jsonb
                                                                 or ((vis.n ->> 'salida') is distinct from 'total' and (vis.n ->> 'pct') = any (v_exclusivos))
                                                               then true end)
                     || public._hoja_estado(v_nodos -> (vis.n ->> 'pct'), true, v_editables ? (vis.n ->> 'pct'),
                                            v_visib -> (vis.n ->> 'pct') ->> 'editar', v_niveles ->> (v_visib -> (vis.n ->> 'pct') ->> 'editar'), v_cfg, v_tc) end))
               || public._hoja_estado(vis.n, true, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
               || vis.asp
             when 'atajos' then jsonb_build_object('tipo', 'atajos', 'nodo', vis.nid,
                 'chips', public._hoja_chips(p_origen, fo.params, vis.n, vis.item ->> 'columna', ((vis.item -> 'filas')::numeric)::int))
               || vis.asp
             when 'variante' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'variante', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta',
                 'opciones', coalesce((select jsonb_agg(jsonb_build_object('clave', o ->> 'clave', 'etiqueta', o ->> 'etiqueta', 'titulo', o ->> 'titulo'))
                                         from jsonb_array_elements(vis.n -> 'opciones') o), '[]'::jsonb),
                 'por_defecto', vis.n ->> 'por_defecto'))
               || public._hoja_estado(vis.n, false, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
               || vis.asp
             when 'interruptor' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'interruptor', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'efecto', vis.item ->> 'efecto',
                 'solo_en', case when v_opcion_ok then vis.n -> 'solo_en' end))
               || public._hoja_estado(vis.n, false, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
               || vis.asp
             when 'subtotal' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'subtotal', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'formato', coalesce(vis.n ->> 'formato', 'usd'),
                 'tono', v_grupos ->> (vis.n ->> 'grupo'), 'en_par', case when vis.nid = any (v_en_par) then true end))
               || vis.asp
           end as o
      from vis
  ), secs as (
    select o.so, jsonb_strip_nulls(jsonb_build_object(
                   'id', o.cab ->> 'id', 'titulo', o.cab ->> 'titulo', 'presentacion', o.cab ->> 'presentacion',
                   'ancho', o.cab -> 'ancho', 'alto', o.cab -> 'alto', 'relleno', o.cab -> 'relleno', 'separacion', o.cab -> 'separacion',
                   'densidad', o.cab -> 'densidad', 'letra', o.cab -> 'letra', 'enfasis', o.cab -> 'enfasis', 'tono', o.cab -> 'tono'))
                 || jsonb_build_object('items', jsonb_agg(o.o order by o.io)) as sec
      from obj o
     where o.o is not null
     group by o.so, o.cab
  )
  -- Los tonos que la hoja pinta: los de los grupos de sus celdas y franjas, los de las secciones que dibuja y el de la cabecera.
  select coalesce((select jsonb_agg(s.sec order by s.so) from secs s), '[]'::jsonb),
         coalesce((select array_agg(distinct x.tono) from (select o.tono from obj o where o.tono is not null
                                                           union all
                                                           select s.sec ->> 'tono' from secs s where s.sec ? 'tono') x), '{}'::text[])
    into v_secciones, v_claves;
  v_cab := fo.diseno -> 'cabecera';
  if jsonb_typeof(v_cab -> 'tono') = 'string' then
    v_claves := v_claves || (v_cab ->> 'tono');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('clave', t.clave,
                                               'claro', jsonb_build_object('fondo', t.claro_fondo, 'borde', t.claro_borde, 'tinta', t.claro_tinta),
                                               'oscuro', jsonb_build_object('fondo', t.oscuro_fondo, 'borde', t.oscuro_borde, 'tinta', t.oscuro_tinta)) order by t.clave), '[]'::jsonb)
    into v_tonos from public.tonos t where t.clave = any (v_claves);

  v_tarjeta := jsonb_build_object('nodo', fo.diseno -> 'tarjeta_total' ->> 'nodo',
                                  'etiqueta', v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'etiqueta',
                                  'formato', coalesce(v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'formato', 'usd'),
                                  'secundarios', coalesce((select jsonb_agg(jsonb_build_object('nodo', x.s, 'etiqueta', v_nodos -> x.s ->> 'etiqueta',
                                                                                              'formato', coalesce(v_nodos -> x.s ->> 'formato', 'usd')) order by x.o)
                                                             from jsonb_array_elements_text(coalesce(fo.diseno -> 'tarjeta_total' -> 'secundarios', '[]'::jsonb)) with ordinality x (s, o)
                                                            where v_ok ? x.s), '[]'::jsonb));

  -- La cabecera: los modos (clave y nombre), «Ver total», su moneda, si quien mira tiene el ⚙ de la cabecera (`ajustes`: configura el origen y hay al
  -- menos un modo), su aspecto y lo que trae por defecto (sólo las claves que el diseño trae).
  return jsonb_build_object(
    'formula', jsonb_build_object('id', fo.id, 'version', fo.version),
    'cabecera', jsonb_build_object(
      'modos', coalesce((select jsonb_agg(jsonb_build_object('clave', m ->> 'clave', 'nombre', m ->> 'nombre'))
                           from jsonb_array_elements(coalesce(v_cab -> 'modos', '[]'::jsonb)) m), '[]'::jsonb),
      'ver_total_bs', coalesce((v_cab ->> 'ver_total_bs')::boolean, false),
      'moneda_bs', v_moneda_bs,
      'ajustes', coalesce(v_cfg, false) and jsonb_array_length(coalesce(v_cab -> 'modos', '[]'::jsonb)) > 0)
      || jsonb_strip_nulls(jsonb_build_object('tono', v_cab -> 'tono', 'relleno', v_cab -> 'relleno', 'letra', v_cab -> 'letra',
                                              'enfasis', v_cab -> 'enfasis', 'modo_por_defecto', v_cab -> 'modo_por_defecto',
                                              'ver_total_bs_por_defecto', v_cab -> 'ver_total_bs_por_defecto',
                                              'modos_visibles', v_cab -> 'modos_visibles')),
    'secciones', v_secciones,
    'tarjeta_total', v_tarjeta,
    'tonos', v_tonos,
    'par', v_par);
end
$$;

comment on function public._cotizacion_hoja(uuid, uuid, boolean) is
  'El diseño de una versión de la fórmula recortado al nivel de quien llama: ítems cuyo nodo se ve, con su candado y su motivo, ayudas (el texto con sus enlaces, o la tabla), el dato del vehículo de una celda de tabla (dato_del_vehiculo), atajos, modos (clave y nombre), la moneda del total en Bs (moneda_bs), si quien llama tiene el ⚙ de la cabecera (ajustes), tarjeta y tonos (los de los grupos de sus celdas, de las secciones que dibuja y de la cabecera). El secundario de un par dice si su pct sigue al monto escrito (sigue_al_monto). Con una variante en par, par (nodo, etiqueta y las dos opciones con su clave y etiqueta, para todo el que abre) y en_par en cada celda y subtotal que cambia según la opción (_nodos_en_par); el ítem de la variante no viaja. Copia el aspecto (ancho, alto, letra y énfasis de cada ítem; ancho, alto, relleno, separación, densidad, letra, énfasis y tono de cada sección; tono, relleno, letra y énfasis de la cabecera) y lo que la cabecera trae por defecto (modo_por_defecto, ver_total_bs_por_defecto, modos_visibles) sólo si el diseño lo trae; nunca los niveles. Con p_edita falso (quien no puede guardar esa cotización) nada es editable y el motivo no es un nivel. De nadie; la llaman cotizacion_hoja y cotizacion_hoja_guardada. docs/COTIZADOR.md › «La lectura que abre la hoja (4.13-1)».';

revoke all on function public._cotizacion_hoja(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public._cotizacion_hoja(uuid, uuid, boolean) to service_role;
