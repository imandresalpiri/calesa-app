-- La pestaña Embarques es de un origen (docs/DECISIONES.md › «Logística siempre en un origen, el último que usaste»): `transporte_grupos` pide
-- `p_origen` y junta por clave sólo los embarques (o contenedores) de ese origen. La sonda de la clave siguiente va por un índice nuevo que empieza
-- por el origen (embarques_origen_booking_idx, contenedores_origen_numero_idx); las filas de una clave, por el índice único (booking o número,
-- origen_id) de siempre. El grupo de una clave (`transporte_grupo`, el panel, y `transporte_grupo_aplicar`) sigue entre orígenes: llama al ayudante
-- sin origen (su default nulo).
-- Las firmas viejas se borran: con las dos, PostgREST tendría dos funciones.

create index embarques_origen_booking_idx on public.embarques (origen_id, booking);
create index contenedores_origen_numero_idx on public.contenedores (origen_id, numero);

drop function public.transporte_grupos(text, text, integer, jsonb);
drop function public._transporte_de_la_clave(text, text);

-- Las unidades vivas de una clave (hasta 201), con lo que ven, de un origen (nulo: de todos). Por booking, las de cada embarque de la clave
-- (embarques_booking_origen_key → transportes_embarque_idx, y → contenedores_embarque_idx → transportes_contenedor_id_idx); por contenedor, las de
-- cada contenedor de la clave (contenedores_numero_origen_key → transportes_contenedor_id_idx). El origen filtra las filas de una clave: a lo
-- sumo una por origen. Cada ruta con su `limit 201`.
create function public._transporte_de_la_clave(p_tipo text, p_clave text, p_origen uuid default null)
  returns table (transporte_id uuid, vehiculo_id uuid, repuesto_id uuid, naviera_id uuid, puerto_origen_id uuid, puerto_destino_id uuid,
                 zarpe_el date, eta_el date, arribo_el date)
  language plpgsql stable security definer
  set search_path = ''
as $$
begin
  if p_tipo = 'booking' then
    return query
      select x.* from (
        (select t.id, t.vehiculo_id, t.repuesto_id, e.naviera_id, e.puerto_origen_id, e.puerto_destino_id, e.zarpe_el, e.eta_el, e.arribo_el
           from public.embarques e join public.transportes t on t.embarque_id = e.id
          where e.booking = p_clave and (p_origen is null or e.origen_id = p_origen)
            and (exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)
                 or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null))
          limit 201)
        union all
        (select t.id, t.vehiculo_id, t.repuesto_id, e.naviera_id, e.puerto_origen_id, e.puerto_destino_id, e.zarpe_el, e.eta_el, e.arribo_el
           from public.embarques e join public.contenedores c on c.embarque_id = e.id join public.transportes t on t.contenedor_id = c.id
          where e.booking = p_clave and (p_origen is null or e.origen_id = p_origen)
            and (exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)
                 or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null))
          limit 201)
      ) x
      limit 201;
  else
    return query
      select t.id, t.vehiculo_id, t.repuesto_id,
             case when e.id is null then t.naviera_id else e.naviera_id end,
             case when e.id is null then t.puerto_origen_id else e.puerto_origen_id end,
             case when e.id is null then t.puerto_destino_id else e.puerto_destino_id end,
             case when e.id is null then t.zarpe_el else e.zarpe_el end,
             case when e.id is null then t.eta_el else e.eta_el end,
             case when e.id is null then t.arribo_el else e.arribo_el end
        from public.contenedores c
        join public.transportes t on t.contenedor_id = c.id
        left join public.embarques e on e.id = c.embarque_id
       where c.numero = p_clave and (p_origen is null or c.origen_id = p_origen)
         and (exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)
              or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null))
       limit 201;
  end if;
end;
$$;
comment on function public._transporte_de_la_clave(text, text, uuid) is
  'Las unidades vivas (hasta 201) de un booking o un contenedor de un origen (p_origen nulo: entre orígenes), con la naviera, los puertos y las fechas que ven.';
revoke all on function public._transporte_de_la_clave(text, text, uuid) from public, anon, authenticated;
grant execute on function public._transporte_de_la_clave(text, text, uuid) to service_role;

create function public.transporte_grupos(p_tipo text, p_desde text, p_tope integer, p_filtros jsonb, p_origen uuid)
  returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  -- TAMANO_DE_PAGINA_POR_DEFECTO (50), máximo 100.
  v_tope integer := public._acotar_pagina(p_tope, 50, 100);
  -- D35 · a lo sumo 2.000 unidades por llamada; cada clave suma al menos 1 (también la que sólo tiene unidades en la papelera o ninguna).
  v_recorrido constant integer := 2000;
  v_yo uuid := (select auth.uid());
  f record;
  v_todos uuid[]; v_algun uuid[]; v_repuestos boolean;
  v_ge text; v_gt text; v_k text;
  g record;
  v_mirado integer := 0; v_n integer := 0;
  v_grupos jsonb := '[]'::jsonb; v_ultima text; v_siguiente text; v_cortada boolean := false; v_desde uuid;
  v_varios text[];
