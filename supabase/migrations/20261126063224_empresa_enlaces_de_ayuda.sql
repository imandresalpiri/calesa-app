-- Enlaces de ayuda (docs/GLOSARIO.md › Enlaces de ayuda): los que la empresa prepara para «Ayuda» del menú del perfil
-- (`enlaces_de_ayuda`, hasta 30, escritos por RPC con `empresa.ajustes.gestionar`) y lo que cada persona elige ver
-- (`enlaces_de_ayuda_personales`: qué oculta de la empresa, su orden y hasta 20 propios; sólo los ve y los escribe su dueña o dueño).
-- Distintos de la ayuda de una celda (`ayuda` del diseño de la hoja).

-- Los topes: espejo de `TOPE_DE_ENLACES_DE_LA_EMPRESA` y `TOPE_DE_ENLACES_PROPIOS` (`src/modules/empresa/entities/enlaces-de-ayuda.ts`).
create function public._enlaces_de_ayuda_tope() returns integer
  language sql immutable
  set search_path = ''
as $$ select 30 $$;

create function public._enlaces_de_ayuda_tope_propios() returns integer
  language sql immutable
  set search_path = ''
as $$ select 20 $$;

revoke all on function public._enlaces_de_ayuda_tope() from public, anon, authenticated;
revoke all on function public._enlaces_de_ayuda_tope_propios() from public, anon, authenticated;
grant execute on function public._enlaces_de_ayuda_tope() to authenticated, service_role;
grant execute on function public._enlaces_de_ayuda_tope_propios() to authenticated, service_role;

