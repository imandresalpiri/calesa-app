-- El transporte se lee y se escribe en su embarque: los lectores de hoy (requisitos, exigido, bandeja del día, la lista de una fase, «dónde
-- está», el portal, los grupos de /logistica/embarques y el uso de un catálogo) leen lo resuelto (transportes_con_embarque) y los escritores
-- (transporte_guardar, transporte_grupo_aplicar) escriben lo que es del embarque en el embarque. Lo que ve la persona no cambia.
-- Candados, siempre en este orden: embarques → contenedores (por id) → unidades (`for share`) → filas de transportes.

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 1. Lo que se valida, con los datos de la unidad (con o sin embarque) en vez de su fila.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

drop function public._transporte_cambios(public.transportes, jsonb, text[]);
drop function public._transporte_validar(uuid, uuid, public.transportes, public.transportes, text);

CREATE OR REPLACE FUNCTION public._transporte_cambios(o public.datos_de_transporte, p_cambios jsonb, p_claves text[])
 RETURNS public.datos_de_transporte
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare n public.datos_de_transporte := o; k text; v text; tipo text;
begin
  if p_cambios is null then
    return n;
  end if;
  if jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios van como un objeto.' using errcode = '22023', hint = 'cambios';
  end if;
  for k in select x from jsonb_object_keys(p_cambios) x order by x loop
    if k <> all (p_claves) then
      raise exception 'No se cambia «%».', k using errcode = '22023', hint = k;
    end if;
    tipo := jsonb_typeof(p_cambios -> k);
    if tipo not in ('string', 'null') then
      raise exception 'El valor de «%» no es válido.', k using errcode = '22023', hint = k;
    end if;
    v := p_cambios ->> k;
    if k in ('naviera_id', 'puerto_origen_id', 'puerto_destino_id') then
      if v is not null and not pg_input_is_valid(v, 'uuid') then
        raise exception 'El valor de «%» no es válido.', k using errcode = '22023', hint = k;
      end if;
      case k
        when 'naviera_id' then n.naviera_id := v::uuid;
        when 'puerto_origen_id' then n.puerto_origen_id := v::uuid;
        else n.puerto_destino_id := v::uuid;
      end case;
    elsif k in ('contenedor', 'booking') then
      v := nullif(upper(regexp_replace(v, '\s', '', 'g')), '');
      if v is not null and v !~ '^[A-Z0-9./-]{1,40}$' then
        raise exception 'El % lleva sólo letras, dígitos, punto, barra o guion (hasta 40).', k using errcode = '22023', hint = k;
      end if;
      if k = 'contenedor' then n.contenedor := v; else n.booking := v; end if;
    elsif k in ('zarpe_el', 'eta_el', 'arribo_el') then
      -- Sólo AAAA-MM-DD: `date` acepta también 'today', 'epoch' o 'infinity'.
      if v is not null and (v !~ '^\d{4}-\d{2}-\d{2}$' or not pg_input_is_valid(v, 'date')) then
        raise exception 'La fecha de «%» no es válida.', k using errcode = '22023', hint = k;
      end if;
      case k
        when 'zarpe_el' then n.zarpe_el := v::date;
        when 'eta_el' then n.eta_el := v::date;
        else n.arribo_el := v::date;
      end case;
    elsif k = 'notas' then
      v := nullif(btrim(v), '');
      if length(v) > 2000 then
        raise exception 'Las notas llevan hasta 2.000 caracteres.' using errcode = '22023', hint = 'notas';
      end if;
      n.notas := v;
    end if;
  end loop;
  return n;
end;
$function$;

CREATE OR REPLACE FUNCTION public._transporte_validar(p_flujo uuid, p_fase uuid, o public.datos_de_transporte, n public.datos_de_transporte, p_titulo text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  pre text := coalesce('«' || p_titulo || '»: ', '');
  f public.fases;
  c record;
  v_origen uuid;
begin
  if not public.flujo_regla_activa(p_flujo, 'transporte') then
    raise exception '%El transporte está apagado en el flujo de esta unidad.', pre using errcode = '23514', hint = 'transporte';
  end if;
  -- D9 · un repuesto que sigue a su vehículo usa los datos del vehículo.
  if o.sigue_al_vehiculo then
    if n.naviera_id is not null then
      raise exception '%Este repuesto sigue a su vehículo: la naviera es la del vehículo.', pre using errcode = '23514', hint = 'naviera_id';
    end if;
    if n.contenedor is not null then
      raise exception '%Este repuesto sigue a su vehículo: el contenedor es el del vehículo.', pre using errcode = '23514', hint = 'contenedor';
    end if;
    if n.booking is not null then
      raise exception '%Este repuesto sigue a su vehículo: el booking es el del vehículo.', pre using errcode = '23514', hint = 'booking';
    end if;
  end if;
  if n.contenedor is not null and n.contenedor is distinct from o.contenedor then
    if not public.flujo_regla_activa(p_flujo, 'contenedor') then
      raise exception '%El contenedor está apagado en el flujo de esta unidad.', pre using errcode = '23514', hint = 'contenedor';
    end if;
    select * into f from public.fases x where x.id = p_fase;
    if f.id is null then
      raise exception '%Una unidad sin fase no recibe contenedor.', pre using errcode = '23514', hint = 'contenedor';
    end if;
    if not f.permite_contenedor then
      raise exception '%La fase «%» no permite asignar contenedor.', pre, f.nombre using errcode = '23514', hint = 'contenedor';
    end if;
  end if;
  -- El origen del flujo (nulo en repuestos: sólo compartidos).
  select fl.origen_id into v_origen from public.flujos fl where fl.id = p_flujo;                       -- flujos_pkey
  -- D7 · naviera y puertos nuevos: existen, activos, del origen o compartidos y, si la oferta de su tipo no está vacía, ofrecidos.
  for c in
    select * from (values
      ('naviera_id', 'naviera', n.naviera_id, o.naviera_id, 'Esa naviera'),
      ('puerto_origen_id', 'puerto_origen', n.puerto_origen_id, o.puerto_origen_id, 'Ese puerto de origen'),
      ('puerto_destino_id', 'puerto_destino', n.puerto_destino_id, o.puerto_destino_id, 'Ese puerto de destino')
    ) x (campo, tipo, nuevo, viejo, sujeto)
    where x.nuevo is not null and x.nuevo is distinct from x.viejo
  loop
    if c.tipo = 'naviera' then
      if not exists (select 1 from public.navieras v where v.id = c.nuevo and v.activo) then
        raise exception '% no existe o está inactiva.', pre || c.sujeto using errcode = '22023', hint = c.campo;
      end if;
      if exists (select 1 from public.navieras v where v.id = c.nuevo and v.origen_id is not null and v.origen_id is distinct from v_origen) then
        raise exception '% es de otro origen.', pre || c.sujeto using errcode = '22023', hint = c.campo;
      end if;
      if exists (select 1 from public.flujos_transporte_oferta t where t.flujo_id = p_flujo and t.tipo = 'naviera')
         and not exists (select 1 from public.flujos_transporte_oferta t where t.flujo_id = p_flujo and t.tipo = 'naviera' and t.naviera_id = c.nuevo) then
        raise exception '% no se ofrece en este flujo.', pre || c.sujeto using errcode = '23514', hint = c.campo;
      end if;
    else
      if not exists (select 1 from public.puertos v where v.id = c.nuevo and v.activo) then
        raise exception '% no existe o está inactivo.', pre || c.sujeto using errcode = '22023', hint = c.campo;
      end if;
      if exists (select 1 from public.puertos v where v.id = c.nuevo and v.origen_id is not null and v.origen_id is distinct from v_origen) then
        raise exception '% es de otro origen.', pre || c.sujeto using errcode = '22023', hint = c.campo;
      end if;
      if exists (select 1 from public.flujos_transporte_oferta t where t.flujo_id = p_flujo and t.tipo = c.tipo)
         and not exists (select 1 from public.flujos_transporte_oferta t where t.flujo_id = p_flujo and t.tipo = c.tipo and t.puerto_id = c.nuevo) then
        raise exception '% no se ofrece en este flujo.', pre || c.sujeto using errcode = '23514', hint = c.campo;
      end if;
    end if;
  end loop;
  -- D8 · las fechas, sólo si cambia alguna.
  if (n.zarpe_el, n.eta_el, n.arribo_el) is distinct from (o.zarpe_el, o.eta_el, o.arribo_el) then
    if n.eta_el < n.zarpe_el then
      raise exception '%La ETA no puede ser antes del zarpe.', pre using errcode = '22023', hint = 'eta_el';
    end if;
    if n.arribo_el < n.zarpe_el then
      raise exception '%El arribo no puede ser antes del zarpe.', pre using errcode = '22023', hint = 'arribo_el';
    end if;
  end if;
end;
$function$;

revoke all on function public._transporte_cambios(public.datos_de_transporte, jsonb, text[]) from public, anon, authenticated;
grant execute on function public._transporte_cambios(public.datos_de_transporte, jsonb, text[]) to service_role;
revoke all on function public._transporte_validar(uuid, uuid, public.datos_de_transporte, public.datos_de_transporte, text) from public, anon, authenticated;
grant execute on function public._transporte_validar(uuid, uuid, public.datos_de_transporte, public.datos_de_transporte, text) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 2. Ayudantes de los escritores: el origen de una unidad, las unidades de un embarque o contenedor, si se pueden editar todas, buscar o crear
--    por clave y mudar (al salir de un embarque se copian sus datos a lo propio; al entrar, se limpia lo propio).
-- ---------------------------------------------------------------------------------------------------------------------------------------------

-- El origen donde una unidad busca o crea su contenedor y su embarque: el del vehículo; el de un ítem, el del vehículo de su proyecto (nulo, de
-- repuestos, si el proyecto es por etiqueta).
create or replace function public._transporte_origen(p_vehiculo uuid, p_repuesto uuid) returns uuid
  language sql stable security definer
  set search_path = ''
as $$
  select case
    when p_vehiculo is not null then (select v.origen_id from public.vehiculos v where v.id = p_vehiculo)                     -- vehiculos_pkey
    else (select pv.origen_id from public.repuestos_items i
            join public.repuestos_proyectos p on p.id = i.proyecto_id
            join public.vehiculos pv on pv.id = p.vehiculo_id
           where i.id = p_repuesto)                                                                   -- las PK
  end;
$$;
revoke all on function public._transporte_origen(uuid, uuid) from public, anon, authenticated;
grant execute on function public._transporte_origen(uuid, uuid) to service_role;

-- Las unidades vivas de un embarque (directas por transportes_embarque_idx, o por sus contenedores: contenedores_embarque_idx →
-- transportes_contenedor_id_idx) o de un contenedor (transportes_contenedor_id_idx). Las de una unidad en la papelera no cuentan.
create or replace function public._unidades_de(p_embarque uuid, p_contenedor uuid)
  returns table (transporte_id uuid, vehiculo_id uuid, repuesto_id uuid)
  language sql stable security definer
  set search_path = ''
as $$
  select t.id, t.vehiculo_id, t.repuesto_id
    from public.transportes t
   where p_embarque is not null and t.embarque_id = p_embarque
     and (exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)
          or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null))
  union all
  select t.id, t.vehiculo_id, t.repuesto_id
    from public.contenedores c join public.transportes t on t.contenedor_id = c.id
   where p_embarque is not null and c.embarque_id = p_embarque
     and (exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)
          or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null))
  union all
  select t.id, t.vehiculo_id, t.repuesto_id
    from public.transportes t
   where p_contenedor is not null and t.contenedor_id = p_contenedor
     and (exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)
          or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null));
