-- Aduana dice qué vehículos lleva cada declaración y dónde viaja cada uno: `declaraciones_listar` suma `primeros` (hasta tres vehículos que quien
-- mira ve, `{vehiculo_id, titulo}` por título; `vehiculos` sigue siendo el conteo) y `declaracion_leer` suma a cada vehículo su `contenedor`
-- (`{id, numero}`) y su `embarque` (`{id, booking}`), nulos si no va en ninguno. `declaraciones_listar` cambia lo que devuelve: drop + create.

drop function public.declaraciones_listar(timestamptz, uuid, integer, jsonb, uuid);

create function "public"."declaraciones_listar"("p_desde" timestamp with time zone, "p_id" "uuid", "p_tope" integer, "p_filtros" "jsonb", "p_origen" "uuid") RETURNS TABLE("id" "uuid", "numero" "text", "canal" "text", "aceptada_el" "date", "vence_tributos_el" "date", "despachante" "text", "deposito" "text", "creado_en" timestamp with time zone, "actualizado_en" timestamp with time zone, "vehiculos" integer, "hay_ocultos" boolean, "pagada" boolean, "faltan" integer, "primeros" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
declare
  -- TAMANO_DE_PAGINA_POR_DEFECTO (50), máximo 100, más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tope, 50, 100) + 1;
  v_lote constant integer := 200;
  v_yo uuid := (select auth.uid());
  v_gestiona boolean;
  f record;
  v_todos uuid[]; v_algun uuid[];
  v_desde timestamptz; v_id uuid;
  d public.declaraciones_aduana; s record;
  v_leidas integer; v_hallados integer := 0;
begin
  perform public.assert_activo();
  v_gestiona := public.tiene_permiso('logistica.aduana.gestionar');
  if not (v_gestiona or public.tiene_permiso('logistica.ver')) then
    raise exception 'No tienes permiso para ver las declaraciones.' using errcode = '42501';
  end if;
  if p_origen is null then
    raise exception 'La lista de declaraciones es de un origen.' using errcode = '22023', hint = 'p_origen';
  end if;
  -- Un origen cuyo flujo de vehículos no usa la regla aduana no tiene pestaña Aduana: nada que listar (flujos_origen_unico).
  if not exists (select 1 from public.flujos fl
                  where fl.origen_id = p_origen and fl.ambito = 'vehiculos' and public.flujo_regla_activa(fl.id, 'aduana')) then
    return;
  end if;
  select * into f from public._declaraciones_filtros(p_filtros);
  if (p_desde is null) <> (p_id is null) then
    raise exception 'El cursor de la lista está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_todos := public.origenes_con_alcance('logistica.ver', 'todos');
  v_algun := public.origenes_con_alcance('logistica.ver', 'propios');
  -- Sin cursor, uno que va antes de toda fila (creado_en nunca es infinity): una sola consulta y el cursor sigue siendo condición de índice.
  v_desde := coalesce(p_desde, 'infinity'::timestamptz);
  v_id := coalesce(p_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid);
  -- Por lotes de 200 sobre declaraciones_aduana_creado_idx (creado_en desc, id desc), sin filtros en la consulta: con ellos, el plan genérico los
  -- creía selectivos y ordenaba toda la tabla. Los filtros y la visibilidad sin gestionar descartan filas del índice: la tabla es de volumen bajo (D34).
  loop
    v_leidas := 0;
    for d in
      select x.* from public.declaraciones_aduana x
       where (x.creado_en, x.id) < (v_desde, v_id)
       order by x.creado_en desc, x.id desc
       limit v_lote
    loop
      v_leidas := v_leidas + 1;
      v_desde := d.creado_en;
      v_id := d.id;
      continue when f.canal is not null and d.canal is distinct from f.canal;
      continue when f.q is not null and not starts_with(upper(d.numero), upper(f.q));
      -- La declaración es del origen si tiene al menos un vehículo vivo de él; la que no tiene ninguno vivo («Sin vehículos») va en todos los orígenes con
      -- aduana. Por declaraciones_vehiculos_pkey (declaracion_id, …) y vehiculos_pkey: una declaración junta pocos vehículos.
      continue when not exists (
        select 1 from public.declaraciones_vehiculos dv join public.vehiculos v on v.id = dv.vehiculo_id
         where dv.declaracion_id = d.id and dv.removido_en is null and v.eliminado_en is null and v.origen_id = p_origen)
        and exists (
        select 1 from public.declaraciones_vehiculos dv join public.vehiculos v on v.id = dv.vehiculo_id
         where dv.declaracion_id = d.id and dv.removido_en is null and v.eliminado_en is null);
      select * into s from public._declaracion_resumen(d.id, v_todos, v_algun, v_yo);
      continue when not v_gestiona and s.vehiculos = 0;
      continue when f.pagada is not null and s.pagada is distinct from f.pagada;
      id := d.id; numero := d.numero; canal := d.canal::text; aceptada_el := d.aceptada_el; vence_tributos_el := d.vence_tributos_el;
      despachante := d.despachante; deposito := d.deposito; creado_en := d.creado_en; actualizado_en := d.actualizado_en;
      vehiculos := s.vehiculos; hay_ocultos := s.hay_ocultos; pagada := s.pagada; faltan := s.faltan;
      -- Los primeros tres que quien mira ve, por título, para nombrarlos en la fila: por declaraciones_vehiculos_pkey y vehiculos_pkey (una
      -- declaración junta pocos vehículos), con la misma visibilidad que el conteo.
      primeros := coalesce((
        select jsonb_agg(jsonb_build_object('vehiculo_id', p.id, 'titulo', p.titulo) order by p.titulo, p.id)
          from (select v.id, v.titulo
                  from public.declaraciones_vehiculos dv join public.vehiculos v on v.id = dv.vehiculo_id
                 where dv.declaracion_id = d.id and dv.removido_en is null and v.eliminado_en is null
                   and public._aduana_vehiculo_visible(v.origen_id, v.creado_por, v.lead_id, v_todos, v_algun, v_yo)
                 order by v.titulo, v.id
                 limit 3) p), '[]'::jsonb);
      return next;
      v_hallados := v_hallados + 1;
      exit when v_hallados >= v_n;
    end loop;
    exit when v_hallados >= v_n or v_leidas < v_lote;
  end loop;