-- Los de la empresa. El orden es el del menú de quien no eligió otro; uno desactivado no se ve en el menú de nadie.
create table public.enlaces_de_ayuda (
  id uuid primary key,
  titulo text not null
    constraint enlaces_de_ayuda_titulo_valido check (titulo = btrim(titulo) and char_length(titulo) between 1 and 80),
  url text not null
    constraint enlaces_de_ayuda_url_https check (url ~* '^https://[^[:space:]/?#@]+([/?#][^[:space:]]*)?$' and char_length(url) <= 2000),
  descripcion text
    constraint enlaces_de_ayuda_descripcion_valida check (
      descripcion is null or (descripcion = btrim(descripcion) and char_length(descripcion) between 1 and 140)),
  orden integer not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.enlaces_de_ayuda is
  'Enlaces de ayuda de la empresa (hasta 30): «Ayuda» del menú del perfil. Los lee toda persona activa; se escriben sólo por enlace_de_ayuda_* con empresa.ajustes.gestionar.';

alter table public.enlaces_de_ayuda enable row level security;
revoke all on table public.enlaces_de_ayuda from anon, authenticated;
grant select on table public.enlaces_de_ayuda to authenticated;
grant all on table public.enlaces_de_ayuda to service_role;

create policy "enlaces_de_ayuda: leer" on public.enlaces_de_ayuda
  for select to authenticated
  using ((select public.es_usuario_activo()));

-- Lo de cada persona: una fila por enlace de la empresa que ordenó u ocultó (`enlace_id`) o por uno propio (título, URL y descripción).
-- Un enlace de la empresa que no tiene fila aparece visible al final de su orden: se guarda lo que oculta, no una lista cerrada de visibles.
create table public.enlaces_de_ayuda_personales (
  id uuid primary key,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  enlace_id uuid references public.enlaces_de_ayuda (id) on delete cascade,
  titulo text
    constraint enlaces_de_ayuda_personales_titulo_valido check (
      titulo is null or (titulo = btrim(titulo) and char_length(titulo) between 1 and 80)),
  url text
    constraint enlaces_de_ayuda_personales_url_https check (
      url is null or (url ~* '^https://[^[:space:]/?#@]+([/?#][^[:space:]]*)?$' and char_length(url) <= 2000)),
  descripcion text
    constraint enlaces_de_ayuda_personales_descripcion_valida check (
      descripcion is null or (descripcion = btrim(descripcion) and char_length(descripcion) between 1 and 140)),
  oculto boolean not null default false,
  orden integer not null,
  actualizado_en timestamptz not null default now(),
  -- O es un enlace de la empresa (sólo se oculta y se ordena) o es uno propio (nunca oculto: se quita).
  constraint enlaces_de_ayuda_personales_de_la_empresa_o_propio check (
    (enlace_id is not null and titulo is null and url is null and descripcion is null)
    or (enlace_id is null and titulo is not null and url is not null and not oculto)),
  constraint enlaces_de_ayuda_personales_usuario_enlace_key unique (usuario_id, enlace_id)
);

comment on table public.enlaces_de_ayuda_personales is
  'Lo que cada persona elige de los enlaces de ayuda: qué oculta de la empresa, su orden y hasta 20 propios. Sólo los lee su dueña o dueño; se escriben con enlaces_de_ayuda_guardar_mios().';

-- La lectura de una persona (y su policy) va por usuario_id y su orden; la FK a la empresa, por su índice propio (la cascada al quitar uno).
create index enlaces_de_ayuda_personales_usuario_orden_idx on public.enlaces_de_ayuda_personales (usuario_id, orden);
create index enlaces_de_ayuda_personales_enlace_idx on public.enlaces_de_ayuda_personales (enlace_id);

alter table public.enlaces_de_ayuda_personales enable row level security;
revoke all on table public.enlaces_de_ayuda_personales from anon, authenticated;
grant select on table public.enlaces_de_ayuda_personales to authenticated;
grant all on table public.enlaces_de_ayuda_personales to service_role;

create policy "enlaces_de_ayuda_personales: leer los míos" on public.enlaces_de_ayuda_personales
  for select to authenticated
  using (usuario_id = (select auth.uid()));

-- La versión de lo de cada persona, aparte de sus filas: la empresa que quita un enlace se lleva por cascada las filas que lo nombran, y
-- una versión sacada de esas filas retrocedería (un PT409 falso al siguiente guardado). La escribe sólo enlaces_de_ayuda_guardar_mios().
create table public.enlaces_de_ayuda_versiones (
  usuario_id uuid primary key references public.perfiles (id) on delete cascade,
  actualizado_en timestamptz not null
);

comment on table public.enlaces_de_ayuda_versiones is
  'La versión de los enlaces de ayuda de cada persona (la que manda enlaces_de_ayuda_guardar_mios()). Sólo la lee su dueña o dueño.';

alter table public.enlaces_de_ayuda_versiones enable row level security;
revoke all on table public.enlaces_de_ayuda_versiones from anon, authenticated;
grant select on table public.enlaces_de_ayuda_versiones to authenticated;
grant all on table public.enlaces_de_ayuda_versiones to service_role;

create policy "enlaces_de_ayuda_versiones: leer la mía" on public.enlaces_de_ayuda_versiones
  for select to authenticated
  using (usuario_id = (select auth.uid()));

-- Los campos de un enlace (de la empresa o propio), recortados y validados con el campo en el `hint`: los mismos topes que los `check`.
create function public._enlace_de_ayuda_titulo(p_texto text) returns text
  language plpgsql immutable
  set search_path = ''
as $$
declare v text := btrim(coalesce(p_texto, ''));
begin
  if v = '' then
    raise exception 'Escribe un título.' using errcode = '22023', hint = 'titulo';
  end if;
  if char_length(v) > 80 then
    raise exception 'El título puede tener hasta 80 caracteres.' using errcode = '22023', hint = 'titulo';
  end if;
  return v;
end;
$$;

create function public._enlace_de_ayuda_url(p_texto text) returns text
  language plpgsql immutable
  set search_path = ''
as $$
declare v text := btrim(coalesce(p_texto, ''));
begin
  if v !~* '^https://[^[:space:]/?#@]+([/?#][^[:space:]]*)?$' then
    raise exception 'Escribe una dirección que empiece con https://.' using errcode = '22023', hint = 'url';
  end if;
  if char_length(v) > 2000 then
    raise exception 'La dirección puede tener hasta 2.000 caracteres.' using errcode = '22023', hint = 'url';
  end if;
  return v;
end;
$$;

create function public._enlace_de_ayuda_descripcion(p_texto text) returns text
  language plpgsql immutable
  set search_path = ''
as $$
declare v text := nullif(btrim(coalesce(p_texto, '')), '');
begin
  if char_length(v) > 140 then
    raise exception 'La descripción puede tener hasta 140 caracteres.' using errcode = '22023', hint = 'descripcion';
  end if;
  return v;
end;
$$;

revoke all on function public._enlace_de_ayuda_titulo(text) from public, anon, authenticated;
revoke all on function public._enlace_de_ayuda_url(text) from public, anon, authenticated;
revoke all on function public._enlace_de_ayuda_descripcion(text) from public, anon, authenticated;
grant execute on function public._enlace_de_ayuda_titulo(text) to service_role;
grant execute on function public._enlace_de_ayuda_url(text) to service_role;
grant execute on function public._enlace_de_ayuda_descripcion(text) to service_role;

-- La lista de la empresa entera (también los desactivados), como la devuelve cada escritura: la pantalla no vuelve a leer.
create function public._enlaces_de_ayuda_lista() returns jsonb
  language sql stable security definer
  set search_path = ''
as $$
  select jsonb_build_object(
    'tope', public._enlaces_de_ayuda_tope(),
    'enlaces', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', e.id, 'titulo', e.titulo, 'url', e.url, 'descripcion', e.descripcion, 'orden', e.orden,
               'activo', e.activo, 'actualizado_en', e.actualizado_en
             ) order by e.orden, e.id)
        from (select x.* from public.enlaces_de_ayuda x order by x.orden, x.id limit public._enlaces_de_ayuda_tope() + 1) e
    ), '[]'::jsonb));
