-- Los embarques y los contenedores se crean y se editan por sí mismos (la pantalla de embarques): `embarque_crear`, `embarque_guardar`,
-- `contenedor_crear` y `contenedor_guardar`. Crear es idempotente por el id del intento; guardar pasa por la versión, por poder editar todas las
-- unidades que cambian (`_embarque_editable`, `_contenedor_editable`) y por lo que exige la fase de cada una (los triggers `trg_embarque_exigido`
-- y `trg_contenedor_exigido`). Candados en el orden de siempre: embarques → contenedores → unidades (`for share`).

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 1. Ayudantes: el permiso de crear en un origen, los catálogos del embarque y los datos de un contenedor.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

-- Crear un embarque o un contenedor en un origen: `logistica.transporte.editar` en ese origen (con cualquier alcance: nace sin unidades); sin
-- origen, `repuestos.editar`.
create or replace function public._entidad_creable(p_origen uuid) returns boolean
  language sql stable security definer
  set search_path = ''
as $$
  select case when p_origen is null then public.tiene_permiso('repuestos.editar')
              else public.alcance_de('logistica.transporte.editar', p_origen) is not null end;
$$;
revoke all on function public._entidad_creable(uuid) from public, anon, authenticated;
grant execute on function public._entidad_creable(uuid) to service_role;

-- La naviera y los puertos nuevos de un embarque: activos, del origen o compartidos y, si la oferta de su tipo no está vacía, ofrecidos en el
-- flujo de vehículos del origen (sin origen, en el de repuestos). Lo ya guardado no se revalida. Las fechas, si cambia alguna.
create or replace function public._embarque_validar(p_origen uuid, o public.datos_de_transporte, n public.datos_de_transporte)
  returns void
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_flujo uuid; c record;
begin
  if p_origen is null then
    select f.id into v_flujo from public.flujos f where f.ambito = 'repuestos';                            -- flujos_repuestos_unico
  else
    select f.id into v_flujo from public.flujos f where f.ambito = 'vehiculos' and f.origen_id = p_origen; -- flujos_origen_unico
  end if;
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
        raise exception '% no existe o está inactiva.', c.sujeto using errcode = '22023', hint = c.campo;
      end if;
      if exists (select 1 from public.navieras v where v.id = c.nuevo and v.origen_id is not null and v.origen_id is distinct from p_origen) then
        raise exception '% es de otro origen.', c.sujeto using errcode = '22023', hint = c.campo;
      end if;
      if exists (select 1 from public.flujos_transporte_oferta t where t.flujo_id = v_flujo and t.tipo = 'naviera')
         and not exists (select 1 from public.flujos_transporte_oferta t where t.flujo_id = v_flujo and t.tipo = 'naviera' and t.naviera_id = c.nuevo) then
        raise exception '% no se ofrece en este origen.', c.sujeto using errcode = '23514', hint = c.campo;
      end if;
    else
      if not exists (select 1 from public.puertos v where v.id = c.nuevo and v.activo) then
        raise exception '% no existe o está inactivo.', c.sujeto using errcode = '22023', hint = c.campo;
      end if;
      if exists (select 1 from public.puertos v where v.id = c.nuevo and v.origen_id is not null and v.origen_id is distinct from p_origen) then
        raise exception '% es de otro origen.', c.sujeto using errcode = '22023', hint = c.campo;
      end if;
      if exists (select 1 from public.flujos_transporte_oferta t where t.flujo_id = v_flujo and t.tipo = c.tipo)
         and not exists (select 1 from public.flujos_transporte_oferta t where t.flujo_id = v_flujo and t.tipo = c.tipo and t.puerto_id = c.nuevo) then
        raise exception '% no se ofrece en este origen.', c.sujeto using errcode = '23514', hint = c.campo;
      end if;
    end if;
  end loop;
  if (n.zarpe_el, n.eta_el, n.arribo_el) is distinct from (o.zarpe_el, o.eta_el, o.arribo_el) then
    if n.eta_el < n.zarpe_el then
      raise exception 'La ETA no puede ser antes del zarpe.' using errcode = '22023', hint = 'eta_el';
    end if;
    if n.arribo_el < n.zarpe_el then
      raise exception 'El arribo no puede ser antes del zarpe.' using errcode = '22023', hint = 'arribo_el';
    end if;
  end if;