begin
  perform public.assert_activo();
  -- C17 · el tipo aquí, no con _transporte_clave: esa función lanza con la clave nula y el cursor vacío es válido.
  if p_tipo is null or p_tipo not in ('booking', 'contenedor') then
    raise exception 'El grupo es por booking o por contenedor.' using errcode = '22023', hint = 'tipo';
  end if;
  if not (public.tiene_permiso('logistica.ver') or public.tiene_permiso('repuestos.ver')) then
    raise exception 'No tienes permiso para ver la logística.' using errcode = '42501';
  end if;
  if p_origen is null then
    raise exception 'Los embarques son de un origen.' using errcode = '22023', hint = 'p_origen';
  end if;
  select * into f from public._transporte_grupos_filtros(p_filtros);
  -- D37 · la visibilidad resuelta una vez: los orígenes de logistica.ver (lo de puede_vehiculo) y repuestos.ver (lo de puede_repuesto).
  v_todos := public.origenes_con_alcance('logistica.ver', 'todos');
  v_algun := public.origenes_con_alcance('logistica.ver', 'propios');
  v_repuestos := public.tiene_permiso('repuestos.ver');
  -- C18, C23 · la clave siguiente es min(clave) con clave >= prefijo y clave > la última mirada ('' = desde el principio: ninguna clave es vacía).
  v_ge := coalesce(f.prefijo, '');
  -- D43 · el cursor es el id de un embarque (o contenedor) con la última clave (la `siguiente` de la página anterior), no la clave: una clave sólo
  -- de unidades que quien llama no ve nunca sale. Se resuelve por la PK; si ya no existe, la lista vuelve a empezar.
  v_gt := '';
  if nullif(btrim(p_desde), '') is not null then
    if not pg_input_is_valid(btrim(p_desde), 'uuid') then
      raise exception 'El cursor de la lista no se entiende.' using errcode = '22023', hint = 'cursor';
    end if;
    v_desde := btrim(p_desde)::uuid;
    if p_tipo = 'booking' then
      select e.booking into v_gt from public.embarques e where e.id = v_desde and e.origen_id = p_origen;  -- embarques_pkey
    else
      select c.numero into v_gt from public.contenedores c where c.id = v_desde and c.origen_id = p_origen;  -- contenedores_pkey
    end if;
    if v_gt is null then
      raise exception 'La lista cambió: vuelve a empezar.' using errcode = '22023', hint = 'cursor';
    end if;
  end if;
  loop
    -- Una sonda por el índice del origen de su tipo: embarques_origen_booking_idx o contenedores_origen_numero_idx.
    if p_tipo = 'booking' then
      select min(e.booking) into v_k from public.embarques e where e.origen_id = p_origen and e.booking >= v_ge and e.booking > v_gt;
    else
      select min(c.numero) into v_k from public.contenedores c where c.origen_id = p_origen and c.numero >= v_ge and c.numero > v_gt;
    end if;
    -- Índice agotado, o fuera del bloque del prefijo.
    exit when v_k is null or (f.prefijo is not null and not starts_with(v_k, f.prefijo));
    -- C19–C22 · por grupo, sobre las unidades que se ven: cuántas, si alguna cumple los filtros (D36) y cada dato común o «varios».
    select count(*)::integer as filas,
           count(*) filter (where r.visible)::integer as unidades,
           coalesce(bool_or(not r.visible), false) as ocultas,
           coalesce(bool_or(r.visible
                            and (f.naviera is null or r.naviera_id = f.naviera)
                            and (f.puerto_origen is null or r.puerto_origen_id = f.puerto_origen)
                            and (f.puerto_destino is null or r.puerto_destino_id = f.puerto_destino)
                            and (f.en_transito is null or (r.arribo_el is null) = f.en_transito)), false) as cumple,
           count(distinct coalesce(r.naviera_id::text, '')) filter (where r.visible) as d_naviera, min(r.naviera_id::text) filter (where r.visible) as naviera,
           count(distinct coalesce(r.puerto_origen_id::text, '')) filter (where r.visible) as d_po, min(r.puerto_origen_id::text) filter (where r.visible) as po,
           count(distinct coalesce(r.puerto_destino_id::text, '')) filter (where r.visible) as d_pd, min(r.puerto_destino_id::text) filter (where r.visible) as pd,
           count(distinct coalesce(r.zarpe_el::text, '')) filter (where r.visible) as d_zarpe, min(r.zarpe_el) filter (where r.visible) as zarpe,
           count(distinct coalesce(r.eta_el::text, '')) filter (where r.visible) as d_eta, min(r.eta_el) filter (where r.visible) as eta,
           count(distinct coalesce(r.arribo_el::text, '')) filter (where r.visible) as d_arribo, min(r.arribo_el) filter (where r.visible) as arribo
      into g
      from (select x.*,
                   coalesce(case when x.vehiculo_id is not null
                                 then v.origen_id = any (v_algun)
                                      and (v.origen_id = any (v_todos) or v.creado_por = v_yo or (v.lead_id is not null and public.en_cartera(v.lead_id)))
                                 else v_repuestos end, false) as visible
              from public._transporte_de_la_clave(p_tipo, v_k, p_origen) x
              left join public.vehiculos v on v.id = x.vehiculo_id) r;
    v_mirado := v_mirado + greatest(g.filas, 1);
    if g.unidades > 0 and g.cumple then
      -- C24 · con la página llena, éste es el que dice que hay otra: la siguiente empieza después del último devuelto.
      if v_n = v_tope then
        v_siguiente := v_ultima;
        exit;
      end if;
      v_varios := array_remove(array[
        case when g.d_naviera > 1 then 'naviera_id' end, case when g.d_po > 1 then 'puerto_origen_id' end,
        case when g.d_pd > 1 then 'puerto_destino_id' end, case when g.d_zarpe > 1 then 'zarpe_el' end,
        case when g.d_eta > 1 then 'eta_el' end, case when g.d_arribo > 1 then 'arribo_el' end], null);
      v_grupos := v_grupos || jsonb_build_object(
        'clave', v_k, 'unidades', least(g.unidades, 200), 'hay_mas', g.filas > 200, 'hay_ocultas', g.ocultas,
        'naviera_id', case when g.d_naviera = 1 then g.naviera::uuid end,
        'puerto_origen_id', case when g.d_po = 1 then g.po::uuid end,
        'puerto_destino_id', case when g.d_pd = 1 then g.pd::uuid end,
        'zarpe_el', case when g.d_zarpe = 1 then g.zarpe end,
        'eta_el', case when g.d_eta = 1 then g.eta end,
        'arribo_el', case when g.d_arribo = 1 then g.arribo end,
        'varios', to_jsonb(v_varios));
      v_n := v_n + 1;
      v_ultima := v_k;
    end if;
    v_gt := v_k;
    -- D35 · el recorrido, mirado al cerrar cada grupo. Con la página llena, no se sabe si hay otra: se sigue desde el último devuelto. Si no, se
    -- sigue desde la última clave mirada y `cortada` le dice a la pantalla que ofrezca «Seguir buscando».
    if v_mirado >= v_recorrido then
      if v_n = v_tope then
        v_siguiente := v_ultima;
      else
        v_siguiente := v_k;
        v_cortada := true;
      end if;
      exit;
    end if;
  end loop;
  -- D43 · `siguiente` sale como el id de un embarque (o contenedor) con esa clave, por el mismo índice único.
  if v_siguiente is not null then
    if p_tipo = 'booking' then
      select e.id::text into v_siguiente from public.embarques e where e.booking = v_siguiente and e.origen_id = p_origen limit 1;
    else
      select c.id::text into v_siguiente from public.contenedores c where c.numero = v_siguiente and c.origen_id = p_origen limit 1;
    end if;
  end if;
  return jsonb_build_object('tipo', p_tipo, 'grupos', v_grupos, 'siguiente', v_siguiente, 'cortada', v_cortada);
end;
$$;
comment on function public.transporte_grupos(text, text, integer, jsonb, uuid) is
  'Los grupos de transporte de un origen (p_origen, obligatorio: 22023 hint p_origen; p_tipo booking o contenedor) por cursor sobre la clave, con filtros naviera, puerto_origen, puerto_destino, en_transito y prefijo (6.07-3). Devuelve {tipo, grupos, siguiente, cortada}: por grupo clave, unidades que quien mira ve (hasta 200), hay_mas, hay_ocultas, naviera, puertos y fechas comunes y varios con las que difieren. siguiente es opaco (el id de una fila del origen, D43): se pasa tal cual como p_desde. Mira a lo sumo 2.000 filas por llamada; cortada si paró por eso antes de llenar la página. Pide logistica.ver o repuestos.ver.';
revoke all on function public.transporte_grupos(text, text, integer, jsonb, uuid) from public, anon;
grant execute on function public.transporte_grupos(text, text, integer, jsonb, uuid) to authenticated, service_role;
