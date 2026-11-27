-- Ajustes del Live (docs/GLOSARIO.md › Modo Live, Ajustes del Live, Ajuste propio): qué se ve con el Modo Live encendido, por rol
-- (`live_ajustes_roles`) y, si hace falta, por persona (`live_ajustes_personas`, que pisa lo de su rol campo por campo). Lo que no tiene fila
-- sigue lo por defecto (el rol) o lo de su rol (la persona). Se escriben sólo por RPC con `live.configurar`; cada persona lee lo de su rol y lo
-- suyo, y quien configura, todo. Viajan a la app en `mi_sesion()`: la regla de combinar es `combinarAjustesDelLive()`
-- (`src/modules/equipo/entities/live-combinar.ts`). Son de presentación: no otorgan nada y la base no los conoce al decidir un permiso.

-- ---------------------------------------------------------------------------------------------------
-- La clave (la misma fila que `seed.sql`) y, en una base que ya tiene roles, el dueño la recibe. En un reset local las migraciones corren antes
-- del seed: el seed se la da al dueño con su `cross join`.
-- ---------------------------------------------------------------------------------------------------
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden) values
  ('live.configurar', 'live', 'Configurar el Modo Live', 'Qué se ve en el Modo Live, por rol y por persona', false, false,
   'live_rol_guardar, live_rol_quitar, live_persona_guardar, live_persona_quitar, live_personas, policy live_ajustes_*', 690)
on conflict (clave) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, por_origen = excluded.por_origen,
  con_alcance = excluded.con_alcance, aplicado_en = excluded.aplicado_en, modulo = excluded.modulo, orden = excluded.orden;

do $$
declare v_nuevos text;
begin
  with concedidos as (
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    select r.id, 'live.configurar', 'todos'::public.alcance_permiso
      from public.roles r
     where r.clave = 'dueno'
    on conflict do nothing
    returning rol_id)
  select string_agg(r.clave, ', ' order by r.clave) into v_nuevos from concedidos c join public.roles r on r.id = c.rol_id;
  raise notice 'live.configurar concedido a los roles: %', coalesce(v_nuevos, '(ninguno nuevo)');
end $$;

-- ---------------------------------------------------------------------------------------------------
-- La forma de los ajustes: un objeto parcial con claves en snake_case, espejo de `esquemaDeAjustesDelLive` (`entities/live.ts`). Lo usan el
-- `check` de las dos tablas y las RPC (que responden 22023 con hint `ajustes` antes de tocar nada).
-- ---------------------------------------------------------------------------------------------------
create function public._live_ajustes_validos(p jsonb) returns boolean
  language sql immutable
  set search_path = ''