end;
$$;
revoke all on function public._embarque_validar(uuid, public.datos_de_transporte, public.datos_de_transporte) from public, anon, authenticated;
grant execute on function public._embarque_validar(uuid, public.datos_de_transporte, public.datos_de_transporte) to service_role;

-- El zarpe estimado de unos cambios (la única clave del embarque que no está en `datos_de_transporte`): AAAA-MM-DD o nulo.
create or replace function public._zarpe_estimado(p_cambios jsonb, p_actual date) returns date
  language plpgsql stable
  set search_path = ''
as $$
declare v text;
begin
  if p_cambios is null or not (p_cambios ? 'zarpe_estimado_el') then
    return p_actual;
  end if;
  if jsonb_typeof(p_cambios -> 'zarpe_estimado_el') not in ('string', 'null') then
    raise exception 'El valor de «zarpe_estimado_el» no es válido.' using errcode = '22023', hint = 'zarpe_estimado_el';
  end if;
  v := p_cambios ->> 'zarpe_estimado_el';
  if v is not null and (v !~ '^\d{4}-\d{2}-\d{2}$' or not pg_input_is_valid(v, 'date')) then
    raise exception 'La fecha de «zarpe_estimado_el» no es válida.' using errcode = '22023', hint = 'zarpe_estimado_el';
  end if;
  return v::date;
end;
$$;
revoke all on function public._zarpe_estimado(jsonb, date) from public, anon, authenticated;
grant execute on function public._zarpe_estimado(jsonb, date) to service_role;

-- Los datos de un contenedor tras unos cambios (`numero`, `tipo`, `sello`, `embarque_id`, `notas`), partiendo de los actuales. El número se
-- normaliza como el contenedor de una unidad; un tipo nuevo, del catálogo y activo; el embarque, un uuid (su origen lo mira quien llama).
create or replace function public._contenedor_cambios(p_cambios jsonb, p_numero text, p_tipo text, p_sello text, p_embarque uuid, p_notas text,
  out numero text, out tipo text, out sello text, out embarque_id uuid, out notas text)
  language plpgsql stable security definer
  set search_path = ''
as $$
declare k text; v text;
begin
  numero := p_numero; tipo := p_tipo; sello := p_sello; embarque_id := p_embarque; notas := p_notas;
  if p_cambios is null then
    return;
  end if;
  if jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios van como un objeto.' using errcode = '22023', hint = 'cambios';
  end if;
  for k in select x from jsonb_object_keys(p_cambios) x order by x loop
    if k not in ('numero', 'tipo', 'sello', 'embarque_id', 'notas') then
      raise exception 'No se cambia «%».', k using errcode = '22023', hint = k;
    end if;
    if jsonb_typeof(p_cambios -> k) not in ('string', 'null') then
      raise exception 'El valor de «%» no es válido.', k using errcode = '22023', hint = k;
    end if;
    v := p_cambios ->> k;
    if k = 'numero' then
      v := nullif(upper(regexp_replace(v, '\s', '', 'g')), '');
      if v is not null and v !~ '^[A-Z0-9./-]{1,40}$' then
        raise exception 'El contenedor lleva sólo letras, dígitos, punto, barra o guion (hasta 40).' using errcode = '22023', hint = 'numero';
      end if;
      numero := v;
    elsif k = 'tipo' then
      v := nullif(btrim(v), '');
      if v is not null and v is distinct from p_tipo
         and not exists (select 1 from public.tipos_contenedor t where t.clave = v and t.activo) then                -- tipos_contenedor_pkey
        raise exception 'Ese tipo de contenedor no existe o está inactivo.' using errcode = '22023', hint = 'tipo';
      end if;
      tipo := v;
    elsif k = 'sello' then
      v := nullif(btrim(v), '');
      if length(v) > 40 then
        raise exception 'El sello lleva hasta 40 caracteres.' using errcode = '22023', hint = 'sello';
      end if;
      sello := v;
    elsif k = 'embarque_id' then
      if v is not null and not pg_input_is_valid(v, 'uuid') then
        raise exception 'El valor de «embarque_id» no es válido.' using errcode = '22023', hint = 'embarque_id';
      end if;
      embarque_id := v::uuid;
    else
      v := nullif(btrim(v), '');
      if length(v) > 2000 then
        raise exception 'Las notas llevan hasta 2.000 caracteres.' using errcode = '22023', hint = 'notas';
      end if;
      notas := v;
    end if;
  end loop;