$$;
revoke all on function public._unidades_de(uuid, uuid) from public, anon, authenticated;
grant execute on function public._unidades_de(uuid, uuid) to service_role;

-- Cambiar los datos de un embarque o contenedor cambia los de todas sus unidades: hace falta poder editar el transporte en su origen (uno sin
-- origen, `repuestos.editar`) y, con alcance `propios`, cada una de sus unidades (la regla de «Editar grupo»).
create or replace function public._entidad_editable(p_embarque uuid, p_contenedor uuid) returns boolean
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_origen uuid; v_hay boolean; v_alcance public.alcance_permiso;
begin
  if p_embarque is not null then
    select e.origen_id, true into v_origen, v_hay from public.embarques e where e.id = p_embarque;          -- embarques_pkey
  else
    select c.origen_id, true into v_origen, v_hay from public.contenedores c where c.id = p_contenedor;     -- contenedores_pkey
  end if;
  if not coalesce(v_hay, false) then
    return false;
  end if;
  if v_origen is null then
    if not public.tiene_permiso('repuestos.editar') then
      return false;
    end if;
    v_alcance := 'todos';
  else
    v_alcance := public.alcance_de('logistica.transporte.editar', v_origen);
    if v_alcance is null then
      return false;
    end if;
  end if;
  return not exists (
    select 1 from public._unidades_de(p_embarque, p_contenedor) u
     where not (v_alcance = 'todos' and u.vehiculo_id is not null)
       and not public.puede_unidad(u.vehiculo_id, u.repuesto_id, 'logistica.transporte.editar', 'repuestos.editar'));
end;
$$;
revoke all on function public._entidad_editable(uuid, uuid) from public, anon, authenticated;
grant execute on function public._entidad_editable(uuid, uuid) to service_role;

create or replace function public._embarque_editable(p_embarque uuid) returns boolean
  language sql stable security definer
  set search_path = ''
as $$ select public._entidad_editable(p_embarque, null); $$;
revoke all on function public._embarque_editable(uuid) from public, anon, authenticated;
grant execute on function public._embarque_editable(uuid) to service_role;

create or replace function public._contenedor_editable(p_contenedor uuid) returns boolean
  language sql stable security definer
  set search_path = ''
as $$ select public._entidad_editable(null, p_contenedor); $$;
revoke all on function public._contenedor_editable(uuid) from public, anon, authenticated;
grant execute on function public._contenedor_editable(uuid) to service_role;

-- El nombre de un origen en un mensaje («Ya hay un embarque «B» en «O».»); sin origen, repuestos.
create or replace function public._origen_en_frase(p_origen uuid) returns text
  language sql stable security definer
  set search_path = ''
as $$
  select coalesce((select o.nombre from public.origenes o where o.id = p_origen), 'Repuestos');                    -- origenes_pkey
$$;
revoke all on function public._origen_en_frase(uuid) from public, anon, authenticated;
grant execute on function public._origen_en_frase(uuid) to service_role;

-- Busca por clave el embarque de un origen (embarques_booking_origen_key) con su candado y, si falta y se pide, lo crea con los datos dados. Dos
-- que crean a la vez la misma clave: el segundo espera al índice único y toma el del primero (nunca `on conflict` en una RPC que se llama siempre).
create or replace function public._embarque_resolver(p_origen uuid, p_booking text, p_datos public.datos_de_transporte, p_crear boolean,
  out id uuid, out creado boolean)
  language plpgsql security definer
  set search_path = ''
as $$
declare v_id uuid;
begin
  creado := false;
  if p_booking is null then
    return;
  end if;
  if p_origen is null then
    select e.id into v_id from public.embarques e where e.booking = p_booking and e.origen_id is null for no key update;
  else
    select e.id into v_id from public.embarques e where e.booking = p_booking and e.origen_id = p_origen for no key update;
  end if;
  if v_id is not null or not p_crear then
    id := v_id;
    return;
  end if;
  begin
    insert into public.embarques (origen_id, booking, naviera_id, puerto_origen_id, puerto_destino_id, zarpe_el, eta_el, arribo_el, creado_por,
                                  actualizado_por)
    values (p_origen, p_booking, p_datos.naviera_id, p_datos.puerto_origen_id, p_datos.puerto_destino_id, p_datos.zarpe_el, p_datos.eta_el,
            p_datos.arribo_el, (select auth.uid()), (select auth.uid()))
    returning embarques.id into v_id;
    creado := true;
  exception when unique_violation then
    if p_origen is null then
      select e.id into v_id from public.embarques e where e.booking = p_booking and e.origen_id is null for no key update;
    else
      select e.id into v_id from public.embarques e where e.booking = p_booking and e.origen_id = p_origen for no key update;
    end if;
  end;
  id := v_id;
end;
$$;
revoke all on function public._embarque_resolver(uuid, text, public.datos_de_transporte, boolean) from public, anon, authenticated;
grant execute on function public._embarque_resolver(uuid, text, public.datos_de_transporte, boolean) to service_role;

-- Lo mismo para un contenedor (contenedores_numero_origen_key); uno nuevo nace en `p_embarque` (o sin embarque).
create or replace function public._contenedor_resolver(p_origen uuid, p_numero text, p_embarque uuid, p_crear boolean,
  out id uuid, out creado boolean)
  language plpgsql security definer
  set search_path = ''
as $$
declare v_id uuid;
begin
  creado := false;
  if p_numero is null then
    return;
  end if;
  if p_origen is null then
    select c.id into v_id from public.contenedores c where c.numero = p_numero and c.origen_id is null for no key update;
  else
    select c.id into v_id from public.contenedores c where c.numero = p_numero and c.origen_id = p_origen for no key update;
  end if;
  if v_id is not null or not p_crear then
    id := v_id;
    return;
  end if;
  begin
    insert into public.contenedores (origen_id, numero, embarque_id, creado_por, actualizado_por)
    values (p_origen, p_numero, p_embarque, (select auth.uid()), (select auth.uid()))
    returning contenedores.id into v_id;
    creado := true;
  exception when unique_violation then
    if p_origen is null then
      select c.id into v_id from public.contenedores c where c.numero = p_numero and c.origen_id is null for no key update;
    else
      select c.id into v_id from public.contenedores c where c.numero = p_numero and c.origen_id = p_origen for no key update;
    end if;
  end;
  id := v_id;
end;
$$;
revoke all on function public._contenedor_resolver(uuid, text, uuid, boolean) from public, anon, authenticated;
grant execute on function public._contenedor_resolver(uuid, text, uuid, boolean) to service_role;

-- Muda una unidad a un contenedor (`p_contenedor`), directa a un embarque (`p_embarque`) o a ninguno, en un solo `update`: si queda sin embarque
-- guarda como propios los datos que veía (al salir, los del embarque); si queda con embarque, limpia lo propio. El exigido lo da el trigger.
create or replace function public._transporte_mudar(p_transporte uuid, p_contenedor uuid, p_embarque uuid) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare r record; v_emb uuid;
begin
  if p_contenedor is not null and p_embarque is not null then
    raise exception 'Una unidad va en un contenedor o directa en un embarque.' using errcode = '22023', hint = 'contenedor';
  end if;
  select x.contenedor_id, x.embarque_id, x.naviera_id, x.puerto_origen_id, x.puerto_destino_id, x.zarpe_el, x.eta_el, x.arribo_el,
         t.embarque_id as embarque_directo
    into r
    from public.transportes_con_embarque x join public.transportes t on t.id = x.id
   where x.id = p_transporte;                                                                       -- transportes_pkey
  if r.contenedor_id is not distinct from p_contenedor and r.embarque_directo is not distinct from p_embarque then
    return;
  end if;
  v_emb := coalesce(p_embarque, (select c.embarque_id from public.contenedores c where c.id = p_contenedor));
  update public.transportes t
     set contenedor_id = p_contenedor, embarque_id = p_embarque,
         naviera_id = case when v_emb is null then r.naviera_id end,
         puerto_origen_id = case when v_emb is null then r.puerto_origen_id end,
         puerto_destino_id = case when v_emb is null then r.puerto_destino_id end,
         zarpe_el = case when v_emb is null then r.zarpe_el end,
         eta_el = case when v_emb is null then r.eta_el end,
         arribo_el = case when v_emb is null then r.arribo_el end,
         actualizado_por = (select auth.uid())
   where t.id = p_transporte;
