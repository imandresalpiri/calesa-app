-- La bandeja del día es de un origen (docs/DECISIONES.md › «Logística siempre en un origen, el último que usaste»): `logistica_bandeja_grupo` pide
-- `p_origen` y sólo lee lo de ese origen. El alcance (`_bandeja_dia_alcance`) suma el filtro por origen y los siete grupos se lo pasan; cada consulta
-- sigue igual (`= any` sobre un arreglo de uno, por `vehiculos_cadena_idx` con su literal `situacion <> 'no_ganada'`, y los índices de cada grupo).
-- La bandeja de Inicio (`logistica_bandeja`) no usa estos ayudantes: sigue juntando todos los orígenes.
-- Las firmas viejas se borran: con las dos, PostgREST tendría dos funciones con el mismo nombre.

drop function public.logistica_bandeja_grupo(text, integer, integer, timestamptz, uuid);
drop function public._bandeja_dia_demorados(integer, timestamptz, uuid);
drop function public._bandeja_dia_trabados(integer, timestamptz, uuid);
drop function public._bandeja_dia_por_aprobar(integer, timestamptz, uuid);
drop function public._bandeja_dia_por_vencer(integer, timestamptz, uuid);
drop function public._bandeja_dia_llegadas(integer, timestamptz, uuid);
drop function public._bandeja_dia_salidas(integer, timestamptz, uuid);
drop function public._bandeja_dia_sin_resolver(integer, timestamptz, uuid);
drop function public._bandeja_dia_alcance(text);

-- Los orígenes de la bandeja de quien mira (los que ve, los que ve «todos» y sus vehículos propios), acotados a `p_origen` (nulo: todos).
create function public._bandeja_dia_alcance(p_clave text, p_origen uuid)
  returns table (origenes uuid[], todos uuid[], propios uuid[])
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_o uuid[]; v_t uuid[]; v_p uuid[] := '{}'::uuid[]; o uuid;
begin
  if (select auth.uid()) is null then
    return query select '{}'::uuid[], '{}'::uuid[], '{}'::uuid[];
    return;
  end if;
  select coalesce(array_agg(x.o), '{}'::uuid[]), coalesce(array_agg(x.o) filter (where x.alc = 'todos' and x.ex = 'todos'), '{}'::uuid[])
    into v_o, v_t
    from (select fl.origen_id as o, public._logistica_alcance(fl.origen_id) as alc,
                 case when p_clave is null then 'todos'::public.alcance_permiso else public.alcance_de(p_clave, fl.origen_id) end as ex
            from public.flujos fl
           where fl.ambito = 'vehiculos' and fl.origen_id is not null
             and (p_origen is null or fl.origen_id = p_origen)) x
   where x.alc is not null and x.ex is not null;
  foreach o in array v_o loop
    if o <> all (v_t) then
      v_p := v_p || public._logistica_lo_propio(o);
    end if;
  end loop;
  return query select v_o, v_t, v_p;
end;
$$;

