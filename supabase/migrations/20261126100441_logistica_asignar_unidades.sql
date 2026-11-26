-- Asignar unidades en lote a un contenedor o a un embarque, y quitarlas (las pantallas de embarques): `transporte_asignar` y
-- `transporte_quitar`. Todo o nada, hasta 200 unidades por vez, cada una con su versión. Candados en el orden de siempre: embarques →
-- contenedores → unidades (`for share`) → filas de transportes.

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 1. Ayudantes: el lote, el destino, los candados de un lote y lo que devuelve.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

-- El lote: `[{vehiculo_id | repuesto_id, actualizado_en | null}]`, de 1 a 200 y sin repetidos, en su orden (`k`).
create or replace function public._transporte_lote(p_unidades jsonb)
  returns table (k bigint, vehiculo_id uuid, repuesto_id uuid, actualizado_en timestamptz)
  language plpgsql stable
  set search_path = ''
as $$
declare r record; v_vistos text[] := '{}'::text[]; v_clave text;
begin
  if p_unidades is null or jsonb_typeof(p_unidades) <> 'array' or jsonb_array_length(p_unidades) not between 1 and 200 then
    raise exception 'Hasta 200 unidades por vez.' using errcode = '22023', hint = 'unidades';
  end if;
  for r in select x.e, x.n from jsonb_array_elements(p_unidades) with ordinality x (e, n) loop
    if jsonb_typeof(r.e) <> 'object'
       or exists (select 1 from jsonb_object_keys(r.e) c where c not in ('vehiculo_id', 'repuesto_id', 'actualizado_en'))
       or num_nonnulls(r.e ->> 'vehiculo_id', r.e ->> 'repuesto_id') <> 1
       or not pg_input_is_valid(coalesce(r.e ->> 'vehiculo_id', r.e ->> 'repuesto_id'), 'uuid')
       or (r.e ->> 'actualizado_en' is not null and not pg_input_is_valid(r.e ->> 'actualizado_en', 'timestamptz')) then
      raise exception 'La unidad % del lote no es válida.', r.n using errcode = '22023', hint = 'unidades';
    end if;
    v_clave := case when r.e ? 'vehiculo_id' and r.e ->> 'vehiculo_id' is not null then 'v' || (r.e ->> 'vehiculo_id')::uuid
                    else 'r' || (r.e ->> 'repuesto_id')::uuid end;
    if v_clave = any (v_vistos) then
      raise exception 'Cada unidad va una sola vez en el lote.' using errcode = '22023', hint = 'unidades';
    end if;
    v_vistos := v_vistos || v_clave;
    k := r.n;
    vehiculo_id := (r.e ->> 'vehiculo_id')::uuid;
    repuesto_id := (r.e ->> 'repuesto_id')::uuid;
    actualizado_en := (r.e ->> 'actualizado_en')::timestamptz;
    return next;
  end loop;
end;
$$;
revoke all on function public._transporte_lote(jsonb) from public, anon, authenticated;
grant execute on function public._transporte_lote(jsonb) to service_role;

-- El destino de un lote: el contenedor (con su embarque) o el embarque. Uno que no existe y uno que quien llama no ve dan el mismo PT409.
-- `nombre` va en los mensajes («El contenedor «X»», «El embarque «B»»).
create or replace function public._transporte_destino(p_tipo text, p_destino uuid,
  out contenedor_id uuid, out embarque_id uuid, out origen_id uuid, out numero text, out booking text, out nombre text)
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_hay boolean; v_ve boolean;
begin
  if p_tipo is null or p_tipo not in ('contenedor', 'embarque') then
    raise exception 'El destino es un contenedor o un embarque.' using errcode = '22023', hint = 'tipo';
  end if;
  if p_tipo = 'contenedor' then
    select c.id, c.embarque_id, c.origen_id, c.numero, e.booking, true into contenedor_id, embarque_id, origen_id, numero, booking, v_hay
      from public.contenedores c left join public.embarques e on e.id = c.embarque_id
     where c.id = p_destino;                                                                         -- contenedores_pkey, embarques_pkey
    nombre := format('El contenedor «%s»', numero);
  else
    select e.id, e.origen_id, e.booking, true into embarque_id, origen_id, booking, v_hay
      from public.embarques e where e.id = p_destino;                                                -- embarques_pkey
    nombre := format('El embarque «%s»', booking);
  end if;
  v_ve := case when origen_id is null then public.tiene_permiso('repuestos.ver') else public.alcance_de('logistica.ver', origen_id) is not null end;
  if not coalesce(v_hay, false) or not v_ve then
    raise exception 'Ese % ya no existe. Recarga.', p_tipo using errcode = 'PT409', hint = 'destino';
  end if;