end;
$$;

comment on function public.declaraciones_listar(timestamptz, uuid, integer, jsonb, uuid) is
  'Las declaraciones de aduana de un origen (p_origen, obligatorio: 22023 hint p_origen) que quien llama ve (con logistica.aduana.gestionar, todas; con logistica.ver, las que tienen un vehículo vivo que ve): las que tienen algún vehículo vivo de ese origen y las que no tienen ninguno vivo («Sin vehículos»). Un origen sin la regla aduana en su flujo: vacío. Por cursor (creado_en desc, id desc) sobre declaraciones_aduana_creado_idx, con filtros canal, pagada y q. Por fila: vehiculos y faltan (de los que ve), primeros (hasta 3 que ve, {vehiculo_id, titulo} por título), hay_ocultos, pagada (de todos los vivos, D31). Hasta el tope más una. Sin total (6.07-3).';

revoke all on function public.declaraciones_listar(timestamptz, uuid, integer, jsonb, uuid) from public, anon;
grant execute on function public.declaraciones_listar(timestamptz, uuid, integer, jsonb, uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."declaracion_leer"("p_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_yo uuid := (select auth.uid());
  v_gestiona boolean;
  v_todos uuid[]; v_algun uuid[];
  d public.declaraciones_aduana; s record;
  v_vehiculos jsonb; v_mas boolean;
begin
  perform public.assert_activo();
  v_gestiona := public.tiene_permiso('logistica.aduana.gestionar');
  if not (v_gestiona or public.tiene_permiso('logistica.ver')) then
    raise exception 'No tienes permiso para ver las declaraciones.' using errcode = '42501';
  end if;
  if p_id is null then
    raise exception 'Falta la declaración.' using errcode = '22023', hint = 'id';
  end if;
  v_todos := public.origenes_con_alcance('logistica.ver', 'todos');
  v_algun := public.origenes_con_alcance('logistica.ver', 'propios');
  select * into d from public.declaraciones_aduana x where x.id = p_id;
  if d.id is not null then
    select * into s from public._declaracion_resumen(d.id, v_todos, v_algun, v_yo);
  end if;
  if d.id is null or (not v_gestiona and s.vehiculos = 0) then
    raise exception 'La declaración no existe o no la ves.' using errcode = 'P0002';
  end if;
  -- Hasta 201 (201 = hay más) por la PK, en orden de vehiculo_id; el tributo con la condición de aduana.tributos_pagados (gastos_vehiculo_idx).
  select coalesce(jsonb_agg(jsonb_build_object('vehiculo_id', y.vehiculo_id, 'titulo', y.titulo, 'origen_id', y.origen_id, 'fase_id', y.fase_id,
                                               'fase', y.fase, 'agregado_en', y.agregado_en, 'tributo', y.tributo,
                                               'contenedor', case when y.contenedor_id is null then null
                                                                  else jsonb_build_object('id', y.contenedor_id, 'numero', y.contenedor) end,
                                               'embarque', case when y.embarque_id is null then null
                                                                else jsonb_build_object('id', y.embarque_id, 'booking', y.booking) end) order by y.vehiculo_id)
                    filter (where y.n <= 200), '[]'::jsonb),
         count(*) > 200
    into v_vehiculos, v_mas
    from (select x.*, row_number() over (order by x.vehiculo_id) as n
            from (select dv.vehiculo_id, v.titulo, v.origen_id, v.fase_id, f.nombre as fase, dv.agregado_en,
                         t.contenedor_id, t.contenedor, t.embarque_id, t.booking,
                         exists (select 1 from public.gastos g join public.categorias_gasto cg on cg.id = g.categoria_id
                                  where g.vehiculo_id = dv.vehiculo_id and g.eliminado_en is null and cg.proposito = 'tributos') as tributo
                    from public.declaraciones_vehiculos dv
                    join public.vehiculos v on v.id = dv.vehiculo_id and v.eliminado_en is null
                    left join public.fases f on f.id = v.fase_id
                    -- El contenedor y el embarque del vehículo (transportes_vehiculo_id_key; contenedor y embarque por su PK).
                    left join public.transportes_con_embarque t on t.vehiculo_id = dv.vehiculo_id
                   where dv.declaracion_id = d.id and dv.removido_en is null
                     and public._aduana_vehiculo_visible(v.origen_id, v.creado_por, v.lead_id, v_todos, v_algun, v_yo)
                   order by dv.vehiculo_id
                   limit 201) x) y;
  -- C15 · actualizado_en es la versión de declaracion_version(): sirve de esperada para guardar, poner vehículos y el canal.
  return jsonb_build_object(
    'id', d.id, 'numero', d.numero, 'canal', d.canal, 'aceptada_el', d.aceptada_el, 'vence_tributos_el', d.vence_tributos_el,
    'despachante', d.despachante, 'deposito', d.deposito, 'notas', d.notas, 'creado_en', d.creado_en, 'actualizado_en', d.actualizado_en,
    'vehiculos', v_vehiculos, 'hay_mas', v_mas, 'hay_ocultos', s.hay_ocultos, 'pagada', s.pagada, 'faltan', s.faltan);
end;
$$;

COMMENT ON FUNCTION public.declaracion_leer(uuid) IS 'Una declaración de aduana con los vehículos vivos que quien llama ve (hasta 200, hay_mas), hay_ocultos, pagada (de todos los vivos, D31), faltan y por vehículo tributo, su contenedor ({id, numero} | null) y su embarque ({id, booking} | null). Con logistica.aduana.gestionar, toda declaración; con logistica.ver, la que tiene un vehículo que ve. La que no existe y la que no se ve, el mismo P0002 (6.07-3).';