$$;

revoke all on function public._enlaces_de_ayuda_lista() from public, anon, authenticated;
grant execute on function public._enlaces_de_ayuda_lista() to service_role;

-- Crear uno al final, con el id del intento: repetirlo devuelve el mismo. El tope se cuenta tras el candado de la tabla.
create function public.enlace_de_ayuda_crear(p_id uuid, p_titulo text, p_url text, p_descripcion text default null) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare v_titulo text; v_url text; v_descripcion text; v_version timestamptz; v_hay integer;
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  v_titulo := public._enlace_de_ayuda_titulo(p_titulo);
  v_url := public._enlace_de_ayuda_url(p_url);
  v_descripcion := public._enlace_de_ayuda_descripcion(p_descripcion);
  lock table public.enlaces_de_ayuda in share row exclusive mode;
  select e.actualizado_en into v_version from public.enlaces_de_ayuda e where e.id = p_id;
  if found then
    return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', true, 'lista', public._enlaces_de_ayuda_lista());
  end if;
  select count(*) into v_hay from (select 1 from public.enlaces_de_ayuda limit public._enlaces_de_ayuda_tope()) t;
  if v_hay >= public._enlaces_de_ayuda_tope() then
    raise exception 'Ya hay % enlaces de ayuda: quita uno para sumar otro.', public._enlaces_de_ayuda_tope()
      using errcode = '22023', hint = 'tope';
  end if;
  insert into public.enlaces_de_ayuda (id, titulo, url, descripcion, orden)
  values (p_id, v_titulo, v_url, v_descripcion, coalesce((select max(e.orden) from public.enlaces_de_ayuda e), 0) + 1)
  returning actualizado_en into v_version;
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'lista', public._enlaces_de_ayuda_lista());
end;
$$;

-- Editar los campos o activarlo y desactivarlo (`p_cambios`: `titulo`, `url`, `descripcion` —vacía la quita— y `activo`), con su versión.
create function public.enlace_de_ayuda_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  o public.enlaces_de_ayuda;
  v_titulo text; v_url text; v_descripcion text; v_activo boolean; v_version timestamptz;
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  if p_cambios is null or jsonb_typeof(p_cambios) is distinct from 'object' then
    raise exception 'No hay nada que guardar.' using errcode = '22023';
  end if;
  select * into o from public.enlaces_de_ayuda e where e.id = p_id for update;
  if not found then
    raise exception 'Ese enlace de ayuda ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado,
    'Otra persona cambió este enlace de ayuda mientras lo editabas.');
  v_titulo := o.titulo;
  if p_cambios ? 'titulo' then
    v_titulo := public._enlace_de_ayuda_titulo(p_cambios ->> 'titulo');
  end if;
  v_url := o.url;
  if p_cambios ? 'url' then
    v_url := public._enlace_de_ayuda_url(p_cambios ->> 'url');
  end if;
  v_descripcion := o.descripcion;
  if p_cambios ? 'descripcion' then
    v_descripcion := public._enlace_de_ayuda_descripcion(p_cambios ->> 'descripcion');
  end if;
  v_activo := o.activo;
  if p_cambios ? 'activo' then
    if jsonb_typeof(p_cambios -> 'activo') is distinct from 'boolean' then
      raise exception 'Activo es sí o no.' using errcode = '22023', hint = 'activo';
    end if;
    v_activo := (p_cambios ->> 'activo')::boolean;
  end if;
  if (v_titulo, v_url, v_descripcion, v_activo) is not distinct from (o.titulo, o.url, o.descripcion, o.activo) then
    return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'lista', public._enlaces_de_ayuda_lista());
  end if;
  update public.enlaces_de_ayuda e
     set titulo = v_titulo, url = v_url, descripcion = v_descripcion, activo = v_activo,
         actualizado_en = greatest(clock_timestamp(), o.actualizado_en + interval '1 microsecond')
   where e.id = p_id
  returning e.actualizado_en into v_version;
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'lista', public._enlaces_de_ayuda_lista());
end;
$$;