as $$
  select coalesce(case when jsonb_typeof(p) is distinct from 'object' then false else (
    not exists (
      select 1 from jsonb_object_keys(p) k
       where k not in ('puede_encender', 'vehiculos', 'origenes', 'cotizaciones', 'clientes', 'logistica', 'repuestos', 'inicio', 'origenes_config'))
    and (not p ? 'puede_encender' or jsonb_typeof(p -> 'puede_encender') = 'boolean')
    and (not p ? 'vehiculos' or jsonb_typeof(p -> 'vehiculos') = 'boolean')
    and (not p ? 'cotizaciones' or jsonb_typeof(p -> 'cotizaciones') = 'boolean')
    and (not p ? 'inicio' or jsonb_typeof(p -> 'inicio') = 'boolean')
    and (not p ? 'clientes' or p -> 'clientes' in ('"apagado"'::jsonb, '"nombres"'::jsonb, '"completo"'::jsonb))
    and (not p ? 'logistica' or p -> 'logistica' in ('"apagado"'::jsonb, '"cadena"'::jsonb))
    and (not p ? 'repuestos' or p -> 'repuestos' in ('"apagado"'::jsonb, '"estadisticas"'::jsonb))
    and (not p ? 'origenes_config' or p -> 'origenes_config' in ('"apagado"'::jsonb, '"lectura"'::jsonb))
    and (not p ? 'origenes' or p -> 'origenes' = '"todos"'::jsonb or (
      case when jsonb_typeof(p -> 'origenes') is distinct from 'array' then false else (
        jsonb_array_length(p -> 'origenes') between 1 and 100
        and not exists (
          select 1 from jsonb_array_elements(p -> 'origenes') e
           where jsonb_typeof(e) <> 'string'
              or (e #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
      ) end))
  ) end, false)
$$;

revoke all on function public._live_ajustes_validos(jsonb) from public, anon, authenticated;
grant execute on function public._live_ajustes_validos(jsonb) to service_role;

-- ---------------------------------------------------------------------------------------------------
-- Las tablas. Sin fila = lo por defecto (un rol) o lo de su rol (una persona). Cada fila es una sola versión para el PT409.
-- ---------------------------------------------------------------------------------------------------
create table public.live_ajustes_roles (
  rol_id uuid primary key references public.roles (id) on delete cascade,
  ajustes jsonb not null constraint live_ajustes_roles_ajustes_validos check (public._live_ajustes_validos(ajustes)),
  actualizado_en timestamptz not null default clock_timestamp()
);

comment on table public.live_ajustes_roles is
  'Ajustes del Live de cada rol (parciales: lo que falta es lo por defecto). Los lee quien tiene el rol y quien tiene live.configurar; se escriben sólo por live_rol_guardar() y live_rol_quitar().';

create table public.live_ajustes_personas (
  usuario_id uuid primary key references public.perfiles (id) on delete cascade,
  ajustes jsonb not null constraint live_ajustes_personas_ajustes_validos check (public._live_ajustes_validos(ajustes) and ajustes <> '{}'::jsonb),
  actualizado_en timestamptz not null default clock_timestamp()
);

comment on table public.live_ajustes_personas is
  'Ajustes propios del Live de cada persona: pisan los de su rol campo por campo. Los lee su dueña o dueño y quien tiene live.configurar; se escriben sólo por live_persona_guardar() y live_persona_quitar().';

-- La lista de quienes tienen ajuste propio, por cursor (`live_personas()` sin texto).
create index live_ajustes_personas_actualizado_idx on public.live_ajustes_personas (actualizado_en desc, usuario_id desc);

alter table public.live_ajustes_roles enable row level security;
alter table public.live_ajustes_personas enable row level security;
revoke all on table public.live_ajustes_roles from anon, authenticated;
revoke all on table public.live_ajustes_personas from anon, authenticated;
grant select on table public.live_ajustes_roles to authenticated;
grant select on table public.live_ajustes_personas to authenticated;
grant all on table public.live_ajustes_roles to service_role;
grant all on table public.live_ajustes_personas to service_role;

-- Lo de un rol: quien configura, o quien tiene ese rol (lo sostiene `usuarios_roles_pkey`, por usuario y rol).
create policy "live_ajustes_roles: leer" on public.live_ajustes_roles
  for select to authenticated
  using (
    (select public.tiene_permiso('live.configurar'))
    or exists (select 1 from public.usuarios_roles ur where ur.usuario_id = (select auth.uid()) and ur.rol_id = live_ajustes_roles.rol_id));

create policy "live_ajustes_personas: leer" on public.live_ajustes_personas
  for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.tiene_permiso('live.configurar')));

-- ---------------------------------------------------------------------------------------------------
-- Escribir. Todas empiezan por la cuenta activa y el permiso, antes de cualquier candado. Guardar sin fila y con la esperada nula crea; con fila,
-- exige la versión (PT409). La versión se mueve con `greatest(clock_timestamp(), anterior + 1 µs)`: dos guardados en la misma transacción no
-- repiten la hora.
-- ---------------------------------------------------------------------------------------------------
create function public.live_rol_guardar(p_rol uuid, p_ajustes jsonb, p_actualizado_en_esperado timestamptz) returns timestamptz
  language plpgsql security definer
  set search_path = ''
