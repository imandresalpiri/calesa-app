-- Tipos de documento propios (de un flujo) o compartidos (flujo_id nulo), como los catálogos de logística: un propio activo con la misma clave
-- (`_catalogo_clave`) que un compartido ya no se rechaza, lo tapa en su flujo. Un compartido pide `logistica.catalogos.gestionar` en cada origen que lo
-- usa; uno del flujo de vehículos de un origen, configurar ese flujo o esa clave en su origen. Nada se reescribe: requisitos y documentos siguen
-- apuntando a lo que apuntaban.

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 1. Nada cambia de nombre en silencio: dos tipos del mismo grupo que con la clave nueva serían el mismo frenan la migración con la lista.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
do $$
declare v_lista text;
begin
  select string_agg(x.nombres, '; ') into v_lista from (
    select string_agg(t.nombre, ' / ' order by t.nombre) as nombres
      from public.tipos_documento t group by t.flujo_id, public._catalogo_clave(t.nombre) having count(*) > 1
  ) x;
  if v_lista is not null then
    raise exception 'Hay tipos de documento que se repiten sin importar mayúsculas, tildes ni espacios: %.', v_lista
      using hint = 'Renombra uno antes de migrar.';
  end if;
end $$;

-- El grupo va primero: sirve a las lecturas por grupo («lo de este flujo», «los compartidos») y a la comparación por clave.
alter table public.tipos_documento drop constraint tipos_documento_flujo_id_nombre_key;
create unique index tipos_documento_flujo_clave_key on public.tipos_documento (flujo_id, public._catalogo_clave(nombre)) nulls not distinct;

comment on table public.tipos_documento is
  'Catálogo de documentos del ciclo (título, BL, DUI, factura, evidencia…). Compartido con todos los orígenes (flujo_id NULL) o propio de un flujo; un propio activo tapa en su flujo al compartido de su clave (_catalogo_clave). Un tipo en uso no se borra: se desactiva. Se escribe sólo por tipo_documento_crear, tipo_documento_guardar, tipo_documento_mover y tipo_documento_eliminar; tipos_documento_con_uso cuenta su uso.';

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 2. El nombre: único en su grupo por clave. Ya no mira a los compartidos: un propio con su nombre lo tapa.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
create or replace function public._tipo_documento_repetido(p_nombre text, p_flujo uuid) returns text
  language sql stable
  set search_path = ''
as $$
  select 'Ya hay un tipo de documento «' || p_nombre || '» '
         || case when p_flujo is null then 'compartido con todos los orígenes.'
                 when f.ambito = 'repuestos' then 'en el flujo de repuestos.'
                 else 'en ' || coalesce(o.nombre, 'este flujo') || '.' end
    from (select 1) x
    left join public.flujos f on f.id = p_flujo                                                        -- flujos_pkey
    left join public.origenes o on o.id = f.origen_id;                                                 -- origenes_pkey
$$;
revoke all on function public._tipo_documento_repetido(text, uuid) from public, anon, authenticated;

drop function public._tipo_documento_nombre_libre(uuid, uuid, text, boolean);
create function public._tipo_documento_nombre_libre(p_id uuid, p_flujo uuid, p_nombre text) returns void
  language plpgsql stable
  set search_path = ''
as $$
declare v_choca text;
begin
  -- tipos_documento_flujo_clave_key (flujo_id primero); a lo sumo _tipos_documento_tope() filas por grupo.
  select x.nombre into v_choca from public.tipos_documento x
   where ((p_flujo is null and x.flujo_id is null) or x.flujo_id = p_flujo)
     and x.id <> p_id and public._catalogo_clave(x.nombre) = public._catalogo_clave(p_nombre)
   limit 1;
  if v_choca is not null then
    raise exception '%', public._tipo_documento_repetido(v_choca, p_flujo) using errcode = '23505', hint = 'nombre';
  end if;