-- «Subir» y «Bajar»: cambia de lugar con el de al lado (en el extremo, nada). El orden no es contenido: no mueve la versión.
create function public.enlace_de_ayuda_mover(p_id uuid, p_actualizado_en_esperado timestamptz, p_direccion text) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare o public.enlaces_de_ayuda; v_pos integer; v_destino integer;
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  if p_direccion is null or p_direccion not in ('subir', 'bajar') then
    raise exception 'La dirección es «subir» o «bajar».' using errcode = '22023', hint = 'direccion';
  end if;
  -- Reordenar pide el candado del conjunto: dos personas que mueven a la vez no dejan dos en el mismo lugar.
  lock table public.enlaces_de_ayuda in share row exclusive mode;
  select * into o from public.enlaces_de_ayuda e where e.id = p_id for update;
  if not found then
    raise exception 'Ese enlace de ayuda ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado,
    'Otra persona cambió este enlace de ayuda mientras lo ordenabas.');
  -- Lugares seguidos (1, 2, 3…) antes de cambiar: dos con el mismo orden no se intercambiarían.
  update public.enlaces_de_ayuda e set orden = n.nuevo
    from (select x.id, (row_number() over (order by x.orden, x.id))::integer as nuevo from public.enlaces_de_ayuda x) n
   where e.id = n.id and e.orden <> n.nuevo;
  select e.orden into v_pos from public.enlaces_de_ayuda e where e.id = p_id;
  v_destino := case when p_direccion = 'subir' then v_pos - 1 else v_pos + 1 end;
  -- En el extremo no hay con quién cambiar: queda como está.
  if exists (select 1 from public.enlaces_de_ayuda y where y.orden = v_destino) then
    update public.enlaces_de_ayuda e
       set orden = case when e.id = p_id then v_destino else v_pos end
     where e.id = p_id or e.orden = v_destino;
  end if;
  return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'lista', public._enlaces_de_ayuda_lista());
end;
$$;

-- Quitarlo: se va del menú de todos (y de lo que cada persona tenía ordenado, por la cascada). Uno que ya no está no es error.
create function public.enlace_de_ayuda_quitar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare o public.enlaces_de_ayuda;
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  lock table public.enlaces_de_ayuda in share row exclusive mode;
  select * into o from public.enlaces_de_ayuda e where e.id = p_id for update;
  if not found then
    return jsonb_build_object('id', p_id, 'lista', public._enlaces_de_ayuda_lista());
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado,
    'Otra persona cambió este enlace de ayuda. Recarga y decide de nuevo.');
  delete from public.enlaces_de_ayuda e where e.id = p_id;
  return jsonb_build_object('id', p_id, 'lista', public._enlaces_de_ayuda_lista());
end;
$$;

