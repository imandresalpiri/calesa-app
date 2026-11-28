-- El texto base de las artes (docs/GLOSARIO.md › «Texto base del origen»): uno por origen, con variables entre llaves que el editor de artes llena con
-- los datos del vehículo, la cotización, el cliente, quien comparte y la empresa. Lo lee quien ve cotizaciones del origen y lo cambia quien
-- configura cotizaciones en él, sólo por `artes_texto_base_guardar`. Nace con el origen (`trg_origen_texto_base`) con el texto inicial de su
-- tipo. Las variables que acepta son el espejo de `src/modules/artes/entities/datos/variables-del-arte.ts`.

-- ---------------------------------------------------------------------------------------------------
-- La tabla: una fila por origen.
-- ---------------------------------------------------------------------------------------------------
create table public.artes_textos_base (
  origen_id uuid primary key references public.origenes (id) on delete cascade,
  texto text not null
    constraint artes_textos_base_largo check (char_length(texto) between 1 and 2000),
  actualizado_en timestamptz not null default clock_timestamp(),
  actualizado_por uuid references public.perfiles (id) on delete set null
);

comment on table public.artes_textos_base is
  'El texto base de las artes de cada origen: lo lee quien ve cotizaciones del origen; se escribe sólo por artes_texto_base_guardar y nace con el origen.';

create index artes_textos_base_actualizado_por_idx on public.artes_textos_base (actualizado_por);

alter table public.artes_textos_base enable row level security;
revoke all on table public.artes_textos_base from anon, authenticated;
grant select on table public.artes_textos_base to authenticated;
grant all on table public.artes_textos_base to service_role;

-- Sin policies de insert, update ni delete: nadie escribe directo.
create policy "artes_textos_base: leer" on public.artes_textos_base
  for select to authenticated
  using (
    (select public.es_usuario_activo())
    and origen_id = any ((select public.origenes_con_alcance('cotizaciones.ver', 'propios'))::uuid[])
  );

-- ---------------------------------------------------------------------------------------------------
-- El texto inicial de un origen según su tipo. El de uno manual es el de subasta sin el lote, la subasta y la hora del patio.
-- ---------------------------------------------------------------------------------------------------
create function public._artes_texto_base_inicial(p_tipo public.tipo_origen) returns text
  language sql immutable
  set search_path = ''
as $$
  select case p_tipo
    when 'subasta' then $texto${vehiculo}
Lote: {lote}
Año: {anio}
Kilometraje: {kilometraje}
VIN: {vin}
Subasta: {subasta}
Hora del patio: {hora_del_patio}
Total: {total}
Modo de tipo de cambio: {modo}
Válida hasta: {vigencia}
Asesor: {asesor}
Cargo: {cargo}
WhatsApp: {whatsapp}$texto$
    else $texto${vehiculo}
Año: {anio}
Kilometraje: {kilometraje}
VIN: {vin}
Total: {total}
Modo de tipo de cambio: {modo}
Válida hasta: {vigencia}
Asesor: {asesor}
Cargo: {cargo}
WhatsApp: {whatsapp}$texto$
  end
$$;

revoke all on function public._artes_texto_base_inicial(public.tipo_origen) from public, anon, authenticated;
grant execute on function public._artes_texto_base_inicial(public.tipo_origen) to service_role;

-- ---------------------------------------------------------------------------------------------------
-- Qué variables acepta el texto base de un origen. Toda `{…}` cuenta. Valen las comunes; las de subasta, sólo en un origen de subasta;
-- `ficha.<clave>` si la clave es de un campo activo del origen; `celda.<concepto>` con un concepto no vacío. Devuelve null si todas valen y,
-- si no, el mensaje de la primera que no.
-- ---------------------------------------------------------------------------------------------------
create function public._artes_texto_base_variables_validas(p_origen_id uuid, p_tipo public.tipo_origen, p_texto text) returns text
  language plpgsql stable
  set search_path = ''
as $$
declare
  v_comunes constant text[] := array['vehiculo','marca','modelo','anio','color','kilometraje','vin','origen','ubicacion','numero','total','modo','vigencia','cliente','asesor','cargo','whatsapp','empresa','web','red.facebook','red.instagram','red.tiktok','red.youtube','red.x','red.linkedin'];
  v_de_subasta constant text[] := array['lote','subasta','hora_del_patio','enlace_del_lote'];
  v_clave text;
begin
  for v_clave in select m[1] from regexp_matches(coalesce(p_texto, ''), '\{([^{}]*)\}', 'g') m loop
    if v_clave = any (v_comunes) then
      continue;
    end if;
    if v_clave = any (v_de_subasta) then
      if p_tipo = 'subasta' then
        continue;
      end if;
      return format('{%s} sólo se llena en un origen de subasta.', v_clave);
    end if;
    if left(v_clave, 6) = 'ficha.'
       and exists (select 1 from public.origenes_campos c   -- origenes_campos_origen_id_clave_key
                    where c.origen_id = p_origen_id and c.clave = substr(v_clave, 7) and c.activo) then
      continue;
    end if;
    if left(v_clave, 6) = 'celda.' and char_length(v_clave) > 6 then
      continue;
    end if;
    return format('{%s} no es un dato que el texto base pueda llenar.', v_clave);
  end loop;
  return null;
end;
$$;

revoke all on function public._artes_texto_base_variables_validas(uuid, public.tipo_origen, text) from public, anon, authenticated;
grant execute on function public._artes_texto_base_variables_validas(uuid, public.tipo_origen, text) to service_role;

