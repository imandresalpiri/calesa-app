-- La posición de cada fase en el diagrama del flujo: una sola por flujo, la misma para todos. Es sólo visual: no audita, no toca
-- `fases.actualizado_en` ni anota la revalidación de la web. La escribe sólo `fase_posiciones_guardar` (y `fase_crear` al nacer, y la copia).

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 1. Las columnas, en rem del lienzo (independientes del zoom). Nulas = sin posición: la fase va en el acomodo automático.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
alter table public.fases
  add column posicion_x numeric(7, 2),
  add column posicion_y numeric(7, 2),
  add constraint fases_posicion_completa check ((posicion_x is null) = (posicion_y is null)),
  add constraint fases_posicion_rango check (posicion_x between -10000 and 10000 and posicion_y between -10000 and 10000);

comment on column public.fases.posicion_x is
  'Dónde se dibuja la fase en el diagrama del flujo, en rem del lienzo (izquierda de la caja). Nula con posicion_y: el acomodo automático. Sólo la escriben fase_posiciones_guardar, fase_crear y flujo_copiar_fases; no se audita.';
comment on column public.fases.posicion_y is
  'Dónde se dibuja la fase en el diagrama del flujo, en rem del lienzo (arriba de la caja). Nula con posicion_x: el acomodo automático.';

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 2. Los triggers de `fases` no ven un cambio de posición: ni la auditoría, ni `actualizado_en`, ni la revalidación de la web.
--    Una columna nueva de `fases` va también a la lista del `update of` de `web_revalidar`.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
drop trigger trg_auditar on public.fases;
create trigger trg_auditar after insert or delete on public.fases
  for each row execute function public.auditar();
create trigger trg_auditar_cambio after update on public.fases
  for each row
  when (old.posicion_x is not distinct from new.posicion_x and old.posicion_y is not distinct from new.posicion_y)
  execute function public.auditar();

drop trigger trg_actualizado_en on public.fases;
create trigger trg_actualizado_en before update on public.fases
  for each row
  when (old.posicion_x is not distinct from new.posicion_x and old.posicion_y is not distinct from new.posicion_y)
  execute function public.set_actualizado_en();