as $$
declare v_actual timestamptz; v_nueva timestamptz;
begin
  perform public.assert_activo();
  perform public.assert_permiso('live.configurar');
  if p_rol is null or not exists (select 1 from public.roles r where r.id = p_rol) then
    raise exception 'El rol ya no existe.' using errcode = '22023', hint = 'rol';
  end if;
  if not public._live_ajustes_validos(p_ajustes) then
    raise exception 'Esos ajustes del Modo Live no son válidos.' using errcode = '22023', hint = 'ajustes';
  end if;
  select l.actualizado_en into v_actual from public.live_ajustes_roles l where l.rol_id = p_rol for update;
  if not found then
    if p_actualizado_en_esperado is not null then
      raise exception 'Otra persona cambió los ajustes de este rol mientras los veías. Recarga para seguir.' using errcode = 'PT409';
    end if;
    insert into public.live_ajustes_roles (rol_id, ajustes) values (p_rol, p_ajustes)
    on conflict (rol_id) do nothing
    returning actualizado_en into v_nueva;
    if v_nueva is null then
      raise exception 'Otra persona cambió los ajustes de este rol mientras los veías. Recarga para seguir.' using errcode = 'PT409';
    end if;
    return v_nueva;
  end if;
  -- La esperada nula es crear: con la fila ya creada, PT409 (nunca pisa).
  if p_actualizado_en_esperado is null then
    raise exception 'Otra persona cambió los ajustes de este rol mientras los veías. Recarga para seguir.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(v_actual, p_actualizado_en_esperado,
    'Otra persona cambió los ajustes de este rol mientras los veías. Recarga para seguir.');
  update public.live_ajustes_roles l
     set ajustes = p_ajustes, actualizado_en = greatest(clock_timestamp(), v_actual + interval '1 microsecond')
   where l.rol_id = p_rol
  returning l.actualizado_en into v_nueva;
  return v_nueva;
end;
$$;

-- «Volver a lo por defecto»: quita la fila del rol, con su versión.
create function public.live_rol_quitar(p_rol uuid, p_actualizado_en_esperado timestamptz) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare v_actual timestamptz;
begin
  perform public.assert_activo();
  perform public.assert_permiso('live.configurar');
  select l.actualizado_en into v_actual from public.live_ajustes_roles l where l.rol_id = p_rol for update;
  if not found then
    raise exception 'Otra persona cambió los ajustes de este rol mientras los veías. Recarga para seguir.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(v_actual, p_actualizado_en_esperado,
    'Otra persona cambió los ajustes de este rol mientras los veías. Recarga para seguir.');
  delete from public.live_ajustes_roles l where l.rol_id = p_rol;
end;
$$;

-- Lo propio de una persona activa. Unos ajustes vacíos (`{}`) son «Volver a lo de su rol»: borra la fila y devuelve null.
create function public.live_persona_guardar(p_usuario uuid, p_ajustes jsonb, p_actualizado_en_esperado timestamptz) returns timestamptz
  language plpgsql security definer
  set search_path = ''
as $$
declare v_actual timestamptz; v_nueva timestamptz; v_hay boolean;
begin
  perform public.assert_activo();
  perform public.assert_permiso('live.configurar');
  if p_usuario is null or not exists (select 1 from public.perfiles p where p.id = p_usuario and p.activo) then
    raise exception 'Esa persona ya no está en el equipo.' using errcode = '22023', hint = 'persona';
  end if;
  if not public._live_ajustes_validos(p_ajustes) then
    raise exception 'Esos ajustes del Modo Live no son válidos.' using errcode = '22023', hint = 'ajustes';
  end if;
  select l.actualizado_en into v_actual from public.live_ajustes_personas l where l.usuario_id = p_usuario for update;
  v_hay := found;
  if not v_hay then
    if p_actualizado_en_esperado is not null then
      raise exception 'Otra persona cambió los ajustes de esta persona mientras los veías. Recarga para seguir.' using errcode = 'PT409';
    end if;
    if p_ajustes = '{}'::jsonb then
      return null;
    end if;
    insert into public.live_ajustes_personas (usuario_id, ajustes) values (p_usuario, p_ajustes)
    on conflict (usuario_id) do nothing
    returning actualizado_en into v_nueva;
    if v_nueva is null then
      raise exception 'Otra persona cambió los ajustes de esta persona mientras los veías. Recarga para seguir.' using errcode = 'PT409';
    end if;
    return v_nueva;
  end if;
  -- La esperada nula es crear: con la fila ya creada, PT409 (nunca pisa).
  if p_actualizado_en_esperado is null then
    raise exception 'Otra persona cambió los ajustes de esta persona mientras los veías. Recarga para seguir.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(v_actual, p_actualizado_en_esperado,
    'Otra persona cambió los ajustes de esta persona mientras los veías. Recarga para seguir.');
  if p_ajustes = '{}'::jsonb then
    delete from public.live_ajustes_personas l where l.usuario_id = p_usuario;
    return null;
  end if;
  update public.live_ajustes_personas l
     set ajustes = p_ajustes, actualizado_en = greatest(clock_timestamp(), v_actual + interval '1 microsecond')
   where l.usuario_id = p_usuario
  returning l.actualizado_en into v_nueva;
  return v_nueva;
