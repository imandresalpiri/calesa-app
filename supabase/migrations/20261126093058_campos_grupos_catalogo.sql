-- campos_grupos_catalogo
-- El grupo de un campo (de los leads y de cada origen) deja de ser texto libre: es un elemento de un catálogo por contexto
-- (`leads_campos_grupos`, `origenes_campos_grupos`) con nombre, orden, activo y versión. El mismo nombre es el mismo grupo sin
-- importar mayúsculas, tildes ni espacios (índice único sobre `_nombre_de_catalogo`), el campo guarda `grupo_id` y el orden de los
-- bloques del formulario y de la ficha es el del grupo. La sección de datos (al final) crea los grupos desde los textos de hoy y
-- borra la columna `grupo`.

-- ── El nombre de un catálogo ──────────────────────────────────────────────────────────────────────────────────────────────────────
-- Se guarda el nombre limpio (un espacio entre palabras, ninguno en las puntas) y se compara la clave (además sin tildes ni
-- mayúsculas). Espejo: `nombreLimpio()` y `claveDeNombre()` de `src/shared/lib/catalogo/nombre.ts`.

create or replace function public._nombre_limpio(p_texto text) returns text
  language sql immutable strict parallel safe
  set search_path = ''
as $$
  select btrim(regexp_replace(p_texto, '\s+', ' ', 'g'))
$$;

create or replace function public._nombre_de_catalogo(p_texto text) returns text
  language sql immutable strict parallel safe
  set search_path = ''
as $$
  select public._sin_tildes(public._nombre_limpio(p_texto))
$$;

comment on function public._nombre_de_catalogo(text) is
  'La clave de un nombre de catálogo: sin mayúsculas, tildes ni espacios de más. Sostiene el índice único de cada catálogo; espejo de claveDeNombre().';

revoke all on function public._nombre_limpio(text) from public, anon;
grant execute on function public._nombre_limpio(text) to authenticated, service_role;
revoke all on function public._nombre_de_catalogo(text) from public, anon;
grant execute on function public._nombre_de_catalogo(text) to authenticated, service_role;

-- El trigger de nombre de todo catálogo: limpia, valida el largo (`tg_argv[0]`) y, si ya hay otro con la misma clave en el mismo
-- alcance (`tg_argv[1]`, una columna: `origen_id`), lo rechaza nombrando al que existe. Corre como quien escribe: la lectura del
-- catálogo es la misma que la de su escritura. El índice único queda para las carreras.
create or replace function public._catalogo_nombre() returns trigger
  language plpgsql
  set search_path = ''
as $$
declare
  v_largo int := tg_argv[0]::int;
  v_alcance text := case when tg_nargs > 1 then tg_argv[1] end;
  v_existe text;
begin
  new.nombre := public._nombre_limpio(new.nombre);
  if new.nombre is null or new.nombre = '' then
    raise exception 'Escribe un nombre.' using errcode = '23514', hint = 'nombre';
  end if;
  if char_length(new.nombre) > v_largo then
    raise exception 'Hasta % caracteres.', v_largo using errcode = '23514', hint = 'nombre';
  end if;
  if v_alcance is null then
    execute format(
      'select x.nombre from %I.%I x where public._nombre_de_catalogo(x.nombre) = public._nombre_de_catalogo($1) and x.id <> $2 limit 1',
      tg_table_schema, tg_table_name)
      into v_existe using new.nombre, new.id;
  else
    execute format(
      'select x.nombre from %I.%I x where x.%I = $3 and public._nombre_de_catalogo(x.nombre) = public._nombre_de_catalogo($1) and x.id <> $2 limit 1',
      tg_table_schema, tg_table_name, v_alcance)
      into v_existe using new.nombre, new.id, (to_jsonb(new) ->> v_alcance)::uuid;
  end if;
  if v_existe is not null then
    raise exception 'Ya existe «%».', v_existe using errcode = '23505', hint = 'nombre';
  end if;
  return new;
end;
$$;

revoke all on function public._catalogo_nombre() from public, anon, authenticated;
grant execute on function public._catalogo_nombre() to service_role;

-- ── Los catálogos ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

create table public.leads_campos_grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 40),
  orden smallint not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.leads_campos_grupos is
  'Grupos de campos de los leads: el bloque del formulario y de la ficha. Nombre único normalizado, orden de los bloques; se escribe por lead_campo_grupo_*.';

create unique index leads_campos_grupos_nombre_key on public.leads_campos_grupos (public._nombre_de_catalogo(nombre));

alter table public.leads_campos_grupos enable row level security;
revoke all on table public.leads_campos_grupos from anon, authenticated;
grant select on table public.leads_campos_grupos to authenticated;
grant all on table public.leads_campos_grupos to service_role;
create policy "leads_campos_grupos: leer" on public.leads_campos_grupos for select to authenticated using (true);

create trigger trg_actualizado_en before update on public.leads_campos_grupos
  for each row execute function public.set_actualizado_en();
create trigger trg_catalogo_nombre before insert or update of nombre on public.leads_campos_grupos
  for each row execute function public._catalogo_nombre('40');
create trigger trg_auditar after insert or delete or update on public.leads_campos_grupos
  for each row execute function public.auditar();