-- ---------------------------------------------------------------------------------------------------
-- Guardar el texto base de un origen. Lo normaliza (sin `\r`, sin blancos en los bordes), exige su versión y, si no cambió, no escribe:
-- devuelve la versión vigente. Devuelve la versión nueva.
-- ---------------------------------------------------------------------------------------------------
create function public.artes_texto_base_guardar(p_origen_id uuid, p_texto text, p_actualizado_en_esperado timestamptz) returns timestamptz
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_nombre text; v_tipo public.tipo_origen; v_texto text; v_error text;
  v_actual text; v_version timestamptz; v_por uuid; v_quien text; v_mensaje text; v_nueva timestamptz;
begin
  perform public.assert_activo();
  -- `tiene_permiso` vale para cualquier id si el permiso es global: primero, que el origen exista.
  select o.nombre, o.tipo into v_nombre, v_tipo from public.origenes o where o.id = p_origen_id;   -- origenes_pkey
  if not found then
    raise exception 'Ese origen no existe.' using errcode = '22023', hint = 'origen';
  end if;
  perform public.assert_permiso('cotizaciones.configurar', p_origen_id);

  v_texto := btrim(replace(coalesce(p_texto, ''), E'\r\n', E'\n'), E' \t\n\r');
  if v_texto = '' then
    raise exception 'El texto base no puede quedar vacío.' using errcode = '22023', hint = 'texto';
  end if;
  if char_length(v_texto) > 2000 then
    raise exception 'El texto base lleva hasta 2000 caracteres.' using errcode = '22023', hint = 'texto';
  end if;
  v_error := public._artes_texto_base_variables_validas(p_origen_id, v_tipo, v_texto);
  if v_error is not null then
    raise exception '%', v_error using errcode = '22023', hint = 'variables';
  end if;

  select t.texto, t.actualizado_en, t.actualizado_por into v_actual, v_version, v_por
    from public.artes_textos_base t where t.origen_id = p_origen_id for no key update;
  if not found then
    -- La fila nace con su origen; si faltara, guardar la crea con este texto (si otra sesión la creó a la vez, se toma la suya).
    insert into public.artes_textos_base (origen_id, texto, actualizado_por)
    values (p_origen_id, v_texto, (select auth.uid()))
    on conflict (origen_id) do nothing
    returning actualizado_en into v_nueva;
    if v_nueva is not null then
      return v_nueva;
    end if;
    select t.texto, t.actualizado_en, t.actualizado_por into v_actual, v_version, v_por
      from public.artes_textos_base t where t.origen_id = p_origen_id for no key update;
  end if;

  if p_actualizado_en_esperado is not null and v_version is distinct from p_actualizado_en_esperado then
    select nullif(btrim(p.nombre), '') into v_quien from public.perfiles p where p.id = v_por;
    v_mensaje := case
      when v_por = (select auth.uid()) then
        format('Cambiaste el texto base de %s %s desde otra ventana. Recarga para seguir desde ahí.', v_nombre, public._hace(v_version))
      else format('%s cambió el texto base de %s %s.', coalesce(v_quien, 'Otra persona'), v_nombre, public._hace(v_version))
    end;
  end if;
  perform public._exigir_version(v_version, p_actualizado_en_esperado, v_mensaje);

  if v_actual = v_texto then
    return v_version;
  end if;
  update public.artes_textos_base t
     set texto = v_texto,
         actualizado_en = greatest(clock_timestamp(), v_version + interval '1 microsecond'),
         actualizado_por = (select auth.uid())
   where t.origen_id = p_origen_id
  returning t.actualizado_en into v_nueva;
  return v_nueva;
end;
$$;

revoke all on function public.artes_texto_base_guardar(uuid, text, timestamptz) from public, anon;
grant execute on function public.artes_texto_base_guardar(uuid, text, timestamptz) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------
-- Todo origen nace con su texto base.
-- ---------------------------------------------------------------------------------------------------
create function public.origen_sembrar_texto_base() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  insert into public.artes_textos_base (origen_id, texto)
  values (new.id, public._artes_texto_base_inicial(new.tipo))
  on conflict (origen_id) do nothing;
  return null;
end;
$$;

revoke all on function public.origen_sembrar_texto_base() from public, anon, authenticated;
grant execute on function public.origen_sembrar_texto_base() to service_role;

create trigger trg_origen_texto_base after insert on public.origenes
  for each row execute function public.origen_sembrar_texto_base();

-- Los orígenes que ya existen.
insert into public.artes_textos_base (origen_id, texto)
select o.id, public._artes_texto_base_inicial(o.tipo) from public.origenes o
on conflict (origen_id) do nothing;

-- El permiso que lo cambia dice dónde se aplica (la misma fila que `seed.sql`).
update public.permisos
   set descripcion = 'Fórmulas, constantes, tablas de referencia, plantilla y texto base de las artes (por origen); en todos los orígenes, también la vigencia de las cotizaciones',
       aplicado_en = 'formula_*, plantilla_*, tono_*, formula_para_cotizar, policy tablas_referencia (leer), tabla_referencia_crear, tabla_referencia_columnas, tabla_referencia_desactivar, tabla_referencia_publicar, empresa_guardar_ajustes_de_cotizacion, artes_texto_base_guardar'
 where clave = 'cotizaciones.configurar';