end;
$$;

-- «Volver a lo de su rol»: quita lo propio, con su versión. No exige que la persona siga activa: lo de una baja también se limpia.
create function public.live_persona_quitar(p_usuario uuid, p_actualizado_en_esperado timestamptz) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare v_actual timestamptz;
begin
  perform public.assert_activo();
  perform public.assert_permiso('live.configurar');
  select l.actualizado_en into v_actual from public.live_ajustes_personas l where l.usuario_id = p_usuario for update;
  if not found then
    raise exception 'Otra persona cambió los ajustes de esta persona mientras los veías. Recarga para seguir.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(v_actual, p_actualizado_en_esperado,
    'Otra persona cambió los ajustes de esta persona mientras los veías. Recarga para seguir.');
  delete from public.live_ajustes_personas l where l.usuario_id = p_usuario;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- «Ajustes por persona»: sin texto (o con uno sin 3 letras o dígitos seguidos), quienes tienen ajuste propio y siguen activos, por cursor
-- (`live_ajustes_personas_actualizado_idx`; con cursor y sin cursor son dos consultas). Con texto, las personas vigentes que lo nombran, con el
-- recorrido y el trigram de `equipo_lista()` (`_equipo_lista_sql`), sin cursor: tope y «escribe más». Cada una con su rol principal y lo propio.
-- ---------------------------------------------------------------------------------------------------
create function public.live_personas(p_texto text default null, p_cursor_en timestamptz default null, p_cursor_id uuid default null,
                                     p_limite integer default 21) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_limite integer := public._acotar_pagina(p_limite, 21, 21);  -- la página, 20, y una más para saber si hay otras
  v_texto text := left(btrim(coalesce(p_texto, '')), 100);
  v_ids uuid[];
  v_lista jsonb;
begin
  perform public.assert_activo();
  perform public.assert_permiso('live.configurar');
  if v_texto <> '' and public._equipo_lista_indexable(v_texto) then
    execute public._equipo_lista_sql(v_texto, 'vigentes', v_limite, 'recorrer') into v_ids;
    if cardinality(v_ids) < v_limite then
      execute format('select array(%s)', public._equipo_lista_sql(v_texto, 'vigentes', v_limite, 'indice')) into v_ids;
    end if;
  elsif p_cursor_en is null or p_cursor_id is null then
    select array(
      select l.usuario_id from public.live_ajustes_personas l join public.perfiles p on p.id = l.usuario_id
       where p.activo
       order by l.actualizado_en desc, l.usuario_id desc
       limit v_limite) into v_ids;
  else
    select array(
      select l.usuario_id from public.live_ajustes_personas l join public.perfiles p on p.id = l.usuario_id
       where p.activo and (l.actualizado_en, l.usuario_id) < (p_cursor_en, p_cursor_id)
       order by l.actualizado_en desc, l.usuario_id desc
       limit v_limite) into v_ids;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'nombre', p.nombre, 'email', p.email,
           'rol', (select jsonb_build_object('id', r.id, 'nombre', r.nombre)
                     from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id
                    where ur.usuario_id = p.id
                    order by ur.es_principal desc, r.orden, r.nombre limit 1),
           'ajustes', l.ajustes, 'actualizado_en', l.actualizado_en) order by x.n), '[]'::jsonb)
    into v_lista
    from unnest(v_ids[1:v_limite - 1]) with ordinality x(id, n)
    join public.perfiles p on p.id = x.id
    left join public.live_ajustes_personas l on l.usuario_id = p.id;
  return jsonb_build_object('personas', v_lista, 'hay_mas', coalesce(cardinality(v_ids), 0) >= v_limite);