end;
$$;
revoke all on function public._transporte_mudar(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public._transporte_mudar(uuid, uuid, uuid) to service_role;

-- Muda un contenedor de embarque (o lo saca): al salir, primero copia los datos del embarque a sus unidades y después lo desengancha; al entrar,
-- primero lo engancha y después limpia lo propio de sus unidades.
create or replace function public._contenedor_mudar(p_contenedor uuid, p_embarque uuid) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare v_antes uuid;
begin
  select c.embarque_id into v_antes from public.contenedores c where c.id = p_contenedor;                 -- contenedores_pkey
  if v_antes is not distinct from p_embarque then
    return;
  end if;
  if p_embarque is null then
    update public.transportes t                                                                     -- transportes_contenedor_id_idx
       set naviera_id = e.naviera_id, puerto_origen_id = e.puerto_origen_id, puerto_destino_id = e.puerto_destino_id, zarpe_el = e.zarpe_el,
           eta_el = e.eta_el, arribo_el = e.arribo_el, actualizado_por = (select auth.uid())
      from public.embarques e
     where t.contenedor_id = p_contenedor and e.id = v_antes;
  end if;
  update public.contenedores c set embarque_id = p_embarque, actualizado_por = (select auth.uid()) where c.id = p_contenedor;
  if v_antes is null then
    update public.transportes t                                                                     -- transportes_contenedor_id_idx
       set naviera_id = null, puerto_origen_id = null, puerto_destino_id = null, zarpe_el = null, eta_el = null, arribo_el = null,
           actualizado_por = (select auth.uid())
     where t.contenedor_id = p_contenedor
       and num_nonnulls(t.naviera_id, t.puerto_origen_id, t.puerto_destino_id, t.zarpe_el, t.eta_el, t.arribo_el) > 0;
  end if;
end;
$$;
revoke all on function public._contenedor_mudar(uuid, uuid) from public, anon, authenticated;
grant execute on function public._contenedor_mudar(uuid, uuid) to service_role;

-- Escribe en un embarque los datos dados (los que no cambian quedan iguales). Las fechas al revés las rechaza su `check`; aquí, con el mensaje.
create or replace function public._embarque_escribir_datos(p_embarque uuid, p_datos public.datos_de_transporte) returns void
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if p_datos.eta_el < p_datos.zarpe_el then
    raise exception 'La ETA no puede ser antes del zarpe.' using errcode = '22023', hint = 'eta_el';
  end if;
  if p_datos.arribo_el < p_datos.zarpe_el then
    raise exception 'El arribo no puede ser antes del zarpe.' using errcode = '22023', hint = 'arribo_el';
  end if;
  update public.embarques e
     set naviera_id = p_datos.naviera_id, puerto_origen_id = p_datos.puerto_origen_id, puerto_destino_id = p_datos.puerto_destino_id,
         zarpe_el = p_datos.zarpe_el, eta_el = p_datos.eta_el, arribo_el = p_datos.arribo_el, actualizado_por = (select auth.uid())
   where e.id = p_embarque
     and (e.naviera_id, e.puerto_origen_id, e.puerto_destino_id, e.zarpe_el, e.eta_el, e.arribo_el)
         is distinct from (p_datos.naviera_id, p_datos.puerto_origen_id, p_datos.puerto_destino_id, p_datos.zarpe_el, p_datos.eta_el, p_datos.arribo_el);
end;
$$;
revoke all on function public._embarque_escribir_datos(uuid, public.datos_de_transporte) from public, anon, authenticated;
grant execute on function public._embarque_escribir_datos(uuid, public.datos_de_transporte) to service_role;

-- Toma los candados de embarques y contenedores en orden de id (embarques primero): el orden de todas las escrituras de transporte.
create or replace function public._transporte_bloquear_entidades(p_embarques uuid[], p_contenedores uuid[]) returns void
  language plpgsql security definer
  set search_path = ''
as $$
begin
  perform 1 from public.embarques e where e.id = any (p_embarques) order by e.id for no key update;          -- embarques_pkey
  perform 1 from public.contenedores c where c.id = any (p_contenedores) order by c.id for no key update;    -- contenedores_pkey
end;
$$;
revoke all on function public._transporte_bloquear_entidades(uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public._transporte_bloquear_entidades(uuid[], uuid[]) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 3. Lo exigido por la fase (23514, los textos y `hint` de siempre), sobre lo resuelto: lo que veía la unidad antes y lo que ve después, contra
--    las tablas vigentes. Un repuesto que sigue a su vehículo no se mira (usa los datos del vehículo).
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create or replace function public.transporte_exigido() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare v_fase uuid; v_nombre text; r record; v_antes boolean; v_despues boolean; v_col text; v_dato text; a record; d record;
begin
  if old.sigue_al_vehiculo then
    return new;
  end if;
  if old.vehiculo_id is not null then
    select v.fase_id into v_fase from public.vehiculos v where v.id = old.vehiculo_id for share;
  else
    select i.fase_id into v_fase from public.repuestos_items i where i.id = old.repuesto_id for share;
  end if;
  if v_fase is null then
    return new;
  end if;
  -- Lo del embarque (por el contenedor o directo) antes y después; sin embarque, lo propio de OLD y NEW.
  select * into a from public._embarque_valores(old.contenedor_id, old.embarque_id);
  select * into d from public._embarque_valores(new.contenedor_id, new.embarque_id);
  -- Por fases_requisitos_fase_id_idx.
  for r in
    select distinct q.clave_dato from public.fases_requisitos q
     where q.fase_id = v_fase and q.tipo = 'dato' and q.bloqueante
       and q.clave_dato = any (array['transporte.naviera', 'transporte.contenedor', 'transporte.booking', 'transporte.zarpe', 'transporte.eta',
                                     'transporte.arribo'])
  loop
    case r.clave_dato
      when 'transporte.naviera' then
        v_antes := case when a.embarque_id is null then old.naviera_id else a.naviera_id end is not null;
        v_despues := case when d.embarque_id is null then new.naviera_id else d.naviera_id end is not null;
        v_col := 'naviera_id'; v_dato := 'la naviera';
      when 'transporte.contenedor' then
        v_antes := coalesce(a.contenedor, '') <> ''; v_despues := coalesce(d.contenedor, '') <> ''; v_col := 'contenedor'; v_dato := 'el contenedor';
      when 'transporte.booking' then
        v_antes := coalesce(a.booking, '') <> ''; v_despues := coalesce(d.booking, '') <> ''; v_col := 'booking'; v_dato := 'el booking';
      when 'transporte.zarpe' then
        v_antes := case when a.embarque_id is null then old.zarpe_el else a.zarpe_el end is not null;
        v_despues := case when d.embarque_id is null then new.zarpe_el else d.zarpe_el end is not null;
        v_col := 'zarpe_el'; v_dato := 'el zarpe';
      when 'transporte.eta' then
        v_antes := case when a.embarque_id is null then old.eta_el else a.eta_el end is not null;
        v_despues := case when d.embarque_id is null then new.eta_el else d.eta_el end is not null;
        v_col := 'eta_el'; v_dato := 'la ETA';
      else
        v_antes := case when a.embarque_id is null then old.arribo_el else a.arribo_el end is not null;
        v_despues := case when d.embarque_id is null then new.arribo_el else d.arribo_el end is not null;
        v_col := 'arribo_el'; v_dato := 'el arribo';
    end case;
    if v_antes and not v_despues then
      select f.nombre into v_nombre from public.fases f where f.id = v_fase;
      raise exception 'La fase «%» exige %: no se puede vaciar.', v_nombre, v_dato using errcode = '23514', hint = v_col;
    end if;
  end loop;
  return new;
end;
$$;
comment on function public.transporte_exigido() is
  'Trigger: una unidad no pierde un dato de transporte que su fase exige como bloqueante (23514), comparando lo que ve antes y después (su embarque, por el contenedor o directo, o lo propio).';

drop trigger trg_transporte_exigido on public.transportes;
create trigger trg_transporte_exigido
  before update of contenedor_id, embarque_id, naviera_id, puerto_origen_id, puerto_destino_id, zarpe_el, eta_el, arribo_el on public.transportes
  for each row execute function public.transporte_exigido();

-- Vaciar la naviera o una fecha de un embarque: ninguna de sus unidades (directas o por un contenedor) puede estar en una fase que la exija.
-- Las unidades quedan con candado `for share` (como en el trigger de la unidad): nadie las pasa de fase hasta confirmar.
create or replace function public.embarque_exigido() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare k record; v_nombre text;
begin
  if not ((old.naviera_id is not null and new.naviera_id is null) or (old.zarpe_el is not null and new.zarpe_el is null)
          or (old.eta_el is not null and new.eta_el is null) or (old.arribo_el is not null and new.arribo_el is null)) then
    return new;
  end if;
  perform 1 from public.transportes t join public.vehiculos v on v.id = t.vehiculo_id where t.embarque_id = old.id for share of v;
  perform 1 from public.transportes t join public.repuestos_items i on i.id = t.repuesto_id where t.embarque_id = old.id for share of i;
  perform 1 from public.contenedores c join public.transportes t on t.contenedor_id = c.id join public.vehiculos v on v.id = t.vehiculo_id
   where c.embarque_id = old.id for share of v;
  perform 1 from public.contenedores c join public.transportes t on t.contenedor_id = c.id join public.repuestos_items i on i.id = t.repuesto_id
   where c.embarque_id = old.id for share of i;
  for k in
    select * from (values
      ('transporte.naviera', 'naviera_id', 'la naviera', old.naviera_id is not null and new.naviera_id is null),
      ('transporte.zarpe', 'zarpe_el', 'el zarpe', old.zarpe_el is not null and new.zarpe_el is null),
      ('transporte.eta', 'eta_el', 'la ETA', old.eta_el is not null and new.eta_el is null),
      ('transporte.arribo', 'arribo_el', 'el arribo', old.arribo_el is not null and new.arribo_el is null)
    ) x (clave, col, dato, vaciado)
    where x.vaciado
  loop
    -- Las unidades del embarque (transportes_embarque_idx; contenedores_embarque_idx → transportes_contenedor_id_idx) y su fase.
    select f.nombre into v_nombre
      from (select coalesce(v.fase_id, i.fase_id) as fase_id
              from public.transportes t
              left join public.vehiculos v on v.id = t.vehiculo_id
              left join public.repuestos_items i on i.id = t.repuesto_id
             where t.embarque_id = old.id
            union all
            select coalesce(v.fase_id, i.fase_id)
              from public.contenedores c join public.transportes t on t.contenedor_id = c.id
              left join public.vehiculos v on v.id = t.vehiculo_id
              left join public.repuestos_items i on i.id = t.repuesto_id
             where c.embarque_id = old.id) u
      join public.fases f on f.id = u.fase_id
     where exists (select 1 from public.fases_requisitos q
                    where q.fase_id = u.fase_id and q.tipo = 'dato' and q.bloqueante and q.clave_dato = k.clave)
     limit 1;
    if v_nombre is not null then
      raise exception 'La fase «%» exige %: no se puede vaciar.', v_nombre, k.dato using errcode = '23514', hint = k.col;
    end if;
  end loop;
  return new;
end;
$$;
comment on function public.embarque_exigido() is
  'Trigger: un embarque no pierde la naviera ni una fecha que la fase de alguna de sus unidades (directas o por contenedor) exige como bloqueante (23514).';
revoke all on function public.embarque_exigido() from public, anon, authenticated;
create trigger trg_embarque_exigido
  before update of naviera_id, zarpe_el, eta_el, arribo_el on public.embarques
  for each row execute function public.embarque_exigido();

-- Un contenedor que cambia de embarque (o sale de él): por unidad, lo del embarque viejo (o lo propio) contra lo del nuevo (o lo propio).
create or replace function public.contenedor_exigido() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare a record; d record; x record;
begin
  if old.embarque_id is not distinct from new.embarque_id then
    return new;
  end if;
  perform 1 from public.transportes t join public.vehiculos v on v.id = t.vehiculo_id where t.contenedor_id = old.id for share of v;
  perform 1 from public.transportes t join public.repuestos_items i on i.id = t.repuesto_id where t.contenedor_id = old.id for share of i;
  select * into a from public._embarque_valores(null, old.embarque_id);
  select * into d from public._embarque_valores(null, new.embarque_id);
  -- Sus unidades (transportes_contenedor_id_idx), su fase y lo que cada dato era y será.
  select f.nombre, k.col, k.dato into x
    from public.transportes t
    left join public.vehiculos v on v.id = t.vehiculo_id
    left join public.repuestos_items i on i.id = t.repuesto_id
    join public.fases f on f.id = coalesce(v.fase_id, i.fase_id)
    cross join lateral (values
      ('transporte.naviera', 'naviera_id', 'la naviera',
       case when a.embarque_id is null then t.naviera_id else a.naviera_id end is not null,
       case when d.embarque_id is null then t.naviera_id else d.naviera_id end is not null),
      ('transporte.booking', 'booking', 'el booking', a.booking is not null, d.booking is not null),
      ('transporte.zarpe', 'zarpe_el', 'el zarpe',
       case when a.embarque_id is null then t.zarpe_el else a.zarpe_el end is not null,
       case when d.embarque_id is null then t.zarpe_el else d.zarpe_el end is not null),
      ('transporte.eta', 'eta_el', 'la ETA',
       case when a.embarque_id is null then t.eta_el else a.eta_el end is not null,
       case when d.embarque_id is null then t.eta_el else d.eta_el end is not null),
      ('transporte.arribo', 'arribo_el', 'el arribo',
       case when a.embarque_id is null then t.arribo_el else a.arribo_el end is not null,
       case when d.embarque_id is null then t.arribo_el else d.arribo_el end is not null)
    ) k (clave, col, dato, antes, despues)
   where t.contenedor_id = old.id and not t.sigue_al_vehiculo and k.antes and not k.despues
     and exists (select 1 from public.fases_requisitos q where q.fase_id = f.id and q.tipo = 'dato' and q.bloqueante and q.clave_dato = k.clave)
   limit 1;
  if x.nombre is not null then
    raise exception 'La fase «%» exige %: no se puede vaciar.', x.nombre, x.dato using errcode = '23514', hint = x.col;
  end if;
  return new;
end;
$$;
comment on function public.contenedor_exigido() is
  'Trigger: un contenedor que cambia de embarque o sale de él no deja a una de sus unidades sin un dato que su fase exige como bloqueante (23514).';
revoke all on function public.contenedor_exigido() from public, anon, authenticated;
create trigger trg_contenedor_exigido
  before update of embarque_id on public.contenedores
  for each row execute function public.contenedor_exigido();

-- Un requisito de dato de transporte se cumple con lo resuelto (transportes_con_embarque); un repuesto que sigue a su vehículo, con lo del vehículo.
create or replace function public._requisito_dato_cumplido(p_vehiculo uuid, p_repuesto uuid, p_clave text, p_config jsonb)
  returns boolean
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v public.vehiculos; i public.repuestos_items; pct numeric; v_sigue boolean; v_hay boolean;
  t_naviera uuid; t_contenedor text; t_booking text; t_zarpe date; t_eta date; t_arribo date;
begin
  if p_vehiculo is not null then select * into v from public.vehiculos where id = p_vehiculo; end if;
  if p_repuesto is not null then select * into i from public.repuestos_items where id = p_repuesto; end if;
  if p_clave like 'transporte.%' then
    -- Por transportes_vehiculo_id_key o transportes_repuesto_id_key, y la PK del contenedor y del embarque.
    if p_vehiculo is not null then
      select x.sigue_al_vehiculo, x.naviera_id, x.contenedor, x.booking, x.zarpe_el, x.eta_el, x.arribo_el, true
        into v_sigue, t_naviera, t_contenedor, t_booking, t_zarpe, t_eta, t_arribo, v_hay
        from public.transportes_con_embarque x where x.vehiculo_id = p_vehiculo;
    elsif p_repuesto is not null then
      select x.sigue_al_vehiculo, x.naviera_id, x.contenedor, x.booking, x.zarpe_el, x.eta_el, x.arribo_el, true
        into v_sigue, t_naviera, t_contenedor, t_booking, t_zarpe, t_eta, t_arribo, v_hay
        from public.transportes_con_embarque x where x.repuesto_id = p_repuesto;
    end if;
    if p_repuesto is not null and coalesce(v_hay, false) and v_sigue then
      select x.naviera_id, x.contenedor, x.booking, x.zarpe_el, x.eta_el, x.arribo_el
        into t_naviera, t_contenedor, t_booking, t_zarpe, t_eta, t_arribo
        from public.repuestos_proyectos pr join public.transportes_con_embarque x on x.vehiculo_id = pr.vehiculo_id
       where pr.id = i.proyecto_id;
    end if;
  end if;
  case p_clave
    when 'vehiculo.vin' then return v.vin is not null;
    when 'vehiculo.lead' then return v.lead_id is not null;
    when 'vehiculo.cotizacion_final' then return exists (select 1 from public.cotizaciones c where c.vehiculo_id = p_vehiculo and c.clase = 'final' and c.estado = 'activa' and c.eliminado_en is null);
    when 'transporte.naviera' then return t_naviera is not null;
    when 'transporte.contenedor' then return coalesce(t_contenedor, '') <> '';
    when 'transporte.booking' then return coalesce(t_booking, '') <> '';
    when 'transporte.zarpe' then return t_zarpe is not null;
    when 'transporte.eta' then return t_eta is not null;
    when 'transporte.arribo' then return t_arribo is not null;
    when 'aduana.declaracion' then return exists (select 1 from public.declaraciones_vehiculos dv where dv.vehiculo_id = p_vehiculo and dv.removido_en is null);
    when 'aduana.canal' then return exists (select 1 from public.declaraciones_vehiculos dv join public.declaraciones_aduana d on d.id = dv.declaracion_id where dv.vehiculo_id = p_vehiculo and dv.removido_en is null and d.canal is not null);
    when 'aduana.tributos_pagados' then return exists (select 1 from public.gastos g join public.categorias_gasto cg on cg.id = g.categoria_id where g.vehiculo_id = p_vehiculo and g.eliminado_en is null and cg.proposito = 'tributos');
    when 'pagos.confirmado' then return exists (select 1 from public.pagos p where p.vehiculo_id = p_vehiculo and p.confirmado and p.eliminado_en is null);
    when 'pagos.umbral_pct' then
      pct := coalesce((p_config ->> 'pct')::numeric, 100);
      return coalesce((select sum(p.monto_base) from public.pagos p where p.vehiculo_id = p_vehiculo and p.confirmado and p.eliminado_en is null), 0)
             >= pct / 100 * coalesce((select c.total_base from public.cotizaciones c where c.vehiculo_id = p_vehiculo and c.clase = 'final' and c.estado = 'activa' and c.eliminado_en is null), 0)
             and exists (select 1 from public.cotizaciones c where c.vehiculo_id = p_vehiculo and c.clase = 'final' and c.estado = 'activa' and c.eliminado_en is null);
    when 'repuesto.tracking' then return coalesce(i.tracking, '') <> '';
    when 'repuesto.precio' then return i.precio_cliente is not null;
    when 'proyecto.pago_cliente' then return exists (select 1 from public.pagos p where p.proyecto_repuestos_id = i.proyecto_id and p.eliminado_en is null);
    else return false;
  end case;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 4. La bandeja del día: cada tanda junta tres rutas (lo propio; el embarque directo; el embarque por su contenedor), cada una con su
--    `order by … limit`, y afuera ordena a lo sumo 600 filas. La clave sigue siendo (fecha, id del transporte).
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create or replace function public._bandeja_dia_llegadas(p_leer integer, p_desde timestamp with time zone, p_id uuid)
  returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  c_lote constant integer := 200; c_tope constant integer := 2000;
  a record; v_hoy date := public._bandeja_dia_hoy();
  v_d date := (p_desde at time zone 'UTC')::date; v_i uuid := p_id; v_ids uuid[]; v_leidas integer := 0; v_filas jsonb := '[]'::jsonb; v_parte jsonb;
begin
  select * into a from public._bandeja_dia_alcance(null);
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

create or replace function public._bandeja_dia_salidas(p_leer integer, p_desde timestamp with time zone, p_id uuid)
  returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  c_lote constant integer := 200; c_tope constant integer := 2000;
  a record; v_hoy date := public._bandeja_dia_hoy();
  v_i uuid := p_id; v_ids uuid[]; v_leidas integer := 0; v_filas jsonb := '[]'::jsonb; v_parte jsonb;
begin
  select * into a from public._bandeja_dia_alcance(null);
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

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 5. El uso de un catálogo suma los embarques (con el mismo tope de 51).
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create or replace function public._puerto_uso(p_id uuid) returns integer
  language sql stable security definer
  set search_path = ''
as $$
  select count(*)::integer from (
    (select 1 from public.transportes t where t.puerto_origen_id = p_id limit 51)                     -- transportes_puerto_origen_id_idx
    union all
    (select 1 from public.transportes t where t.puerto_destino_id = p_id limit 51)                    -- transportes_puerto_destino_id_idx
    union all
    (select 1 from public.embarques e where e.puerto_origen_id = p_id limit 51)                       -- embarques_puerto_origen_id_idx
    union all
    (select 1 from public.embarques e where e.puerto_destino_id = p_id limit 51)                      -- embarques_puerto_destino_id_idx
    union all
    (select 1 from public.flujos_transporte_oferta o where o.puerto_id = p_id limit 51)               -- flujos_transporte_oferta_puerto_id_idx
    limit 51) q;
$$;

create or replace function public._naviera_uso(p_id uuid) returns integer
  language sql stable security definer
  set search_path = ''
as $$
  select count(*)::integer from (
    (select 1 from public.transportes t where t.naviera_id = p_id limit 51)                           -- transportes_naviera_id_idx
    union all
    (select 1 from public.embarques e where e.naviera_id = p_id limit 51)                             -- embarques_naviera_id_idx
    union all
    (select 1 from public.flujos_transporte_oferta o where o.naviera_id = p_id limit 51)              -- flujos_transporte_oferta_naviera_id_idx
    limit 51) q;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 6. La columna de una fase, «dónde está» y el portal leen lo resuelto.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

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

  if p_todos then
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


CREATE OR REPLACE FUNCTION public.logistica_donde_esta(p_buscar text, p_tope integer DEFAULT 10)
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
  -- Los orígenes: los de `logistica.ver` con la regla `logistica` activa en su flujo de vehículos (`flujos_origen_unico`), por su alcance.
  select coalesce(array_agg(o.id) filter (where a.alcance = 'todos'), '{}'), coalesce(array_agg(o.id) filter (where a.alcance = 'propios'), '{}')
    into v_t, v_p
    from unnest(public.origenes_con_alcance('logistica.ver', 'propios')) as o(id)
    join public.flujos fl on fl.origen_id = o.id and fl.ambito = 'vehiculos'
    cross join lateral (select public._logistica_alcance(o.id) as alcance) a
   where public.flujo_regla_activa(fl.id, 'logistica');
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
           'fase_color', f.color, 'fase_desde', v.fase_desde, 'eta_el', t.eta_el) order by u.k), '[]'::jsonb)
    into v_unidades
    from unnest(v_ids[1:v_n]) with ordinality as u(id, k)
    join public.vehiculos v on v.id = u.id
    left join public.fases f on f.id = v.fase_id
    left join public.transportes_con_embarque t on t.vehiculo_id = v.id;
  return jsonb_build_object('unidades', v_unidades, 'hay_mas', coalesce(cardinality(v_ids), 0) > v_n);