drop trigger web_revalidar on public.fases;
create trigger web_revalidar
  after insert or delete or update of id, flujo_id, nombre, descripcion, color, icono, orden, es_inicial, es_final, activa, es_logistica,
    demora_dias, alerta_cada_horas, nota_obligatoria, permite_contenedor, permite_aduana, cuenta_llegada_repuestos, publica_web, visible_portal,
    alias_portal, descripcion_portal, creado_en, actualizado_en, es_subasta
  on public.fases
  for each statement execute function public._web_revalidar_anotar('vehiculos');

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 3. La forma de una posición: `x` e `y` las dos números dentro del rango, o (si vale) las dos nulas.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
create or replace function public._fase_posicion_bien(p_x jsonb, p_y jsonb, p_nula_vale boolean)
returns boolean
language sql immutable
set search_path = ''
as $$
  select coalesce(case
    when jsonb_typeof(p_x) = 'null' and jsonb_typeof(p_y) = 'null' then p_nula_vale
    when jsonb_typeof(p_x) = 'number' and jsonb_typeof(p_y) = 'number' then
      (p_x #>> '{}')::numeric between -10000 and 10000 and (p_y #>> '{}')::numeric between -10000 and 10000
    else false
  end, false);
$$;

comment on function public._fase_posicion_bien(jsonb, jsonb, boolean) is
  'La forma de la posición de una fase: x e y números entre -10000 y 10000, o las dos nulas si p_nula_vale. Falta una clave = falso.';

revoke all on function public._fase_posicion_bien(jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public._fase_posicion_bien(jsonb, jsonb, boolean) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 4. Guardar las posiciones de un lote de fases del flujo, todo o nada, con la versión del flujo.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
create or replace function public.fase_posiciones_guardar(p_flujo uuid, p_actualizado_en_esperado timestamptz, p_posiciones jsonb)
returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare
  v_mal boolean;
  v_repetida boolean;
  v_ajena boolean;
begin
  if p_posiciones is null or jsonb_typeof(p_posiciones) <> 'array' then
    raise exception 'Manda entre 1 y 200 posiciones.' using errcode = '22023', hint = 'posiciones';
  end if;
  if jsonb_array_length(p_posiciones) not between 1 and 200 then
    raise exception 'Manda entre 1 y 200 posiciones.' using errcode = '22023', hint = 'posiciones';
  end if;
  -- Cada elemento: {fase, x, y} sin otras claves, la fase un uuid y la posición completa o nula.
  v_mal := exists (
    select 1 from jsonb_array_elements(p_posiciones) e(v)
    -- `case`: el orden de un `or` no está garantizado, y `jsonb_object_keys` de algo que no es un objeto falla.
    where case when jsonb_typeof(e.v) <> 'object' then true
               else not (e.v ? 'fase' and e.v ? 'x' and e.v ? 'y')
                 or exists (select 1 from jsonb_object_keys(e.v) k where k not in ('fase', 'x', 'y'))
                 or jsonb_typeof(e.v -> 'fase') <> 'string'
                 or (e.v ->> 'fase') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                 or not public._fase_posicion_bien(e.v -> 'x', e.v -> 'y', true)
          end);
  if v_mal then
    raise exception 'Una posición no es válida.' using errcode = '22023', hint = 'posiciones';
  end if;
  v_repetida := cardinality(array(select distinct (e.v ->> 'fase')::uuid from jsonb_array_elements(p_posiciones) e(v)))
                <> jsonb_array_length(p_posiciones);
  if v_repetida then
    raise exception 'Una fase viene dos veces.' using errcode = '22023', hint = 'posiciones';
  end if;

  perform public._flujo_para_editar(p_flujo, p_actualizado_en_esperado);

  v_ajena := exists (
    select 1 from jsonb_array_elements(p_posiciones) e(v)
    where not exists (select 1 from public.fases f where f.id = (e.v ->> 'fase')::uuid and f.flujo_id = p_flujo));
  if v_ajena then
    raise exception 'Esa fase ya no está en este flujo. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;

  -- Sólo las filas que cambian (por la PK).
  update public.fases f set posicion_x = e.x, posicion_y = e.y
  from (
    select (q.v ->> 'fase')::uuid as fase, (q.v ->> 'x')::numeric as x, (q.v ->> 'y')::numeric as y
    from jsonb_array_elements(p_posiciones) q(v)
  ) e
  where f.id = e.fase and f.flujo_id = p_flujo
    and (f.posicion_x is distinct from e.x or f.posicion_y is distinct from e.y);

  return public._flujo_tocar(p_flujo);
end $$;

comment on function public.fase_posiciones_guardar(uuid, timestamptz, jsonb) is
  'Guarda dónde se dibuja cada fase en el diagrama: 1-200 {fase, x, y} (rem; las dos nulas = sin posición), todo o nada. Forma → 22023 hint posiciones; contrato _flujo_para_editar/_flujo_tocar (inexistente PT409, sin permiso 42501, versión distinta PT409); fase ajena → PT409. Sólo escribe posicion_x/y: no audita ni anota la web. Devuelve la versión del flujo.';

revoke all on function public.fase_posiciones_guardar(uuid, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.fase_posiciones_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 5. `fase_crear` acepta `p_datos.posicion = {x, y}`: la fase nace donde se pidió, en la misma escritura.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."fase_crear"("p_id" "uuid", "p_flujo" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_datos" "jsonb") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v public.fases;
  v_restriccion text;
  v_pos jsonb;
  v_pos_bien boolean;
begin
  if p_id is null then
    raise exception 'Falta el id de la fase.' using errcode = '22023', hint = 'id';
  end if;
  -- La posición no es un dato de la fase: se saca antes de la lista cerrada de `_fase_forma`.
  if jsonb_typeof(p_datos) = 'object' and p_datos ? 'posicion' then
    v_pos := p_datos -> 'posicion';
    p_datos := p_datos - 'posicion';
    -- `case`: el orden de un `and` no está garantizado, y `jsonb_object_keys` de algo que no es un objeto falla.
    v_pos_bien := case when jsonb_typeof(v_pos) <> 'object' then false
                       else not exists (select 1 from jsonb_object_keys(v_pos) k where k not in ('x', 'y'))
                         and public._fase_posicion_bien(v_pos -> 'x', v_pos -> 'y', false)
                  end;
    if not v_pos_bien then
      raise exception 'La posición no es válida.' using errcode = '22023', hint = 'posicion';
    end if;
  end if;
  perform public._fase_forma(p_datos, true);
  perform public._flujo_para_editar(p_flujo, p_actualizado_en_esperado);

  v.id := p_id;
  v.flujo_id := p_flujo;
  v.color := '#717c93';
  v.orden := (select coalesce(max(f.orden), 0) + 10 from public.fases f where f.flujo_id = p_flujo);
  v.es_inicial := false;
  v.es_final := false;
  v.activa := true;
  v.es_logistica := public.flujo_regla_activa(p_flujo, 'logistica');
  v.nota_obligatoria := false;
  v.permite_contenedor := true;
  v.permite_aduana := false;
  v.cuenta_llegada_repuestos := false;
  v.publica_web := false;
  v.visible_portal := false;
  v.es_subasta := false;
  v.creado_en := now();
  v.actualizado_en := now();
  v := public._fase_aplicar(v, p_datos);
  if v_pos is not null then
    v.posicion_x := (v_pos ->> 'x')::numeric;
    v.posicion_y := (v_pos ->> 'y')::numeric;
  end if;
  perform public._fase_validar(v, array(select jsonb_object_keys(p_datos)));

  begin
    insert into public.fases select (v).*;
  exception when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    perform public._fase_unico(v_restriccion, v.nombre);
    raise;
  end;
  return public._flujo_tocar(p_flujo);
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 6. Copiar las fases de otro flujo lleva también su posición: el flujo copiado se ve igual.
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
                            visible_portal, alias_portal, descripcion_portal, es_subasta, posicion_x, posicion_y)
  select (v_fases ->> f.id::text)::uuid, p_flujo, f.nombre, f.descripcion, f.color, f.icono, f.orden, f.es_inicial, f.es_final, true,
         f.es_logistica, f.demora_dias, f.alerta_cada_horas, f.nota_obligatoria, f.permite_contenedor, f.permite_aduana,
         f.cuenta_llegada_repuestos, f.publica_web, f.visible_portal, f.alias_portal, f.descripcion_portal, f.es_subasta and v_subasta,
         f.posicion_x, f.posicion_y
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
