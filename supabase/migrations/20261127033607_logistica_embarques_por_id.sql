-- Embarques y contenedores por su id (docs/DECISIONES.md › «Embarques y contenedores por su id»): la lista de la pestaña Embarques lee las
-- entidades del origen (también las vacías) con su estado calculado, sus conteos con tope y cuántos vehículos tienen algo que falta; la página
-- de un embarque y el drawer de un contenedor leen la entidad por su clave primaria, con sus contenedores y sus vehículos (y la declaración de
-- cada uno) en la misma lectura. Las unidades de un embarque o un contenedor, para el lote, los documentos y el prorrateo, salen por su id.
-- Ninguna tabla nueva: alcanzan los índices de las entidades (embarques_origen_booking_idx, contenedores_origen_numero_idx,
-- contenedores_embarque_idx, transportes_embarque_idx, transportes_contenedor_id_idx, declaraciones_vehiculo_activo_unico).

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 1. Ayudantes: los filtros de las dos listas, «algo que falta» de un vehículo y de una entidad.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

-- Los filtros de embarques_listar y contenedores_listar: `estado` (los del embarque; en contenedores, también sin_embarque), `naviera`,
-- `puerto_origen`, `puerto_destino` (sólo embarques) y `prefijo` (3 letras o dígitos seguidos, sin espacios y en mayúsculas). Otra clave o un
-- valor mal escrito: 22023 con la clave en el hint.
create function public._embarques_filtros(p_filtros jsonb, p_contenedores boolean,
  out estado text, out naviera uuid, out puerto_origen uuid, out puerto_destino uuid, out prefijo text)
  language plpgsql stable
  set search_path = ''