end;
$$;
revoke all on function public._tipo_documento_nombre_libre(uuid, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 3. Quién: un tipo del flujo de vehículos de un origen lo cambia quien configura ese flujo o quien gestiona los catálogos de logística en ese origen;
--    uno del flujo de repuestos, quien configura repuestos; un compartido, la clave en algún origen (alcanza para leer) y, para escribir, en cada
--    origen que lo usa (`_tipo_documento_exigir_compartido`).
-- ---------------------------------------------------------------------------------------------------------------------------------------------
create or replace function public._tipo_documento_exigir_permiso(p_flujo uuid) returns void
  language plpgsql stable
  set search_path = ''
as $$
begin
  if p_flujo is null then
    perform public.assert_permiso('logistica.catalogos.gestionar');
    return;
  end if;
  perform public.assert_activo();
  if not (public.puede_configurar_flujo(p_flujo)
          or exists (select 1 from public.flujos f                                                      -- flujos_pkey
                      where f.id = p_flujo and f.ambito = 'vehiculos' and public.tiene_permiso('logistica.catalogos.gestionar', f.origen_id))) then
    raise exception 'No puedes configurar los tipos de documento de este flujo.' using errcode = '42501';
  end if;
end;
$$;

-- Los orígenes que tapan a un compartido con esa clave: los que tienen en su flujo de vehículos activo un propio activo de la misma clave.
create or replace function public._tipo_documento_tapan(p_nombre text) returns uuid[]
  language sql stable
  set search_path = ''
as $$
  select coalesce(array_agg(distinct fl.origen_id), '{}'::uuid[])
    from public.tipos_documento x join public.flujos fl on fl.id = x.flujo_id
   where fl.ambito = 'vehiculos' and fl.activo and x.activo and public._catalogo_clave(x.nombre) = public._catalogo_clave(p_nombre);
$$;
revoke all on function public._tipo_documento_tapan(text) from public, anon, authenticated;

-- Escribir un compartido: la clave en cada origen que lo usa (o lo usaría), salvo los que lo tapan antes y después del cambio.
create or replace function public._tipo_documento_exigir_compartido(p_nombre text, p_nombre_nuevo text, p_creando boolean) returns void
  language plpgsql stable
  set search_path = ''
as $$
begin
  perform public._catalogo_logistica_exigir(null,
    array(select unnest(public._tipo_documento_tapan(p_nombre)) intersect select unnest(public._tipo_documento_tapan(p_nombre_nuevo))),
    p_nombre, p_creando, false);
end;
$$;
revoke all on function public._tipo_documento_exigir_compartido(text, text, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 4. Las RPC: el nombre por clave y, en un compartido, el permiso de cada origen que lo usa.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
create or replace function public.tipo_documento_crear(p_id uuid, p_flujo uuid, p_datos jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  o public.tipos_documento; t public.tipos_documento; v_tope integer := public._tipos_documento_tope();
begin
  perform public._tipo_documento_exigir_permiso(p_flujo);
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  lock table public.tipos_documento in share row exclusive mode;
  select * into o from public.tipos_documento x where x.id = p_id;
  if found and o.flujo_id is not distinct from p_flujo then
    return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'repetido', true);
  elsif found then
    raise exception 'Ese identificador ya es de otro tipo de documento.' using errcode = '22023';
  end if;
  if p_datos is not null and jsonb_typeof(p_datos) = 'object' and not (p_datos ? 'nombre') then
    raise exception 'Escribe el nombre del tipo de documento.' using errcode = '22023', hint = 'nombre';
  end if;
  t.id := p_id;
  t.flujo_id := p_flujo;
  t.activo := true;
  t.formatos := public._tipos_documento_formatos();
  t.modo_vencimiento := 'ninguno';
  t.visible_portal_permitido := false;
  t := public._tipo_documento_validar(public._tipo_documento_de_jsonb(t, p_datos, true), public._tipos_documento_formatos());
  if p_flujo is null then
    perform public._tipo_documento_exigir_compartido(t.nombre, t.nombre, true);
  end if;
  if (select count(*) from (select 1 from public.tipos_documento x
                            where (p_flujo is null and x.flujo_id is null) or x.flujo_id = p_flujo limit v_tope) q) >= v_tope then
    raise exception 'Ya hay % tipos de documento en esta lista, que es el máximo. Elimina uno sin uso o desactiva los que no uses.', v_tope
      using errcode = '22023', hint = 'nombre';
  end if;
  perform public._tipo_documento_nombre_libre(t.id, t.flujo_id, t.nombre);
  begin
    insert into public.tipos_documento (id, flujo_id, nombre, descripcion, activo, orden, visible_portal_permitido, modo_vencimiento,
                                        vigencia_dias, aviso_dias, formatos)
    values (t.id, t.flujo_id, t.nombre, t.descripcion, true,
            coalesce((select max(x.orden) + 10 from public.tipos_documento x
                      where (p_flujo is null and x.flujo_id is null) or x.flujo_id = p_flujo), 10),
            t.visible_portal_permitido, t.modo_vencimiento, t.vigencia_dias, t.aviso_dias, t.formatos)
    returning actualizado_en into t.actualizado_en;
  exception when unique_violation then
    raise exception '%', public._tipo_documento_repetido(t.nombre, t.flujo_id) using errcode = '23505', hint = 'nombre';
  end;
  return jsonb_build_object('id', p_id, 'actualizado_en', t.actualizado_en, 'repetido', false);
end;
$$;

create or replace function public.tipo_documento_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare o public.tipos_documento; t public.tipos_documento; v_fase text; v_formato text;
begin
  select * into o from public.tipos_documento x where x.id = p_id;
  if not found then
    raise exception 'Ese tipo de documento ya no existe.' using errcode = 'PT409';
  end if;
  perform public._tipo_documento_exigir_permiso(o.flujo_id);
  lock table public.tipos_documento in share row exclusive mode;
  select * into o from public.tipos_documento x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tipo de documento ya no existe.' using errcode = 'PT409';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  t := public._tipo_documento_validar(public._tipo_documento_de_jsonb(o, p_cambios, false), public._tipos_documento_formatos());
  if (t.nombre, t.descripcion, t.activo, t.formatos, t.modo_vencimiento, t.vigencia_dias, t.aviso_dias, t.visible_portal_permitido)
     is not distinct from
     (o.nombre, o.descripcion, o.activo, o.formatos, o.modo_vencimiento, o.vigencia_dias, o.aviso_dias, o.visible_portal_permitido) then
    return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'sin_cambios', true);
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo de documento mientras lo editabas.');
  if o.flujo_id is null then
    perform public._tipo_documento_exigir_compartido(o.nombre, t.nombre, false);
  end if;
  if t.nombre is distinct from o.nombre then
    perform public._tipo_documento_nombre_libre(t.id, t.flujo_id, t.nombre);
  end if;
  -- C7 · por fases_requisitos_tipo_documento_id_idx.
  if t.formatos is distinct from o.formatos then
    select f.nombre, (select x from unnest(r.formatos) x where not (x = any (t.formatos)) limit 1) into v_fase, v_formato
    from public.fases_requisitos r join public.fases f on f.id = r.fase_id
    where r.tipo_documento_id = p_id and r.formatos is not null and not (r.formatos <@ t.formatos)
    order by f.orden, f.nombre
    limit 1;
    if found then
      raise exception 'El requisito de «%» pide «%»: quítalo de ese requisito antes.', v_fase, v_formato using errcode = '22023', hint = 'formatos';
    end if;
  end if;
  begin
    update public.tipos_documento x
       set nombre = t.nombre, descripcion = t.descripcion, activo = t.activo, formatos = t.formatos, modo_vencimiento = t.modo_vencimiento,
           vigencia_dias = t.vigencia_dias, aviso_dias = t.aviso_dias, visible_portal_permitido = t.visible_portal_permitido
     where x.id = p_id
    returning x.actualizado_en into t.actualizado_en;
  exception when unique_violation then
    raise exception '%', public._tipo_documento_repetido(t.nombre, t.flujo_id) using errcode = '23505', hint = 'nombre';
  end;
  return jsonb_build_object('id', p_id, 'actualizado_en', t.actualizado_en, 'sin_cambios', false);
end;
$$;

create or replace function public.tipo_documento_mover(p_id uuid, p_actualizado_en_esperado timestamptz, p_despues_de uuid default null) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare o public.tipos_documento;
begin
  select * into o from public.tipos_documento x where x.id = p_id;
  if not found then
    raise exception 'Ese tipo de documento ya no existe.' using errcode = 'PT409';
  end if;
  perform public._tipo_documento_exigir_permiso(o.flujo_id);
  lock table public.tipos_documento in share row exclusive mode;
  select * into o from public.tipos_documento x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tipo de documento ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo de documento mientras lo editabas.');
  if o.flujo_id is null then
    perform public._tipo_documento_exigir_compartido(o.nombre, o.nombre, false);
  end if;
  if p_despues_de = p_id then
    raise exception 'Un tipo de documento no puede ir después de sí mismo.' using errcode = '22023';
  end if;
  if p_despues_de is not null
     and not exists (select 1 from public.tipos_documento x
                     where x.id = p_despues_de and ((o.flujo_id is null and x.flujo_id is null) or x.flujo_id = o.flujo_id)) then
    raise exception 'Ese tipo de documento ya no está en esta lista. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  -- El grupo, por el btree de tipos_documento_flujo_clave_key (flujo_id primero); a lo sumo _tipos_documento_tope() filas.
  update public.tipos_documento x set orden = n.orden_nuevo
  from public._campos_reordenar((
    select jsonb_agg(jsonb_build_object('id', y.id, 'clave', y.nombre, 'orden', y.orden)) from public.tipos_documento y
    where (o.flujo_id is null and y.flujo_id is null) or y.flujo_id = o.flujo_id),
    p_id, p_despues_de) n
  where x.id = n.campo_id and x.orden <> n.orden_nuevo;
  return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en);