end;
$function$;


CREATE OR REPLACE FUNCTION web.portal_snapshot(p_lead uuid, p_otorgado_en timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (public._portal_vigente(p_lead, p_otorgado_en)).lead_id is null then
    return null;
  end if;
  return jsonb_build_object(
    'cliente', (select jsonb_build_object('nombre', l.nombre) from public.leads l where l.id = p_lead),
    'asesor', (select jsonb_build_object('nombre', p.nombre, 'whatsapp', p.whatsapp_web, 'avatar', p.avatar_ruta) from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id where la.lead_id = p_lead and la.tipo_acceso = 'dueno' and la.revocado_en is null and la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])),
    'vehiculos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', v.id, 'titulo', v.titulo, 'anio', v.anio, 'vin_parcial', case when v.vin is not null then left(v.vin, 3) || '•••••' || right(v.vin, 4) end,
        'imagenes', (select coalesce(jsonb_agg(i.ruta order by i.es_portada desc, i.orden), '[]'::jsonb) from public.vehiculos_imagenes i where i.vehiculo_id = v.id),
        'fase', case when f.visible_portal then jsonb_build_object('nombre', f.alias_portal, 'descripcion', f.descripcion_portal, 'desde', v.fase_desde) end,
        'linea_tiempo', (select coalesce(jsonb_agg(jsonb_build_object('nombre', fz.alias_portal, 'en', h.creado_en) order by h.creado_en), '[]'::jsonb) from public.historial_fases h join public.fases fz on fz.id = h.a_fase_id where h.vehiculo_id = v.id and fz.visible_portal),
        'embarque', (select jsonb_build_object('zarpe', t.zarpe_el, 'eta', t.eta_el, 'arribo', t.arribo_el) from public.transportes_con_embarque t where t.vehiculo_id = v.id),
        'documentos', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'tipo', td.nombre, 'estado', d.estado, 'fecha', d.creado_en)), '[]'::jsonb) from public.documentos d join public.tipos_documento td on td.id = d.tipo_documento_id where d.vehiculo_id = v.id and d.visible_portal and td.visible_portal_permitido and d.estado <> 'rechazado' and d.eliminado_en is null),
        'seguimientos', (select coalesce(jsonb_agg(jsonb_build_object('titulo', s.titulo, 'detalle', s.detalle_texto, 'en', s.ocurrido_en) order by s.ocurrido_en desc), '[]'::jsonb) from public.seguimientos s where s.lead_id = p_lead and s.vehiculo_id = v.id and s.visibilidad = 'publico' and s.eliminado_en is null),
        'pagos', (select coalesce(jsonb_agg(jsonb_build_object('concepto', pg.concepto, 'monto', pg.monto, 'moneda', pg.moneda, 'fecha', pg.fecha, 'confirmado', pg.confirmado) order by pg.fecha), '[]'::jsonb) from public.pagos pg where pg.vehiculo_id = v.id and pg.eliminado_en is null)
      )) from public.vehiculos v left join public.fases f on f.id = v.fase_id where v.lead_id = p_lead and v.eliminado_en is null), '[]'::jsonb),
    -- Lo «Visible para el cliente» que no sale con un vehículo suyo: sin vehículo, o de uno que no está
    -- vinculado a este lead (un interés, uno que se desvinculó). No se nombra el vehículo. Las 30 más nuevas.
    'novedades', coalesce((select jsonb_agg(jsonb_build_object('titulo', n.titulo, 'detalle', n.detalle_texto, 'en', n.ocurrido_en) order by n.ocurrido_en desc, n.id)
      from (select s.id, s.titulo, s.detalle_texto, s.ocurrido_en from public.seguimientos s
            where s.lead_id = p_lead and s.visibilidad = 'publico' and s.eliminado_en is null
              and (s.vehiculo_id is null or not exists (
                select 1 from public.vehiculos v where v.id = s.vehiculo_id and v.lead_id = p_lead and v.eliminado_en is null))
            order by s.ocurrido_en desc, s.id limit 30) n), '[]'::jsonb)
  );
