-- La lista de una fase filtrada por un contenedor o un embarque (`?contenedor=`, `?booking=`): quien ve todo la lee desde las unidades de esa
-- entidad, no recorriendo la fase entera. Misma firma, misma salida; lo demás de `_logistica_columna`, como estaba.

CREATE OR REPLACE FUNCTION public._logistica_columna(p_origen uuid, p_fase uuid, p_desde timestamp with time zone, p_id uuid, p_n integer, p_f jsonb, p_todos boolean, p_dias integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_patron text := p_f ->> 'patron';
  v_prefijo text := p_f ->> 'prefijo';
  v_cont text := p_f ->> 'contenedor';
  v_book text := p_f ->> 'booking';
  v_nav uuid := (p_f ->> 'naviera')::uuid;
  v_apr boolean := coalesce((p_f ->> 'por_aprobar')::boolean, false);
  v_trans boolean := (p_f ->> 'naviera') is not null or (p_f ->> 'contenedor') is not null or (p_f ->> 'booking') is not null;
  v_corte timestamptz := 'infinity'::timestamptz;
  v_cont_id uuid;
  v_emb_id uuid;
  v_ids uuid[];
  v_cand uuid[];
  v_tarjetas jsonb;
begin
  -- El contenedor y el embarque del filtro, una vez y en el origen de la lista (contenedores_numero_origen_key, embarques_booking_origen_key):
  -- uno que no existe ahí no tiene tarjetas.
  if v_cont is not null then
    select c.id into v_cont_id from public.contenedores c where c.numero = v_cont and c.origen_id = p_origen;
    if v_cont_id is null then
      return jsonb_build_object('tarjetas', '[]'::jsonb, 'hay_mas', false);
    end if;
  end if;
  if v_book is not null then
    select e.id into v_emb_id from public.embarques e where e.booking = v_book and e.origen_id = p_origen;
    if v_emb_id is null then
      return jsonb_build_object('tarjetas', '[]'::jsonb, 'hay_mas', false);
    end if;
  end if;
  if coalesce((p_f ->> 'demoradas')::boolean, false) then
    if p_fase is null or p_dias is null then
      return jsonb_build_object('tarjetas', '[]'::jsonb, 'hay_mas', false);
    end if;
    v_corte := now() - make_interval(days => p_dias);
  end if;

  -- Filtrada por un contenedor o un embarque, quien ve todo parte de sus unidades: por contenedor, transportes_contenedor_id_idx; por embarque,
  -- transportes_embarque_idx y, por sus contenedores, contenedores_embarque_idx → transportes_contenedor_id_idx. Hasta 10.001, y cada vehículo por
  -- vehiculos_pkey: recorrer la fase por vehiculos_cadena_idx descartaría todos los que no van ahí. Con más de 10.000, la ruta de la fase.
  -- Lo propio sigue partiendo de _logistica_lo_propio, que ya tiene su tope.
  if p_todos and v_cont_id is not null then
    v_cand := array(select t.vehiculo_id from public.transportes t where t.contenedor_id = v_cont_id and t.vehiculo_id is not null limit 10001);
  elsif p_todos and v_emb_id is not null then
    v_cand := array(
      select u.id from (
        (select t.vehiculo_id from public.transportes t where t.embarque_id = v_emb_id and t.vehiculo_id is not null limit 10001)
        union all
        (select t.vehiculo_id from public.contenedores c join public.transportes t on t.contenedor_id = c.id
          where c.embarque_id = v_emb_id and t.vehiculo_id is not null limit 10001)) as u(id)
      limit 10001);
  end if;

  if cardinality(v_cand) <= 10000 then
    -- Las unidades del contenedor o del embarque, por vehiculos_pkey: la fase (o «Sin fase») y el cursor se miran sobre cada una y se ordenan a lo
    -- sumo 10.000.
    v_ids := array(
      select v.id from unnest(v_cand) as u(id)
       join public.vehiculos v on v.id = u.id
       where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada'
         and ((p_fase is null and v.fase_id is null and v.fase_desde is null) or (v.fase_id = p_fase and v.fase_desde < v_corte))
         and (p_id is null or (p_fase is null and v.id > p_id) or (p_fase is not null and (v.fase_desde, v.id) > (p_desde, p_id)))
         and exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id
               and (v_nav is null or t.naviera_id = v_nav) and (v_cont_id is null or t.contenedor_id = v_cont_id)
               and (v_emb_id is null or t.embarque_id = v_emb_id))
         and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
         and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
              or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
       order by v.fase_desde, v.id
       limit p_n + 1);
  elsif p_todos then
    if p_fase is not null and p_id is null then
      -- vehiculos_cadena_idx (parcial: sin las no ganadas): (origen_id, fase_id) fijos, rango de fase_desde.
      v_ids := array(
        select v.id from public.vehiculos v
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id = p_fase and v.fase_desde < v_corte
           and (not v_trans or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont_id is null or t.contenedor_id = v_cont_id)
                 and (v_emb_id is null or t.embarque_id = v_emb_id)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.fase_id, v.fase_desde, v.id
         limit p_n + 1);
    elsif p_fase is not null then
      -- vehiculos_cadena_idx (parcial: sin las no ganadas): (origen_id, fase_id) fijos, desde el cursor (fase_desde, id).
      v_ids := array(
        select v.id from public.vehiculos v
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id = p_fase and v.fase_desde < v_corte
           and (v.fase_desde, v.id) > (p_desde, p_id)
           and (not v_trans or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont_id is null or t.contenedor_id = v_cont_id)
                 and (v_emb_id is null or t.embarque_id = v_emb_id)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.fase_id, v.fase_desde, v.id
         limit p_n + 1);
    elsif p_id is null then
      -- vehiculos_cadena_idx (parcial: sin las no ganadas): origen_id fijo, fase_id is null (fase_desde también es nulo), por id.
      v_ids := array(
        select v.id from public.vehiculos v
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id is null and v.fase_desde is null
           and (not v_trans or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont_id is null or t.contenedor_id = v_cont_id)
                 and (v_emb_id is null or t.embarque_id = v_emb_id)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.fase_id, v.fase_desde, v.id
         limit p_n + 1);
    else
      -- vehiculos_cadena_idx (parcial: sin las no ganadas): origen_id fijo, fase_id is null, desde el cursor id.
      v_ids := array(
        select v.id from public.vehiculos v
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id is null and v.fase_desde is null
           and v.id > p_id
           and (not v_trans or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont_id is null or t.contenedor_id = v_cont_id)
                 and (v_emb_id is null or t.embarque_id = v_emb_id)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.fase_id, v.fase_desde, v.id
         limit p_n + 1);
    end if;
  else
    if p_fase is not null and p_id is null then
      -- Sólo lo propio: parte de _logistica_lo_propio (vehiculos_creador_idx y leads_asesores_usuario_vigente_idx, hasta 10.001) y lee cada fila por vehiculos_pkey. (origen_id, fase_id) fijos, rango de fase_desde.
      v_ids := array(
        select v.id from unnest(public._logistica_lo_propio(p_origen)) as u(id)
         join public.vehiculos v on v.id = u.id
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id = p_fase and v.fase_desde < v_corte
           and (not v_trans or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont_id is null or t.contenedor_id = v_cont_id)
                 and (v_emb_id is null or t.embarque_id = v_emb_id)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.fase_desde, v.id
         limit p_n + 1);
    elsif p_fase is not null then
      -- Sólo lo propio: parte de _logistica_lo_propio (vehiculos_creador_idx y leads_asesores_usuario_vigente_idx, hasta 10.001) y lee cada fila por vehiculos_pkey. (origen_id, fase_id) fijos, desde el cursor (fase_desde, id).
      v_ids := array(
        select v.id from unnest(public._logistica_lo_propio(p_origen)) as u(id)
         join public.vehiculos v on v.id = u.id
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id = p_fase and v.fase_desde < v_corte
           and (v.fase_desde, v.id) > (p_desde, p_id)
           and (not v_trans or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont_id is null or t.contenedor_id = v_cont_id)
                 and (v_emb_id is null or t.embarque_id = v_emb_id)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.fase_desde, v.id
         limit p_n + 1);
    elsif p_id is null then
      -- Sólo lo propio: parte de _logistica_lo_propio (vehiculos_creador_idx y leads_asesores_usuario_vigente_idx, hasta 10.001) y lee cada fila por vehiculos_pkey. origen_id fijo, fase_id is null (fase_desde también es nulo), por id.
      v_ids := array(
        select v.id from unnest(public._logistica_lo_propio(p_origen)) as u(id)
         join public.vehiculos v on v.id = u.id
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id is null and v.fase_desde is null
           and (not v_trans or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont_id is null or t.contenedor_id = v_cont_id)
                 and (v_emb_id is null or t.embarque_id = v_emb_id)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.id
         limit p_n + 1);
    else
      -- Sólo lo propio: parte de _logistica_lo_propio (vehiculos_creador_idx y leads_asesores_usuario_vigente_idx, hasta 10.001) y lee cada fila por vehiculos_pkey. origen_id fijo, fase_id is null, desde el cursor id.
      v_ids := array(
        select v.id from unnest(public._logistica_lo_propio(p_origen)) as u(id)
         join public.vehiculos v on v.id = u.id
         where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id is null and v.fase_desde is null
           and v.id > p_id
           and (not v_trans or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id
                 and (v_nav is null or t.naviera_id = v_nav) and (v_cont_id is null or t.contenedor_id = v_cont_id)
                 and (v_emb_id is null or t.embarque_id = v_emb_id)))
           and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
           and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
                or exists (select 1 from public.transportes_con_embarque t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
         order by v.id
         limit p_n + 1);
    end if;
  end if;

  -- La tarjeta, sobre las filas ya leídas (por su clave primaria y `transportes_vehiculo_id_key`; contenedor y embarque por sus PK).
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', v.id, 'titulo', v.titulo, 'vin', v.vin, 'lote', v.lote, 'fase_desde', v.fase_desde, 'situacion', v.situacion,
           'demorada', coalesce(p_dias > 0 and v.fase_desde < now() - make_interval(days => p_dias), false),
           'contenedor', t.contenedor, 'booking', t.booking, 'eta_el', t.eta_el) order by u.k), '[]'::jsonb)
    into v_tarjetas
    from unnest(v_ids[1:p_n]) with ordinality as u(id, k)
    join public.vehiculos v on v.id = u.id
    left join public.transportes_con_embarque t on t.vehiculo_id = v.id;

  return jsonb_build_object('tarjetas', v_tarjetas, 'hay_mas', coalesce(cardinality(v_ids), 0) > p_n);
end;
$function$;