revoke all on function public._bandeja_dia_alcance(text, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_alcance(text, uuid) to service_role;

create function "public"."_bandeja_dia_demorados"("p_leer" integer, "p_desde" timestamp with time zone, "p_id" "uuid", "p_origen" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  a record; r record; v_filas jsonb := '[]'::jsonb; v_parte jsonb;
begin
  select * into a from public._bandeja_dia_alcance(null, p_origen);
  -- Los orígenes donde lo ve todo: una consulta por par, por su índice.
  for r in
    select fl.origen_id as o, f.id as f, f.nombre, x.dias
      from public.flujos fl
      join public.fases f on f.flujo_id = fl.id
      cross join lateral (select public._logistica_dias(f.id) as dias) x
     where fl.ambito = 'vehiculos' and fl.origen_id = any (a.todos) and x.dias is not null
  loop
    if p_desde is null then
      -- vehiculos_cadena_idx (parcial: sin las no ganadas): (origen_id, fase_id) fijos, rango de fase_desde.
      select coalesce(jsonb_agg(jsonb_build_object('id', y.id, 'origen_id', r.o, 'titulo', y.titulo, 'fase_id', r.f, 'fase', r.nombre,
               'fase_desde', y.fase_desde, 'situacion', y.situacion, 'dias', r.dias,
               'clave_desde', y.fase_desde + make_interval(days => r.dias), 'clave_id', y.id) order by y.fase_desde, y.id), '[]'::jsonb)
        into v_parte
        from (select v.id, v.titulo, v.fase_desde, v.situacion from public.vehiculos v
               where v.origen_id = r.o and v.fase_id = r.f and v.eliminado_en is null and v.situacion <> 'no_ganada'
                 and v.fase_desde < now() - make_interval(days => r.dias)
               order by v.fase_desde, v.id limit p_leer) y;
    else
      -- Lo mismo, desde el cursor (fase_desde, id); la fecha del cursor es el vencimiento, y el de un par se resta con sus días.
      select coalesce(jsonb_agg(jsonb_build_object('id', y.id, 'origen_id', r.o, 'titulo', y.titulo, 'fase_id', r.f, 'fase', r.nombre,
               'fase_desde', y.fase_desde, 'situacion', y.situacion, 'dias', r.dias,
               'clave_desde', y.fase_desde + make_interval(days => r.dias), 'clave_id', y.id) order by y.fase_desde, y.id), '[]'::jsonb)
        into v_parte
        from (select v.id, v.titulo, v.fase_desde, v.situacion from public.vehiculos v
               where v.origen_id = r.o and v.fase_id = r.f and v.eliminado_en is null and v.situacion <> 'no_ganada'
                 and v.fase_desde < now() - make_interval(days => r.dias)
                 and (v.fase_desde, v.id) > (p_desde - make_interval(days => r.dias), p_id)
               order by v.fase_desde, v.id limit p_leer) y;
    end if;
    v_filas := v_filas || v_parte;
  end loop;

  -- Los orígenes donde ve lo propio: una sola pasada sobre sus ids (vehiculos_pkey), con el cursor sobre la fila. Los vehículos propios se leen primero
  -- (materializados) y recién después se unen a los pares: unidos a la vez, el planificador recorría `vehiculos` entera por el origen.
  if cardinality(a.propios) > 0 then
    with q as materialized (
      -- Los pares (origen, fase que alerta) de lo propio, con sus días: pocos, y `_logistica_dias` se paga una vez por par y no por vehículo.
      select fl.origen_id as o, f.id as f, f.nombre, x.dias
        from public.flujos fl
        join public.fases f on f.flujo_id = fl.id
        cross join lateral (select public._logistica_dias(f.id) as dias) x
       where fl.ambito = 'vehiculos' and fl.origen_id = any (a.origenes) and fl.origen_id <> all (a.todos) and x.dias is not null),
    m as materialized (
      select v.id, v.titulo, v.origen_id, v.fase_id, v.fase_desde, v.situacion
        from unnest(a.propios) as u(id)
        join public.vehiculos v on v.id = u.id
       where v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id is not null)
    select coalesce(jsonb_agg(jsonb_build_object('id', y.id, 'origen_id', y.origen_id, 'titulo', y.titulo, 'fase_id', y.fase_id, 'fase', y.nombre,
             'fase_desde', y.fase_desde, 'situacion', y.situacion, 'dias', y.dias, 'clave_desde', y.vence, 'clave_id', y.id)
             order by y.vence, y.id), '[]'::jsonb)
      into v_parte
      from (select m.id, m.titulo, m.origen_id, m.fase_id, q.nombre, m.fase_desde, m.situacion, q.dias,
                   m.fase_desde + make_interval(days => q.dias) as vence
              from m
              join q on q.o = m.origen_id and q.f = m.fase_id
             where m.fase_desde < now() - make_interval(days => q.dias)
               and (p_desde is null or (m.fase_desde + make_interval(days => q.dias), m.id) > (p_desde, p_id))
             order by vence, m.id
             limit p_leer) y;
    v_filas := v_filas || v_parte;
  end if;

  -- Las partes se juntan y se ordenan: son pocas (un par por origen y fase, cada una de a lo sumo p_leer).
  select coalesce(jsonb_agg(z.e order by (z.e ->> 'clave_desde')::timestamptz, (z.e ->> 'clave_id')::uuid), '[]'::jsonb) into v_parte
    from (select e from jsonb_array_elements(v_filas) e
           order by (e ->> 'clave_desde')::timestamptz, (e ->> 'clave_id')::uuid limit p_leer) z;
  return jsonb_build_object('filas', v_parte, 'cortada', false, 'ultimo', null);
end;
$$;
revoke all on function public._bandeja_dia_demorados(integer, timestamptz, uuid, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_demorados(integer, timestamptz, uuid, uuid) to service_role;

create function "public"."_bandeja_dia_trabados"("p_leer" integer, "p_desde" timestamp with time zone, "p_id" "uuid", "p_origen" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  -- TOPE_DE_EVALUADAS: las demoradas que se evalúan por llamada, de una sola lectura (cada lectura de lo propio paga una pasada por sus ids).
  c_tope constant integer := 200;
  c_lote constant integer := 200;
  v_desde timestamptz := p_desde; v_id uuid := p_id;
  v_lote jsonb; v_filas jsonb := '[]'::jsonb; v_cache jsonb := '{}'::jsonb; v_ultimo jsonb := null;
  v_eval integer := 0; e jsonb; v_sig uuid; v_sig_nombre text; v_motivo text;
begin
  loop
    v_lote := (public._bandeja_dia_demorados(c_lote, v_desde, v_id, p_origen)) -> 'filas';
    exit when jsonb_array_length(v_lote) = 0;
    for e in select x from jsonb_array_elements(v_lote) x loop
      v_eval := v_eval + 1;
      v_ultimo := jsonb_build_object('desde', e -> 'clave_desde', 'id', e -> 'clave_id');
      if not v_cache ? (e ->> 'fase_id') then
        select f.id, f.nombre into v_sig, v_sig_nombre
          from public.fases_transiciones t join public.fases f on f.id = t.a_fase_id
         where t.de_fase_id = (e ->> 'fase_id')::uuid and f.activa
         order by f.orden, f.id limit 1;
        v_cache := v_cache || jsonb_build_object(e ->> 'fase_id',
          case when v_sig is null then 'null'::jsonb else jsonb_build_object('id', v_sig, 'nombre', v_sig_nombre) end);
      end if;
      v_sig := (v_cache -> (e ->> 'fase_id') ->> 'id')::uuid;
      v_sig_nombre := v_cache -> (e ->> 'fase_id') ->> 'nombre';
      continue when v_sig is null;
      select q.descripcion into v_motivo
        from public.evaluar_requisitos((e ->> 'id')::uuid, null, v_sig) q join public.fases_requisitos fr on fr.id = q.requisito_id
       where q.bloqueante and not q.cumplido
       order by fr.orden, fr.id limit 1;
      continue when v_motivo is null;
      v_filas := v_filas || jsonb_build_array(e || jsonb_build_object('fase_siguiente', v_sig_nombre, 'motivo', v_motivo));
      if jsonb_array_length(v_filas) >= p_leer then
        return jsonb_build_object('filas', v_filas, 'cortada', false, 'ultimo', null);
      end if;
    end loop;
    exit when jsonb_array_length(v_lote) < c_lote;
    if v_eval >= c_tope then
      return jsonb_build_object('filas', v_filas, 'cortada', true, 'ultimo', v_ultimo);
    end if;
    v_desde := (v_ultimo ->> 'desde')::timestamptz; v_id := (v_ultimo ->> 'id')::uuid;
  end loop;
  return jsonb_build_object('filas', v_filas, 'cortada', false, 'ultimo', null);
end;
$$;
revoke all on function public._bandeja_dia_trabados(integer, timestamptz, uuid, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_trabados(integer, timestamptz, uuid, uuid) to service_role;

create function "public"."_bandeja_dia_por_aprobar"("p_leer" integer, "p_desde" timestamp with time zone, "p_id" "uuid", "p_origen" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c_lote constant integer := 200; c_tope constant integer := 2000;
  a record; v_d timestamptz := p_desde; v_i uuid := p_id; v_ids uuid[]; v_leidas integer := 0; v_filas jsonb := '[]'::jsonb; v_parte jsonb;
begin
  select * into a from public._bandeja_dia_alcance('logistica.documentos.aprobar', p_origen);
  if cardinality(a.origenes) = 0 then
    return jsonb_build_object('filas', '[]'::jsonb, 'cortada', false, 'ultimo', null);
  end if;
  loop
    if v_i is null then
      -- documentos_por_revisar_idx (creado_en, id) where subido y vivo: una cola corta.
      v_ids := array(select d.id from public.documentos d where d.estado = 'subido' and d.eliminado_en is null
                      order by d.creado_en, d.id limit c_lote);
    else
      v_ids := array(select d.id from public.documentos d where d.estado = 'subido' and d.eliminado_en is null and (d.creado_en, d.id) > (v_d, v_i)
                      order by d.creado_en, d.id limit c_lote);
    end if;
    exit when cardinality(v_ids) = 0;
    v_leidas := v_leidas + cardinality(v_ids);
    select d.creado_en, d.id into v_d, v_i from public.documentos d where d.id = any (v_ids) order by d.creado_en desc, d.id desc limit 1;
    -- De las leídas, las que quien mira ve (por su clave primaria).
    select coalesce(jsonb_agg(jsonb_build_object('documento_id', d.id, 'vehiculo_id', d.vehiculo_id, 'origen_id', v.origen_id, 'titulo', v.titulo,
             'tipo', t.nombre, 'creado_en', d.creado_en, 'clave_desde', d.creado_en, 'clave_id', d.id) order by d.creado_en, d.id), '[]'::jsonb)
      into v_parte
      from public.documentos d
      join public.vehiculos v on v.id = d.vehiculo_id
      join public.tipos_documento t on t.id = d.tipo_documento_id
     where d.id = any (v_ids) and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.origen_id = any (a.origenes)
       and (v.origen_id = any (a.todos) or v.id in (select p from unnest(a.propios) p));
    v_filas := v_filas || v_parte;
    if jsonb_array_length(v_filas) >= p_leer then
      return jsonb_build_object('filas', public._bandeja_dia_recortar(v_filas, p_leer), 'cortada', false, 'ultimo', null);
    end if;
    exit when cardinality(v_ids) < c_lote;
    if v_leidas >= c_tope then
      return jsonb_build_object('filas', v_filas, 'cortada', true, 'ultimo', jsonb_build_object('desde', v_d, 'id', v_i));
    end if;
  end loop;
  return jsonb_build_object('filas', v_filas, 'cortada', false, 'ultimo', null);
end;
$$;
revoke all on function public._bandeja_dia_por_aprobar(integer, timestamptz, uuid, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_por_aprobar(integer, timestamptz, uuid, uuid) to service_role;

create function "public"."_bandeja_dia_por_vencer"("p_leer" integer, "p_desde" timestamp with time zone, "p_id" "uuid", "p_origen" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c_lote constant integer := 200; c_tope constant integer := 2000;
  a record; v_hoy date := public._bandeja_dia_hoy(); v_max integer;
  v_d date := (p_desde at time zone 'UTC')::date; v_i uuid := p_id; v_ids uuid[]; v_leidas integer := 0; v_filas jsonb := '[]'::jsonb; v_parte jsonb;
begin
  select * into a from public._bandeja_dia_alcance('logistica.documentos.subir', p_origen);
  select max(t.aviso_dias) into v_max from public.tipos_documento t where t.modo_vencimiento in ('renovar', 'solicitar') and t.aviso_dias is not null;
  if cardinality(a.origenes) = 0 or v_hoy is null or v_max is null then
    return jsonb_build_object('filas', '[]'::jsonb, 'cortada', false, 'ultimo', null);
  end if;
  loop
    if v_i is null then
      -- documentos_vencen_idx (vence_el) where aprobado y vivo: el rango [hoy, hoy + el mayor aviso].
      v_ids := array(select x.id from public.documentos x
                      where x.estado = 'aprobado' and x.eliminado_en is null and x.vence_el is not null and x.vence_el between v_hoy and v_hoy + v_max
                      order by x.vence_el, x.id limit c_lote);
    else
      v_ids := array(select x.id from public.documentos x
                      where x.estado = 'aprobado' and x.eliminado_en is null and x.vence_el is not null and x.vence_el between v_hoy and v_hoy + v_max
                        and (x.vence_el, x.id) > (v_d, v_i)
                      order by x.vence_el, x.id limit c_lote);
    end if;
    exit when cardinality(v_ids) = 0;
    v_leidas := v_leidas + cardinality(v_ids);
    select x.vence_el, x.id into v_d, v_i from public.documentos x where x.id = any (v_ids) order by x.vence_el desc, x.id desc limit 1;
    select coalesce(jsonb_agg(jsonb_build_object('documento_id', d.id, 'vehiculo_id', d.vehiculo_id, 'origen_id', v.origen_id, 'titulo', v.titulo,
             'tipo', t.nombre, 'vence_el', d.vence_el, 'modo', t.modo_vencimiento,
             'clave_desde', d.vence_el::timestamp at time zone 'UTC', 'clave_id', d.id) order by d.vence_el, d.id), '[]'::jsonb)
      into v_parte
      from public.documentos d
      join public.tipos_documento t on t.id = d.tipo_documento_id
      join public.vehiculos v on v.id = d.vehiculo_id
     where d.id = any (v_ids) and t.modo_vencimiento in ('renovar', 'solicitar') and t.aviso_dias is not null and d.vence_el - t.aviso_dias <= v_hoy
       and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.origen_id = any (a.origenes)
       and (v.origen_id = any (a.todos) or v.id in (select p from unnest(a.propios) p));
    v_filas := v_filas || v_parte;
    if jsonb_array_length(v_filas) >= p_leer then
      return jsonb_build_object('filas', public._bandeja_dia_recortar(v_filas, p_leer), 'cortada', false, 'ultimo', null);
    end if;
    exit when cardinality(v_ids) < c_lote;
    if v_leidas >= c_tope then
      return jsonb_build_object('filas', v_filas, 'cortada', true,
                                'ultimo', jsonb_build_object('desde', v_d::timestamp at time zone 'UTC', 'id', v_i));
    end if;
  end loop;
  return jsonb_build_object('filas', v_filas, 'cortada', false, 'ultimo', null);
end;
$$;
revoke all on function public._bandeja_dia_por_vencer(integer, timestamptz, uuid, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_por_vencer(integer, timestamptz, uuid, uuid) to service_role;

create function public._bandeja_dia_llegadas(p_leer integer, p_desde timestamp with time zone, p_id uuid, p_origen uuid)
  returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  c_lote constant integer := 200; c_tope constant integer := 2000;
  a record; v_hoy date := public._bandeja_dia_hoy();
  v_d date := (p_desde at time zone 'UTC')::date; v_i uuid := p_id; v_ids uuid[]; v_leidas integer := 0; v_filas jsonb := '[]'::jsonb; v_parte jsonb;
begin
  select * into a from public._bandeja_dia_alcance(null, p_origen);
  if cardinality(a.origenes) = 0 or v_hoy is null then
    return jsonb_build_object('filas', '[]'::jsonb, 'cortada', false, 'ultimo', null);
  end if;
  loop
    if v_i is null then
      v_ids := array(select x.id from (
        -- Lo propio (sin embarque): transportes_llegadas_idx (eta_el, id) where sin arribo, de un vehículo y con ETA, hacia atrás desde hoy.
        (select t.id, t.eta_el as eta from public.transportes t
          where t.arribo_el is null and t.vehiculo_id is not null and t.eta_el is not null and t.eta_el <= v_hoy
          order by t.eta_el desc, t.id desc limit c_lote)
        union all
        -- El embarque directo: embarques_llegadas_idx → transportes_embarque_idx.
        (select t.id, e.eta_el from public.embarques e join public.transportes t on t.embarque_id = e.id
          where e.arribo_el is null and e.eta_el is not null and e.eta_el <= v_hoy and t.vehiculo_id is not null
          order by e.eta_el desc, t.id desc limit c_lote)
        union all
        -- El embarque por su contenedor: embarques_llegadas_idx → contenedores_embarque_idx → transportes_contenedor_id_idx.
        (select t.id, e.eta_el from public.embarques e join public.contenedores c on c.embarque_id = e.id
           join public.transportes t on t.contenedor_id = c.id
          where e.arribo_el is null and e.eta_el is not null and e.eta_el <= v_hoy and t.vehiculo_id is not null
          order by e.eta_el desc, t.id desc limit c_lote)
      ) x order by x.eta desc, x.id desc limit c_lote);
    else
      v_ids := array(select x.id from (
        (select t.id, t.eta_el as eta from public.transportes t
          where t.arribo_el is null and t.vehiculo_id is not null and t.eta_el is not null and t.eta_el <= v_hoy
            and (t.eta_el, t.id) < (v_d, v_i)
          order by t.eta_el desc, t.id desc limit c_lote)
        union all
        (select t.id, e.eta_el from public.embarques e join public.transportes t on t.embarque_id = e.id
          where e.arribo_el is null and e.eta_el is not null and e.eta_el <= v_hoy and e.eta_el <= v_d and t.vehiculo_id is not null
            and (e.eta_el, t.id) < (v_d, v_i)
          order by e.eta_el desc, t.id desc limit c_lote)
        union all
        (select t.id, e.eta_el from public.embarques e join public.contenedores c on c.embarque_id = e.id
           join public.transportes t on t.contenedor_id = c.id
          where e.arribo_el is null and e.eta_el is not null and e.eta_el <= v_hoy and e.eta_el <= v_d and t.vehiculo_id is not null
            and (e.eta_el, t.id) < (v_d, v_i)
          order by e.eta_el desc, t.id desc limit c_lote)
      ) x order by x.eta desc, x.id desc limit c_lote);
    end if;
    exit when cardinality(v_ids) = 0;
    v_leidas := v_leidas + cardinality(v_ids);
    select r.eta_el, r.id into v_d, v_i from public.transportes_con_embarque r where r.id = any (v_ids) order by r.eta_el, r.id limit 1;
    select coalesce(jsonb_agg(jsonb_build_object('vehiculo_id', v.id, 'origen_id', v.origen_id, 'titulo', v.titulo, 'fase', f.nombre,
             'eta_el', r.eta_el, 'contenedor', r.contenedor, 'clave_desde', r.eta_el::timestamp at time zone 'UTC', 'clave_id', r.id)
             order by r.eta_el desc, r.id desc), '[]'::jsonb)
      into v_parte
      from public.transportes_con_embarque r
      join public.vehiculos v on v.id = r.vehiculo_id
      join public.fases f on f.id = v.fase_id
     where r.id = any (v_ids) and not f.es_final and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.origen_id = any (a.origenes)
       and (v.origen_id = any (a.todos) or v.id in (select p from unnest(a.propios) p));
    v_filas := v_filas || v_parte;
    if jsonb_array_length(v_filas) >= p_leer then
      return jsonb_build_object('filas', public._bandeja_dia_recortar(v_filas, p_leer), 'cortada', false, 'ultimo', null);
    end if;
    exit when cardinality(v_ids) < c_lote;
    if v_leidas >= c_tope then
      return jsonb_build_object('filas', v_filas, 'cortada', true,
                                'ultimo', jsonb_build_object('desde', v_d::timestamp at time zone 'UTC', 'id', v_i));
    end if;
  end loop;
  return jsonb_build_object('filas', v_filas, 'cortada', false, 'ultimo', null);
end;
$$;
revoke all on function public._bandeja_dia_llegadas(integer, timestamptz, uuid, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_llegadas(integer, timestamptz, uuid, uuid) to service_role;

create function public._bandeja_dia_salidas(p_leer integer, p_desde timestamp with time zone, p_id uuid, p_origen uuid)
  returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  c_lote constant integer := 200; c_tope constant integer := 2000;
  a record; v_hoy date := public._bandeja_dia_hoy();
  v_i uuid := p_id; v_ids uuid[]; v_leidas integer := 0; v_filas jsonb := '[]'::jsonb; v_parte jsonb;
begin
  select * into a from public._bandeja_dia_alcance(null, p_origen);
  if cardinality(a.origenes) = 0 or v_hoy is null then
    return jsonb_build_object('filas', '[]'::jsonb, 'cortada', false, 'ultimo', null);
  end if;
  loop
    if v_i is null then
      v_ids := array(select x.id from (
        -- Lo propio: transportes_salidas_idx (zarpe_el, id) where de un vehículo y con zarpe, el día de hoy.
        (select t.id from public.transportes t where t.vehiculo_id is not null and t.zarpe_el = v_hoy order by t.id limit c_lote)
        union all
        -- El embarque directo: embarques_salidas_idx → transportes_embarque_idx.
        (select t.id from public.embarques e join public.transportes t on t.embarque_id = e.id
          where e.zarpe_el = v_hoy and t.vehiculo_id is not null order by t.id limit c_lote)
        union all
        -- El embarque por su contenedor: embarques_salidas_idx → contenedores_embarque_idx → transportes_contenedor_id_idx.
        (select t.id from public.embarques e join public.contenedores c on c.embarque_id = e.id join public.transportes t on t.contenedor_id = c.id
          where e.zarpe_el = v_hoy and t.vehiculo_id is not null order by t.id limit c_lote)
      ) x order by x.id limit c_lote);
    else
      v_ids := array(select x.id from (
        (select t.id from public.transportes t where t.vehiculo_id is not null and t.zarpe_el = v_hoy and t.id > v_i order by t.id limit c_lote)
        union all
        (select t.id from public.embarques e join public.transportes t on t.embarque_id = e.id
          where e.zarpe_el = v_hoy and t.vehiculo_id is not null and t.id > v_i order by t.id limit c_lote)
        union all
        (select t.id from public.embarques e join public.contenedores c on c.embarque_id = e.id join public.transportes t on t.contenedor_id = c.id
          where e.zarpe_el = v_hoy and t.vehiculo_id is not null and t.id > v_i order by t.id limit c_lote)
      ) x order by x.id limit c_lote);
    end if;
    exit when cardinality(v_ids) = 0;
    v_leidas := v_leidas + cardinality(v_ids);
    select x into v_i from unnest(v_ids) x order by x desc limit 1;
    select coalesce(jsonb_agg(jsonb_build_object('vehiculo_id', v.id, 'origen_id', v.origen_id, 'titulo', v.titulo, 'fase', f.nombre,
             'zarpe_el', r.zarpe_el, 'booking', r.booking, 'contenedor', r.contenedor,
             'clave_desde', r.zarpe_el::timestamp at time zone 'UTC', 'clave_id', r.id) order by r.id), '[]'::jsonb)
      into v_parte
      from public.transportes_con_embarque r
      join public.vehiculos v on v.id = r.vehiculo_id
      left join public.fases f on f.id = v.fase_id
     where r.id = any (v_ids) and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.origen_id = any (a.origenes)
       and (v.origen_id = any (a.todos) or v.id in (select p from unnest(a.propios) p));
    v_filas := v_filas || v_parte;
    if jsonb_array_length(v_filas) >= p_leer then
      return jsonb_build_object('filas', public._bandeja_dia_recortar(v_filas, p_leer), 'cortada', false, 'ultimo', null);
    end if;
    exit when cardinality(v_ids) < c_lote;
    if v_leidas >= c_tope then
      return jsonb_build_object('filas', v_filas, 'cortada', true,
                                'ultimo', jsonb_build_object('desde', v_hoy::timestamp at time zone 'UTC', 'id', v_i));
    end if;
  end loop;
  return jsonb_build_object('filas', v_filas, 'cortada', false, 'ultimo', null);
end;
$$;
revoke all on function public._bandeja_dia_salidas(integer, timestamptz, uuid, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_salidas(integer, timestamptz, uuid, uuid) to service_role;

create function "public"."_bandeja_dia_sin_resolver"("p_leer" integer, "p_desde" timestamp with time zone, "p_id" "uuid", "p_origen" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  a record; o uuid; v_filas jsonb := '[]'::jsonb; v_parte jsonb;
begin
  select * into a from public._bandeja_dia_alcance(null, p_origen);
  foreach o in array a.todos loop
    if p_desde is null then
      -- vehiculos_situacion_idx (origen_id, situacion, creado_en desc, id desc), recorrido hacia atrás.
      select coalesce(jsonb_agg(jsonb_build_object('vehiculo_id', y.id, 'origen_id', o, 'titulo', y.titulo, 'creado_en', y.creado_en,
               'clave_desde', y.creado_en, 'clave_id', y.id) order by y.creado_en, y.id), '[]'::jsonb)
        into v_parte
        from (select v.id, v.titulo, v.creado_en from public.vehiculos v
               where v.origen_id = o and v.situacion = 'sin_resolver' and v.eliminado_en is null
               order by v.creado_en, v.id limit p_leer) y;
    else
      select coalesce(jsonb_agg(jsonb_build_object('vehiculo_id', y.id, 'origen_id', o, 'titulo', y.titulo, 'creado_en', y.creado_en,
               'clave_desde', y.creado_en, 'clave_id', y.id) order by y.creado_en, y.id), '[]'::jsonb)
        into v_parte
        from (select v.id, v.titulo, v.creado_en from public.vehiculos v
               where v.origen_id = o and v.situacion = 'sin_resolver' and v.eliminado_en is null and (v.creado_en, v.id) > (p_desde, p_id)
               order by v.creado_en, v.id limit p_leer) y;
    end if;
    v_filas := v_filas || v_parte;
  end loop;
  if cardinality(a.propios) > 0 then
    select coalesce(jsonb_agg(jsonb_build_object('vehiculo_id', y.id, 'origen_id', y.origen_id, 'titulo', y.titulo, 'creado_en', y.creado_en,
             'clave_desde', y.creado_en, 'clave_id', y.id) order by y.creado_en, y.id), '[]'::jsonb)
      into v_parte
      from (select v.id, v.titulo, v.origen_id, v.creado_en
              from unnest(a.propios) as u(id)
              join public.vehiculos v on v.id = u.id
             where v.situacion = 'sin_resolver' and v.eliminado_en is null and v.origen_id = any (a.origenes) and v.origen_id <> all (a.todos)
               and (p_desde is null or (v.creado_en, v.id) > (p_desde, p_id))
             order by v.creado_en, v.id limit p_leer) y;
    v_filas := v_filas || v_parte;
  end if;
  select coalesce(jsonb_agg(z.e order by (z.e ->> 'clave_desde')::timestamptz, (z.e ->> 'clave_id')::uuid), '[]'::jsonb) into v_parte
    from (select e from jsonb_array_elements(v_filas) e
           order by (e ->> 'clave_desde')::timestamptz, (e ->> 'clave_id')::uuid limit p_leer) z;
  return jsonb_build_object('filas', v_parte, 'cortada', false, 'ultimo', null);
end;
$$;
revoke all on function public._bandeja_dia_sin_resolver(integer, timestamptz, uuid, uuid) from public, anon, authenticated;
grant execute on function public._bandeja_dia_sin_resolver(integer, timestamptz, uuid, uuid) to service_role;

create function public.logistica_bandeja_grupo(
  p_grupo text,
  p_origen uuid,
  p_tope integer default 20,
  p_conteo integer default null,
  p_desde timestamptz default null,
  p_id uuid default null
) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_n integer := public._acotar_pagina(p_tope, 20, 50);
  v_c integer := case when p_conteo is null or p_desde is not null then null else public._acotar_pagina(p_conteo, 100, 100) end;
  v_leer integer;
  r jsonb; v_leidas integer; v_cortada boolean; v_siguiente jsonb := null;
begin
  v_leer := greatest(v_n, coalesce(v_c, 0)) + 1;
  if p_grupo is null or p_grupo not in ('demorados', 'trabados', 'por_aprobar', 'por_vencer', 'llegadas', 'salidas', 'sin_resolver') then
    raise exception 'Ese grupo de la bandeja no existe.' using errcode = '22023', hint = 'p_grupo';
  end if;
  if p_origen is null then
    raise exception 'La bandeja del día es de un origen.' using errcode = '22023', hint = 'p_origen';
  end if;
  if (p_desde is null) <> (p_id is null) then
    raise exception 'El cursor del grupo no es válido.' using errcode = '22023', hint = 'cursor';
  end if;
  if (select auth.uid()) is null then
    return jsonb_build_object('filas', '[]'::jsonb, 'hay_mas', false, 'siguiente', null, 'cortada', false, 'conteo', null);
  end if;
  r := case p_grupo
    when 'demorados' then public._bandeja_dia_demorados(v_leer, p_desde, p_id, p_origen)
    when 'trabados' then public._bandeja_dia_trabados(v_leer, p_desde, p_id, p_origen)
    when 'por_aprobar' then public._bandeja_dia_por_aprobar(v_leer, p_desde, p_id, p_origen)
    when 'por_vencer' then public._bandeja_dia_por_vencer(v_leer, p_desde, p_id, p_origen)
    when 'llegadas' then public._bandeja_dia_llegadas(v_leer, p_desde, p_id, p_origen)
    when 'salidas' then public._bandeja_dia_salidas(v_leer, p_desde, p_id, p_origen)
    else public._bandeja_dia_sin_resolver(v_leer, p_desde, p_id, p_origen)
  end;
  v_leidas := jsonb_array_length(r -> 'filas');
  v_cortada := coalesce((r ->> 'cortada')::boolean, false);
  if v_leidas > v_n then
    v_siguiente := jsonb_build_object('desde', r -> 'filas' -> (v_n - 1) -> 'clave_desde', 'id', r -> 'filas' -> (v_n - 1) -> 'clave_id');
  elsif v_cortada then
    v_siguiente := r -> 'ultimo';
  end if;
  return jsonb_build_object(
    'filas', (select coalesce(jsonb_agg(z.e - 'clave_desde' - 'clave_id' order by z.i), '[]'::jsonb)
                from jsonb_array_elements(r -> 'filas') with ordinality z(e, i) where z.i <= v_n),
    'hay_mas', v_leidas > v_n,
    'siguiente', v_siguiente,
    'cortada', v_cortada and v_leidas <= v_n,
    'conteo', case when v_c is null then null
                   else jsonb_build_object('n', least(v_leidas, v_c), 'hay_mas', v_leidas > v_c or v_cortada) end);
end;
$$;

comment on function public.logistica_bandeja_grupo(text, uuid, integer, integer, timestamptz, uuid) is
  'Un grupo de la bandeja del día de logística de un origen (p_origen, obligatorio: 22023 hint p_origen) (demorados, trabados, por_aprobar, por_vencer, llegadas, salidas, sin_resolver): {filas, hay_mas, siguiente: {desde, id} | null, cortada, conteo: {n, hay_mas} | null}. Por cursor (p_desde, p_id; los dos o ninguno), _acotar_pagina(p_tope, 20, 50); el conteo (hasta p_conteo, 100) sólo sin cursor. Lo de ese origen si quien mira lo ve (el menor de logistica.ver y vehiculos.ver; por_aprobar además logistica.documentos.aprobar, por_vencer además logistica.documentos.subir); con «propios», lo suyo y lo de su cartera. Sin las no ganadas ni la papelera. cortada = la base paró de recorrer (trabados: 200 evaluadas; documentos y transportes: 2.000 leídas) y siguiente dice por dónde seguir. Grupo inválido 22023 hint p_grupo; cursor a medias 22023 hint cursor.';

revoke all on function public.logistica_bandeja_grupo(text, uuid, integer, integer, timestamptz, uuid) from public, anon;
grant execute on function public.logistica_bandeja_grupo(text, uuid, integer, integer, timestamptz, uuid) to authenticated, service_role;