end;
$function$;



-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 7. Los grupos de /logistica/embarques siguen por clave entre orígenes: un booking (o un contenedor) junta todos los embarques (o contenedores)
--    con esa clave. Misma firma, misma salida.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

-- Las unidades vivas de una clave (hasta 201), con lo que ven: por booking, las de cada embarque de la clave (embarques_booking_origen_key →
-- transportes_embarque_idx, y → contenedores_embarque_idx → transportes_contenedor_id_idx); por contenedor, las de cada contenedor de la clave
-- (contenedores_numero_origen_key → transportes_contenedor_id_idx). Cada ruta con su `limit 201`.
create or replace function public._transporte_de_la_clave(p_tipo text, p_clave text)
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
          where e.booking = p_clave
            and (exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)
                 or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null))
          limit 201)
        union all
        (select t.id, t.vehiculo_id, t.repuesto_id, e.naviera_id, e.puerto_origen_id, e.puerto_destino_id, e.zarpe_el, e.eta_el, e.arribo_el
           from public.embarques e join public.contenedores c on c.embarque_id = e.id join public.transportes t on t.contenedor_id = c.id
          where e.booking = p_clave
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
       where c.numero = p_clave
         and (exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)
              or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null))
       limit 201;
  end if;
end;
$$;
comment on function public._transporte_de_la_clave(text, text) is
  'Las unidades vivas (hasta 201) de un booking o un contenedor entre orígenes, con la naviera, los puertos y las fechas que ven.';
revoke all on function public._transporte_de_la_clave(text, text) from public, anon, authenticated;
grant execute on function public._transporte_de_la_clave(text, text) to service_role;

create or replace function public.transporte_grupos(p_tipo text, p_desde text, p_tope integer, p_filtros jsonb)
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
      select e.booking into v_gt from public.embarques e where e.id = v_desde;                       -- embarques_pkey
    else
      select c.numero into v_gt from public.contenedores c where c.id = v_desde;                     -- contenedores_pkey
    end if;
    if v_gt is null then
      raise exception 'La lista cambió: vuelve a empezar.' using errcode = '22023', hint = 'cursor';
    end if;
  end if;
  loop
    -- Una sonda por el índice único de su tipo: embarques_booking_origen_key o contenedores_numero_origen_key.
    if p_tipo = 'booking' then
      select min(e.booking) into v_k from public.embarques e where e.booking >= v_ge and e.booking > v_gt;
    else
      select min(c.numero) into v_k from public.contenedores c where c.numero >= v_ge and c.numero > v_gt;
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
              from public._transporte_de_la_clave(p_tipo, v_k) x
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
      select e.id::text into v_siguiente from public.embarques e where e.booking = v_siguiente limit 1;
    else
      select c.id::text into v_siguiente from public.contenedores c where c.numero = v_siguiente limit 1;
    end if;
  end if;
  return jsonb_build_object('tipo', p_tipo, 'grupos', v_grupos, 'siguiente', v_siguiente, 'cortada', v_cortada);
end;
$$;

-- El grupo de una clave: la misma salida de siempre, más (aditivo) `fase_orden`, `embarque_id` y `contenedor_id` por unidad y los embarques que
-- se ven. `actualizado_en` es la versión que ve el grupo: la mayor entre la fila, su contenedor y su embarque.
create or replace function public.transporte_grupo(p_tipo text, p_clave text)
  returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_clave text := public._transporte_clave(p_tipo, p_clave);
  r record; v_n int := 0; v_ocultas boolean := false; v_unidades jsonb := '[]'::jsonb; v_titulo text; v_fase uuid; v_fase_nombre text;
  v_fase_orden smallint; v_origen uuid; v_ids uuid[]; v_emb_ids uuid[]; v_embarques jsonb;
begin
  perform public.assert_activo();
  if not (public.tiene_permiso('logistica.ver') or public.tiene_permiso('repuestos.ver')) then
    raise exception 'No tienes permiso para ver la logística.' using errcode = '42501';
  end if;
  v_ids := array(select k.transporte_id from public._transporte_de_la_clave(p_tipo, v_clave) k);
  for r in
    select x.*, greatest(x.actualizado_en, x.contenedor_actualizado_en, x.embarque_actualizado_en) as version
      from public.transportes_con_embarque x where x.id = any (v_ids) order by x.id
  loop
    v_n := v_n + 1;
    exit when v_n > 200;
    if not public.puede_unidad(r.vehiculo_id, r.repuesto_id, 'logistica.ver', 'repuestos.ver') then
      v_ocultas := true;
      continue;
    end if;
    if r.vehiculo_id is not null then
      select v.titulo, v.fase_id, f.nombre, f.orden, v.origen_id into v_titulo, v_fase, v_fase_nombre, v_fase_orden, v_origen
        from public.vehiculos v left join public.fases f on f.id = v.fase_id where v.id = r.vehiculo_id;
    else
      select i.descripcion, i.fase_id, f.nombre, f.orden, null::uuid into v_titulo, v_fase, v_fase_nombre, v_fase_orden, v_origen
        from public.repuestos_items i left join public.fases f on f.id = i.fase_id where i.id = r.repuesto_id;
    end if;
    v_unidades := v_unidades || jsonb_build_object(
      'transporte_id', r.id, 'vehiculo_id', r.vehiculo_id, 'repuesto_id', r.repuesto_id, 'titulo', v_titulo, 'fase_id', v_fase, 'fase', v_fase_nombre,
      'fase_orden', v_fase_orden, 'origen_id', v_origen, 'embarque_id', r.embarque_id, 'contenedor_id', r.contenedor_id,
      'naviera_id', r.naviera_id, 'puerto_origen_id', r.puerto_origen_id, 'puerto_destino_id', r.puerto_destino_id, 'contenedor', r.contenedor,
      'booking', r.booking, 'zarpe_el', r.zarpe_el, 'eta_el', r.eta_el, 'arribo_el', r.arribo_el, 'actualizado_en', r.version,
      'editable', public.puede_unidad(r.vehiculo_id, r.repuesto_id, 'logistica.transporte.editar', 'repuestos.editar'));
  end loop;
  -- Los embarques del grupo que la persona ve (el espejo de «embarques: leer»): los de la clave, o los de sus contenedores.
  if p_tipo = 'booking' then
    v_emb_ids := array(select e.id from public.embarques e where e.booking = v_clave limit 201);              -- embarques_booking_origen_key
  else
    v_emb_ids := array(select distinct c.embarque_id from public.contenedores c                             -- contenedores_numero_origen_key
                        where c.numero = v_clave and c.embarque_id is not null limit 201);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'booking', e.booking, 'origen_id', e.origen_id, 'actualizado_en', e.actualizado_en,
                                               'estado', public.embarque_estado(e.id)) order by e.booking, e.id), '[]'::jsonb)
    into v_embarques
    from public.embarques e
   where e.id = any (v_emb_ids)
     and (e.origen_id = any ((select public.origenes_con_alcance('logistica.ver', 'propios'))::uuid[])
          or (e.origen_id is null and (select public.tiene_permiso('repuestos.ver'))));
  return jsonb_build_object('tipo', p_tipo, 'clave', v_clave, 'unidades', v_unidades, 'hay_mas', v_n > 200, 'hay_ocultas', v_ocultas,
                            'embarques', v_embarques);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 8. Guardar el transporte de una unidad: lo que es del embarque va al embarque. El contenedor y el booking se buscan por clave en el origen de
--    la unidad o se crean; con contenedor, el booking es del contenedor.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

drop function public.transporte_guardar(uuid, uuid, timestamp with time zone, jsonb);

create function public.transporte_guardar(p_vehiculo uuid, p_repuesto uuid, p_actualizado_en_esperado timestamp with time zone, p_cambios jsonb,
                                          p_embarque_esperado timestamp with time zone default null,
                                          p_contenedor_esperado timestamp with time zone default null)
  returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_claves constant text[] := array['naviera_id', 'puerto_origen_id', 'puerto_destino_id', 'contenedor', 'booking', 'zarpe_el', 'eta_el', 'arribo_el',
                                    'notas'];
  v_sujeto constant text := 'el transporte de esta unidad';
  x record; o public.datos_de_transporte; n public.datos_de_transporte; u record; t record; e record; c record; res record;
  v_hay boolean; v_origen uuid; v_antes_cont uuid; v_antes_emb uuid;
  v_busca_cont uuid; v_busca_ce uuid; v_busca_emb uuid;
  v_cambia_cont boolean; v_cambia_book boolean; v_cambia_datos boolean;
  v_cont uuid; v_cont_creado boolean := false; v_emb uuid; v_emb_creado boolean := false;
  v_propios boolean;