end;
$$;
revoke all on function public._transporte_destino(text, uuid) from public, anon, authenticated;
grant execute on function public._transporte_destino(text, uuid) to service_role;

-- El embarque y el contenedor que ve hoy cada unidad del lote (por transportes_vehiculo_id_key y transportes_repuesto_id_key).
create or replace function public._transporte_lote_entidades(p_vehiculos uuid[], p_repuestos uuid[], out embarques uuid[], out contenedores uuid[])
  language sql stable security definer
  set search_path = ''
as $$
  select coalesce(array_agg(distinct y.embarque_id) filter (where y.embarque_id is not null), '{}'),
         coalesce(array_agg(distinct y.contenedor_id) filter (where y.contenedor_id is not null), '{}')
    from (select x.embarque_id, x.contenedor_id from public.transportes_con_embarque x where x.vehiculo_id = any (p_vehiculos)
          union all
          select x.embarque_id, x.contenedor_id from public.transportes_con_embarque x where x.repuesto_id = any (p_repuestos)) y;
$$;
revoke all on function public._transporte_lote_entidades(uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public._transporte_lote_entidades(uuid[], uuid[]) to service_role;

-- Los candados de un lote, en orden: los embarques y contenedores de hoy de sus unidades (y los del destino), las unidades `for share` y sus filas.
-- Si alguna cambió de embarque o de contenedor antes de su candado, los candados no son los suyos: PT409.
create or replace function public._transporte_lote_bloquear(p_vehiculos uuid[], p_repuestos uuid[], p_embarque uuid, p_contenedor uuid)
  returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare a record; d record; v_embarques uuid[]; v_contenedores uuid[];
begin
  select * into a from public._transporte_lote_entidades(p_vehiculos, p_repuestos);
  v_embarques := array_remove(a.embarques || p_embarque, null);
  v_contenedores := array_remove(a.contenedores || p_contenedor, null);
  perform public._transporte_bloquear_entidades(v_embarques, v_contenedores);
  perform public._transporte_grupo_bloquear(p_vehiculos, p_repuestos);
  perform 1 from public.transportes t where t.vehiculo_id = any (p_vehiculos) order by t.id for update;   -- transportes_vehiculo_id_key
  perform 1 from public.transportes t where t.repuesto_id = any (p_repuestos) order by t.id for update;   -- transportes_repuesto_id_key
  select * into d from public._transporte_lote_entidades(p_vehiculos, p_repuestos);
  if not (d.embarques <@ v_embarques and d.contenedores <@ v_contenedores) then
    raise exception 'Una de las unidades cambió de transporte mientras tanto. Recarga.' using errcode = 'PT409';
  end if;
end;
$$;
revoke all on function public._transporte_lote_bloquear(uuid[], uuid[], uuid, uuid) from public, anon, authenticated;
grant execute on function public._transporte_lote_bloquear(uuid[], uuid[], uuid, uuid) to service_role;

-- La versión de la fila de una unidad del lote: sin fila, la esperada nula es crear (con otra, PT409); con fila, tiene que ser la suya.
create or replace function public._transporte_lote_version(p_transporte uuid, p_actual timestamptz, p_esperada timestamptz, p_titulo text,
  p_crear boolean)
  returns void
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if p_transporte is null then
    if p_esperada is not null or not p_crear then
      raise exception 'El transporte de «%» ya no existe. Recarga.', p_titulo using errcode = 'PT409';
    end if;
    return;
  end if;
  if p_esperada is null and not p_crear then
    perform public._exigir_version(p_actual, p_esperada, null);
  end if;
  if p_actual is distinct from p_esperada then
    perform public._conflicto_de_edicion('transportes', p_transporte, p_actual, format('el transporte de «%s»', p_titulo));
  end if;
end;
$$;
revoke all on function public._transporte_lote_version(uuid, timestamptz, timestamptz, text, boolean) from public, anon, authenticated;
grant execute on function public._transporte_lote_version(uuid, timestamptz, timestamptz, text, boolean) to service_role;

-- Lo que devuelven las dos: cada unidad del lote con su fila de transporte y su versión, en el orden del lote.
create or replace function public._transporte_lote_respuesta(p_unidades jsonb, p_cambiadas integer) returns jsonb
  language sql stable security definer
  set search_path = ''
as $$
  select jsonb_build_object('sin_cambios', p_cambiadas = 0, 'unidades',
           coalesce(jsonb_agg(jsonb_build_object('vehiculo_id', z.vehiculo_id, 'repuesto_id', z.repuesto_id, 'id', t.id,
                                                 'actualizado_en', t.actualizado_en) order by z.k), '[]'::jsonb))
    from public._transporte_lote(p_unidades) z
    left join lateral (select y.id, y.actualizado_en from public.transportes y where y.vehiculo_id = z.vehiculo_id   -- transportes_vehiculo_id_key
                       union all
                       select y.id, y.actualizado_en from public.transportes y where y.repuesto_id = z.repuesto_id    -- transportes_repuesto_id_key
                      ) t on true;
$$;
revoke all on function public._transporte_lote_respuesta(jsonb, integer) from public, anon, authenticated;
grant execute on function public._transporte_lote_respuesta(jsonb, integer) to service_role;

-- El permiso de cada unidad del lote, antes de los candados (quien no puede no espera a nadie): uno que no puede, que no existe o que está en la
-- papelera dan el mismo 42501, sin nombrarlo.
create or replace function public._transporte_lote_permiso(p_unidades jsonb) returns void
  language plpgsql stable security definer
  set search_path = ''
as $$
declare l record;
begin
  for l in select z.vehiculo_id, z.repuesto_id from public._transporte_lote(p_unidades) z order by z.k loop
    if not public.puede_unidad(l.vehiculo_id, l.repuesto_id, 'logistica.transporte.editar', 'repuestos.editar') then
      raise exception 'No tienes el permiso «%» de una de las unidades.',
        case when l.vehiculo_id is not null then 'logistica.transporte.editar' else 'repuestos.editar' end using errcode = '42501';
    end if;
  end loop;
end;
$$;
revoke all on function public._transporte_lote_permiso(jsonb) from public, anon, authenticated;
grant execute on function public._transporte_lote_permiso(jsonb) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 2. Asignar y quitar.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

-- Pone las unidades del lote en un contenedor o directas en un embarque. Un vehículo va en uno de su origen (un ítem, en cualquiera). Una que ya
-- está en otro se mueve sólo con `p_mover` (23514 hint mover); la que ya está, no cambia. Por unidad: lo que valida su flujo y su fase
-- (`_transporte_validar`), su versión (la nula crea la fila) y lo que exige su fase (el trigger).
create or replace function public.transporte_asignar(p_tipo text, p_destino uuid, p_unidades jsonb, p_mover boolean default false) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  d record; d2 record; l record; u record; t record; x record; o public.datos_de_transporte; n public.datos_de_transporte;
  v_vehiculos uuid[]; v_repuestos uuid[]; v_ya boolean; v_cont uuid; v_emb uuid; v_cambiadas integer := 0;
begin
  perform public.assert_activo();
  select * into d from public._transporte_destino(p_tipo, p_destino);
  select coalesce(array_agg(z.vehiculo_id) filter (where z.vehiculo_id is not null), '{}'),
         coalesce(array_agg(z.repuesto_id) filter (where z.repuesto_id is not null), '{}')
    into v_vehiculos, v_repuestos from public._transporte_lote(p_unidades) z;
  perform public._transporte_lote_permiso(p_unidades);
  for l in select z.vehiculo_id from public._transporte_lote(p_unidades) z where z.vehiculo_id is not null order by z.k loop
    if public._transporte_origen(l.vehiculo_id, null) is distinct from d.origen_id then
      raise exception '«%»: % es de otro origen.', (select v.titulo from public.vehiculos v where v.id = l.vehiculo_id), d.nombre    -- vehiculos_pkey
        using errcode = '22023', hint = 'destino';
    end if;
  end loop;
  perform public._transporte_lote_bloquear(v_vehiculos, v_repuestos, d.embarque_id, d.contenedor_id);
  -- El destino con su candado: un contenedor que cambió de embarque mientras tanto no es el que se eligió.
  select * into d2 from public._transporte_destino(p_tipo, p_destino);
  if (d2.embarque_id, d2.numero, d2.booking) is distinct from (d.embarque_id, d.numero, d.booking) then
    raise exception '% cambió mientras tanto. Recarga.', d.nombre using errcode = 'PT409', hint = 'destino';
  end if;
  v_cont := case when p_tipo = 'contenedor' then d.contenedor_id end;
  v_emb := case when p_tipo = 'embarque' then d.embarque_id end;
  for l in select z.* from public._transporte_lote(p_unidades) z order by z.k loop
    select * into u from public._transporte_unidad(l.vehiculo_id, l.repuesto_id, false);
    if l.vehiculo_id is not null then
      select y.id, y.actualizado_en, y.contenedor_id, y.embarque_id into t from public.transportes y where y.vehiculo_id = l.vehiculo_id;
    else
      select y.id, y.actualizado_en, y.contenedor_id, y.embarque_id into t from public.transportes y where y.repuesto_id = l.repuesto_id;
    end if;
    perform public._transporte_lote_version(t.id, t.actualizado_en, l.actualizado_en, u.titulo, true);
    select * into x from public.transportes_con_embarque y where y.id = t.id;                        -- transportes_pkey
    -- Dónde está: en éste no cambia; en otro contenedor o directa en otro embarque, sólo con p_mover. Con destino embarque, una que ya va en
    -- uno de sus contenedores ya está en él.
    if p_tipo = 'contenedor' then
      v_ya := t.contenedor_id is not distinct from d.contenedor_id;
    else
      v_ya := x.embarque_id is not distinct from d.embarque_id;
    end if;
    continue when v_ya;
    if not p_mover and t.contenedor_id is not null then
      raise exception '«%»: Está en el contenedor «%»: ¿moverlo a éste?', u.titulo, x.contenedor using errcode = '23514', hint = 'mover';
    end if;
    if not p_mover and t.embarque_id is not null and t.embarque_id is distinct from d.embarque_id then
      raise exception '«%»: Está en el embarque «%»: ¿moverlo a éste?', u.titulo, x.booking using errcode = '23514', hint = 'mover';
    end if;
    -- Lo que valida la unidad: la regla del contenedor y su fase, y que un repuesto que sigue a su vehículo no reciba nada.
    o := row(l.vehiculo_id, l.repuesto_id, coalesce(x.sigue_al_vehiculo, false), x.contenedor, x.booking, x.naviera_id, x.puerto_origen_id,
             x.puerto_destino_id, x.zarpe_el, x.eta_el, x.arribo_el, x.notas)::public.datos_de_transporte;
    n := o;
    n.contenedor := d.numero;
    n.booking := d.booking;
    perform public._transporte_validar(u.flujo, u.fase_id, o, n, u.titulo);
    if t.id is null then
      begin
        insert into public.transportes (vehiculo_id, repuesto_id, contenedor_id, embarque_id, actualizado_por)
        values (l.vehiculo_id, l.repuesto_id, v_cont, v_emb, (select auth.uid()));
      exception when unique_violation then
        raise exception 'Otra persona cargó el transporte de «%» mientras tanto. Recarga.', u.titulo using errcode = 'PT409';
      end;
    else
      perform public._transporte_mudar(t.id, v_cont, v_emb);
    end if;
    v_cambiadas := v_cambiadas + 1;
  end loop;
  return public._transporte_lote_respuesta(p_unidades, v_cambiadas);
end;
$$;
comment on function public.transporte_asignar(text, uuid, jsonb, boolean) is
  'Pone hasta 200 unidades en un contenedor o directas en un embarque (p_tipo), todo o nada, con la versión de cada una (nula = crear la fila). Devuelve {sin_cambios, unidades: [{vehiculo_id, repuesto_id, id, actualizado_en}]}.';
revoke all on function public.transporte_asignar(text, uuid, jsonb, boolean) from public, anon;
grant execute on function public.transporte_asignar(text, uuid, jsonb, boolean) to authenticated, service_role;

-- Saca las unidades del lote de su contenedor (quedan directas en el embarque del contenedor) o de su embarque (salen también del contenedor y
-- copian sus datos como propios). Una que no está, no cambia. Lo que exige la fase de cada una lo dice el trigger (23514).
create or replace function public.transporte_quitar(p_tipo text, p_unidades jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare l record; u record; t record; x record; v_vehiculos uuid[]; v_repuestos uuid[]; v_cambiadas integer := 0;
begin
  perform public.assert_activo();
  if p_tipo is null or p_tipo not in ('contenedor', 'embarque') then
    raise exception 'Se quita de un contenedor o de un embarque.' using errcode = '22023', hint = 'tipo';
  end if;
  select coalesce(array_agg(z.vehiculo_id) filter (where z.vehiculo_id is not null), '{}'),
         coalesce(array_agg(z.repuesto_id) filter (where z.repuesto_id is not null), '{}')
    into v_vehiculos, v_repuestos from public._transporte_lote(p_unidades) z;
  perform public._transporte_lote_permiso(p_unidades);
  perform public._transporte_lote_bloquear(v_vehiculos, v_repuestos, null, null);
  for l in select z.* from public._transporte_lote(p_unidades) z order by z.k loop
    select * into u from public._transporte_unidad(l.vehiculo_id, l.repuesto_id, false);
    if l.vehiculo_id is not null then
      select y.id, y.actualizado_en, y.contenedor_id into t from public.transportes y where y.vehiculo_id = l.vehiculo_id;
    else
      select y.id, y.actualizado_en, y.contenedor_id into t from public.transportes y where y.repuesto_id = l.repuesto_id;
    end if;
    continue when t.id is null and l.actualizado_en is null;
    perform public._transporte_lote_version(t.id, t.actualizado_en, l.actualizado_en, u.titulo, false);
    select * into x from public.transportes_con_embarque y where y.id = t.id;                        -- transportes_pkey
    if p_tipo = 'contenedor' then
      continue when t.contenedor_id is null;
      perform public._transporte_mudar(t.id, null, x.embarque_id);
    else
      continue when x.embarque_id is null;
      perform public._transporte_mudar(t.id, null, null);
    end if;
    v_cambiadas := v_cambiadas + 1;
  end loop;
  return public._transporte_lote_respuesta(p_unidades, v_cambiadas);
end;
$$;
comment on function public.transporte_quitar(text, jsonb) is
  'Saca hasta 200 unidades de su contenedor (quedan en el embarque del contenedor) o de su embarque (y de su contenedor, copiando sus datos), todo o nada, con la versión de cada una. Devuelve {sin_cambios, unidades: [{vehiculo_id, repuesto_id, id, actualizado_en}]}.';
revoke all on function public.transporte_quitar(text, jsonb) from public, anon;
grant execute on function public.transporte_quitar(text, jsonb) to authenticated, service_role;