create table public.origenes_campos_grupos (
  id uuid primary key default gen_random_uuid(),
  origen_id uuid not null references public.origenes (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  orden smallint not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint origenes_campos_grupos_origen_id_id_key unique (origen_id, id)
);

comment on table public.origenes_campos_grupos is
  'Grupos de campos de cada origen: el bloque del formulario y de la ficha del vehículo. Nombre único normalizado por origen; se escribe por origen_campo_grupo_*.';

-- También sostiene la FK `origen_id` (su primera columna).
create unique index origenes_campos_grupos_nombre_key on public.origenes_campos_grupos (origen_id, public._nombre_de_catalogo(nombre));

alter table public.origenes_campos_grupos enable row level security;
revoke all on table public.origenes_campos_grupos from anon, authenticated;
grant select on table public.origenes_campos_grupos to authenticated;
grant all on table public.origenes_campos_grupos to service_role;
create policy "origenes_campos_grupos: leer" on public.origenes_campos_grupos for select to authenticated using (true);

create trigger trg_actualizado_en before update on public.origenes_campos_grupos
  for each row execute function public.set_actualizado_en();
create trigger trg_catalogo_nombre before insert or update of nombre on public.origenes_campos_grupos
  for each row execute function public._catalogo_nombre('40', 'origen_id');
create trigger trg_auditar after insert or delete or update on public.origenes_campos_grupos
  for each row execute function public.auditar();
-- La web pública dibuja los atributos de un vehículo por bloques.
create trigger web_revalidar after insert or delete or update on public.origenes_campos_grupos
  for each statement execute function public._web_revalidar_anotar('vehiculos');

-- El campo guarda la referencia. `no action` (no `restrict`): se comprueba al final de la sentencia, y así borrar un origen arrastra
-- sus grupos y sus campos en la misma cascada. La FK compuesta impide que un campo use el grupo de otro origen.
alter table public.leads_campos add column grupo_id uuid references public.leads_campos_grupos (id);
create index leads_campos_grupo_idx on public.leads_campos (grupo_id);

alter table public.origenes_campos add column grupo_id uuid;
alter table public.origenes_campos add constraint origenes_campos_grupo_fkey
  foreign key (origen_id, grupo_id) references public.origenes_campos_grupos (origen_id, id);
create index origenes_campos_grupo_idx on public.origenes_campos (origen_id, grupo_id);

-- ── Ayudantes ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

-- El grupo con ese nombre (normalizado) o uno nuevo al final. Para lo que nace con grupos de texto: los presets del origen, apibara y
-- la preparación de los e2e. Busca y después inserta: el trigger de nombre rechaza antes que el índice, así que nunca `on conflict`.
create or replace function public._lead_campo_grupo_asegurar(p_nombre text) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare v_id uuid; v_nombre text := public._nombre_limpio(p_nombre);
begin
  if v_nombre is null or v_nombre = '' then
    return null;
  end if;
  select x.id into v_id from public.leads_campos_grupos x
   where public._nombre_de_catalogo(x.nombre) = public._nombre_de_catalogo(v_nombre);   -- leads_campos_grupos_nombre_key
  if found then
    return v_id;
  end if;
  begin
    insert into public.leads_campos_grupos (nombre, orden)
    values (left(v_nombre, 40), coalesce((select max(x.orden) + 10 from public.leads_campos_grupos x), 10))
    returning id into v_id;
  exception when unique_violation then
    select x.id into v_id from public.leads_campos_grupos x
     where public._nombre_de_catalogo(x.nombre) = public._nombre_de_catalogo(v_nombre);
  end;
  return v_id;
end;
$$;

create or replace function public._origen_campo_grupo_asegurar(p_origen uuid, p_nombre text) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare v_id uuid; v_nombre text := public._nombre_limpio(p_nombre);
begin
  if v_nombre is null or v_nombre = '' then
    return null;
  end if;
  select x.id into v_id from public.origenes_campos_grupos x
   where x.origen_id = p_origen and public._nombre_de_catalogo(x.nombre) = public._nombre_de_catalogo(v_nombre);   -- origenes_campos_grupos_nombre_key
  if found then
    return v_id;
  end if;
  begin
    insert into public.origenes_campos_grupos (origen_id, nombre, orden)
    values (p_origen, left(v_nombre, 40),
            coalesce((select max(x.orden) + 10 from public.origenes_campos_grupos x where x.origen_id = p_origen), 10))
    returning id into v_id;
  exception when unique_violation then
    select x.id into v_id from public.origenes_campos_grupos x
     where x.origen_id = p_origen and public._nombre_de_catalogo(x.nombre) = public._nombre_de_catalogo(v_nombre);
  end;
  return v_id;
end;
$$;

revoke all on function public._lead_campo_grupo_asegurar(text) from public, anon, authenticated;
grant execute on function public._lead_campo_grupo_asegurar(text) to service_role;
revoke all on function public._origen_campo_grupo_asegurar(uuid, text) from public, anon, authenticated;
grant execute on function public._origen_campo_grupo_asegurar(uuid, text) to service_role;

-- El grupo que se elige para un campo: que exista (en ese origen) y esté activo. Conservar el que ya tiene, aunque esté
-- desactivado, vale (`p_actual`).
create or replace function public._lead_campo_grupo_exigir(p_grupo uuid, p_actual uuid) returns void
  language plpgsql stable
  set search_path = ''
as $$
declare v_activo boolean;
begin
  if p_grupo is null then
    return;
  end if;
  select x.activo into v_activo from public.leads_campos_grupos x where x.id = p_grupo;
  if not found then
    raise exception 'Ese grupo ya no existe: recarga.' using errcode = '22023', hint = 'grupo_id';
  end if;
  if not v_activo and p_grupo is distinct from p_actual then
    raise exception 'Ese grupo está desactivado: actívalo en «Grupos» o elige otro.' using errcode = '22023', hint = 'grupo_id';
  end if;
end;
$$;

create or replace function public._origen_campo_grupo_exigir(p_origen uuid, p_grupo uuid, p_actual uuid) returns void
  language plpgsql stable
  set search_path = ''
as $$
declare v_activo boolean;
begin
  if p_grupo is null then
    return;
  end if;
  select x.activo into v_activo from public.origenes_campos_grupos x where x.id = p_grupo and x.origen_id = p_origen;
  if not found then
    raise exception 'Ese grupo ya no existe: recarga.' using errcode = '22023', hint = 'grupo_id';
  end if;
  if not v_activo and p_grupo is distinct from p_actual then
    raise exception 'Ese grupo está desactivado: actívalo en «Grupos» o elige otro.' using errcode = '22023', hint = 'grupo_id';
  end if;
end;
$$;

revoke all on function public._lead_campo_grupo_exigir(uuid, uuid) from public, anon, authenticated;
grant execute on function public._lead_campo_grupo_exigir(uuid, uuid) to service_role;
revoke all on function public._origen_campo_grupo_exigir(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public._origen_campo_grupo_exigir(uuid, uuid, uuid) to service_role;

-- ── Los campos eligen su grupo por id ─────────────────────────────────────────────────────────────────────────────────────────────

drop function public.lead_campo_crear(text, text, public.tipo_campo, jsonb, boolean, text, boolean, boolean, boolean, jsonb, text, numeric, numeric);

create function public.lead_campo_crear(
  p_clave text, p_etiqueta text, p_tipo public.tipo_campo, p_opciones jsonb default '[]'::jsonb, p_requerido boolean default false,
  p_grupo_id uuid default null, p_en_tabla boolean default false, p_filtrable boolean default false, p_solo_cartera boolean default null,
  p_valor_defecto jsonb default null, p_valor_defecto_empresa text default null, p_minimo numeric default null, p_maximo numeric default null
) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_etiqueta text; v_id uuid; v_version timestamptz;
  v_defecto jsonb; v_empresa text;
begin
  perform public.assert_permiso('leads.campos.gestionar');
  -- El orden es del layout entero: el candado también ordena el «último + 10» de dos altas a la vez.
  lock table public.leads_campos in share row exclusive mode;
  if p_clave is null or p_clave !~ '^[a-z][a-z0-9_]{1,40}$' then
    raise exception 'La clave del campo usa minúsculas, números y guion bajo, y empieza con una letra.';
  end if;
  if public._lead_clave_reservada(p_clave) then
    raise exception '«%» ya es un dato fijo de todos los leads: no se crea como campo propio.', p_clave;
  end if;
  if p_tipo in ('vin', 'lote') then
    raise exception 'Un lead no lleva campos de ese tipo.';
  end if;
  v_etiqueta := public._campo_nombre_valido(p_etiqueta, 'el nombre del campo', 60);
  perform public._campo_opciones_validas(coalesce(p_opciones, '[]'::jsonb));
  if p_tipo in ('opcion', 'multi_opcion') and jsonb_array_length(coalesce(p_opciones, '[]'::jsonb)) = 0 then
    raise exception 'Un campo de opciones necesita al menos una opción.';
  end if;
  if p_tipo not in ('opcion', 'multi_opcion') and jsonb_array_length(coalesce(p_opciones, '[]'::jsonb)) > 0 then
    raise exception 'Sólo un campo de opciones lleva opciones.';
  end if;
  perform public._lead_campo_grupo_exigir(p_grupo_id, null);
  v_defecto := public._campo_valor_defecto(p_tipo, coalesce(p_opciones, '[]'::jsonb), p_valor_defecto);
  v_empresa := public._lead_defecto_empresa(p_tipo, v_defecto, p_valor_defecto_empresa);
  perform public._campo_rango(p_tipo, p_minimo, p_maximo, v_defecto);
  begin
    insert into public.leads_campos (clave, etiqueta, tipo, opciones, requerido, grupo_id, orden, en_tabla, filtrable,
                                     solo_cartera, es_sistema, valor_defecto, valor_defecto_empresa, minimo, maximo)
    values (p_clave, v_etiqueta, p_tipo, coalesce(p_opciones, '[]'::jsonb), coalesce(p_requerido, false), p_grupo_id,
            coalesce((select max(c.orden) + 10 from public.leads_campos c), 10),
            coalesce(p_en_tabla, false), coalesce(p_filtrable, false),
            coalesce(p_solo_cartera, p_tipo in ('correo', 'documento')), false, v_defecto, v_empresa, p_minimo, p_maximo)
    returning id, actualizado_en into v_id, v_version;
  exception when unique_violation then
    raise exception 'Ya hay un campo con la clave «%».', p_clave using errcode = '23505';
  end;
  return jsonb_build_object('id', v_id, 'actualizado_en', v_version);
end;
$$;

revoke all on function public.lead_campo_crear(text, text, public.tipo_campo, jsonb, boolean, uuid, boolean, boolean, boolean, jsonb, text, numeric, numeric) from public, anon;
grant execute on function public.lead_campo_crear(text, text, public.tipo_campo, jsonb, boolean, uuid, boolean, boolean, boolean, jsonb, text, numeric, numeric) to authenticated, service_role;

create or replace function public.lead_campo_guardar(p_campo uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns timestamptz
  language plpgsql security definer
  set search_path = ''
as $$
declare
  c public.leads_campos; v_clave text; v_nueva timestamptz;
  v_editables constant text[] := array['etiqueta', 'tipo', 'opciones', 'requerido', 'grupo_id', 'en_tabla', 'filtrable',
    'solo_cartera', 'activo', 'valor_defecto', 'valor_defecto_empresa', 'minimo', 'maximo'];
  v_tipo public.tipo_campo; v_opciones jsonb; v_grupo_id uuid; v_con int; v_orden smallint; v_defecto jsonb; v_empresa text;
  v_minimo numeric; v_maximo numeric;
  v_privado boolean := (p_cambios ->> 'solo_cartera')::boolean; v_pendiente boolean;
begin
  perform public.assert_permiso('leads.campos.gestionar');
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los cambios a guardar.';
  end if;
  for v_clave in select jsonb_object_keys(p_cambios) loop
    if not (v_clave = any (v_editables)) then
      raise exception 'El dato «%» no se cambia desde el layout de campos.', v_clave;
    end if;
    if v_clave in ('etiqueta', 'tipo', 'opciones', 'requerido', 'en_tabla', 'filtrable', 'solo_cartera', 'activo')
       and p_cambios -> v_clave = 'null'::jsonb then
      raise exception 'El dato «%» no puede quedar vacío.', v_clave;
    end if;
  end loop;

  lock table public.leads_campos in share row exclusive mode;
  select * into c from public.leads_campos x where x.id = p_campo for update;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');

  v_tipo := coalesce((p_cambios ->> 'tipo')::public.tipo_campo, c.tipo);
  if v_tipo is distinct from c.tipo then
    if c.es_sistema then
      raise exception 'El tipo de «%» no cambia: es un campo de fábrica.', c.etiqueta;
    end if;
    if v_tipo in ('vin', 'lote') then
      raise exception 'Un lead no lleva campos de ese tipo.';
    end if;
    v_con := public._lead_campo_con_valor(c.clave);
    if v_con > 0 then
      raise exception '% % ya tienen un valor en «%»: no se puede cambiar su tipo. Desactívalo y crea otro campo.',
        v_con, case when v_con = 1 then 'lead' else 'leads' end, c.etiqueta;
    end if;
  end if;

  v_opciones := coalesce(p_cambios -> 'opciones', c.opciones);
  if v_tipo not in ('opcion', 'multi_opcion') then
    v_opciones := '[]'::jsonb;
  else
    perform public._campo_opciones_validas(v_opciones);
    if jsonb_array_length(v_opciones) = 0 then
      raise exception 'Un campo de opciones necesita al menos una opción.';
    end if;
  end if;

  if p_cambios ? 'valor_defecto' then
    v_defecto := public._campo_valor_defecto(v_tipo, v_opciones, p_cambios -> 'valor_defecto');
  elsif v_tipo is distinct from c.tipo then
    v_defecto := null;
  else
    begin
      v_defecto := public._campo_valor_defecto(v_tipo, v_opciones, c.valor_defecto);
    exception when invalid_parameter_value then
      v_defecto := null;
    end;
  end if;

  -- El rango: lo que se manda (null = sin límite) o el vigente; si el tipo deja de ser numérico, se va solo, como las opciones.
  v_minimo := public._campo_limite(p_cambios, 'minimo', case when v_tipo in ('numero', 'moneda') then c.minimo end);
  v_maximo := public._campo_limite(p_cambios, 'maximo', case when v_tipo in ('numero', 'moneda') then c.maximo end);
  perform public._campo_rango(v_tipo, v_minimo, v_maximo, v_defecto);

  -- «La de la empresa»: si ahora hay un valor fijo se va solo; si el tipo ya no es texto, también.
  if p_cambios ? 'valor_defecto_empresa' then
    v_empresa := public._lead_defecto_empresa(v_tipo, v_defecto, p_cambios ->> 'valor_defecto_empresa');
  elsif v_tipo <> 'texto' or v_defecto is not null then
    v_empresa := null;
  else
    v_empresa := c.valor_defecto_empresa;
  end if;

  v_grupo_id := case when p_cambios ? 'grupo_id' then (p_cambios ->> 'grupo_id')::uuid else c.grupo_id end;
  perform public._lead_campo_grupo_exigir(v_grupo_id, c.grupo_id);

  -- Cambiar de grupo lo manda al final del grupo nuevo.
  v_orden := c.orden;
  if v_grupo_id is distinct from c.grupo_id then
    select max(x.orden) + 1 into v_orden from public.leads_campos x where x.id <> c.id and x.grupo_id is not distinct from v_grupo_id;
    v_orden := coalesce(v_orden, (select coalesce(max(x.orden), 0) + 10 from public.leads_campos x));
  end if;

  update public.leads_campos x set
    etiqueta = case when p_cambios ? 'etiqueta' then public._campo_nombre_valido(p_cambios ->> 'etiqueta', 'el nombre del campo', 60) else x.etiqueta end,
    tipo = v_tipo,
    opciones = v_opciones,
    requerido = coalesce((p_cambios ->> 'requerido')::boolean, x.requerido),
    grupo_id = v_grupo_id,
    en_tabla = coalesce((p_cambios ->> 'en_tabla')::boolean, x.en_tabla),
    filtrable = coalesce((p_cambios ->> 'filtrable')::boolean, x.filtrable),
    -- 9h: pasar a privado no cambia `solo_cartera` hasta quitar la clave de los atributos públicos de todos los leads
    -- (por lotes, `_lead_campo_privacidad_lote`); pasar a público es inmediato y deja completar los atributos públicos.
    solo_cartera = case when v_privado is null or v_privado then x.solo_cartera else false end,
    solo_cartera_pendiente = case
      when v_privado is null then x.solo_cartera_pendiente
      when v_privado and x.solo_cartera and x.solo_cartera_pendiente is null then null
      when v_privado then true
      when not x.solo_cartera and x.solo_cartera_pendiente is null then null
      else false end,
    activo = coalesce((p_cambios ->> 'activo')::boolean, x.activo),
    valor_defecto = v_defecto,
    valor_defecto_empresa = v_empresa,
    minimo = v_minimo,
    maximo = v_maximo,
    orden = v_orden
  where x.id = p_campo
  returning x.actualizado_en, x.solo_cartera_pendiente into v_nueva, v_pendiente;
  if v_orden is distinct from c.orden then
    perform public._lead_campos_renumerar();
  end if;
  -- El primer lote, en esta misma llamada: una base chica termina acá. Lo que quede lo sigue el job.
  if v_pendiente is not null then
    perform public._lead_campo_privacidad_lote(p_campo, 5000);
  end if;
  return v_nueva;
end;
$$;

revoke all on function public.lead_campo_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.lead_campo_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;

drop function public.origen_campo_crear(uuid, text, text, public.tipo_campo, jsonb, boolean, text, boolean, boolean, boolean, text, jsonb, boolean, numeric, numeric);

create function public.origen_campo_crear(
  p_origen uuid, p_clave text, p_etiqueta text, p_tipo public.tipo_campo, p_opciones jsonb default '[]'::jsonb,
  p_requerido boolean default false, p_grupo_id uuid default null, p_en_tarjeta boolean default false, p_filtrable boolean default false,
  p_publico_web boolean default false, p_clave_apibara text default null, p_valor_defecto jsonb default null,
  p_principal boolean default false, p_minimo numeric default null, p_maximo numeric default null
) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_origen public.origenes; v_etiqueta text;
  v_apibara text := nullif(btrim(p_clave_apibara), ''); v_id uuid; v_version timestamptz; v_defecto jsonb;
  v_principal boolean := coalesce(p_principal, false); v_desmarcado uuid; v_restriccion text;
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into v_origen from public.origenes o where o.id = p_origen for update;
  if not found then raise exception 'Ese origen ya no existe.' using errcode = 'PT409'; end if;
  if p_clave is null or p_clave !~ '^[a-z][a-z0-9_]{1,40}$' then
    raise exception 'La clave del campo usa minúsculas, números y guion bajo, y empieza con una letra.';
  end if;
  if public._origen_clave_reservada(p_clave) then
    raise exception '«%» ya es un dato común de todos los vehículos: no se crea como campo propio.', p_clave;
  end if;
  v_etiqueta := public._origen_nombre_valido(p_etiqueta, 'el nombre del campo', 60);
  perform public._origen_opciones_validas(coalesce(p_opciones, '[]'::jsonb));
  if p_tipo in ('opcion', 'multi_opcion') and jsonb_array_length(coalesce(p_opciones, '[]'::jsonb)) = 0 then
    raise exception 'Un campo de opciones necesita al menos una opción.';
  end if;
  if p_tipo not in ('opcion', 'multi_opcion') and jsonb_array_length(coalesce(p_opciones, '[]'::jsonb)) > 0 then
    raise exception 'Sólo un campo de opciones lleva opciones.';
  end if;
  if v_apibara is not null and v_origen.tipo <> 'subasta' then
    raise exception 'La clave de apibara sólo se usa en orígenes de subasta.';
  end if;
  perform public._origen_campo_grupo_exigir(p_origen, p_grupo_id, null);
  if v_principal and p_tipo = 'moneda' then
    raise exception 'Un monto no identifica a un vehículo: elige otro campo como principal.' using hint = 'principal';
  end if;
  v_defecto := public._origen_valor_defecto(p_tipo, coalesce(p_opciones, '[]'::jsonb), p_valor_defecto);
  perform public._campo_rango(p_tipo, p_minimo, p_maximo, v_defecto);
  if v_principal then
    v_desmarcado := public._origen_campos_desmarcar_principal(p_origen, null);
  end if;
  begin
    insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, opciones, requerido, grupo_id, orden, en_tarjeta, filtrable, publico_web, clave_apibara, es_sistema, valor_defecto, principal, minimo, maximo)
    values (p_origen, p_clave, v_etiqueta, p_tipo, coalesce(p_opciones, '[]'::jsonb), coalesce(p_requerido, false), p_grupo_id,
            coalesce((select max(c.orden) + 10 from public.origenes_campos c where c.origen_id = p_origen), 10),
            coalesce(p_en_tarjeta, false), coalesce(p_filtrable, false), coalesce(p_publico_web, false), v_apibara, false, v_defecto, v_principal, p_minimo, p_maximo)
    returning id, actualizado_en into v_id, v_version;
  exception when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    if v_restriccion = 'origenes_campos_principal_unico' then
      raise exception 'Otra persona marcó otro campo como principal mientras editabas.' using errcode = 'PT409';
    end if;
    raise exception 'Ya hay un campo con la clave «%» en este origen.', p_clave using errcode = '23505';
  end;
  return jsonb_build_object('id', v_id, 'actualizado_en', v_version, 'desmarcado', v_desmarcado);
end;
$$;

revoke all on function public.origen_campo_crear(uuid, text, text, public.tipo_campo, jsonb, boolean, uuid, boolean, boolean, boolean, text, jsonb, boolean, numeric, numeric) from public, anon;
grant execute on function public.origen_campo_crear(uuid, text, text, public.tipo_campo, jsonb, boolean, uuid, boolean, boolean, boolean, text, jsonb, boolean, numeric, numeric) to authenticated, service_role;

create or replace function public.origen_campo_guardar(p_campo uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns timestamptz
  language plpgsql security definer
  set search_path = ''
as $$
declare
  c public.origenes_campos; v_origen public.origenes; v_clave text; v_nueva timestamptz;
  v_editables constant text[] := array['etiqueta', 'tipo', 'opciones', 'requerido', 'grupo_id', 'en_tarjeta', 'filtrable', 'publico_web', 'clave_apibara', 'activo', 'valor_defecto', 'principal', 'minimo', 'maximo'];
  v_tipo public.tipo_campo; v_opciones jsonb; v_grupo_id uuid; v_apibara text; v_con int; v_orden smallint; v_defecto jsonb;
  v_origen_id uuid; v_activo boolean; v_principal boolean; v_restriccion text;
  v_minimo numeric; v_maximo numeric;
begin
  perform public.assert_permiso('origenes.gestionar');
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los cambios a guardar.';
  end if;
  for v_clave in select jsonb_object_keys(p_cambios) loop
    if not (v_clave = any (v_editables)) then
      raise exception 'El dato «%» no se cambia desde el layout de campos.', v_clave;
    end if;
    if v_clave in ('etiqueta', 'tipo', 'opciones', 'requerido', 'en_tarjeta', 'filtrable', 'publico_web', 'activo', 'principal') and p_cambios -> v_clave = 'null'::jsonb then
      raise exception 'El dato «%» no puede quedar vacío.', v_clave;
    end if;
  end loop;

  select x.origen_id into v_origen_id from public.origenes_campos x where x.id = p_campo;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  select * into v_origen from public.origenes o where o.id = v_origen_id for no key update;
  select * into c from public.origenes_campos x where x.id = p_campo for update;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');

  v_tipo := coalesce((p_cambios ->> 'tipo')::public.tipo_campo, c.tipo);
  if v_tipo is distinct from c.tipo then
    if c.es_sistema then
      raise exception 'El tipo de «%» no cambia: es un campo de fábrica.', c.etiqueta;
    end if;
    v_con := public._origen_vehiculos_con_valor(c.origen_id, c.clave);
    if v_con > 0 then
      raise exception '% % ya tienen un valor en «%»: no se puede cambiar su tipo. Desactívalo y crea otro campo.',
        v_con, case when v_con = 1 then 'vehículo' else 'vehículos' end, c.etiqueta;
    end if;
  end if;

  -- Desactivar el principal lo desmarca; marcar principal un desactivado o un monto es un error de validación.
  v_activo := coalesce((p_cambios ->> 'activo')::boolean, c.activo);
  if not v_activo and coalesce((p_cambios ->> 'principal')::boolean, false) then
    raise exception 'Un campo desactivado no puede ser el principal. Actívalo primero.' using hint = 'principal';
  end if;
  v_principal := v_activo and coalesce((p_cambios ->> 'principal')::boolean, c.principal);
  if v_principal and v_tipo = 'moneda' then
    raise exception 'Un monto no identifica a un vehículo: elige otro campo como principal.' using hint = 'principal';
  end if;

  v_opciones := coalesce(p_cambios -> 'opciones', c.opciones);
  if v_tipo not in ('opcion', 'multi_opcion') then
    v_opciones := '[]'::jsonb;
  else
    perform public._origen_opciones_validas(v_opciones);
  end if;

  if p_cambios ? 'valor_defecto' then
    v_defecto := public._origen_valor_defecto(v_tipo, v_opciones, p_cambios -> 'valor_defecto');
  elsif v_tipo is distinct from c.tipo then
    v_defecto := null;
  else
    begin
      v_defecto := public._origen_valor_defecto(v_tipo, v_opciones, c.valor_defecto);
    exception when invalid_parameter_value then
      v_defecto := null;
    end;
  end if;

  -- El rango: lo que se manda (null = sin límite) o el vigente; si el tipo deja de ser numérico, se va solo, como las opciones.
  v_minimo := public._campo_limite(p_cambios, 'minimo', case when v_tipo in ('numero', 'moneda') then c.minimo end);
  v_maximo := public._campo_limite(p_cambios, 'maximo', case when v_tipo in ('numero', 'moneda') then c.maximo end);
  perform public._campo_rango(v_tipo, v_minimo, v_maximo, v_defecto);

  v_grupo_id := case when p_cambios ? 'grupo_id' then (p_cambios ->> 'grupo_id')::uuid else c.grupo_id end;
  perform public._origen_campo_grupo_exigir(c.origen_id, v_grupo_id, c.grupo_id);
  v_apibara := case when p_cambios ? 'clave_apibara' then nullif(btrim(p_cambios ->> 'clave_apibara'), '') else c.clave_apibara end;
  if v_apibara is not null and v_origen.tipo <> 'subasta' then
    raise exception 'La clave de apibara sólo se usa en orígenes de subasta.';
  end if;

  -- Cambiar de grupo lo manda al final del grupo nuevo.
  v_orden := c.orden;
  if v_grupo_id is distinct from c.grupo_id then
    select max(x.orden) + 1 into v_orden from public.origenes_campos x
    where x.origen_id = c.origen_id and x.id <> c.id and x.grupo_id is not distinct from v_grupo_id;
    v_orden := coalesce(v_orden, (select coalesce(max(x.orden), 0) + 10 from public.origenes_campos x where x.origen_id = c.origen_id));
  end if;

  if v_principal and not c.principal then
    perform public._origen_campos_desmarcar_principal(c.origen_id, c.id);
  end if;
  begin
    update public.origenes_campos x set
      etiqueta = case when p_cambios ? 'etiqueta' then public._origen_nombre_valido(p_cambios ->> 'etiqueta', 'el nombre del campo', 60) else x.etiqueta end,
      tipo = v_tipo,
      opciones = v_opciones,
      requerido = coalesce((p_cambios ->> 'requerido')::boolean, x.requerido),
      grupo_id = v_grupo_id,
      en_tarjeta = coalesce((p_cambios ->> 'en_tarjeta')::boolean, x.en_tarjeta),
      filtrable = coalesce((p_cambios ->> 'filtrable')::boolean, x.filtrable),
      publico_web = coalesce((p_cambios ->> 'publico_web')::boolean, x.publico_web),
      clave_apibara = v_apibara,
      activo = v_activo,
      principal = v_principal,
      valor_defecto = v_defecto,
      minimo = v_minimo,
      maximo = v_maximo,
      orden = v_orden
    where x.id = p_campo
    returning x.actualizado_en into v_nueva;
  exception when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    if v_restriccion = 'origenes_campos_principal_unico' then
      raise exception 'Otra persona marcó otro campo como principal mientras editabas.' using errcode = 'PT409';
    end if;
    raise;
  end;
  -- Desactivado: deja de ser dato clave del origen (el origen ya está tomado arriba).
  if c.activo and not v_activo then
    update public.origenes o
       set datos_clave = public._origen_datos_clave_sin_campo(o.datos_clave, c.clave)
     where o.id = c.origen_id
       and o.datos_clave @> jsonb_build_array(jsonb_build_object('campo', c.clave));
  end if;
  if v_orden is distinct from c.orden then
    perform public._origen_campos_renumerar(c.origen_id);
  end if;
  return v_nueva;
end;
$$;

revoke all on function public.origen_campo_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.origen_campo_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;

-- ── Lo que nace con grupos de texto pasa por el catálogo ─────────────────────────────────────────────────────────────────────────
-- Los grupos se aseguran en el orden de su primer campo: así el orden de los bloques es el de los campos.

create or replace function public.origen_apibara_agregar(p_origen uuid, p_rutas text[]) returns integer
  language plpgsql security definer
  set search_path = ''
as $$
declare r record; v_n int := 0; v_clave text; v_orden int; v_sufijo int; v_grupo uuid;
begin
  perform public.assert_permiso('origenes.gestionar');
  perform 1 from public.origenes o where o.id = p_origen and o.tipo = 'subasta' for update;
  if not found then raise exception 'Ese origen no es de subasta o ya no existe.' using errcode = 'PT409'; end if;
  if p_rutas is null or cardinality(p_rutas) = 0 then return 0; end if;
  for r in select * from public.origen_apibara_rutas_sin_campo(p_origen) x where x.ruta = any (p_rutas) loop
    v_clave := left('apibara_' || regexp_replace(lower(r.ruta), '[^a-z0-9]+', '_', 'g'), 41);
    v_sufijo := 1;
    while exists (select 1 from public.origenes_campos c where c.origen_id = p_origen and c.clave = v_clave) loop
      v_sufijo := v_sufijo + 1;
      v_clave := left('apibara_' || regexp_replace(lower(r.ruta), '[^a-z0-9]+', '_', 'g'), 38) || '_' || v_sufijo;
    end loop;
    if v_grupo is null then
      v_grupo := public._origen_campo_grupo_asegurar(p_origen, 'Otros datos de apibara');
    end if;
    select coalesce(max(c.orden) + 10, 10) into v_orden from public.origenes_campos c where c.origen_id = p_origen;
    insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, grupo_id, orden, clave_apibara, es_sistema)
    values (p_origen, v_clave, left(r.ruta, 60),
            case r.tipo when 'number' then 'numero' when 'boolean' then 'booleano' else 'texto' end::public.tipo_campo,
            v_grupo, v_orden, r.ruta, false);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

revoke all on function public.origen_apibara_agregar(uuid, text[]) from public, anon;
grant execute on function public.origen_apibara_agregar(uuid, text[]) to authenticated, service_role;

create or replace function public.origen_apibara_completar(p_origen uuid) returns integer
  language plpgsql security definer
  set search_path = ''
as $$
declare v_n int; r record;
begin
  if not exists (select 1 from public.origenes o where o.id = p_origen and o.tipo = 'subasta') then
    return 0;
  end if;
  for r in
    select c.grupo from public._apibara_catalogo() c
    where c.grupo is not null
      and not exists (select 1 from public.origenes_campos x where x.origen_id = p_origen and x.clave = c.clave)
      and (c.clave_apibara is null or not exists (
        select 1 from public.origenes_campos x where x.origen_id = p_origen and x.clave_apibara = c.clave_apibara))
    group by c.grupo
    order by min(c.orden)
  loop
    perform public._origen_campo_grupo_asegurar(p_origen, r.grupo);
  end loop;
  insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, requerido, grupo_id, orden, en_tarjeta, filtrable, publico_web, clave_apibara, es_sistema)
  select p_origen, c.clave, c.etiqueta, c.tipo, false, g.id, c.orden, c.en_tarjeta, c.filtrable, c.publico_web, c.clave_apibara, c.es_sistema
  from public._apibara_catalogo() c
  left join public.origenes_campos_grupos g
    on g.origen_id = p_origen and public._nombre_de_catalogo(g.nombre) = public._nombre_de_catalogo(c.grupo)
  where not exists (select 1 from public.origenes_campos x where x.origen_id = p_origen and x.clave = c.clave)
    and (c.clave_apibara is null or not exists (
      select 1 from public.origenes_campos x where x.origen_id = p_origen and x.clave_apibara = c.clave_apibara));
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.origen_apibara_completar(uuid) from public, anon, authenticated;
grant execute on function public.origen_apibara_completar(uuid) to service_role;

-- Los campos con que nace un origen: el catálogo de apibara (subasta) o la lista de abajo (manual), que espeja
-- `entities/preconfiguraciones.ts` (su test lee estas filas). Primero los grupos, en el orden de su primer campo; después los campos.
create or replace function public.origen_preconfigurar_campos() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare v_filas jsonb; r record;
begin
  if new.tipo = 'subasta' then
    select jsonb_agg(to_jsonb(c) order by c.orden) into v_filas from public._apibara_catalogo() c;
  else
    select jsonb_agg(to_jsonb(v) order by v.orden) into v_filas from (values
      (new.id, 'color', 'Color', 'texto', false, 'Vehículo', 10, true, true, true, true),
      (new.id, 'transmision', 'Transmisión', 'opcion', false, 'Vehículo', 20, true, true, true, true),
      (new.id, 'combustible', 'Combustible', 'opcion', false, 'Vehículo', 30, false, true, true, true),
      (new.id, 'motor', 'Motor', 'texto', false, 'Vehículo', 40, false, false, true, true),
      (new.id, 'traccion', 'Tracción', 'opcion', false, 'Vehículo', 50, false, true, true, true),
      (new.id, 'carroceria', 'Carrocería', 'opcion', false, 'Vehículo', 60, false, true, true, true),
      (new.id, 'condicion', 'Condición', 'opcion', false, 'Venta', 70, true, true, true, true),
      (new.id, 'descripcion', 'Descripción comercial', 'texto_largo', false, 'Venta', 80, false, false, true, true)
    ) v (origen_id, clave, etiqueta, tipo, requerido, grupo, orden, en_tarjeta, filtrable, publico_web, es_sistema);
  end if;
  for r in
    select f ->> 'grupo' as grupo from jsonb_array_elements(v_filas) f
    where f ->> 'grupo' is not null
    group by f ->> 'grupo'
    order by min((f ->> 'orden')::int)
  loop
    perform public._origen_campo_grupo_asegurar(new.id, r.grupo);
  end loop;
  insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, requerido, grupo_id, orden, en_tarjeta, filtrable, publico_web, clave_apibara, es_sistema)
  select new.id, f.clave, f.etiqueta, f.tipo::public.tipo_campo, coalesce(f.requerido, false), g.id, f.orden, f.en_tarjeta, f.filtrable,
         f.publico_web, f.clave_apibara, f.es_sistema
  from jsonb_to_recordset(v_filas) f (clave text, etiqueta text, tipo text, requerido boolean, grupo text, orden smallint, en_tarjeta boolean,
                                      filtrable boolean, publico_web boolean, clave_apibara text, es_sistema boolean)
  left join public.origenes_campos_grupos g
    on g.origen_id = new.id and public._nombre_de_catalogo(g.nombre) = public._nombre_de_catalogo(f.grupo);
  return new;