as $$
declare k text; v jsonb;
begin
  if p_filtros is null or p_filtros = '{}'::jsonb then
    return;
  end if;
  if jsonb_typeof(p_filtros) <> 'object' then
    raise exception 'Los filtros no se entienden.' using errcode = '22023', hint = 'filtros';
  end if;
  for k in select x from jsonb_object_keys(p_filtros) x order by x loop
    v := p_filtros -> k;
    if k = 'estado' then
      if jsonb_typeof(v) <> 'string'
         or not (v #>> '{}') = any (case when p_contenedores
                                         then array['armandose', 'en_transito', 'llego', 'entregado', 'sin_embarque']
                                         else array['armandose', 'en_transito', 'llego', 'entregado'] end) then
        raise exception 'Ese estado no existe.' using errcode = '22023', hint = k;
      end if;
      estado := v #>> '{}';
    elsif k in ('naviera', 'puerto_origen', 'puerto_destino') and not p_contenedores then
      if jsonb_typeof(v) <> 'string' or not pg_input_is_valid(v #>> '{}', 'uuid') then
        raise exception 'El filtro «%» no tiene un valor válido.', k using errcode = '22023', hint = k;
      end if;
      if k = 'naviera' then
        naviera := (v #>> '{}')::uuid;
      elsif k = 'puerto_origen' then
        puerto_origen := (v #>> '{}')::uuid;
      else
        puerto_destino := (v #>> '{}')::uuid;
      end if;
    elsif k = 'prefijo' then
      prefijo := case when jsonb_typeof(v) = 'string' then left(upper(regexp_replace(v #>> '{}', '\s', '', 'g')), 40) end;
      if prefijo is null or prefijo !~ '[A-Z0-9]{3}' then
        raise exception 'Escribe al menos 3 letras o dígitos.' using errcode = '22023', hint = k;
      end if;
    else
      raise exception 'No se filtra por «%».', k using errcode = '22023', hint = k;
    end if;
  end loop;
end;
$$;
comment on function public._embarques_filtros(jsonb, boolean) is
  'Lee los filtros de embarques_listar (estado, naviera, puerto_origen, puerto_destino, prefijo) y de contenedores_listar (estado con sin_embarque, prefijo); otra clave o un valor mal escrito da 22023 con la clave en el hint.';
revoke all on function public._embarques_filtros(jsonb, boolean) from public, anon, authenticated;
grant execute on function public._embarques_filtros(jsonb, boolean) to service_role;

-- «Algo que falta» (docs/GLOSARIO.md): el criterio de «Trabados» de la bandeja del día. La fase siguiente activa de la fase del vehículo (la
-- primera por orden entre sus transiciones) y algún requisito bloqueante de ella sin cumplir. Sin fase o sin fase siguiente, no le falta nada.
create function public._vehiculo_le_falta(p_vehiculo uuid) returns boolean
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_fase uuid; v_sig uuid;
begin
  select v.fase_id into v_fase from public.vehiculos v where v.id = p_vehiculo;                                         -- vehiculos_pkey
  if v_fase is null then
    return false;
  end if;
  select f.id into v_sig
    from public.fases_transiciones t join public.fases f on f.id = t.a_fase_id
   where t.de_fase_id = v_fase and f.activa
   order by f.orden, f.id limit 1;
  if v_sig is null then
    return false;
  end if;
  return exists (select 1 from public.evaluar_requisitos(p_vehiculo, null, v_sig) q where q.bloqueante and not q.cumplido);
end;
$$;
comment on function public._vehiculo_le_falta(uuid) is
  'Si al vehículo le falta algo para su fase siguiente (la primera activa por orden entre sus transiciones): algún requisito bloqueante sin cumplir. El criterio de «Trabados».';
revoke all on function public._vehiculo_le_falta(uuid) from public, anon, authenticated;
grant execute on function public._vehiculo_le_falta(uuid) to service_role;

-- Cuántos de los vehículos visibles de un embarque o un contenedor tienen algo que falta, evaluando a lo sumo `p_tope` (el presupuesto de la
-- lista: 200 evaluaciones por llamada repartidas entre sus filas). `hay_mas`: había más visibles que los evaluados.
create function public._faltan_de(p_embarque uuid, p_contenedor uuid, p_tope integer) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare u record; v_k integer := 0; v_n integer := 0; v_mas boolean := false;
begin
  for u in
    select x.vehiculo_id from public._unidades_de(p_embarque, p_contenedor) x where x.vehiculo_id is not null limit 1000
  loop
    continue when not public.puede_vehiculo(u.vehiculo_id, 'logistica.ver');
    if v_k >= p_tope then
      v_mas := true;
      exit;
    end if;
    v_k := v_k + 1;
    if public._vehiculo_le_falta(u.vehiculo_id) then
      v_n := v_n + 1;
    end if;
  end loop;
  return jsonb_build_object('n', v_n, 'hay_mas', v_mas);
end;
$$;
comment on function public._faltan_de(uuid, uuid, integer) is
  'Cuántos vehículos visibles de un embarque o un contenedor tienen algo que falta para su fase siguiente, evaluando hasta p_tope; hay_mas si quedaron sin evaluar.';
revoke all on function public._faltan_de(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public._faltan_de(uuid, uuid, integer) to service_role;

-- Los vehículos visibles de un embarque (directos y en sus contenedores) o de un contenedor, como los dibuja la página y el drawer: hasta 201
-- (201 = hay más) de las primeras 1.000 unidades, por número de contenedor (los sueltos al final) y título. Por vehículo, su fase con su color,
-- su contenedor, la versión de su fila de transporte, la declaración viva que lo cubre (declaraciones_vehiculo_activo_unico) y si le falta algo.
-- `p_falta`: sólo los que tienen algo que falta.
create function public._vehiculos_de_la_entidad(p_embarque uuid, p_contenedor uuid, p_falta boolean)
  returns table (k bigint, fila jsonb, oculto boolean)
  language sql stable security definer
  set search_path = ''
as $$
  with u as (
    select x.transporte_id, x.vehiculo_id
      from public._unidades_de(p_embarque, p_contenedor) x
     where x.vehiculo_id is not null
     limit 1000
  ), w as (
    select u.transporte_id, u.vehiculo_id, public.puede_vehiculo(u.vehiculo_id, 'logistica.ver') as visible from u
  ), r as (
    select w.vehiculo_id, v.titulo, v.vin, v.lote, v.fase_id, f.nombre as fase, f.color as fase_color, t.contenedor_id, c.numero as contenedor,
           t.actualizado_en, public._vehiculo_le_falta(w.vehiculo_id) as falta
      from w
      join public.vehiculos v on v.id = w.vehiculo_id                                                                  -- vehiculos_pkey
      join public.transportes t on t.id = w.transporte_id                                                              -- transportes_pkey
      left join public.contenedores c on c.id = t.contenedor_id                                                        -- contenedores_pkey
      left join public.fases f on f.id = v.fase_id
     where w.visible
  ), s as (
    select r.*, row_number() over (order by r.contenedor nulls last, r.titulo, r.vehiculo_id) as k
      from r
     where not coalesce(p_falta, false) or r.falta
  )
  select s.k,
         jsonb_build_object('vehiculo_id', s.vehiculo_id, 'titulo', s.titulo, 'vin', s.vin, 'lote', s.lote, 'fase_id', s.fase_id, 'fase', s.fase,
                            'fase_color', s.fase_color, 'contenedor_id', s.contenedor_id, 'contenedor', s.contenedor,
                            'transporte_actualizado_en', s.actualizado_en, 'falta', s.falta,
                            'declaracion', (select jsonb_build_object('id', d.id, 'numero', d.numero)
                                              from public.declaraciones_vehiculos dv
                                              join public.declaraciones_aduana d on d.id = dv.declaracion_id
                                             where dv.vehiculo_id = s.vehiculo_id and dv.removido_en is null)),
         false
    from s
   where s.k <= 201
  union all
  (select null, null, true from w where not w.visible limit 1);
$$;
comment on function public._vehiculos_de_la_entidad(uuid, uuid, boolean) is
  'Los vehículos visibles (hasta 201) de un embarque o un contenedor con su fase, contenedor, versión de su transporte, declaración viva y si le falta algo; una fila con oculto si hay alguno que no se ve.';
revoke all on function public._vehiculos_de_la_entidad(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public._vehiculos_de_la_entidad(uuid, uuid, boolean) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 2. Las listas: embarques y contenedores de un origen, por cursor.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

-- Los embarques de un origen, vacíos incluidos, por booking (embarques_origen_booking_idx; el cursor es el id de uno del origen). El estado es
-- calculado: las fechas descartan primero y embarque_estado confirma. Recorre a lo sumo 500 por llamada: `cortada` si paró sin llenar la página.
create function public.embarques_listar(p_origen uuid, p_desde uuid, p_tope integer, p_filtros jsonb) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  -- TAMANO_DE_PAGINA_POR_DEFECTO (50), máximo 100.
  v_tope integer := public._acotar_pagina(p_tope, 50, 100);
  c_recorrido constant integer := 500;
  -- «Algo que falta»: 200 evaluaciones por llamada, repartidas entre las filas de la página.
  v_por integer;
  f record; e record; v_hoy date; v_gt text := ''; v_estado text; v_vehiculos jsonb;
  v_filas jsonb := '[]'::jsonb; v_n integer := 0; v_mirados integer := 0; v_ultimo uuid; v_mirado uuid; v_siguiente uuid;
  v_cortada boolean := false;
begin
  perform public.assert_activo();
  if p_origen is null then
    raise exception 'Los embarques son de un origen.' using errcode = '22023', hint = 'p_origen';
  end if;
  if public.alcance_de('logistica.ver', p_origen) is null then
    raise exception 'No tienes permiso para ver la logística de este origen.' using errcode = '42501';
  end if;
  select * into f from public._embarques_filtros(p_filtros, false);
  if p_desde is not null then
    select x.booking into v_gt from public.embarques x where x.id = p_desde and x.origen_id = p_origen;                -- embarques_pkey
    if v_gt is null then
      raise exception 'La lista cambió: vuelve a empezar.' using errcode = '22023', hint = 'cursor';
    end if;
  end if;
  -- Un origen cuyo flujo de vehículos no usa la regla transporte no tiene embarques que mostrar (flujos_origen_unico).
  if not exists (select 1 from public.flujos fl
                  where fl.origen_id = p_origen and fl.ambito = 'vehiculos' and public.flujo_regla_activa(fl.id, 'transporte')) then
    return jsonb_build_object('embarques', '[]'::jsonb, 'siguiente', null, 'cortada', false);
  end if;
  v_hoy := coalesce(public._bandeja_dia_hoy(), current_date);
  v_por := greatest(1, 200 / v_tope);
  for e in
    select x.id, x.booking, x.naviera_id, x.puerto_origen_id, x.puerto_destino_id, x.zarpe_estimado_el, x.zarpe_el, x.eta_el, x.arribo_el,
           x.actualizado_en
      from public.embarques x                                                                                           -- embarques_origen_booking_idx
     where x.origen_id = p_origen and x.booking >= coalesce(f.prefijo, '') and x.booking > v_gt
     order by x.booking
     limit c_recorrido + 1
  loop
    exit when f.prefijo is not null and not starts_with(e.booking, f.prefijo);
    if v_mirados = c_recorrido then
      if v_n = v_tope then
        v_siguiente := v_ultimo;
      else
        v_siguiente := v_mirado;
        v_cortada := true;
      end if;
      exit;
    end if;
    v_mirados := v_mirados + 1;
    v_mirado := e.id;
    continue when f.naviera is not null and e.naviera_id is distinct from f.naviera;
    continue when f.puerto_origen is not null and e.puerto_origen_id is distinct from f.puerto_origen;
    continue when f.puerto_destino is not null and e.puerto_destino_id is distinct from f.puerto_destino;
    -- Las fechas descartan sin calcular el estado; «entregado» no se sabe por las fechas.
    continue when f.estado = 'armandose' and not (e.arribo_el is null and (e.zarpe_el is null or e.zarpe_el > v_hoy));
    continue when f.estado = 'en_transito' and not (e.arribo_el is null and e.zarpe_el <= v_hoy);
    continue when f.estado = 'llego' and e.arribo_el is null;
    v_estado := public.embarque_estado(e.id);
    continue when f.estado is not null and v_estado is distinct from f.estado;
    if v_n = v_tope then
      v_siguiente := v_ultimo;
      exit;
    end if;
    v_vehiculos := public._vehiculos_de(e.id, null);
    v_filas := v_filas || jsonb_build_array(jsonb_build_object(
      'id', e.id, 'booking', e.booking, 'naviera_id', e.naviera_id, 'puerto_origen_id', e.puerto_origen_id,
      'puerto_destino_id', e.puerto_destino_id, 'zarpe_estimado_el', e.zarpe_estimado_el, 'zarpe_el', e.zarpe_el, 'eta_el', e.eta_el,
      'arribo_el', e.arribo_el, 'actualizado_en', e.actualizado_en, 'estado', v_estado,
      'contenedores', (select jsonb_build_object('n', least(count(*), 100), 'hay_mas', count(*) > 100)
                         from (select 1 from public.contenedores c where c.embarque_id = e.id limit 101) c),                 -- contenedores_embarque_idx
      'vehiculos', jsonb_build_object('n', v_vehiculos -> 'n', 'hay_mas', v_vehiculos -> 'hay_mas'),
      'hay_ocultos', v_vehiculos -> 'hay_ocultas',
      'faltan', public._faltan_de(e.id, null, v_por)));
    v_n := v_n + 1;
    v_ultimo := e.id;
  end loop;
  return jsonb_build_object('embarques', v_filas, 'siguiente', v_siguiente, 'cortada', v_cortada);
end;
$$;
comment on function public.embarques_listar(uuid, uuid, integer, jsonb) is
  'Los embarques de un origen (p_origen, obligatorio: 22023 hint p_origen; pide logistica.ver en él), vacíos incluidos, por cursor sobre el booking (p_desde: el id de uno del origen), con filtros estado, naviera, puerto_origen, puerto_destino y prefijo. Devuelve {embarques, siguiente, cortada}: por fila sus datos, estado, contenedores y vehiculos {n, hay_mas} (hasta 100, los vehículos que quien mira ve), hay_ocultos y faltan {n, hay_mas} (con 200 evaluaciones por llamada). Recorre a lo sumo 500 embarques; cortada si paró por eso sin llenar la página. Un origen sin la regla transporte: vacío.';
revoke all on function public.embarques_listar(uuid, uuid, integer, jsonb) from public, anon;
grant execute on function public.embarques_listar(uuid, uuid, integer, jsonb) to authenticated, service_role;

-- Los contenedores de un origen, con embarque o sin él, por número (contenedores_origen_numero_idx). Lo mismo que embarques_listar; también lo
-- usa el selector «Elegir uno sin embarque» (estado sin_embarque, de a 10).
create function public.contenedores_listar(p_origen uuid, p_desde uuid, p_tope integer, p_filtros jsonb) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_tope integer := public._acotar_pagina(p_tope, 50, 100);
  c_recorrido constant integer := 500;
  v_por integer;
  f record; c record; m record; v_gt text := ''; v_estado text; v_vehiculos jsonb;
  v_filas jsonb := '[]'::jsonb; v_n integer := 0; v_mirados integer := 0; v_ultimo uuid; v_mirado uuid; v_siguiente uuid;
  v_cortada boolean := false;
begin
  perform public.assert_activo();
  if p_origen is null then
    raise exception 'Los contenedores son de un origen.' using errcode = '22023', hint = 'p_origen';
  end if;
  if public.alcance_de('logistica.ver', p_origen) is null then
    raise exception 'No tienes permiso para ver la logística de este origen.' using errcode = '42501';
  end if;
  select * into f from public._embarques_filtros(p_filtros, true);
  if p_desde is not null then
    select x.numero into v_gt from public.contenedores x where x.id = p_desde and x.origen_id = p_origen;              -- contenedores_pkey
    if v_gt is null then
      raise exception 'La lista cambió: vuelve a empezar.' using errcode = '22023', hint = 'cursor';
    end if;
  end if;
  if not exists (select 1 from public.flujos fl
                  where fl.origen_id = p_origen and fl.ambito = 'vehiculos' and public.flujo_regla_activa(fl.id, 'contenedor')) then
    return jsonb_build_object('contenedores', '[]'::jsonb, 'siguiente', null, 'cortada', false);
  end if;
  v_por := greatest(1, 200 / v_tope);
  for c in
    select x.id, x.numero, x.tipo, x.sello, x.embarque_id, x.actualizado_en
      from public.contenedores x                                                                                        -- contenedores_origen_numero_idx
     where x.origen_id = p_origen and x.numero >= coalesce(f.prefijo, '') and x.numero > v_gt
     order by x.numero
     limit c_recorrido + 1
  loop
    exit when f.prefijo is not null and not starts_with(c.numero, f.prefijo);
    if v_mirados = c_recorrido then
      if v_n = v_tope then
        v_siguiente := v_ultimo;
      else
        v_siguiente := v_mirado;
        v_cortada := true;
      end if;
      exit;
    end if;
    v_mirados := v_mirados + 1;
    v_mirado := c.id;
    continue when f.estado = 'sin_embarque' and c.embarque_id is not null;
    continue when f.estado is not null and f.estado <> 'sin_embarque' and c.embarque_id is null;
    v_estado := public.contenedor_estado(c.id);
    continue when f.estado is not null and v_estado is distinct from f.estado;
    if v_n = v_tope then
      v_siguiente := v_ultimo;
      exit;
    end if;
    m := null;
    if c.embarque_id is not null then
      select x.id, x.booking, x.eta_el into m from public.embarques x where x.id = c.embarque_id;                       -- embarques_pkey
    end if;
    v_vehiculos := public._vehiculos_de(null, c.id);
    v_filas := v_filas || jsonb_build_array(jsonb_build_object(
      'id', c.id, 'numero', c.numero, 'tipo', c.tipo, 'tipo_nombre', (select t.nombre from public.tipos_contenedor t where t.clave = c.tipo),
      'sello', c.sello, 'actualizado_en', c.actualizado_en, 'estado', v_estado,
      'embarque', case when m.id is null then null else jsonb_build_object('id', m.id, 'booking', m.booking) end,
      'eta_el', m.eta_el,
      'vehiculos', jsonb_build_object('n', v_vehiculos -> 'n', 'hay_mas', v_vehiculos -> 'hay_mas'),
      'hay_ocultos', v_vehiculos -> 'hay_ocultas',
      'faltan', public._faltan_de(null, c.id, v_por)));
    v_n := v_n + 1;
    v_ultimo := c.id;
  end loop;
  return jsonb_build_object('contenedores', v_filas, 'siguiente', v_siguiente, 'cortada', v_cortada);
end;
$$;
comment on function public.contenedores_listar(uuid, uuid, integer, jsonb) is
  'Los contenedores de un origen (p_origen, obligatorio; pide logistica.ver en él), con o sin embarque, por cursor sobre el número (p_desde: el id de uno del origen), con filtros estado (también sin_embarque) y prefijo. Devuelve {contenedores, siguiente, cortada}: por fila número, tipo, sello, estado, embarque {id, booking} o nulo, eta_el de su embarque, vehiculos {n, hay_mas}, hay_ocultos y faltan. Recorre a lo sumo 500; un origen sin la regla contenedor: vacío.';
revoke all on function public.contenedores_listar(uuid, uuid, integer, jsonb) from public, anon;
grant execute on function public.contenedores_listar(uuid, uuid, integer, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 3. Un embarque y un contenedor, por su id.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

-- Un embarque con sus contenedores (hasta 100, por número) y sus vehículos visibles (hasta 200), en una lectura por su clave primaria. El que
-- no existe, el de repuestos y el de un origen cuya logística no se ve dan el mismo P0002.
create function public.embarque_leer(p_id uuid, p_falta boolean default false) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare e public.embarques; v_contenedores jsonb; v_mas_cont boolean; v_vehiculos jsonb; v_mas boolean; v_ocultos boolean; v_conteo jsonb;
begin
  perform public.assert_activo();
  select * into e from public.embarques x where x.id = p_id;                                                           -- embarques_pkey
  if e.id is null or e.origen_id is null or public.alcance_de('logistica.ver', e.origen_id) is null then
    raise exception 'El embarque no existe o no lo ves.' using errcode = 'P0002';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', y.id, 'numero', y.numero, 'tipo', y.tipo, 'tipo_nombre', y.tipo_nombre, 'sello', y.sello,
                                               'estado', public.contenedor_estado(y.id), 'actualizado_en', y.actualizado_en)
                            order by y.numero) filter (where y.n <= 100), '[]'::jsonb),
         count(*) > 100
    into v_contenedores, v_mas_cont
    from (select c.id, c.numero, c.tipo, t.nombre as tipo_nombre, c.sello, c.actualizado_en, row_number() over (order by c.numero) as n
            from (select * from public.contenedores c where c.embarque_id = e.id order by c.numero limit 101) c          -- contenedores_embarque_idx
            left join public.tipos_contenedor t on t.clave = c.tipo) y;
  select coalesce(jsonb_agg(x.fila order by x.k) filter (where not x.oculto and x.k <= 200), '[]'::jsonb),
         coalesce(bool_or(not x.oculto and x.k > 200), false), coalesce(bool_or(x.oculto), false)
    into v_vehiculos, v_mas, v_ocultos
    from public._vehiculos_de_la_entidad(e.id, null, p_falta) x;
  v_conteo := public._vehiculos_de(e.id, null);
  return jsonb_build_object(
    'id', e.id, 'origen_id', e.origen_id, 'booking', e.booking, 'naviera_id', e.naviera_id, 'puerto_origen_id', e.puerto_origen_id,
    'puerto_destino_id', e.puerto_destino_id, 'zarpe_estimado_el', e.zarpe_estimado_el, 'zarpe_el', e.zarpe_el, 'eta_el', e.eta_el,
    'arribo_el', e.arribo_el, 'notas', e.notas, 'actualizado_en', e.actualizado_en, 'estado', public.embarque_estado(e.id),
    'contenedores', v_contenedores, 'hay_mas_contenedores', v_mas_cont,
    'vehiculos', v_vehiculos, 'hay_mas', v_mas, 'hay_ocultos', v_ocultos,
    'conteo', jsonb_build_object('n', v_conteo -> 'n', 'hay_mas', v_conteo -> 'hay_mas'),
    'editable', public._embarque_editable(e.id));
end;
$$;
comment on function public.embarque_leer(uuid, boolean) is
  'Un embarque de un origen cuya logística se ve: sus datos, estado, contenedores (hasta 100 por número, hay_mas_contenedores, cada uno con su estado), vehículos visibles (hasta 200, hay_mas; por contenedor, los sueltos al final; con fase, contenedor, versión de su transporte, declaración viva y falta), hay_ocultos, conteo {n, hay_mas} y editable (se pueden editar todas sus unidades). p_falta: sólo los vehículos con algo que falta. El que no existe o no se ve: P0002.';
revoke all on function public.embarque_leer(uuid, boolean) from public, anon;
grant execute on function public.embarque_leer(uuid, boolean) to authenticated, service_role;

-- Un contenedor con su embarque (si tiene) y sus vehículos visibles (hasta 200), por su clave primaria.
create function public.contenedor_leer(p_id uuid) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare c public.contenedores; m public.embarques; v_vehiculos jsonb; v_mas boolean; v_ocultos boolean;
begin
  perform public.assert_activo();
  select * into c from public.contenedores x where x.id = p_id;                                                        -- contenedores_pkey
  if c.id is null or c.origen_id is null or public.alcance_de('logistica.ver', c.origen_id) is null then
    raise exception 'El contenedor no existe o no lo ves.' using errcode = 'P0002';
  end if;
  if c.embarque_id is not null then
    select * into m from public.embarques x where x.id = c.embarque_id;                                                -- embarques_pkey
  end if;
  select coalesce(jsonb_agg(x.fila order by x.k) filter (where not x.oculto and x.k <= 200), '[]'::jsonb),
         coalesce(bool_or(not x.oculto and x.k > 200), false), coalesce(bool_or(x.oculto), false)
    into v_vehiculos, v_mas, v_ocultos
    from public._vehiculos_de_la_entidad(null, c.id, false) x;
  return jsonb_build_object(
    'id', c.id, 'origen_id', c.origen_id, 'numero', c.numero, 'tipo', c.tipo,
    'tipo_nombre', (select t.nombre from public.tipos_contenedor t where t.clave = c.tipo), 'sello', c.sello, 'notas', c.notas,
    'actualizado_en', c.actualizado_en, 'estado', public.contenedor_estado(c.id),
    'embarque', case when m.id is null then null
                     else jsonb_build_object('id', m.id, 'booking', m.booking, 'estado', public.embarque_estado(m.id), 'zarpe_el', m.zarpe_el,
                                             'eta_el', m.eta_el, 'arribo_el', m.arribo_el) end,
    'vehiculos', v_vehiculos, 'hay_mas', v_mas, 'hay_ocultos', v_ocultos,
    'editable', public._contenedor_editable(c.id));
end;
$$;
comment on function public.contenedor_leer(uuid) is
  'Un contenedor de un origen cuya logística se ve: número, tipo, sello, notas, estado, su embarque {id, booking, estado, zarpe_el, eta_el, arribo_el} o nulo, sus vehículos visibles (hasta 200, hay_mas, como en embarque_leer), hay_ocultos y editable. El que no existe o no se ve: P0002.';
revoke all on function public.contenedor_leer(uuid) from public, anon;
grant execute on function public.contenedor_leer(uuid) to authenticated, service_role;

-- Las unidades vivas de un embarque o un contenedor que quien mira ve, hasta 200 (hay_mas), con la forma que leen el lote de mover, la subida a
-- un grupo de documentos y el prorrateo de dinero. Un id que no existe da la lista vacía.
create function public.transporte_unidades(p_tipo text, p_id uuid) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare r record; v_n integer := 0; v_ocultas boolean := false; v_unidades jsonb := '[]'::jsonb; v_titulo text; v_fase uuid; v_fase_nombre text;
  v_fase_orden smallint; v_origen uuid;
begin
  perform public.assert_activo();
  if p_tipo is null or p_tipo not in ('embarque', 'contenedor') then
    raise exception 'Las unidades son de un embarque o de un contenedor.' using errcode = '22023', hint = 'tipo';
  end if;
  if p_id is null then
    raise exception 'Falta el embarque o el contenedor.' using errcode = '22023', hint = 'id';
  end if;
  if not (public.tiene_permiso('logistica.ver') or public.tiene_permiso('repuestos.ver')) then
    raise exception 'No tienes permiso para ver la logística.' using errcode = '42501';
  end if;
  for r in
    select x.*
      from (select u.transporte_id from public._unidades_de(case when p_tipo = 'embarque' then p_id end,
                                                            case when p_tipo = 'contenedor' then p_id end) u limit 1000) u
      join public.transportes_con_embarque x on x.id = u.transporte_id                                                  -- transportes_pkey
     order by x.id
  loop
    if not public.puede_unidad(r.vehiculo_id, r.repuesto_id, 'logistica.ver', 'repuestos.ver') then
      v_ocultas := true;
      continue;
    end if;
    v_n := v_n + 1;
    exit when v_n > 200;
    if r.vehiculo_id is not null then
      select v.titulo, v.fase_id, f.nombre, f.orden, v.origen_id into v_titulo, v_fase, v_fase_nombre, v_fase_orden, v_origen
        from public.vehiculos v left join public.fases f on f.id = v.fase_id where v.id = r.vehiculo_id;
    else
      select i.descripcion, i.fase_id, f.nombre, f.orden, null::uuid into v_titulo, v_fase, v_fase_nombre, v_fase_orden, v_origen
        from public.repuestos_items i left join public.fases f on f.id = i.fase_id where i.id = r.repuesto_id;
    end if;
    v_unidades := v_unidades || jsonb_build_array(jsonb_build_object(
      'transporte_id', r.id, 'vehiculo_id', r.vehiculo_id, 'repuesto_id', r.repuesto_id, 'titulo', v_titulo, 'fase_id', v_fase,
      'fase', v_fase_nombre, 'fase_orden', v_fase_orden, 'origen_id', v_origen, 'embarque_id', r.embarque_id, 'contenedor_id', r.contenedor_id,
      'contenedor', r.contenedor, 'booking', r.booking, 'eta_el', r.eta_el, 'actualizado_en', r.actualizado_en));
  end loop;
  return jsonb_build_object('unidades', v_unidades, 'hay_mas', v_n > 200, 'hay_ocultas', v_ocultas);
end;
$$;
comment on function public.transporte_unidades(text, uuid) is
  'Las unidades vivas de un embarque (directas y en sus contenedores) o de un contenedor (p_tipo embarque o contenedor) que quien mira ve, hasta 200: {unidades: [{transporte_id, vehiculo_id, repuesto_id, titulo, fase_id, fase, fase_orden, origen_id, embarque_id, contenedor_id, contenedor, booking, eta_el, actualizado_en}], hay_mas, hay_ocultas}. Pide logistica.ver o repuestos.ver.';
revoke all on function public.transporte_unidades(text, uuid) from public, anon;
grant execute on function public.transporte_unidades(text, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 4. «Dónde está» suma el contenedor y el embarque de cada unidad, y la versión de su transporte: «Agregar vehículos» avisa antes de mover y
--    manda la versión que leyó.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create or replace function public.logistica_donde_esta(p_buscar text, p_tope integer DEFAULT 10, p_origen uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_n integer := public._acotar_pagina(p_tope, 10, 10);
  v_yo uuid := (select auth.uid());
  v_exacto text := upper(btrim(p_buscar));
  v_patron text;
  v_t uuid[];
  v_p uuid[];
  v_ids uuid[];
  v_unidades jsonb;
begin
  if char_length(p_buscar) > 100 then
    raise exception 'El texto a buscar es demasiado largo.' using errcode = '22023', hint = 'p_buscar';
  end if;
  -- El mismo escape y el mismo mínimo (3 letras o dígitos seguidos) que `q` de la cadena; si no alcanza, no se busca.
  v_patron := public._logistica_filtros(jsonb_build_object('q', p_buscar)) ->> 'patron';
  if v_patron is null then
    return jsonb_build_object('unidades', '[]'::jsonb, 'hay_mas', false);
  end if;
  -- Los orígenes: los de `logistica.ver` con la regla `logistica` activa en su flujo de vehículos (`flujos_origen_unico`), por su alcance; con `p_origen`, sólo ése.
  select coalesce(array_agg(o.id) filter (where a.alcance = 'todos'), '{}'), coalesce(array_agg(o.id) filter (where a.alcance = 'propios'), '{}')
    into v_t, v_p
    from unnest(public.origenes_con_alcance('logistica.ver', 'propios')) as o(id)
    join public.flujos fl on fl.origen_id = o.id and fl.ambito = 'vehiculos'
    cross join lateral (select public._logistica_alcance(o.id) as alcance) a
   where public.flujo_regla_activa(fl.id, 'logistica') and (p_origen is null or o.id = p_origen);
  if cardinality(v_t) = 0 and cardinality(v_p) = 0 then
    return jsonb_build_object('unidades', '[]'::jsonb, 'hay_mas', false);
  end if;
  -- Candidatas por `vehiculos_titulo_trgm`, `vehiculos_vin_trgm` y `vehiculos_lote_trgm` (bitmap or): a lo sumo 1.000 de los orígenes que veo.
  v_ids := array(
    select v.id from public.vehiculos v
     where (v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron)
       and v.eliminado_en is null and v.origen_id = any (v_t || v_p)
     limit 1000);
  -- Las propias, por `vehiculos_creador_idx (creado_por, origen_id, creado_en desc, id desc)`, sólo donde tengo «propios»: encuentra las mías aunque el
  -- título lo compartan más de 1.000 ajenas. Una de un lead de mi cartera creada por otra persona no se rescata (el límite de `buscador_cotizaciones`).
  if cardinality(v_p) > 0 then
    v_ids := v_ids || array(
      select v.id from public.vehiculos v
       where v.creado_por = v_yo and v.origen_id = any (v_p) and v.eliminado_en is null
         and (v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron)
       order by v.creado_en desc, v.id desc
       limit v_n + 1);
  end if;
  -- La regla de la fila sobre las candidatas (por la clave primaria); primero el VIN o el lote exactos, después lo más nuevo.
  v_ids := array(
    select v.id from public.vehiculos v
     where v.id = any (v_ids) and v.eliminado_en is null
       and (v.origen_id = any (v_t)
            or (v.origen_id = any (v_p) and (v.creado_por = v_yo or (v.lead_id is not null and public.en_cartera(v.lead_id)))))
     order by (upper(v.vin) = v_exacto or upper(v.lote) = v_exacto) is true desc, v.creado_en desc, v.id desc
     limit v_n + 1);
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', v.id, 'origen_id', v.origen_id, 'titulo', v.titulo, 'vin', v.vin, 'lote', v.lote, 'fase_id', v.fase_id, 'fase_nombre', f.nombre,
           'fase_color', f.color, 'fase_desde', v.fase_desde, 'eta_el', t.eta_el, 'contenedor_id', t.contenedor_id, 'contenedor', t.contenedor,
           'embarque_id', t.embarque_id, 'booking', t.booking, 'transporte_actualizado_en', t.actualizado_en) order by u.k), '[]'::jsonb)
    into v_unidades
    from unnest(v_ids[1:v_n]) with ordinality as u(id, k)
    join public.vehiculos v on v.id = u.id
    left join public.fases f on f.id = v.fase_id
    left join public.transportes_con_embarque t on t.vehiculo_id = v.id;
  return jsonb_build_object('unidades', v_unidades, 'hay_mas', coalesce(cardinality(v_ids), 0) > v_n);
end;
$function$;

comment on function public.logistica_donde_esta(text, integer, uuid) is
  '«Dónde está» (6.02-3): {unidades: [{id, origen_id, titulo, vin, lote, fase_id, fase_nombre, fase_color, fase_desde, eta_el, contenedor_id, contenedor, embarque_id, booking, transporte_actualizado_en}], hay_mas}, hasta _acotar_pagina(p_tope, 10, 10), de los orígenes con la regla logistica activa cuya logística veo; con p_origen, sólo de ése (nulo: todos). Por título, VIN o lote (vehiculos_*_trgm, hasta 1.000 candidatas, más las propias por vehiculos_creador_idx donde se tiene «propios»), con la regla de la fila de la cadena sobre las candidatas; VIN o lote exactos primero. Menos de 3 letras o dígitos seguidos, o ningún origen: vacío sin error; más de 100 caracteres: 22023 hint p_buscar. Sin lead_id.';

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 5. La vista de la lista de embarques (tabla o tarjetas), como las de vehículos y cotizaciones.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

alter table public.preferencias_usuario add constraint preferencias_vista_de_embarques_valida
  check (clave <> 'embarques.vista' or valor = any (array['"tabla"'::jsonb, '"tarjetas"'::jsonb]));