revoke all on function public.enlace_de_ayuda_crear(uuid, text, text, text) from public, anon;
revoke all on function public.enlace_de_ayuda_guardar(uuid, timestamptz, jsonb) from public, anon;
revoke all on function public.enlace_de_ayuda_mover(uuid, timestamptz, text) from public, anon;
revoke all on function public.enlace_de_ayuda_quitar(uuid, timestamptz) from public, anon;
grant execute on function public.enlace_de_ayuda_crear(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.enlace_de_ayuda_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;
grant execute on function public.enlace_de_ayuda_mover(uuid, timestamptz, text) to authenticated, service_role;
grant execute on function public.enlace_de_ayuda_quitar(uuid, timestamptz) to authenticated, service_role;

-- La única lectura de «Ayuda» de quien mira: los activos de la empresa en su orden y lo suyo, con la versión de lo suyo
-- (enlaces_de_ayuda_versiones; si nunca guardó, nula). La lista que ve la arma `armarMisEnlaces()` (`entities/mis-enlaces-de-ayuda.ts`).
-- Corre con los permisos de quien llama: la empresa la lee toda persona activa (su policy) y lo personal sólo lo propio (su policy y
-- el filtro, por enlaces_de_ayuda_personales_usuario_orden_idx). Con tope + 1 cada parte.
create function public.enlaces_de_ayuda_de_mi() returns jsonb
  language sql stable
  set search_path = ''
as $$
  select jsonb_build_object(
    'tope_propios', public._enlaces_de_ayuda_tope_propios(),
    'version', (select v.actualizado_en from public.enlaces_de_ayuda_versiones v where v.usuario_id = (select auth.uid())),
    'empresa', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'titulo', e.titulo, 'url', e.url, 'descripcion', e.descripcion) order by e.orden, e.id)
        from (select x.* from public.enlaces_de_ayuda x where x.activo order by x.orden, x.id limit public._enlaces_de_ayuda_tope() + 1) e
    ), '[]'::jsonb),
    'mios', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'enlace_id', p.enlace_id, 'titulo', p.titulo, 'url', p.url, 'descripcion', p.descripcion,
               'oculto', p.oculto, 'orden', p.orden
             ) order by p.orden, p.id)
        from (select x.* from public.enlaces_de_ayuda_personales x
               where x.usuario_id = (select auth.uid())
               order by x.orden, x.id
               limit public._enlaces_de_ayuda_tope() + public._enlaces_de_ayuda_tope_propios() + 1) p
    ), '[]'::jsonb));
$$;

revoke all on function public.enlaces_de_ayuda_de_mi() from public, anon;
grant execute on function public.enlaces_de_ayuda_de_mi() to authenticated, service_role;