end;
$$;

revoke all on function public.origen_preconfigurar_campos() from public, anon, authenticated;
grant execute on function public.origen_preconfigurar_campos() to service_role;

-- ── Gestionar los grupos de los leads ─────────────────────────────────────────────────────────────────────────────────────────────
-- Todas piden `leads.campos.gestionar` antes de cualquier candado. Candados: el de `leads_campos` (si hace falta) antes que el de
-- `leads_campos_grupos`, el mismo orden de las RPC de campo (tabla de campos y después la clave de la FK): sin interbloqueos.

create or replace function public.lead_campo_grupo_crear(p_nombre text) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare g public.leads_campos_grupos; v_n int; v_existe text;
begin
  perform public.assert_permiso('leads.campos.gestionar');
  -- El candado de conjunto ordena el «último + 10» y el tope de dos altas a la vez.
  lock table public.leads_campos_grupos in share row exclusive mode;
  select count(*) into v_n from (select 1 from public.leads_campos_grupos x limit 101) s;
  if v_n >= 100 then
    raise exception 'Ya hay 100 grupos, el máximo: quita uno que no uses.' using errcode = '23514', hint = 'nombre';
  end if;
  begin
    insert into public.leads_campos_grupos (nombre, orden)
    values (p_nombre, coalesce((select max(x.orden) + 10 from public.leads_campos_grupos x), 10))
    returning * into g;
  exception when unique_violation then
    select x.nombre into v_existe from public.leads_campos_grupos x
     where public._nombre_de_catalogo(x.nombre) = public._nombre_de_catalogo(p_nombre) limit 1;
    raise exception 'Ya existe «%».', coalesce(v_existe, public._nombre_limpio(p_nombre)) using errcode = '23505', hint = 'nombre';
  end;
  return jsonb_build_object('id', g.id, 'nombre', g.nombre, 'orden', g.orden, 'activo', g.activo, 'actualizado_en', g.actualizado_en);