begin
  perform public.assert_activo();
  if num_nonnulls(p_vehiculo, p_repuesto) <> 1 then
    raise exception 'Una unidad por vez.' using errcode = '22023', hint = 'unidad';
  end if;
  -- C5 · el permiso del origen antes del candado: quien no puede no espera a nadie. Cubre la unidad inexistente o en la papelera.
  if not public.puede_unidad(p_vehiculo, p_repuesto, 'logistica.transporte.editar', 'repuestos.editar') then
    raise exception 'No tienes el permiso «%» de esta unidad.', case when p_vehiculo is not null then 'logistica.transporte.editar' else 'repuestos.editar' end
      using errcode = '42501';
  end if;
  v_origen := public._transporte_origen(p_vehiculo, p_repuesto);
  -- Sin candado, lo que ve hoy y a dónde iría: para tomar los candados de embarques y contenedores (en ese orden) antes que el de la unidad.
  if p_vehiculo is not null then
    select * into x from public.transportes_con_embarque y where y.vehiculo_id = p_vehiculo;        -- transportes_vehiculo_id_key
  else
    select * into x from public.transportes_con_embarque y where y.repuesto_id = p_repuesto;        -- transportes_repuesto_id_key
  end if;
  v_antes_cont := x.contenedor_id;
  v_antes_emb := x.embarque_id;
  n := public._transporte_cambios(row(p_vehiculo, p_repuesto, false, x.contenedor, x.booking, null, null, null, null, null, null, null)::public.datos_de_transporte,
                                  p_cambios, v_claves);
  if n.contenedor is not null and n.contenedor is distinct from x.contenedor then
    select y.id, y.embarque_id into v_busca_cont, v_busca_ce from public.contenedores y                -- contenedores_numero_origen_key
     where y.numero = n.contenedor and y.origen_id is not distinct from v_origen;
  end if;
  if n.booking is not null and n.booking is distinct from x.booking then
    select y.id into v_busca_emb from public.embarques y                                            -- embarques_booking_origen_key
     where y.booking = n.booking and y.origen_id is not distinct from v_origen;
  end if;
  perform public._transporte_bloquear_entidades(array[v_antes_emb, v_busca_emb, v_busca_ce], array[v_antes_cont, v_busca_cont]);
  -- C6 · unidad antes que fila, siempre. Por transportes_vehiculo_id_key o transportes_repuesto_id_key.
  select * into u from public._transporte_unidad(p_vehiculo, p_repuesto, true);
  if p_vehiculo is not null then
    select y.id, y.actualizado_en into t from public.transportes y where y.vehiculo_id = p_vehiculo for update;
  else
    select y.id, y.actualizado_en into t from public.transportes y where y.repuesto_id = p_repuesto for update;
  end if;
  v_hay := found;
  -- C7 · la esperada nula es crear: si la fila ya existe, PT409 aunque no haya diferencias (D11).
  if v_hay and p_actualizado_en_esperado is null then
    perform public._conflicto_de_edicion('transportes', t.id, t.actualizado_en, v_sujeto);
  end if;
  -- Con los candados, lo vigente. Si la unidad cambió de contenedor o de embarque mientras tanto, los candados no son los suyos: que recargue.
  if v_hay then
    select * into x from public.transportes_con_embarque y where y.id = t.id;                        -- transportes_pkey
    if x.contenedor_id is distinct from v_antes_cont or x.embarque_id is distinct from v_antes_emb then
      perform public._conflicto_de_edicion('transportes', t.id, t.actualizado_en, v_sujeto);
    end if;
  elsif x.id is not null then
    raise exception 'El transporte de esta unidad ya no existe. Recarga.' using errcode = 'PT409';
  end if;
  o := row(p_vehiculo, p_repuesto, coalesce(x.sigue_al_vehiculo, false), x.contenedor, x.booking, x.naviera_id, x.puerto_origen_id,
           x.puerto_destino_id, x.zarpe_el, x.eta_el, x.arribo_el, x.notas)::public.datos_de_transporte;
  n := public._transporte_cambios(o, p_cambios, v_claves);
  if (n.naviera_id, n.puerto_origen_id, n.puerto_destino_id, n.contenedor, n.booking, n.zarpe_el, n.eta_el, n.arribo_el, n.notas)
     is not distinct from
     (o.naviera_id, o.puerto_origen_id, o.puerto_destino_id, o.contenedor, o.booking, o.zarpe_el, o.eta_el, o.arribo_el, o.notas) then
    return jsonb_build_object('id', t.id, 'actualizado_en', t.actualizado_en, 'sin_cambios', true,
      'embarque', case when x.embarque_id is not null then jsonb_build_object('id', x.embarque_id, 'actualizado_en', x.embarque_actualizado_en) end,
      'contenedor', case when x.contenedor_id is not null then jsonb_build_object('id', x.contenedor_id, 'actualizado_en', x.contenedor_actualizado_en) end);
  end if;
  -- C8 · la versión de la fila.
  if not v_hay and p_actualizado_en_esperado is not null then
    raise exception 'El transporte de esta unidad ya no existe. Recarga.' using errcode = 'PT409';
  end if;
  if v_hay and t.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('transportes', t.id, t.actualizado_en, v_sujeto);
  end if;
  -- C9 · validar.
  perform public._transporte_validar(u.flujo, u.fase_id, o, n, null);
  v_cambia_cont := n.contenedor is distinct from o.contenedor;
  v_cambia_book := n.booking is distinct from o.booking;
  v_cambia_datos := (n.naviera_id, n.puerto_origen_id, n.puerto_destino_id, n.zarpe_el, n.eta_el, n.arribo_el)
                    is distinct from (o.naviera_id, o.puerto_origen_id, o.puerto_destino_id, o.zarpe_el, o.eta_el, o.arribo_el);
  -- El contenedor destino: el tipeado (se busca en el origen de la unidad o se crea) o el de hoy.
  if v_cambia_cont then
    select r.id, r.creado into v_cont, v_cont_creado from public._contenedor_resolver(v_origen, n.contenedor, null, true) r;
  else
    v_cont := x.contenedor_id;
  end if;
  select y.id, y.numero, y.embarque_id, y.actualizado_en, eb.booking into c
    from public.contenedores y left join public.embarques eb on eb.id = y.embarque_id where y.id = v_cont;           -- contenedores_pkey
  -- El embarque destino. Con contenedor, el booking es del contenedor: uno tipeado lleva al contenedor a ese embarque; si no se tocó, manda el
  -- del contenedor (y uno sin embarque entra al de la unidad).
  if v_cambia_book then
    if v_cont is not null and not v_cont_creado then
      if v_cont = x.contenedor_id and c.actualizado_en is distinct from p_contenedor_esperado then
        perform public._conflicto_de_edicion('contenedores', c.id, c.actualizado_en, 'el contenedor «' || c.numero || '»');
      end if;
      if not public._contenedor_editable(v_cont) then
        raise exception 'Hay unidades del contenedor «%» que no puedes editar.', c.numero using errcode = '42501';
      end if;
    end if;
    if n.booking is not null then
      select r.id, r.creado into v_emb, v_emb_creado from public._embarque_resolver(v_origen, n.booking, n, true) r;
    end if;
  elsif v_cont is not null and c.embarque_id is not null then
    if v_cambia_cont and x.embarque_id is not null and c.embarque_id is distinct from x.embarque_id then
      raise exception 'El contenedor «%» va en el booking «%».', c.numero, c.booking using errcode = '23514', hint = 'contenedor';
    end if;
    v_emb := c.embarque_id;
  else
    v_emb := x.embarque_id;
    if v_cont is not null and v_emb is not null and not v_cont_creado and not public._contenedor_editable(v_cont) then
      raise exception 'Hay unidades del contenedor «%» que no puedes editar.', c.numero using errcode = '42501';
    end if;
  end if;
  -- Entrar a un embarque que ya existía no cambia sus datos de paso: primero el booking, después sus datos (lo tipeado igual a lo suyo pasa).
  if v_emb is not null and v_emb is distinct from x.embarque_id and not v_emb_creado and v_cambia_datos then
    select y.booking, y.naviera_id, y.puerto_origen_id, y.puerto_destino_id, y.zarpe_el, y.eta_el, y.arribo_el into e
      from public.embarques y where y.id = v_emb;
    if (p_cambios ? 'naviera_id' and n.naviera_id is distinct from e.naviera_id)
       or (p_cambios ? 'puerto_origen_id' and n.puerto_origen_id is distinct from e.puerto_origen_id)
       or (p_cambios ? 'puerto_destino_id' and n.puerto_destino_id is distinct from e.puerto_destino_id)
       or (p_cambios ? 'zarpe_el' and n.zarpe_el is distinct from e.zarpe_el)
       or (p_cambios ? 'eta_el' and n.eta_el is distinct from e.eta_el)
       or (p_cambios ? 'arribo_el' and n.arribo_el is distinct from e.arribo_el) then
      raise exception 'El embarque «%» ya existe: guarda el booking y después cambia sus datos.', e.booking using errcode = '23514', hint = 'booking';
    end if;
  end if;
  -- Los datos del mismo embarque van al embarque: su versión y que se puedan editar todas sus unidades.
  if v_cambia_datos and v_emb is not null and v_emb = x.embarque_id then
    select y.id, y.booking, y.actualizado_en into e from public.embarques y where y.id = v_emb;
    if e.actualizado_en is distinct from p_embarque_esperado then
      perform public._conflicto_de_edicion('embarques', e.id, e.actualizado_en, 'el embarque «' || e.booking || '»');
    end if;
    if not public._embarque_editable(v_emb) then
      raise exception 'Hay unidades del embarque «%» que no puedes editar.', e.booking using errcode = '42501';
    end if;
    perform public._embarque_escribir_datos(v_emb, n);
  end if;
  -- Las entidades primero (el contenedor a su embarque) y después la fila: sin embarque guarda lo propio; con embarque, nada propio.
  if v_cont is not null and c.embarque_id is distinct from v_emb then
    perform public._contenedor_mudar(v_cont, v_emb);
  end if;
  v_propios := v_emb is null;
  if not v_hay then
    insert into public.transportes (vehiculo_id, repuesto_id, contenedor_id, embarque_id, naviera_id, puerto_origen_id, puerto_destino_id, zarpe_el,
                                    eta_el, arribo_el, notas, actualizado_por)
    values (p_vehiculo, p_repuesto, v_cont, case when v_cont is null then v_emb end,
            case when v_propios then n.naviera_id end, case when v_propios then n.puerto_origen_id end,
            case when v_propios then n.puerto_destino_id end, case when v_propios then n.zarpe_el end, case when v_propios then n.eta_el end,
            case when v_propios then n.arribo_el end, n.notas, (select auth.uid()))
    on conflict do nothing
    returning id, actualizado_en into t;
    if not found then
      raise exception 'Otra persona cargó el transporte de esta unidad mientras lo editabas. Recarga.' using errcode = 'PT409';
    end if;
  else
    update public.transportes y
       set contenedor_id = v_cont, embarque_id = case when v_cont is null then v_emb end,
           naviera_id = case when v_propios then n.naviera_id end, puerto_origen_id = case when v_propios then n.puerto_origen_id end,
           puerto_destino_id = case when v_propios then n.puerto_destino_id end, zarpe_el = case when v_propios then n.zarpe_el end,
           eta_el = case when v_propios then n.eta_el end, arribo_el = case when v_propios then n.arribo_el end, notas = n.notas,
           actualizado_por = (select auth.uid())
     where y.id = t.id
       and (y.contenedor_id, y.embarque_id, y.naviera_id, y.puerto_origen_id, y.puerto_destino_id, y.zarpe_el, y.eta_el, y.arribo_el, y.notas)
           is distinct from
           (v_cont, case when v_cont is null then v_emb end, case when v_propios then n.naviera_id end,
            case when v_propios then n.puerto_origen_id end, case when v_propios then n.puerto_destino_id end, case when v_propios then n.zarpe_el end,
            case when v_propios then n.eta_el end, case when v_propios then n.arribo_el end, n.notas);
  end if;
  select y.id, y.actualizado_en, y.embarque_id, y.embarque_actualizado_en, y.contenedor_id, y.contenedor_actualizado_en into res
    from public.transportes_con_embarque y where y.id = t.id;
  return jsonb_build_object('id', res.id, 'actualizado_en', res.actualizado_en, 'sin_cambios', false,
    'embarque', case when res.embarque_id is not null then jsonb_build_object('id', res.embarque_id, 'actualizado_en', res.embarque_actualizado_en) end,
    'contenedor', case when res.contenedor_id is not null then jsonb_build_object('id', res.contenedor_id, 'actualizado_en', res.contenedor_actualizado_en) end);