end;
$$;

create or replace function public.tipo_documento_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare o public.tipos_documento; u record;
begin
  select * into o from public.tipos_documento x where x.id = p_id;
  if not found then
    raise exception 'Ese tipo de documento ya no existe.' using errcode = 'PT409';
  end if;
  perform public._tipo_documento_exigir_permiso(o.flujo_id);
  lock table public.tipos_documento in share row exclusive mode;
  select * into o from public.tipos_documento x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tipo de documento ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo de documento mientras lo editabas.');
  if o.flujo_id is null then
    perform public._tipo_documento_exigir_compartido(o.nombre, o.nombre, false);
  end if;
  select * into u from public._tipo_documento_uso(p_id);
  if u.documentos = 0 and u.requisitos = 0 then
    begin
      delete from public.tipos_documento x where x.id = p_id;
      return jsonb_build_object('accion', 'eliminado', 'documentos', 0, 'requisitos', 0, 'actualizado_en', null);
    exception when foreign_key_violation then
      -- Una fila que lo usa entró entre la cuenta y el borrado: se desactiva.
      select * into u from public._tipo_documento_uso(p_id);
    end;
  end if;
  if o.activo then
    update public.tipos_documento x set activo = false where x.id = p_id returning x.actualizado_en into o.actualizado_en;
  end if;
  return jsonb_build_object('accion', 'desactivado', 'documentos', u.documentos, 'requisitos', u.requisitos, 'actualizado_en', o.actualizado_en);