end;
$$;

-- Renombrar o activar y desactivar (`nombre`, `activo`). Renombrar cambia el nombre en todos sus campos: es una referencia.
create or replace function public.lead_campo_grupo_guardar(p_grupo uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
  returns timestamptz
  language plpgsql security definer
  set search_path = ''
as $$
declare g public.leads_campos_grupos; v_clave text; v_nueva timestamptz; v_existe text;
begin
  perform public.assert_permiso('leads.campos.gestionar');
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los cambios a guardar.' using errcode = '22023';
  end if;
  for v_clave in select jsonb_object_keys(p_cambios) loop
    if v_clave not in ('nombre', 'activo') then
      raise exception 'El dato «%» no se cambia desde los grupos.', v_clave using errcode = '22023';
    end if;
    if p_cambios -> v_clave = 'null'::jsonb then
      raise exception 'El dato «%» no puede quedar vacío.', v_clave using errcode = '22023', hint = v_clave;
    end if;
  end loop;
  select * into g from public.leads_campos_grupos x where x.id = p_grupo for no key update;
  if not found then raise exception 'Ese grupo ya no existe: recarga.' using errcode = 'PT409'; end if;
  perform public._exigir_version(g.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este grupo mientras lo editabas.');
  begin
    update public.leads_campos_grupos x set
      nombre = coalesce(p_cambios ->> 'nombre', x.nombre),
      activo = coalesce((p_cambios ->> 'activo')::boolean, x.activo)
    where x.id = p_grupo
    returning x.actualizado_en into v_nueva;
  exception when unique_violation then
    select x.nombre into v_existe from public.leads_campos_grupos x
     where x.id <> p_grupo and public._nombre_de_catalogo(x.nombre) = public._nombre_de_catalogo(p_cambios ->> 'nombre') limit 1;
    raise exception 'Ya existe «%».', coalesce(v_existe, public._nombre_limpio(p_cambios ->> 'nombre')) using errcode = '23505', hint = 'nombre';
  end;
  return v_nueva;
end;
$$;

-- El orden de los bloques: el grupo va después de `p_despues_de` (sin él, primero).
create or replace function public.lead_campo_grupo_mover(p_grupo uuid, p_actualizado_en_esperado timestamptz, p_despues_de uuid default null)
  returns timestamptz
  language plpgsql security definer
  set search_path = ''
as $$
declare g public.leads_campos_grupos; v_nueva timestamptz;
begin
  perform public.assert_permiso('leads.campos.gestionar');
  -- El orden es del catálogo entero: el candado de conjunto antes de leerlo, y dos movimientos van en fila.
  lock table public.leads_campos_grupos in share row exclusive mode;
  select * into g from public.leads_campos_grupos x where x.id = p_grupo for update;
  if not found then raise exception 'Ese grupo ya no existe: recarga.' using errcode = 'PT409'; end if;
  perform public._exigir_version(g.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este grupo mientras lo editabas.');
  if p_despues_de is not null then
    if p_despues_de = p_grupo then raise exception 'Un grupo no puede ir después de sí mismo.' using errcode = '22023'; end if;
    if not exists (select 1 from public.leads_campos_grupos x where x.id = p_despues_de) then
      raise exception 'Ese grupo ya no existe: recarga.' using errcode = 'PT409';
    end if;
  end if;
  update public.leads_campos_grupos x set orden = n.orden_nuevo
  from public._campos_reordenar((
    select jsonb_agg(jsonb_build_object('id', y.id, 'clave', y.id::text, 'orden', y.orden)) from public.leads_campos_grupos y),
    p_grupo, p_despues_de) n
  where x.id = n.campo_id and x.orden <> n.orden_nuevo;
  select x.actualizado_en into v_nueva from public.leads_campos_grupos x where x.id = p_grupo;
  return v_nueva;
end;
$$;

-- Quitar: sólo sin campos. Con campos y `p_mover`, van primero al final de `p_destino` (nulo = «Sin grupo»), en su orden relativo.
create or replace function public.lead_campo_grupo_eliminar(
  p_grupo uuid, p_actualizado_en_esperado timestamptz, p_mover boolean default false, p_destino uuid default null
) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare g public.leads_campos_grupos; v_n int; v_max int;
begin
  perform public.assert_permiso('leads.campos.gestionar');
  lock table public.leads_campos in share row exclusive mode;
  lock table public.leads_campos_grupos in share row exclusive mode;
  select * into g from public.leads_campos_grupos x where x.id = p_grupo for update;
  if not found then raise exception 'Ese grupo ya no existe: recarga.' using errcode = 'PT409'; end if;
  perform public._exigir_version(g.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este grupo mientras lo editabas.');
  -- leads_campos_grupo_idx; nunca el total exacto.
  select count(*) into v_n from (select 1 from public.leads_campos c where c.grupo_id = p_grupo limit 101) s;
  if v_n > 0 then
    if not coalesce(p_mover, false) then
      if v_n = 1 then
        raise exception 'Tiene 1 campo: muévelo a otro grupo antes de quitarlo.' using errcode = '23503', hint = 'campos';
      end if;
      raise exception 'Tiene % campos: muévelos a otro grupo antes de quitarlo.', case when v_n > 100 then 'más de 100' else v_n::text end
        using errcode = '23503', hint = 'campos';
    end if;
    if p_destino is not null and (p_destino = p_grupo or not exists (
      select 1 from public.leads_campos_grupos x where x.id = p_destino and x.activo)) then
      raise exception 'Elige un grupo activo de este layout.' using errcode = '22023', hint = 'destino';
    end if;
    select coalesce(max(x.orden), 0) into v_max from public.leads_campos x;
    update public.leads_campos c set grupo_id = p_destino, orden = (v_max + c.orden)::smallint where c.grupo_id = p_grupo;
    perform public._lead_campos_renumerar();
  end if;
  delete from public.leads_campos_grupos where id = p_grupo;
end;
$$;

revoke all on function public.lead_campo_grupo_crear(text) from public, anon;
grant execute on function public.lead_campo_grupo_crear(text) to authenticated, service_role;
revoke all on function public.lead_campo_grupo_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.lead_campo_grupo_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;
revoke all on function public.lead_campo_grupo_mover(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.lead_campo_grupo_mover(uuid, timestamptz, uuid) to authenticated, service_role;
revoke all on function public.lead_campo_grupo_eliminar(uuid, timestamptz, boolean, uuid) from public, anon;
grant execute on function public.lead_campo_grupo_eliminar(uuid, timestamptz, boolean, uuid) to authenticated, service_role;

-- ── Gestionar los grupos de un origen ─────────────────────────────────────────────────────────────────────────────────────────────
-- Piden `origenes.gestionar` (la clave de `origen_campo_*`). El primer candado es la fila del origen, el mismo de conjunto que toman
-- las RPC de campo del origen; después, la fila del grupo.

create or replace function public.origen_campo_grupo_crear(p_origen uuid, p_nombre text) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare g public.origenes_campos_grupos; v_n int; v_existe text;
begin
  perform public.assert_permiso('origenes.gestionar');
  perform 1 from public.origenes o where o.id = p_origen for no key update;
  if not found then raise exception 'Ese origen ya no existe.' using errcode = 'PT409'; end if;
  select count(*) into v_n from (select 1 from public.origenes_campos_grupos x where x.origen_id = p_origen limit 101) s;
  if v_n >= 100 then
    raise exception 'Ya hay 100 grupos, el máximo: quita uno que no uses.' using errcode = '23514', hint = 'nombre';
  end if;
  begin
    insert into public.origenes_campos_grupos (origen_id, nombre, orden)
    values (p_origen, p_nombre, coalesce((select max(x.orden) + 10 from public.origenes_campos_grupos x where x.origen_id = p_origen), 10))
    returning * into g;
  exception when unique_violation then
    select x.nombre into v_existe from public.origenes_campos_grupos x
     where x.origen_id = p_origen and public._nombre_de_catalogo(x.nombre) = public._nombre_de_catalogo(p_nombre) limit 1;
    raise exception 'Ya existe «%».', coalesce(v_existe, public._nombre_limpio(p_nombre)) using errcode = '23505', hint = 'nombre';
  end;
  return jsonb_build_object('id', g.id, 'nombre', g.nombre, 'orden', g.orden, 'activo', g.activo, 'actualizado_en', g.actualizado_en);
end;
$$;

create or replace function public.origen_campo_grupo_guardar(p_origen uuid, p_grupo uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
  returns timestamptz
  language plpgsql security definer
  set search_path = ''
as $$
declare g public.origenes_campos_grupos; v_clave text; v_nueva timestamptz; v_existe text;
begin
  perform public.assert_permiso('origenes.gestionar');
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los cambios a guardar.' using errcode = '22023';
  end if;
  for v_clave in select jsonb_object_keys(p_cambios) loop
    if v_clave not in ('nombre', 'activo') then
      raise exception 'El dato «%» no se cambia desde los grupos.', v_clave using errcode = '22023';
    end if;
    if p_cambios -> v_clave = 'null'::jsonb then
      raise exception 'El dato «%» no puede quedar vacío.', v_clave using errcode = '22023', hint = v_clave;
    end if;
  end loop;
  perform 1 from public.origenes o where o.id = p_origen for no key update;
  if not found then raise exception 'Ese origen ya no existe.' using errcode = 'PT409'; end if;
  select * into g from public.origenes_campos_grupos x where x.id = p_grupo and x.origen_id = p_origen for no key update;
  if not found then raise exception 'Ese grupo ya no existe: recarga.' using errcode = 'PT409'; end if;
  perform public._exigir_version(g.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este grupo mientras lo editabas.');
  begin
    update public.origenes_campos_grupos x set
      nombre = coalesce(p_cambios ->> 'nombre', x.nombre),
      activo = coalesce((p_cambios ->> 'activo')::boolean, x.activo)
    where x.id = p_grupo
    returning x.actualizado_en into v_nueva;
  exception when unique_violation then
    select x.nombre into v_existe from public.origenes_campos_grupos x
     where x.origen_id = p_origen and x.id <> p_grupo
       and public._nombre_de_catalogo(x.nombre) = public._nombre_de_catalogo(p_cambios ->> 'nombre') limit 1;
    raise exception 'Ya existe «%».', coalesce(v_existe, public._nombre_limpio(p_cambios ->> 'nombre')) using errcode = '23505', hint = 'nombre';
  end;
  return v_nueva;
end;
$$;

create or replace function public.origen_campo_grupo_mover(p_origen uuid, p_grupo uuid, p_actualizado_en_esperado timestamptz, p_despues_de uuid default null)
  returns timestamptz
  language plpgsql security definer
  set search_path = ''
as $$
declare g public.origenes_campos_grupos; v_nueva timestamptz;
begin
  perform public.assert_permiso('origenes.gestionar');
  perform 1 from public.origenes o where o.id = p_origen for no key update;
  if not found then raise exception 'Ese origen ya no existe.' using errcode = 'PT409'; end if;
  select * into g from public.origenes_campos_grupos x where x.id = p_grupo and x.origen_id = p_origen for update;
  if not found then raise exception 'Ese grupo ya no existe: recarga.' using errcode = 'PT409'; end if;
  perform public._exigir_version(g.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este grupo mientras lo editabas.');
  if p_despues_de is not null then
    if p_despues_de = p_grupo then raise exception 'Un grupo no puede ir después de sí mismo.' using errcode = '22023'; end if;
    if not exists (select 1 from public.origenes_campos_grupos x where x.id = p_despues_de and x.origen_id = p_origen) then
      raise exception 'Ese grupo ya no existe: recarga.' using errcode = 'PT409';
    end if;
  end if;
  update public.origenes_campos_grupos x set orden = n.orden_nuevo
  from public._campos_reordenar((
    select jsonb_agg(jsonb_build_object('id', y.id, 'clave', y.id::text, 'orden', y.orden))
    from public.origenes_campos_grupos y where y.origen_id = p_origen),
    p_grupo, p_despues_de) n
  where x.id = n.campo_id and x.orden <> n.orden_nuevo;
  select x.actualizado_en into v_nueva from public.origenes_campos_grupos x where x.id = p_grupo;
  return v_nueva;
end;
$$;

create or replace function public.origen_campo_grupo_eliminar(
  p_origen uuid, p_grupo uuid, p_actualizado_en_esperado timestamptz, p_mover boolean default false, p_destino uuid default null
) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare g public.origenes_campos_grupos; v_n int; v_max int;
begin
  perform public.assert_permiso('origenes.gestionar');
  perform 1 from public.origenes o where o.id = p_origen for no key update;
  if not found then raise exception 'Ese origen ya no existe.' using errcode = 'PT409'; end if;
  select * into g from public.origenes_campos_grupos x where x.id = p_grupo and x.origen_id = p_origen for update;
  if not found then raise exception 'Ese grupo ya no existe: recarga.' using errcode = 'PT409'; end if;
  perform public._exigir_version(g.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este grupo mientras lo editabas.');
  -- origenes_campos_grupo_idx; nunca el total exacto.
  select count(*) into v_n from (select 1 from public.origenes_campos c where c.origen_id = p_origen and c.grupo_id = p_grupo limit 101) s;
  if v_n > 0 then
    if not coalesce(p_mover, false) then
      if v_n = 1 then
        raise exception 'Tiene 1 campo: muévelo a otro grupo antes de quitarlo.' using errcode = '23503', hint = 'campos';
      end if;
      raise exception 'Tiene % campos: muévelos a otro grupo antes de quitarlo.', case when v_n > 100 then 'más de 100' else v_n::text end
        using errcode = '23503', hint = 'campos';
    end if;
    if p_destino is not null and (p_destino = p_grupo or not exists (
      select 1 from public.origenes_campos_grupos x where x.id = p_destino and x.origen_id = p_origen and x.activo)) then
      raise exception 'Elige un grupo activo de este layout.' using errcode = '22023', hint = 'destino';
    end if;
    select coalesce(max(x.orden), 0) into v_max from public.origenes_campos x where x.origen_id = p_origen;
    update public.origenes_campos c set grupo_id = p_destino, orden = (v_max + c.orden)::smallint
     where c.origen_id = p_origen and c.grupo_id = p_grupo;
    perform public._origen_campos_renumerar(p_origen);
  end if;
  delete from public.origenes_campos_grupos where id = p_grupo;
end;
$$;

revoke all on function public.origen_campo_grupo_crear(uuid, text) from public, anon;
grant execute on function public.origen_campo_grupo_crear(uuid, text) to authenticated, service_role;
revoke all on function public.origen_campo_grupo_guardar(uuid, uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.origen_campo_grupo_guardar(uuid, uuid, timestamptz, jsonb) to authenticated, service_role;
revoke all on function public.origen_campo_grupo_mover(uuid, uuid, timestamptz, uuid) from public, anon;
grant execute on function public.origen_campo_grupo_mover(uuid, uuid, timestamptz, uuid) to authenticated, service_role;
revoke all on function public.origen_campo_grupo_eliminar(uuid, uuid, timestamptz, boolean, uuid) from public, anon;
grant execute on function public.origen_campo_grupo_eliminar(uuid, uuid, timestamptz, boolean, uuid) to authenticated, service_role;

-- ── La actividad muestra los grupos como configuración ────────────────────────────────────────────────────────────────────────────

create or replace function public._actividad_recorte(p_tabla text) returns text
  language sql immutable
  set search_path = ''
as $$
  select case
    when p_tabla = 'leads' then 'lead'
    when p_tabla in ('vehiculos', 'cotizaciones', 'comprobantes', 'declaraciones_aduana', 'documentos', 'gastos', 'pagos', 'transportes',
                     'repuestos_compras', 'repuestos_items', 'formulas', 'formulas_del_origen') then 'entidad'
    when p_tabla in ('ajustes_empresa', 'ajustes_web', 'ajustes_leads', 'categorias', 'cola_web_asesores', 'fases', 'fases_requisitos',
                     'fases_transiciones', 'integraciones', 'leads_campos', 'leads_campos_grupos', 'origenes', 'origenes_campos',
                     'origenes_campos_grupos', 'origenes_lead', 'plantillas_tarjeta', 'roles_permisos', 'tipos_cambio', 'tipos_lead',
                     'tipos_seguimiento', 'usuarios_roles') then 'configuracion'
  end;
$$;

-- ── Datos: los grupos de texto pasan al catálogo ──────────────────────────────────────────────────────────────────────────────────
-- Une los que sólo difieren en mayúsculas, tildes o espacios: gana el nombre más usado; si empatan, el del campo de menor orden (las
-- tablas no tienen fecha de alta), y después el orden binario. Los grupos se ordenan por su primer campo y cada campo queda con el
-- suyo. Idempotente (sólo corre si la columna vieja existe y sólo crea lo que falta), sin escribir en la auditoría ni mover versiones;
-- al final borra la columna. La prueba (`areas/campos/grupos-migracion.sql`) corre otra vez sólo esta sección.
-- datos:inicio
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'leads_campos' and column_name = 'grupo') then
    alter table public.leads_campos disable trigger trg_actualizado_en;
    alter table public.leads_campos disable trigger trg_auditar;
    alter table public.leads_campos_grupos disable trigger trg_auditar;
    with usos as (
      select public._nombre_de_catalogo(c.grupo) as clave, public._nombre_limpio(c.grupo) as nombre, count(*) as n, min(c.orden) as primero
      from public.leads_campos c
      where public._nombre_limpio(c.grupo) <> ''
      group by 1, 2
    ), ganadores as (
      select distinct on (u.clave) u.clave, u.nombre
      from usos u
      order by u.clave, u.n desc, u.primero, u.nombre collate "C"
    ), primeros as (
      select u.clave, min(u.primero) as primero from usos u group by u.clave
    )
    insert into public.leads_campos_grupos (nombre, orden)
    select g.nombre, (row_number() over (order by p.primero, g.clave collate "C") * 10)::smallint
    from ganadores g join primeros p on p.clave = g.clave
    where not exists (select 1 from public.leads_campos_grupos x where public._nombre_de_catalogo(x.nombre) = g.clave);
    update public.leads_campos c set grupo_id = g.id
    from public.leads_campos_grupos g
    where public._nombre_limpio(c.grupo) <> ''
      and public._nombre_de_catalogo(g.nombre) = public._nombre_de_catalogo(c.grupo)
      and c.grupo_id is distinct from g.id;
    alter table public.leads_campos enable trigger trg_actualizado_en;
    alter table public.leads_campos enable trigger trg_auditar;
    alter table public.leads_campos_grupos enable trigger trg_auditar;
    alter table public.leads_campos drop column grupo;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'origenes_campos' and column_name = 'grupo') then
    alter table public.origenes_campos disable trigger trg_actualizado_en;
    alter table public.origenes_campos disable trigger trg_auditar;
    alter table public.origenes_campos_grupos disable trigger trg_auditar;
    with usos as (
      select c.origen_id, public._nombre_de_catalogo(c.grupo) as clave, public._nombre_limpio(c.grupo) as nombre, count(*) as n,
             min(c.orden) as primero
      from public.origenes_campos c
      where public._nombre_limpio(c.grupo) <> ''
      group by 1, 2, 3
    ), ganadores as (
      select distinct on (u.origen_id, u.clave) u.origen_id, u.clave, u.nombre
      from usos u
      order by u.origen_id, u.clave, u.n desc, u.primero, u.nombre collate "C"
    ), primeros as (
      select u.origen_id, u.clave, min(u.primero) as primero from usos u group by u.origen_id, u.clave
    )
    insert into public.origenes_campos_grupos (origen_id, nombre, orden)
    select g.origen_id, g.nombre, (row_number() over (partition by g.origen_id order by p.primero, g.clave collate "C") * 10)::smallint
    from ganadores g join primeros p on p.origen_id = g.origen_id and p.clave = g.clave
    where not exists (select 1 from public.origenes_campos_grupos x
                      where x.origen_id = g.origen_id and public._nombre_de_catalogo(x.nombre) = g.clave);
    update public.origenes_campos c set grupo_id = g.id
    from public.origenes_campos_grupos g
    where g.origen_id = c.origen_id
      and public._nombre_limpio(c.grupo) <> ''
      and public._nombre_de_catalogo(g.nombre) = public._nombre_de_catalogo(c.grupo)
      and c.grupo_id is distinct from g.id;
    alter table public.origenes_campos enable trigger trg_actualizado_en;
    alter table public.origenes_campos enable trigger trg_auditar;
    alter table public.origenes_campos_grupos enable trigger trg_auditar;
    alter table public.origenes_campos drop column grupo;
  end if;
end $$;
-- datos:fin