end;
$$;
comment on function public.transporte_guardar(uuid, uuid, timestamp with time zone, jsonb, timestamp with time zone, timestamp with time zone) is
  'Guarda el transporte de una unidad: la fila (contenedor o embarque, notas y, sin embarque, lo propio) y, en su embarque, la naviera, los puertos y las fechas. Busca o crea el contenedor y el embarque por clave en el origen de la unidad.';
revoke all on function public.transporte_guardar(uuid, uuid, timestamp with time zone, jsonb, timestamp with time zone, timestamp with time zone)
  from public, anon;
grant execute on function public.transporte_guardar(uuid, uuid, timestamp with time zone, jsonb, timestamp with time zone, timestamp with time zone)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 9. Editar un grupo (misma firma): candados de embarques y contenedores, después las unidades y después las filas; versiones compuestas.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create or replace function public.transporte_grupo_aplicar(p_tipo text, p_clave text, p_esperadas jsonb, p_cambios jsonb)
  returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_clave text := public._transporte_clave(p_tipo, p_clave);
  v_claves constant text[] := array['naviera_id', 'puerto_origen_id', 'puerto_destino_id', 'contenedor', 'booking', 'zarpe_el', 'eta_el', 'arribo_el'];
  v_esperadas uuid[]; v_ids uuid[]; v_emb_ids uuid[]; v_cont_ids uuid[]; r record; o public.datos_de_transporte; n public.datos_de_transporte;
  pz public.datos_de_transporte; u record; k text; v_titulo text; v_id uuid; v_creado boolean; v_destino record; d public.datos_de_transporte;
  v_nueva text := v_clave; v_unidades jsonb := '[]'::jsonb; v_cambia boolean := false; v_datos boolean;