-- Guardar lo de quien llama, entero: `p_elementos` es su lista en orden, cada uno `{enlace_id, oculto}` (uno de la empresa) o
-- `{id, titulo, url, descripcion}` (uno propio, con el id del navegador). Lo que falta se borra; un enlace de la empresa quitado o
-- repetido se ignora (desaparece sin error) y uno desactivado que no vino conserva su fila (vuelve a su lugar si lo activan). La versión
-- es la de lo suyo (`enlaces_de_ayuda_de_mi().version`, de enlaces_de_ayuda_versiones; nula si nunca guardó): otra ventana que guardó
-- antes da PT409, y la empresa que quita un enlace no la mueve.
create function public.enlaces_de_ayuda_guardar_mios(p_actualizado_en_esperado timestamptz, p_elementos jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_actual timestamptz;
  v_ahora timestamptz;
  v_el jsonb;
  v_pos integer := 0;
  v_propios uuid[] := array[]::uuid[];
  v_refs uuid[] := array[]::uuid[];
  v_id uuid;
  v_enlace uuid;
  v_oculto boolean;
  v_escritas integer;
begin
  perform public.assert_activo();
  if p_elementos is null or jsonb_typeof(p_elementos) is distinct from 'array' then
    raise exception 'La lista de tus enlaces no es válida.' using errcode = '22023', hint = 'elementos';
  end if;
  if jsonb_array_length(p_elementos) > public._enlaces_de_ayuda_tope() + public._enlaces_de_ayuda_tope_propios() then
    raise exception 'Tu lista tiene más enlaces de los que caben.' using errcode = '22023', hint = 'tope';
  end if;
  -- Una escritura de lo suyo a la vez (dos ventanas): el candado antes de leer la versión.
  perform pg_advisory_xact_lock(hashtextextended('enlaces_de_ayuda_personales:' || v_yo::text, 0));
  select v.actualizado_en into v_actual from public.enlaces_de_ayuda_versiones v where v.usuario_id = v_yo;
  if p_actualizado_en_esperado is null then
    if v_actual is not null then
      raise exception 'Cambiaste tus enlaces de ayuda en otra ventana. Recarga para ver cómo quedaron.' using errcode = 'PT409';
    end if;
  else
    perform public._exigir_version(v_actual, p_actualizado_en_esperado,
      'Cambiaste tus enlaces de ayuda en otra ventana. Recarga para ver cómo quedaron.');
  end if;
  v_ahora := greatest(clock_timestamp(), coalesce(v_actual + interval '1 microsecond', clock_timestamp()));
  insert into public.enlaces_de_ayuda_versiones as v (usuario_id, actualizado_en) values (v_yo, v_ahora)
  on conflict (usuario_id) do update set actualizado_en = excluded.actualizado_en;

  for v_el in select x.value from jsonb_array_elements(p_elementos) x loop
    if jsonb_typeof(v_el) is distinct from 'object' then
      raise exception 'La lista de tus enlaces no es válida.' using errcode = '22023', hint = 'elementos';
    end if;
    if v_el ? 'enlace_id' then
      v_enlace := (v_el ->> 'enlace_id')::uuid;
      if v_enlace is null or v_enlace = any(v_refs) then
        continue;
      end if;
      -- Tomado contra un borrado a la vez: el que ya no está se ignora.
      perform 1 from public.enlaces_de_ayuda e where e.id = v_enlace for key share;
      if not found then
        continue;
      end if;
      if (v_el ? 'oculto') and jsonb_typeof(v_el -> 'oculto') is distinct from 'boolean' then
        raise exception 'Mostrar es sí o no.' using errcode = '22023', hint = 'oculto';
      end if;
      v_oculto := coalesce((v_el ->> 'oculto')::boolean, false);
      v_refs := v_refs || v_enlace;
      v_pos := v_pos + 1;
      insert into public.enlaces_de_ayuda_personales as p (id, usuario_id, enlace_id, oculto, orden, actualizado_en)
      values (gen_random_uuid(), v_yo, v_enlace, v_oculto, v_pos, v_ahora)
      on conflict (usuario_id, enlace_id)
        do update set oculto = excluded.oculto, orden = excluded.orden, actualizado_en = excluded.actualizado_en;
    else
      v_id := (v_el ->> 'id')::uuid;
      if v_id is null then
        raise exception 'Falta el identificador de tu enlace.' using errcode = '22023', hint = 'elementos';
      end if;
      if v_id = any(v_propios) then
        raise exception 'Un enlace propio está dos veces en tu lista.' using errcode = '22023', hint = 'elementos';
      end if;
      v_propios := v_propios || v_id;
      if cardinality(v_propios) > public._enlaces_de_ayuda_tope_propios() then
        raise exception 'Ya tienes % enlaces propios: quita uno para sumar otro.', public._enlaces_de_ayuda_tope_propios()
          using errcode = '22023', hint = 'tope';
      end if;
      v_pos := v_pos + 1;
      insert into public.enlaces_de_ayuda_personales as p (id, usuario_id, titulo, url, descripcion, orden, actualizado_en)
      values (v_id, v_yo, public._enlace_de_ayuda_titulo(v_el ->> 'titulo'), public._enlace_de_ayuda_url(v_el ->> 'url'),
              public._enlace_de_ayuda_descripcion(v_el ->> 'descripcion'), v_pos, v_ahora)
      on conflict (id)
        do update set titulo = excluded.titulo, url = excluded.url, descripcion = excluded.descripcion,
                      orden = excluded.orden, actualizado_en = excluded.actualizado_en
        where p.usuario_id = v_yo and p.enlace_id is null;
      get diagnostics v_escritas = row_count;
      if v_escritas = 0 then
        raise exception 'Ese enlace no es tuyo.' using errcode = '42501';
      end if;
    end if;
  end loop;

  delete from public.enlaces_de_ayuda_personales p
   where p.usuario_id = v_yo
     and ((p.enlace_id is null and p.id <> all (v_propios))
       or (p.enlace_id is not null and p.enlace_id <> all (v_refs)
           and exists (select 1 from public.enlaces_de_ayuda e where e.id = p.enlace_id and e.activo)));

  return public.enlaces_de_ayuda_de_mi();
end;
$$;

revoke all on function public.enlaces_de_ayuda_guardar_mios(timestamptz, jsonb) from public, anon;
grant execute on function public.enlaces_de_ayuda_guardar_mios(timestamptz, jsonb) to authenticated, service_role;