end;
$$;
revoke all on function public._contenedor_cambios(jsonb, text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public._contenedor_cambios(jsonb, text, text, text, uuid, text) to service_role;

-- El embarque de un contenedor: existe y es de su mismo origen.
create or replace function public._contenedor_embarque_valido(p_origen uuid, p_embarque uuid) returns void
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_origen uuid; v_hay boolean;
begin
  if p_embarque is null then
    return;
  end if;
  select e.origen_id, true into v_origen, v_hay from public.embarques e where e.id = p_embarque;                        -- embarques_pkey
  if not coalesce(v_hay, false) then
    raise exception 'Ese embarque ya no existe. Recarga.' using errcode = 'PT409', hint = 'embarque_id';
  end if;
  if v_origen is distinct from p_origen then
    raise exception 'Ese embarque es de otro origen.' using errcode = '22023', hint = 'embarque_id';
  end if;
end;
$$;
revoke all on function public._contenedor_embarque_valido(uuid, uuid) from public, anon, authenticated;
grant execute on function public._contenedor_embarque_valido(uuid, uuid) to service_role;

-- Toma `for share` las unidades vivas de un embarque o un contenedor (después de su candado): nadie las mueve de fase mientras cambian sus datos.
create or replace function public._entidad_bloquear_unidades(p_embarque uuid, p_contenedor uuid) returns void
  language plpgsql security definer
  set search_path = ''
as $$
begin
  perform public._transporte_grupo_bloquear(
    array(select u.vehiculo_id from public._unidades_de(p_embarque, p_contenedor) u where u.vehiculo_id is not null),
    array(select u.repuesto_id from public._unidades_de(p_embarque, p_contenedor) u where u.repuesto_id is not null));
end;
$$;
revoke all on function public._entidad_bloquear_unidades(uuid, uuid) from public, anon, authenticated;
grant execute on function public._entidad_bloquear_unidades(uuid, uuid) to service_role;

-- La respuesta de las cuatro RPC.
create or replace function public._entidad_respuesta(p_id uuid, p_actualizado_en timestamptz, p_estado text, p_sin_cambios boolean,
  p_ya_existia boolean default false) returns jsonb
  language sql immutable
  set search_path = ''
as $$
  select jsonb_build_object('id', p_id, 'actualizado_en', p_actualizado_en, 'estado', p_estado, 'sin_cambios', p_sin_cambios)
         || case when p_ya_existia then jsonb_build_object('ya_existia', true) else '{}'::jsonb end;
$$;
revoke all on function public._entidad_respuesta(uuid, timestamptz, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public._entidad_respuesta(uuid, timestamptz, text, boolean, boolean) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 2. Embarques.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

-- Crea un embarque con el id del intento: un reintento con el mismo id devuelve el que ya está (`ya_existia`) y nunca pisa. Un booking que ya
-- existe en el origen: 23505 hint booking.
create or replace function public.embarque_crear(p_id uuid, p_origen uuid, p_datos jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  c_claves constant text[] := array['booking', 'naviera_id', 'puerto_origen_id', 'puerto_destino_id', 'zarpe_el', 'eta_el', 'arribo_el', 'notas'];
  e record; n public.datos_de_transporte; v_zarpe_est date;
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el identificador del embarque.' using errcode = '23502', hint = 'id';
  end if;
  if not public._entidad_creable(p_origen) then
    raise exception 'No tienes permiso para crear embarques en este origen.' using errcode = '42501';
  end if;
  n := public._transporte_cambios(null::public.datos_de_transporte, p_datos - 'zarpe_estimado_el', c_claves);
  v_zarpe_est := public._zarpe_estimado(p_datos, null);
  select x.id, x.origen_id, x.booking, x.actualizado_en into e from public.embarques x where x.id = p_id;                -- embarques_pkey
  if e.id is null then
    if n.booking is null then
      raise exception 'Falta el booking.' using errcode = '23502', hint = 'booking';
    end if;
    perform public._embarque_validar(p_origen, null::public.datos_de_transporte, n);
    begin
      insert into public.embarques (id, origen_id, booking, naviera_id, puerto_origen_id, puerto_destino_id, zarpe_estimado_el, zarpe_el, eta_el,
                                    arribo_el, notas, creado_por, actualizado_por)
      values (p_id, p_origen, n.booking, n.naviera_id, n.puerto_origen_id, n.puerto_destino_id, v_zarpe_est, n.zarpe_el, n.eta_el, n.arribo_el,
              n.notas, (select auth.uid()), (select auth.uid()))
      returning embarques.actualizado_en into e.actualizado_en;
      return public._entidad_respuesta(p_id, e.actualizado_en, public.embarque_estado(p_id), false);
    exception when unique_violation then
      -- Otro intento con el mismo id se adelantó, o el booking ya existe en el origen.
      select x.id, x.origen_id, x.booking, x.actualizado_en into e from public.embarques x where x.id = p_id;
      if e.id is null then
        raise exception 'Ya hay un embarque «%» en «%».', n.booking, public._origen_en_frase(p_origen) using errcode = '23505', hint = 'booking';
      end if;
    end;
  end if;
  if e.origen_id is distinct from p_origen or (n.booking is not null and e.booking is distinct from n.booking) then
    raise exception 'Ese id ya es de otro embarque.' using errcode = '23505', hint = 'id';
  end if;
  return public._entidad_respuesta(e.id, e.actualizado_en, public.embarque_estado(e.id), true, true);
end;
$$;
comment on function public.embarque_crear(uuid, uuid, jsonb) is
  'Crea un embarque (booking, naviera, puertos, fechas, notas) en un origen (nulo = de repuestos). Idempotente por p_id. Devuelve {id, actualizado_en, estado, sin_cambios} (y ya_existia en un reintento).';
revoke all on function public.embarque_crear(uuid, uuid, jsonb) from public, anon;
grant execute on function public.embarque_crear(uuid, uuid, jsonb) to authenticated, service_role;

-- Guarda un embarque: renombrar el booking (23505 si ya existe en el origen), naviera, puertos, fechas y notas. Cambia para todas sus unidades:
-- hace falta poder editarlas todas, y la fase de cada una dice lo que no se puede vaciar (trg_embarque_exigido).
create or replace function public.embarque_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  c_claves constant text[] := array['booking', 'naviera_id', 'puerto_origen_id', 'puerto_destino_id', 'zarpe_el', 'eta_el', 'arribo_el', 'notas'];
  e record; o public.datos_de_transporte; n public.datos_de_transporte; v_zarpe_est date; v_version timestamptz;
begin
  perform public.assert_activo();
  select x.id, x.origen_id, x.booking, x.naviera_id, x.puerto_origen_id, x.puerto_destino_id, x.zarpe_estimado_el, x.zarpe_el, x.eta_el,
         x.arribo_el, x.notas, x.actualizado_en
    into e from public.embarques x where x.id = p_id for no key update;                                                 -- embarques_pkey
  if e.id is null then
    raise exception 'Este embarque ya no existe. Recarga.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  if not public._entidad_creable(e.origen_id) then
    raise exception 'No tienes permiso para editar los embarques de este origen.' using errcode = '42501';
  end if;
  if not public._embarque_editable(p_id) then
    raise exception 'Hay unidades del embarque «%» que no puedes editar.', e.booking using errcode = '42501';
  end if;
  perform public._entidad_bloquear_unidades(p_id, null);
  if p_actualizado_en_esperado is null then
    perform public._exigir_version(e.actualizado_en, p_actualizado_en_esperado, null);
  end if;
  if e.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('embarques', p_id, e.actualizado_en, format('el embarque «%s»', e.booking));
  end if;
  o := row(null, null, false, null, e.booking, e.naviera_id, e.puerto_origen_id, e.puerto_destino_id, e.zarpe_el, e.eta_el, e.arribo_el,
           e.notas)::public.datos_de_transporte;
  n := public._transporte_cambios(o, p_cambios - 'zarpe_estimado_el', c_claves);
  v_zarpe_est := public._zarpe_estimado(p_cambios, e.zarpe_estimado_el);
  if n.booking is null then
    raise exception 'El booking no puede quedar vacío.' using errcode = '23502', hint = 'booking';
  end if;
  if n is not distinct from o and v_zarpe_est is not distinct from e.zarpe_estimado_el then
    return public._entidad_respuesta(p_id, e.actualizado_en, public.embarque_estado(p_id), true);
  end if;
  perform public._embarque_validar(e.origen_id, o, n);
  begin
    update public.embarques x
       set booking = n.booking, naviera_id = n.naviera_id, puerto_origen_id = n.puerto_origen_id, puerto_destino_id = n.puerto_destino_id,
           zarpe_estimado_el = v_zarpe_est, zarpe_el = n.zarpe_el, eta_el = n.eta_el, arribo_el = n.arribo_el, notas = n.notas,
           actualizado_por = (select auth.uid())
     where x.id = p_id
    returning x.actualizado_en into v_version;
  exception when unique_violation then
    raise exception 'Ya hay un embarque «%» en «%».', n.booking, public._origen_en_frase(e.origen_id) using errcode = '23505', hint = 'booking';
  end;
  return public._entidad_respuesta(p_id, v_version, public.embarque_estado(p_id), false);
end;
$$;
comment on function public.embarque_guardar(uuid, timestamptz, jsonb) is
  'Guarda un embarque (booking, naviera, puertos, zarpe estimado, fechas, notas) con su versión; cambia para todas sus unidades. Devuelve {id, actualizado_en, estado, sin_cambios}.';
revoke all on function public.embarque_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.embarque_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 3. Contenedores.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

-- Crea un contenedor con el id del intento (idempotente como embarque_crear), en un embarque de su mismo origen o sin embarque.
create or replace function public.contenedor_crear(p_id uuid, p_origen uuid, p_datos jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare c record; d record; v_version timestamptz;
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el identificador del contenedor.' using errcode = '23502', hint = 'id';
  end if;
  if not public._entidad_creable(p_origen) then
    raise exception 'No tienes permiso para crear contenedores en este origen.' using errcode = '42501';
  end if;
  select * into d from public._contenedor_cambios(p_datos, null, null, null, null, null);
  select x.id, x.origen_id, x.numero, x.actualizado_en into c from public.contenedores x where x.id = p_id;            -- contenedores_pkey
  if c.id is null then
    if d.numero is null then
      raise exception 'Falta el número del contenedor.' using errcode = '23502', hint = 'numero';
    end if;
    if d.embarque_id is not null then
      -- El embarque antes que el contenedor (el orden de los candados).
      perform 1 from public.embarques e where e.id = d.embarque_id for no key update;                                    -- embarques_pkey
      perform public._contenedor_embarque_valido(p_origen, d.embarque_id);
    end if;
    begin
      insert into public.contenedores (id, origen_id, numero, tipo, sello, embarque_id, notas, creado_por, actualizado_por)
      values (p_id, p_origen, d.numero, d.tipo, d.sello, d.embarque_id, d.notas, (select auth.uid()), (select auth.uid()))
      returning contenedores.actualizado_en into v_version;
      return public._entidad_respuesta(p_id, v_version, public.contenedor_estado(p_id), false);
    exception when unique_violation then
      select x.id, x.origen_id, x.numero, x.actualizado_en into c from public.contenedores x where x.id = p_id;
      if c.id is null then
        raise exception 'Ya hay un contenedor «%» en «%».', d.numero, public._origen_en_frase(p_origen) using errcode = '23505', hint = 'numero';
      end if;
    end;
  end if;
  if c.origen_id is distinct from p_origen or (d.numero is not null and c.numero is distinct from d.numero) then
    raise exception 'Ese id ya es de otro contenedor.' using errcode = '23505', hint = 'id';
  end if;
  return public._entidad_respuesta(c.id, c.actualizado_en, public.contenedor_estado(c.id), true, true);
end;
$$;
comment on function public.contenedor_crear(uuid, uuid, jsonb) is
  'Crea un contenedor (número, tipo, sello, embarque_id del mismo origen, notas) en un origen (nulo = de repuestos). Idempotente por p_id. Devuelve {id, actualizado_en, estado, sin_cambios} (y ya_existia en un reintento).';
revoke all on function public.contenedor_crear(uuid, uuid, jsonb) from public, anon;
grant execute on function public.contenedor_crear(uuid, uuid, jsonb) to authenticated, service_role;

-- Guarda un contenedor: número (23505 si ya existe en el origen), tipo, sello, notas y su embarque. Entrar a un embarque o salir de él cambia lo
-- que ven sus unidades (al salir, copian los datos del embarque): hace falta poder editarlas todas, y la fase de cada una lo exige
-- (trg_contenedor_exigido).
create or replace function public.contenedor_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare c record; d record; v_antes uuid; v_version timestamptz;
begin
  perform public.assert_activo();
  -- Los embarques (el de ahora y el nuevo) antes que el contenedor.
  select x.embarque_id into v_antes from public.contenedores x where x.id = p_id;                                        -- contenedores_pkey
  perform public._transporte_bloquear_entidades(
    array_remove(array[v_antes, case when p_cambios ? 'embarque_id' and pg_input_is_valid(p_cambios ->> 'embarque_id', 'uuid')
                                     then (p_cambios ->> 'embarque_id')::uuid end], null),
    array[p_id]);
  select x.id, x.origen_id, x.numero, x.tipo, x.sello, x.embarque_id, x.notas, x.actualizado_en
    into c from public.contenedores x where x.id = p_id;
  if c.id is null then
    raise exception 'Este contenedor ya no existe. Recarga.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  if not public._entidad_creable(c.origen_id) then
    raise exception 'No tienes permiso para editar los contenedores de este origen.' using errcode = '42501';
  end if;
  if not public._contenedor_editable(p_id) then
    raise exception 'Hay unidades del contenedor «%» que no puedes editar.', c.numero using errcode = '42501';
  end if;
  perform public._entidad_bloquear_unidades(null, p_id);
  if p_actualizado_en_esperado is null then
    perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, null);
  end if;
  if c.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('contenedores', p_id, c.actualizado_en, format('el contenedor «%s»', c.numero));
  end if;
  select * into d from public._contenedor_cambios(p_cambios, c.numero, c.tipo, c.sello, c.embarque_id, c.notas);
  if d.numero is null then
    raise exception 'El número del contenedor no puede quedar vacío.' using errcode = '23502', hint = 'numero';
  end if;
  if (d.numero, d.tipo, d.sello, d.embarque_id, d.notas) is not distinct from (c.numero, c.tipo, c.sello, c.embarque_id, c.notas) then
    return public._entidad_respuesta(p_id, c.actualizado_en, public.contenedor_estado(p_id), true);
  end if;
  if d.embarque_id is distinct from c.embarque_id then
    perform public._contenedor_embarque_valido(c.origen_id, d.embarque_id);
    perform public._contenedor_mudar(p_id, d.embarque_id);
  end if;
  begin
    update public.contenedores x
       set numero = d.numero, tipo = d.tipo, sello = d.sello, notas = d.notas, actualizado_por = (select auth.uid())
     where x.id = p_id
       and (x.numero, x.tipo, x.sello, x.notas) is distinct from (d.numero, d.tipo, d.sello, d.notas);
  exception when unique_violation then
    raise exception 'Ya hay un contenedor «%» en «%».', d.numero, public._origen_en_frase(c.origen_id) using errcode = '23505', hint = 'numero';
  end;
  select x.actualizado_en into v_version from public.contenedores x where x.id = p_id;
  return public._entidad_respuesta(p_id, v_version, public.contenedor_estado(p_id), false);
end;
$$;
comment on function public.contenedor_guardar(uuid, timestamptz, jsonb) is
  'Guarda un contenedor (número, tipo, sello, notas, embarque_id) con su versión; entrar a un embarque o salir de él cambia lo que ven sus unidades. Devuelve {id, actualizado_en, estado, sin_cambios}.';
revoke all on function public.contenedor_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.contenedor_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;