begin
  perform public.assert_activo();
  -- Sin la clave en ningún origen, 42501 antes de tomar un candado: ni bloquea filas que no puede leer ni distingue un booking que existe de uno que no.
  if not (public.tiene_permiso('logistica.transporte.editar') or public.tiene_permiso('repuestos.editar')) then
    raise exception 'No tienes permiso para editar el transporte.' using errcode = '42501';
  end if;
  -- C16 · {"<transporte_id>": "<actualizado_en>"} de 1 a 200 claves.
  if p_esperadas is null or jsonb_typeof(p_esperadas) <> 'object' then
    raise exception 'Las versiones del grupo van como un objeto.' using errcode = '22023', hint = 'esperadas';
  end if;
  for k in select y from jsonb_object_keys(p_esperadas) y loop
    if not pg_input_is_valid(k, 'uuid') or jsonb_typeof(p_esperadas -> k) <> 'string'
       or not pg_input_is_valid(p_esperadas ->> k, 'timestamptz') then
      raise exception 'Cada versión del grupo es {id: fecha}.' using errcode = '22023', hint = 'esperadas';
    end if;
    v_esperadas := array_append(v_esperadas, k::uuid);
  end loop;
  if coalesce(cardinality(v_esperadas), 0) not between 1 and 200 then
    raise exception 'Un grupo se edita con 1 a 200 unidades.' using errcode = '22023', hint = 'esperadas';
  end if;
  select array_agg(y order by y) into v_esperadas from unnest(v_esperadas) y;
  -- Los cambios, una vez (las claves y los valores; los mismos para todas las unidades).
  pz := public._transporte_cambios(row(null, null, false, null, null, null, null, null, null, null, null, null)::public.datos_de_transporte,
                                   p_cambios, v_claves);
  v_datos := p_cambios ?| array['naviera_id', 'puerto_origen_id', 'puerto_destino_id', 'zarpe_el', 'eta_el', 'arribo_el'];
  -- C17 · las entidades de la clave en todos los orígenes, con candado en orden de id: embarques y después contenedores.
  if p_tipo = 'booking' then
    v_emb_ids := array(select y.id from public.embarques y where y.booking = v_clave order by y.id);            -- embarques_booking_origen_key
    perform public._transporte_bloquear_entidades(v_emb_ids, null);
    v_cont_ids := array(select y.id from public.contenedores y where y.embarque_id = any (v_emb_ids) order by y.id);  -- contenedores_embarque_idx
    perform public._transporte_bloquear_entidades(null, v_cont_ids);
  else
    v_cont_ids := array(select y.id from public.contenedores y where y.numero = v_clave order by y.id);         -- contenedores_numero_origen_key
    v_emb_ids := array(select distinct y.embarque_id from public.contenedores y where y.id = any (v_cont_ids) and y.embarque_id is not null);
    perform public._transporte_bloquear_entidades(v_emb_ids, v_cont_ids);
    if exists (select 1 from public.contenedores y where y.id = any (v_cont_ids) and y.embarque_id is not null and y.embarque_id <> all (v_emb_ids)) then
      raise exception 'El grupo cambió mientras lo editabas. Recarga.' using errcode = 'PT409';
    end if;
  end if;
  -- Las unidades vivas de la clave (D19: sin las de la papelera), en orden de id.
  v_ids := array(select y.transporte_id from public._transporte_de_la_clave(p_tipo, v_clave) y order by y.transporte_id);
  if coalesce(cardinality(v_ids), 0) > 200 then
    raise exception 'Un grupo se edita con hasta 200 unidades.' using errcode = '22023', hint = 'grupo';
  end if;
  for r in select y.vehiculo_id, y.repuesto_id from public.transportes y where y.id = any (v_ids) order by y.id loop
    if not (public.puede_unidad(r.vehiculo_id, r.repuesto_id, 'logistica.ver', 'repuestos.ver')
            and public.puede_unidad(r.vehiculo_id, r.repuesto_id, 'logistica.transporte.editar', 'repuestos.editar')) then
      raise exception 'Hay unidades del grupo que no puedes editar.' using errcode = '42501';
    end if;
  end loop;
  if v_ids is distinct from v_esperadas then
    raise exception 'El grupo cambió mientras lo editabas. Recarga.' using errcode = 'PT409';
  end if;
  -- C18 · las unidades de una sola pasada y después sus filas.
  perform public._transporte_grupo_bloquear(
    (select array_agg(y.vehiculo_id) from public.transportes y where y.id = any (v_ids) and y.vehiculo_id is not null),
    (select array_agg(y.repuesto_id) from public.transportes y where y.id = any (v_ids) and y.repuesto_id is not null));
  perform 1 from public.transportes y where y.id = any (v_ids) order by y.id for update;
  -- Las versiones que vio el grupo: la mayor entre la fila, su contenedor y su embarque.
  for r in
    select y.id, y.vehiculo_id, y.repuesto_id, greatest(y.actualizado_en, y.contenedor_actualizado_en, y.embarque_actualizado_en) as version
      from public.transportes_con_embarque y where y.id = any (v_ids) order by y.id
  loop
    if r.version is distinct from (p_esperadas ->> r.id::text)::timestamptz then
      select coalesce(v.titulo, i.descripcion) into v_titulo
        from (select 1) uno left join public.vehiculos v on v.id = r.vehiculo_id left join public.repuestos_items i on i.id = r.repuesto_id;
      raise exception 'Otra persona cambió «%» mientras editabas el grupo. Recarga.', v_titulo using errcode = 'PT409';
    end if;
  end loop;
  -- Por unidad, lo que vería y su validación (la regla del flujo y de la fase de cada una).
  for r in select y.* from public.transportes_con_embarque y where y.id = any (v_ids) order by y.id loop
    o := row(r.vehiculo_id, r.repuesto_id, r.sigue_al_vehiculo, r.contenedor, r.booking, r.naviera_id, r.puerto_origen_id, r.puerto_destino_id,
             r.zarpe_el, r.eta_el, r.arribo_el, r.notas)::public.datos_de_transporte;
    n := public._transporte_cambios(o, p_cambios, v_claves);
    if p_cambios ? p_tipo then
      v_nueva := case when p_tipo = 'booking' then n.booking else n.contenedor end;
    end if;
    if (n.naviera_id, n.puerto_origen_id, n.puerto_destino_id, n.contenedor, n.booking, n.zarpe_el, n.eta_el, n.arribo_el)
       is distinct from
       (o.naviera_id, o.puerto_origen_id, o.puerto_destino_id, o.contenedor, o.booking, o.zarpe_el, o.eta_el, o.arribo_el) then
      select * into u from public._transporte_unidad(r.vehiculo_id, r.repuesto_id, false);
      perform public._transporte_validar(u.flujo, u.fase_id, o, n, u.titulo);
      v_cambia := true;
    end if;
  end loop;
  if v_cambia then
    -- 1 · El contenedor.
    if p_cambios ? 'contenedor' and p_tipo = 'contenedor' then
      if pz.contenedor is null then
        -- Vaciarlo deja a sus unidades directas en el embarque del contenedor (o sueltas, con lo que ven).
        for r in select y.id, c.embarque_id from public.transportes y join public.contenedores c on c.id = y.contenedor_id
                  where y.id = any (v_ids) order by y.id loop
          perform public._transporte_mudar(r.id, null, r.embarque_id);
        end loop;
      elsif pz.contenedor <> v_clave then
        for r in select y.id, y.origen_id from public.contenedores y where y.id = any (v_cont_ids) order by y.id loop
          begin
            update public.contenedores y set numero = pz.contenedor, actualizado_por = (select auth.uid()) where y.id = r.id;
          exception when unique_violation then
            raise exception 'Ya hay un contenedor «%» en «%».', pz.contenedor, public._origen_en_frase(r.origen_id)
              using errcode = '23505', hint = 'contenedor';
          end;
        end loop;
      end if;
    elsif p_cambios ? 'contenedor' then
      -- En un grupo por booking, cada unidad va al contenedor tipeado de su origen (que se crea en su embarque si falta).
      for r in select y.id, y.vehiculo_id, y.repuesto_id, y.contenedor_id, y.embarque_id from public.transportes_con_embarque y
                where y.id = any (v_ids) order by y.id loop
        if pz.contenedor is null then
          perform public._transporte_mudar(r.id, null, r.embarque_id);
        else
          select q.id, q.creado into v_id, v_creado
            from public._contenedor_resolver(public._transporte_origen(r.vehiculo_id, r.repuesto_id), pz.contenedor, r.embarque_id, true) q;
          select y.id, y.numero, y.embarque_id, eb.booking into v_destino
            from public.contenedores y left join public.embarques eb on eb.id = y.embarque_id where y.id = v_id;
          if v_destino.embarque_id is not null and v_destino.embarque_id is distinct from r.embarque_id then
            raise exception 'El contenedor «%» va en el booking «%».', v_destino.numero, v_destino.booking using errcode = '23514', hint = 'contenedor';
          end if;
          if v_destino.embarque_id is null and r.embarque_id is not null then
            if not v_creado and not public._contenedor_editable(v_id) then
              raise exception 'Hay unidades del contenedor «%» que no puedes editar.', v_destino.numero using errcode = '42501';
            end if;
            perform public._contenedor_mudar(v_id, r.embarque_id);
          end if;
          perform public._transporte_mudar(r.id, v_id, null);
        end if;
      end loop;
    end if;
    -- 2 · El booking.
    if p_cambios ? 'booking' and p_tipo = 'booking' then
      if pz.booking is null then
        -- Un booking vacío desengancha contenedores y unidades: se quedan con lo que veían.
        for r in select y.id from public.contenedores y where y.embarque_id = any (v_emb_ids) order by y.id loop   -- contenedores_embarque_idx
          perform public._contenedor_mudar(r.id, null);
        end loop;
        for r in select y.id from public.transportes y where y.id = any (v_ids) and y.embarque_id is not null order by y.id loop
          perform public._transporte_mudar(r.id, null, null);
        end loop;
      elsif pz.booking <> v_clave then
        for r in select y.id, y.origen_id from public.embarques y where y.id = any (v_emb_ids) order by y.id loop
          begin
            update public.embarques y set booking = pz.booking, actualizado_por = (select auth.uid()) where y.id = r.id;
          exception when unique_violation then
            raise exception 'Ya hay un embarque «%» en «%».', pz.booking, public._origen_en_frase(r.origen_id) using errcode = '23505', hint = 'booking';
          end;
        end loop;
      end if;
    elsif p_cambios ? 'booking' then
      -- En un grupo por contenedor, cada contenedor entra al embarque tipeado de su origen (que se crea si falta) o sale copiando. Si el
      -- contenedor se vació en el paso 1, la que se muda es cada unidad.
      if p_cambios ? 'contenedor' and pz.contenedor is null then
        for r in select y.id, y.vehiculo_id, y.repuesto_id from public.transportes y where y.id = any (v_ids) order by y.id loop
          v_id := null;
          if pz.booking is not null then
            select x.vehiculo_id, x.repuesto_id, x.sigue_al_vehiculo, x.contenedor, x.booking, x.naviera_id, x.puerto_origen_id, x.puerto_destino_id,
                   x.zarpe_el, x.eta_el, x.arribo_el, x.notas
              into d from public.transportes_con_embarque x where x.id = r.id;
            select q.id into v_id from public._embarque_resolver(public._transporte_origen(r.vehiculo_id, r.repuesto_id), pz.booking,
                                                                 public._transporte_cambios(d, p_cambios, v_claves), true) q;
          end if;
          perform public._transporte_mudar(r.id, null, v_id);
        end loop;
      else
        for r in select y.id, y.origen_id from public.contenedores y where y.id = any (v_cont_ids) order by y.id loop
          v_id := null;
          if pz.booking is not null then
            -- Nace con lo que ve su primera unidad, con los cambios.
            select x.vehiculo_id, x.repuesto_id, x.sigue_al_vehiculo, x.contenedor, x.booking, x.naviera_id, x.puerto_origen_id, x.puerto_destino_id,
                   x.zarpe_el, x.eta_el, x.arribo_el, x.notas
              into d from public.transportes_con_embarque x where x.contenedor_id = r.id order by x.id limit 1;
            select q.id into v_id from public._embarque_resolver(r.origen_id, pz.booking, public._transporte_cambios(d, p_cambios, v_claves), true) q;
          end if;
          perform public._contenedor_mudar(r.id, v_id);
        end loop;
      end if;
    end if;
    -- 3 · La naviera, los puertos y las fechas: en cada embarque que ven las unidades del grupo (si se pueden editar todas sus unidades); sin
    -- embarque, en lo propio.
    if v_datos then
      for r in select distinct y.embarque_id from public.transportes_con_embarque y where y.id = any (v_ids) and y.embarque_id is not null loop
        if not public._embarque_editable(r.embarque_id) then
          raise exception 'Hay unidades del grupo que no puedes editar.' using errcode = '42501';
        end if;
        select null::uuid, null::uuid, false, null::text, null::text, x.naviera_id, x.puerto_origen_id, x.puerto_destino_id, x.zarpe_el, x.eta_el,
               x.arribo_el, null::text
          into d from public.embarques x where x.id = r.embarque_id;
        perform public._embarque_escribir_datos(r.embarque_id, public._transporte_cambios(d, p_cambios - 'contenedor' - 'booking', v_claves));
      end loop;
      for r in select y.id, y.naviera_id, y.puerto_origen_id, y.puerto_destino_id, y.zarpe_el, y.eta_el, y.arribo_el
                 from public.transportes_con_embarque y where y.id = any (v_ids) and y.embarque_id is null order by y.id loop
        d := public._transporte_cambios(row(null, null, false, null, null, r.naviera_id, r.puerto_origen_id, r.puerto_destino_id, r.zarpe_el,
                                            r.eta_el, r.arribo_el, null)::public.datos_de_transporte, p_cambios - 'contenedor' - 'booking', v_claves);
        update public.transportes y
           set naviera_id = d.naviera_id, puerto_origen_id = d.puerto_origen_id, puerto_destino_id = d.puerto_destino_id, zarpe_el = d.zarpe_el,
               eta_el = d.eta_el, arribo_el = d.arribo_el, actualizado_por = (select auth.uid())
         where y.id = r.id
           and (y.naviera_id, y.puerto_origen_id, y.puerto_destino_id, y.zarpe_el, y.eta_el, y.arribo_el)
               is distinct from (d.naviera_id, d.puerto_origen_id, d.puerto_destino_id, d.zarpe_el, d.eta_el, d.arribo_el);
      end loop;
    end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('transporte_id', y.id,
                                               'actualizado_en', greatest(y.actualizado_en, y.contenedor_actualizado_en, y.embarque_actualizado_en))
                            order by y.id), '[]'::jsonb)
    into v_unidades
    from public.transportes_con_embarque y where y.id = any (v_ids);
  return jsonb_build_object('tipo', p_tipo, 'clave', v_nueva, 'unidades', v_unidades, 'sin_cambios', not v_cambia);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 10. Leer el transporte de un vehículo: lo que ve (como hoy) y, aparte, su embarque y su contenedor con su estado y cuántos vehículos llevan.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

-- Cuántos vehículos lleva un embarque o un contenedor, contando sólo los que la persona ve (hasta 100: `hay_mas` con 101 visibles) y si hay
-- alguno que no ve. Lee a lo sumo 1.000 unidades: con más, las ocultas de más allá no se avisan.
create or replace function public._vehiculos_de(p_embarque uuid, p_contenedor uuid) returns jsonb
  language sql stable security definer
  set search_path = ''
as $$
  select jsonb_build_object('n', least(count(*) filter (where x.visible), 100), 'hay_mas', count(*) filter (where x.visible) > 100,
                            'hay_ocultas', coalesce(bool_or(not x.visible), false))
    from (select public.puede_vehiculo(u.vehiculo_id, 'logistica.ver') as visible
            from public._unidades_de(p_embarque, p_contenedor) u
           where u.vehiculo_id is not null
           limit 1000) x;
$$;
revoke all on function public._vehiculos_de(uuid, uuid) from public, anon, authenticated;
grant execute on function public._vehiculos_de(uuid, uuid) to service_role;

create or replace function public.transporte_leer(p_vehiculo uuid) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare x record; c record; v_embarque jsonb; v_contenedor jsonb;
begin
  perform public.assert_activo();
  if not public.puede_vehiculo(p_vehiculo, 'logistica.ver') then
    raise exception 'No tienes permiso para ver el transporte de este vehículo.' using errcode = '42501';
  end if;
  select * into x from public.transportes_con_embarque y where y.vehiculo_id = p_vehiculo;          -- transportes_vehiculo_id_key
  if x.id is null then
    return null;
  end if;
  if x.embarque_id is not null then
    v_embarque := jsonb_build_object('id', x.embarque_id, 'booking', x.booking, 'actualizado_en', x.embarque_actualizado_en,
                                     'estado', public.embarque_estado(x.embarque_id), 'vehiculos', public._vehiculos_de(x.embarque_id, null));
  end if;
  if x.contenedor_id is not null then
    select y.id, y.numero, y.tipo, y.sello, y.actualizado_en into c from public.contenedores y where y.id = x.contenedor_id;   -- contenedores_pkey
    v_contenedor := jsonb_build_object('id', c.id, 'numero', c.numero, 'tipo', c.tipo, 'sello', c.sello, 'actualizado_en', c.actualizado_en,
                                       'estado', public.contenedor_estado(c.id), 'vehiculos', public._vehiculos_de(null, c.id));
  end if;
  return jsonb_build_object('id', x.id, 'naviera_id', x.naviera_id, 'puerto_origen_id', x.puerto_origen_id, 'puerto_destino_id', x.puerto_destino_id,
                            'contenedor', x.contenedor, 'booking', x.booking, 'zarpe_el', x.zarpe_el, 'eta_el', x.eta_el, 'arribo_el', x.arribo_el,
                            'notas', x.notas, 'actualizado_en', x.actualizado_en,
                            'entidades', jsonb_build_object('embarque', v_embarque, 'contenedor', v_contenedor));
end;
$$;
comment on function public.transporte_leer(uuid) is
  'El transporte de un vehículo como lo ve la persona (sus datos resueltos y la versión de la fila) y, en `entidades`, su embarque y su contenedor con versión, estado y cuántos vehículos visibles llevan (hasta 100).';
revoke all on function public.transporte_leer(uuid) from public, anon;
grant execute on function public.transporte_leer(uuid) to authenticated, service_role;