end;
$$;

revoke all on function public.live_rol_guardar(uuid, jsonb, timestamptz) from public, anon;
revoke all on function public.live_rol_quitar(uuid, timestamptz) from public, anon;
revoke all on function public.live_persona_guardar(uuid, jsonb, timestamptz) from public, anon;
revoke all on function public.live_persona_quitar(uuid, timestamptz) from public, anon;
revoke all on function public.live_personas(text, timestamptz, uuid, integer) from public, anon;
grant execute on function public.live_rol_guardar(uuid, jsonb, timestamptz) to authenticated, service_role;
grant execute on function public.live_rol_quitar(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.live_persona_guardar(uuid, jsonb, timestamptz) to authenticated, service_role;
grant execute on function public.live_persona_quitar(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.live_personas(text, timestamptz, uuid, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------
-- `mi_sesion()`: la definición vigente con la clave `live`. `rol` es el de la perspectiva si «Ver como» vale (y entonces `persona` es nula:
-- se mira como el rol, sin lo propio); si no, el principal (el mismo orden que `roles`). Dos lecturas por clave primaria dentro de la misma ida.
-- ---------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."mi_sesion"("p_perspectiva" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select jsonb_build_object(
    'estado', case when not p.activo then 'baja' when p.bloqueado then 'bloqueada' else 'activa' end,
    'perfil', jsonb_build_object(
      'id', p.id, 'nombre', p.nombre, 'email', p.email, 'avatar_ruta', p.avatar_ruta,
      'actualizado_en', p.actualizado_en),
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'clave', r.clave, 'nombre', r.nombre, 'color', r.color, 'es_principal', ur.es_principal)
                       order by ur.es_principal desc, r.orden, r.nombre)
      from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id
      where ur.usuario_id = p.id), '[]'::jsonb),
    'permisos', coalesce((
      select jsonb_agg(jsonb_build_object('clave', m.clave, 'origen_id', m.origen_id, 'alcance', m.alcance))
      from public.permisos_efectivos(p_perspectiva) m), '[]'::jsonb),
    'perspectiva', jsonb_build_object(
      'disponible', v.disponible,
      'rol', (
        select jsonb_build_object('id', r.id, 'nombre', r.nombre, 'color', r.color)
        from public.roles r where v.disponible and r.id = p_perspectiva),
      'roles', coalesce((
        select jsonb_agg(jsonb_build_object('id', r.id, 'nombre', r.nombre, 'color', r.color) order by r.orden, r.nombre)
        from public.roles r where v.disponible), '[]'::jsonb)),
    'preferencias', coalesce((
      select jsonb_object_agg(pu.clave, pu.valor)
      from public.preferencias_usuario pu
      where pu.usuario_id = p.id), '{}'::jsonb),
    'live', jsonb_build_object(
      'rol', (
        select jsonb_build_object('id', r.id, 'nombre', r.nombre, 'ajustes', l.ajustes)
        from public.roles r left join public.live_ajustes_roles l on l.rol_id = r.id
        where r.id = coalesce(mirado.id, principal.id)),
      'persona', case when mirado.id is null then (
        select l.ajustes from public.live_ajustes_personas l where l.usuario_id = p.id) end))
  from public.perfiles p
  cross join lateral (select public.tiene_permiso('equipo.roles.gestionar') as disponible) v
  left join lateral (select r.id from public.roles r where v.disponible and r.id = p_perspectiva) mirado on true
  left join lateral (
    select ur.rol_id as id from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id
     where ur.usuario_id = p.id
     order by ur.es_principal desc, r.orden, r.nombre limit 1) principal on true
  where p.id = (select auth.uid());
$$;