end;
$$;

create or replace function public.tipos_documento_con_uso(p_flujo uuid) returns table(tipo_id uuid, documentos integer, requisitos integer)
  language plpgsql stable security definer
  set search_path = ''
as $$
begin
  perform public._tipo_documento_exigir_permiso(p_flujo);
  -- El grupo, por el btree de tipos_documento_flujo_clave_key (flujo_id primero), con tope de la lista + 1.
  return query
    select t.id, u.documentos, u.requisitos
    from public.tipos_documento t, lateral public._tipo_documento_uso(t.id) u
    where (p_flujo is null and t.flujo_id is null) or t.flujo_id = p_flujo
    order by t.orden, t.nombre
    limit public._tipos_documento_tope() + 1;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 5. Copiar las fases de otro flujo reusa un tipo con la misma clave (no sólo las mismas mayúsculas).
-- ---------------------------------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."flujo_copiar_fases"("p_flujo" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_desde" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_destino public.flujos;
  v_ambito_desde public.ambito_flujo;
  v_subasta boolean;
  v_esperas boolean;
  v_tope_saltado constant int := 50;
  v_tope_tipos constant int := public._tipos_documento_tope();
  v_fases jsonb;
  v_salidas jsonb;
  v_tipos jsonb := '{}'::jsonb;
  v_saltado jsonb := '[]'::jsonb;
  v_n_fases int := 0;
  v_n_salidas int := 0;
  v_n_req int := 0;
  v_n_tipos int := 0;
  v_n_existentes int;
  v_reusado uuid;
  v_nuevo uuid;
  v_tipo uuid;
  v_formatos text[];
  v_motivo text;
  v_version timestamptz;
  t record;
  r record;
begin
  -- Forma. Los textos los pone la app según código y hint (sólo el PT409 se muestra tal cual).
  if p_desde is null or p_desde = p_flujo then
    raise exception 'Elige otro flujo de donde copiar.' using errcode = '22023', hint = 'desde';
  end if;
  select fl.ambito into v_ambito_desde from public.flujos fl where fl.id = p_desde;
  if not found or v_ambito_desde <> 'vehiculos' then
    raise exception 'Ese flujo no se puede copiar.' using errcode = '22023', hint = 'desde';
  end if;
  if p_flujo is null or not exists (select 1 from public.flujos where id = p_flujo) then
    raise exception 'Este flujo ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;

  -- Los dos permisos antes de todo candado: quien no puede no espera ni hace esperar.
  if not public.puede_configurar_flujo(p_flujo) then
    raise exception 'No tienes permiso para configurar este flujo.' using errcode = '42501';
  end if;
  if not public.puede_configurar_flujo(p_desde) then
    raise exception 'No tienes permiso para configurar el flujo de donde copias.' using errcode = '42501', hint = 'desde';
  end if;

  -- Candados en orden de id: dos copias cruzadas (A→B y B→A) no se bloquean entre sí. El de donde se copia, `for share`: frena a quien lo
  -- edita (`_flujo_para_editar` toma `for no key update`) mientras dura la copia; el destino, con el contrato de siempre.
  if p_desde < p_flujo then
    perform 1 from public.flujos where id = p_desde for share;
  end if;
  v_destino := public._flujo_para_editar(p_flujo, p_actualizado_en_esperado);
  if p_desde > p_flujo then
    perform 1 from public.flujos where id = p_desde for share;
  end if;

  -- Estado, ya con los candados.
  if v_destino.ambito <> 'vehiculos' then
    raise exception 'Sólo se copian fases entre flujos de vehículos.' using errcode = '22023', hint = 'destino';
  end if;
  -- fases_flujo_id_nombre_key (flujo_id primero). También las jubiladas: «sin fases» es ninguna fila.
  if exists (select 1 from public.fases where flujo_id = p_flujo) then
    raise exception 'Este flujo ya tiene fases.' using errcode = '23514', hint = 'destino';
  end if;
  if not exists (select 1 from public.fases where flujo_id = p_desde and activa) then
    raise exception 'Ese flujo no tiene fases para copiar.' using errcode = '22023', hint = 'desde';
  end if;
  v_subasta := public._flujo_de_subasta(p_flujo);
  v_esperas := public.flujo_regla_activa(p_desde, 'esperas');

  -- 1. Las reglas, antes que las fases (`fase_validar` y `fase_requisito_validar` las miran): el destino queda con exactamente las del origen.
  -- Apagar o borrar una regla del destino no choca con `flujo_regla_apagar_validar`: sin fases no hay uso.
  delete from public.flujos_reglas d
   where d.flujo_id = p_flujo
     and not exists (select 1 from public.flujos_reglas o where o.flujo_id = p_desde and o.regla = d.regla);
  insert into public.flujos_reglas (flujo_id, regla, activa)
  select p_flujo, o.regla, o.activa from public.flujos_reglas o where o.flujo_id = p_desde
  on conflict (flujo_id, regla) do update set activa = excluded.activa;

  -- 2. Los tipos «Sólo de este flujo», todos (activos o no) y en su orden. El candado y la regla del nombre, los de `tipo_documento_crear`
  -- (`_tipo_documento_nombre_libre`): un nombre que ya está en el destino, o en uno de la empresa activo si el tipo es activo, se reusa y se dice.
  lock table public.tipos_documento in share row exclusive mode;
  -- tipos_documento_flujo_clave_key (flujo_id primero); a lo sumo el tope + 1.
  select count(*) into v_n_existentes
    from (select 1 from public.tipos_documento x where x.flujo_id = p_flujo limit v_tope_tipos + 1) q;
  for t in
    select x.* from public.tipos_documento x where x.flujo_id = p_desde order by x.orden, x.id limit v_tope_tipos + 1
  loop
    select x.id into v_reusado
      from public.tipos_documento x
     where (x.flujo_id = p_flujo or (t.activo and x.flujo_id is null and x.activo))
       and public._catalogo_clave(x.nombre) = public._catalogo_clave(t.nombre)
     order by (x.flujo_id is null), x.id
     limit 1;
    if v_reusado is not null then
      v_tipos := v_tipos || jsonb_build_object(t.id::text, v_reusado);
      v_saltado := v_saltado || jsonb_build_array(jsonb_build_object('motivo', 'tipo_documento_reusado', 'nombre', t.nombre));
    else
      if v_n_existentes + v_n_tipos >= v_tope_tipos then
        raise exception 'No caben más tipos de documento en este flujo.' using errcode = '22023', hint = 'tipos_documento';
      end if;
      v_nuevo := gen_random_uuid();
      insert into public.tipos_documento (id, flujo_id, nombre, descripcion, activo, orden, visible_portal_permitido, proposito,
                                          modo_vencimiento, vigencia_dias, aviso_dias, formatos)
      values (v_nuevo, p_flujo, t.nombre, t.descripcion, t.activo, t.orden, t.visible_portal_permitido, null,
              t.modo_vencimiento, t.vigencia_dias, t.aviso_dias, t.formatos);
      v_tipos := v_tipos || jsonb_build_object(t.id::text, v_nuevo);
      v_n_tipos := v_n_tipos + 1;
    end if;
  end loop;

  -- 3. Las fases activas, con id nuevo y todas sus columnas. «Es la subasta» sólo si el destino es un origen de subasta; si no, se dice.
  select coalesce(jsonb_object_agg(f.id::text, gen_random_uuid()), '{}'::jsonb) into v_fases
    from public.fases f where f.flujo_id = p_desde and f.activa;
  if not v_subasta then
    v_saltado := v_saltado || coalesce((
      select jsonb_agg(jsonb_build_object('motivo', 'subasta', 'nombre', f.nombre) order by f.orden, f.id)
        from public.fases f where f.flujo_id = p_desde and f.activa and f.es_subasta), '[]'::jsonb);
  end if;
  insert into public.fases (id, flujo_id, nombre, descripcion, color, icono, orden, es_inicial, es_final, activa, es_logistica, demora_dias,
                            alerta_cada_horas, nota_obligatoria, permite_contenedor, permite_aduana, cuenta_llegada_repuestos, publica_web,
                            visible_portal, alias_portal, descripcion_portal, es_subasta)
  select (v_fases ->> f.id::text)::uuid, p_flujo, f.nombre, f.descripcion, f.color, f.icono, f.orden, f.es_inicial, f.es_final, true,
         f.es_logistica, f.demora_dias, f.alerta_cada_horas, f.nota_obligatoria, f.permite_contenedor, f.permite_aduana,
         f.cuenta_llegada_repuestos, f.publica_web, f.visible_portal, f.alias_portal, f.descripcion_portal, f.es_subasta and v_subasta
    from public.fases f
   where f.flujo_id = p_desde and f.activa
   order by f.orden, f.id;
  get diagnostics v_n_fases = row_count;

  -- 4. Los roles de cada fase (fases_roles_pkey, fase_id primero).
  insert into public.fases_roles (fase_id, rol_id)
  select (v_fases ->> fr.fase_id::text)::uuid, fr.rol_id
    from public.fases_roles fr join public.fases f on f.id = fr.fase_id
   where f.flujo_id = p_desde and f.activa;

  -- 5. Las salidas entre fases activas (fases_transiciones_flujo_id_idx) y sus roles. Las que van a una jubilada no se copian.
  select coalesce(jsonb_object_agg(s.id::text, gen_random_uuid()), '{}'::jsonb) into v_salidas
    from public.fases_transiciones s
   where s.flujo_id = p_desde and v_fases ? s.de_fase_id::text and v_fases ? s.a_fase_id::text;
  insert into public.fases_transiciones (id, flujo_id, de_fase_id, a_fase_id, accion, nota_obligatoria)
  select (v_salidas ->> s.id::text)::uuid, p_flujo, (v_fases ->> s.de_fase_id::text)::uuid, (v_fases ->> s.a_fase_id::text)::uuid,
         s.accion, s.nota_obligatoria
    from public.fases_transiciones s
   where s.flujo_id = p_desde and v_salidas ? s.id::text;
  get diagnostics v_n_salidas = row_count;
  insert into public.fases_transiciones_roles (transicion_id, rol_id)
  select (v_salidas ->> sr.transicion_id::text)::uuid, sr.rol_id
    from public.fases_transiciones_roles sr join public.fases_transiciones s on s.id = sr.transicion_id
   where s.flujo_id = p_desde and v_salidas ? s.id::text;

  -- 6. Los requisitos de las fases activas (fases_requisitos_fase_id_idx), en su orden. Un documento del flujo apunta al tipo copiado (o al
  -- reusado: si sus formatos no caben, el requisito queda sin acotar); uno de la empresa, al mismo. Una espera que el destino no aceptaría
  -- se filtra antes del insert y se dice: así no sale un 23514 crudo a mitad de la copia.
  for r in
    select q.*, f.nombre as fase_nombre, fe.activa as esperada_activa, fle.ambito as esperada_ambito
      from public.fases f
      join public.fases_requisitos q on q.fase_id = f.id
      left join public.fases fe on fe.id = q.espera_fase_id
      left join public.flujos fle on fle.id = fe.flujo_id
     where f.flujo_id = p_desde and f.activa
     order by f.orden, f.id, q.orden, q.id
  loop
    v_motivo := null;
    v_tipo := r.tipo_documento_id;
    v_formatos := r.formatos;
    if r.tipo = 'espera' then
      v_motivo := case
        when not v_esperas then 'espera_apagada'
        when r.esperada_ambito is distinct from 'repuestos' then 'espera_otro_flujo'
        when not r.esperada_activa then 'espera_jubilada'
      end;
    elsif r.tipo = 'documento' then
      v_tipo := coalesce((v_tipos ->> r.tipo_documento_id::text)::uuid, r.tipo_documento_id);
      if v_formatos is not null
         and not (v_formatos <@ (select x.formatos from public.tipos_documento x where x.id = v_tipo)) then
        v_formatos := null;
      end if;
    end if;
    if v_motivo is not null then
      v_saltado := v_saltado || jsonb_build_array(jsonb_build_object('motivo', v_motivo, 'nombre', r.fase_nombre));
      continue;
    end if;
    insert into public.fases_requisitos (fase_id, tipo, bloqueante, orden, notas, tipo_documento_id, min_archivos, max_archivos, formatos,
                                         clave_dato, config, espera_fase_id, espera_ambito)
    values ((v_fases ->> r.fase_id::text)::uuid, r.tipo, r.bloqueante, r.orden, r.notas, v_tipo, r.min_archivos, r.max_archivos, v_formatos,
            r.clave_dato, r.config, r.espera_fase_id, r.espera_ambito);
    v_n_req := v_n_req + 1;
  end loop;

  -- 7. La actividad y la versión.
  perform public.registrar_actividad('flujo.copiado', 'flujos', p_flujo::text, null, null,
    jsonb_build_object('desde', p_desde, 'fases', v_n_fases, 'saltados', jsonb_array_length(v_saltado)));
  v_version := public._flujo_tocar(p_flujo);
  return jsonb_build_object(
    'version', v_version,
    'copiado', jsonb_build_object('fases', v_n_fases, 'salidas', v_n_salidas, 'requisitos', v_n_req, 'tipos_documento', v_n_tipos),
    'saltado', coalesce((select jsonb_agg(e.valor order by e.i)
                           from jsonb_array_elements(v_saltado) with ordinality as e(valor, i)
                          where e.i <= v_tope_saltado), '[]'::jsonb),
    'saltado_hay_mas', jsonb_array_length(v_saltado) > v_tope_saltado);
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 6. Revisar avisa (info) del requisito que pide un compartido que el flujo tapa: ese requisito ya no se ofrece para elegir de nuevo.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."revisar_flujo"("p_flujo" "uuid") RETURNS TABLE("nivel" "text", "codigo" "text", "mensaje" "text", "fase_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
declare
  v_ambito public.ambito_flujo;
  v_iniciales uuid[];
  v_inicial public.fases;
  v_motivos text[] := array[]::text[];
begin
  if p_flujo is null or not public.puede_configurar_flujo(p_flujo) then
    return;
  end if;

  select fl.ambito into v_ambito from public.flujos fl where fl.id = p_flujo;

  return query
  with f as (select * from public.fases fa where fa.flujo_id = p_flujo and fa.activa)
  select 'error', 'sin_inicial', 'El flujo no tiene ninguna fase inicial activa.', null::uuid where not exists (select 1 from f where f.es_inicial)
  union all
  select 'aviso', 'sin_salida', 'La fase «' || f.nombre || '» no tiene salida y no es final.', f.id from f where not f.es_final and not exists (select 1 from public.fases_transiciones t where t.de_fase_id = f.id)
  union all
  select 'aviso', 'inalcanzable', 'La fase «' || f.nombre || '» no es inicial y nadie llega a ella.', f.id from f where not f.es_inicial and not exists (select 1 from public.fases_transiciones t where t.a_fase_id = f.id)
  union all
  select 'aviso', 'orden_duplicado', 'Dos fases comparten el orden ' || f.orden || '.', (array_agg(f.id order by f.nombre))[1] from f group by f.orden having count(*) > 1
  union all
  select 'aviso', 'contenedor_inalcanzable', 'La fase «' || f.nombre || '» exige contenedor pero ninguna fase del flujo permite asignarlo.', f.id
    from f where exists (select 1 from public.fases_requisitos q where q.fase_id = f.id and q.clave_dato = 'transporte.contenedor') and not exists (select 1 from f f2 where f2.permite_contenedor)
  union all
  select 'aviso', 'espera_jubilada', 'La fase «' || f.nombre || '» espera a una fase jubilada.', f.id
    from f where exists (select 1 from public.fases_requisitos q join public.fases e on e.id = q.espera_fase_id where q.fase_id = f.id and not e.activa)
  union all
  select 'aviso', 'espera_cruzada', 'Esperas cruzadas: «' || f.nombre || '» y la fase que espera se esperan mutuamente.', f.id
    from f where exists (
      select 1 from public.fases_requisitos a join public.fases_requisitos b on b.fase_id = a.espera_fase_id
      where a.fase_id = f.id and a.tipo = 'espera' and b.tipo = 'espera' and b.espera_fase_id = f.id)
  union all
  select 'info', 'sin_bloqueantes', 'La fase «' || f.nombre || '» sólo tiene requisitos informativos.', f.id
    from f where exists (select 1 from public.fases_requisitos q where q.fase_id = f.id) and not exists (select 1 from public.fases_requisitos q where q.fase_id = f.id and q.bloqueante)
  union all
  -- C3: la lista de la fase, aunque cada entrada traiga la suya (no replica la precedencia de `_puede_mover`).
  select 'aviso', 'rol_sin_personas', 'Sólo pueden mover a «' || f.nombre || '» roles que nadie tiene.', f.id
    from f where exists (select 1 from public.fases_roles fr where fr.fase_id = f.id)
      and not exists (
        select 1 from public.fases_roles fr
          join public.usuarios_roles ur on ur.rol_id = fr.rol_id
          join public.perfiles p on p.id = ur.usuario_id
        where fr.fase_id = f.id and p.activo and not p.bloqueado)
  union all
  -- C4
  select 'aviso', 'rol_sin_personas', 'Sólo pueden usar la salida de «' || d.nombre || '» a «' || h.nombre || '» roles que nadie tiene.', d.id
    from public.fases_transiciones t join f d on d.id = t.de_fase_id join f h on h.id = t.a_fase_id
    where exists (select 1 from public.fases_transiciones_roles tr where tr.transicion_id = t.id)
      and not exists (
        select 1 from public.fases_transiciones_roles tr
          join public.usuarios_roles ur on ur.rol_id = tr.rol_id
          join public.perfiles p on p.id = ur.usuario_id
        where tr.transicion_id = t.id and p.activo and not p.bloqueado)
  union all
  -- C6
  select 'aviso', 'tipo_documento_inactivo', 'La fase «' || f.nombre || '» pide «' || td.nombre || '», que está desactivado.', f.id
    from f join public.fases_requisitos q on q.fase_id = f.id join public.tipos_documento td on td.id = q.tipo_documento_id
    where not td.activo
  union all
  -- C7
  select 'aviso', 'salida_a_jubilada', 'La fase «' || d.nombre || '» tiene una salida a «' || h.nombre || '», que está jubilada.', d.id
    from public.fases_transiciones t join f d on d.id = t.de_fase_id join public.fases h on h.id = t.a_fase_id
    where not h.activa and h.flujo_id = p_flujo
  union all
  -- C8: la fase de subasta de un origen de subasta (activa o jubilada, como la mira la situación del vehículo).
  select 'aviso', 'sin_fase_de_subasta',
    'Ninguna fase está marcada como la subasta: un vehículo con la subasta terminada nunca figura «Sin resolver».', null::uuid
    where public._flujo_de_subasta(p_flujo)
      and not exists (select 1 from public.fases fa where fa.flujo_id = p_flujo and fa.es_subasta)
  union all
  -- C9: un requisito pide un compartido que el flujo tapa con un propio activo de la misma clave (tipos_documento_flujo_clave_key).
  select 'info', 'tipo_documento_tapado',
    'La fase «' || f.nombre || '» pide «' || td.nombre || '», compartido, que '
      || case when v_ambito = 'repuestos' then 'este flujo' else 'este origen' end || ' tapa con su «' || tp.nombre || '».', f.id
    from f join public.fases_requisitos q on q.fase_id = f.id join public.tipos_documento td on td.id = q.tipo_documento_id
    join public.tipos_documento tp on tp.flujo_id = p_flujo and tp.activo and public._catalogo_clave(tp.nombre) = public._catalogo_clave(td.nombre)
    where td.flujo_id is null;

  -- C5: espejo de `_vehiculo_fase_de_entrada()`, que sólo existe para vehículos.
  if v_ambito is distinct from 'vehiculos' then
    return;
  end if;
  select array_agg(fa.id) into v_iniciales from public.fases fa where fa.flujo_id = p_flujo and fa.es_inicial and fa.activa;
  if coalesce(cardinality(v_iniciales), 0) > 1 then
    return query select 'info', 'entrada_no_automatica', 'Hay más de una fase inicial: los vehículos nuevos nacen «Sin fase».', null::uuid;
    return;
  end if;
  if coalesce(cardinality(v_iniciales), 0) = 0 then
    return;
  end if;
  select * into v_inicial from public.fases fa where fa.id = v_iniciales[1];
  if v_inicial.nota_obligatoria then
    v_motivos := array_append(v_motivos, 'una nota');
  end if;
  if exists (select 1 from public.fases_requisitos q where q.fase_id = v_inicial.id and q.bloqueante) then
    v_motivos := array_append(v_motivos, 'requisitos bloqueantes');
  end if;
  if exists (select 1 from public.fases_roles fr where fr.fase_id = v_inicial.id) then
    v_motivos := array_append(v_motivos, 'un rol');
  end if;
  if cardinality(v_motivos) > 0 then
    return query select 'info', 'entrada_no_automatica',
      'Los vehículos nuevos pueden nacer «Sin fase»: la fase inicial «' || v_inicial.nombre || '» pide '
        || case cardinality(v_motivos)
             when 1 then v_motivos[1]
             when 2 then v_motivos[1] || ' y ' || v_motivos[2]
             else v_motivos[1] || ', ' || v_motivos[2] || ' y ' || v_motivos[3]
           end || '.',
      v_inicial.id;
  end if;
end;
$$;

comment on function public.revisar_flujo(uuid) is
  'Revisa la coherencia de un flujo (5.12). Sólo responde a quien lo configura (puede_configurar_flujo); a los demás, cero filas sin error. Códigos: error sin_inicial; aviso sin_salida, inalcanzable, orden_duplicado, contenedor_inalcanzable, espera_jubilada, espera_cruzada, rol_sin_personas, tipo_documento_inactivo, salida_a_jubilada, sin_fase_de_subasta; info sin_bloqueantes, entrada_no_automatica, tipo_documento_tapado. Avisa, nunca impide guardar.';
