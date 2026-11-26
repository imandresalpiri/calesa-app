-- Puertos, navieras y categorías de gasto: propios de un origen (`origen_id`) o compartidos con todos (`origen_id` nulo), como las tablas de
-- referencia. Lo que ya existe queda compartido, sin tocar datos. Un propio activo con la misma clave (`_catalogo_clave`) que un compartido lo tapa
-- en su origen: la base no reescribe nada; sólo cambia lo que los selectores ofrecen. La escritura pasa de directa bajo la RLS a RPC con versión,
-- porque un compartido pide `logistica.catalogos.gestionar` en cada origen que lo usa, y eso no cabe en una policy.

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 1. La clave de un nombre: minúsculas ASCII, sin tildes, espacios colapsados. Espejo: `claveDeCatalogo` de `src/shared/lib/catalogos/propios.ts`.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
create or replace function public._catalogo_clave(p_texto text) returns text
  language sql immutable parallel safe
  set search_path = ''
as $$
  -- `collate "C"`: `lower()` sólo toca ASCII, igual en la base real y en PGlite; las vocales con tilde, en las dos cajas, las cambia `translate`.
  select btrim(regexp_replace(
           translate(lower(coalesce(p_texto, '') collate "C"),
                     'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
                     'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc'),
           E'[ \\t\\n\\r\\f\\v]+', ' ', 'g'), E' ');
$$;
comment on function public._catalogo_clave(text) is
  'La clave de un nombre de catálogo de logística (puertos, navieras, categorías de gasto, tipos de documento): minúsculas ASCII, sin tildes y con los espacios colapsados. Dos nombres con la misma clave son el mismo; un propio tapa al compartido de su clave. Espejo en TS: claveDeCatalogo.';
revoke all on function public._catalogo_clave(text) from public, anon;
grant execute on function public._catalogo_clave(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 2. Nada cambia de nombre en silencio: dos filas que con la clave nueva serían la misma frenan la migración con la lista.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
do $$
declare v_lista text;
begin
  select string_agg(x.nombres, '; ') into v_lista from (
    select 'puertos: ' || string_agg(p.nombre || coalesce(' (' || p.pais || ')', ''), ' / ' order by p.nombre) as nombres
      from public.puertos p group by public._catalogo_clave(p.nombre), public._catalogo_clave(p.pais) having count(*) > 1
    union all
    select 'navieras: ' || string_agg(n.nombre, ' / ' order by n.nombre)
      from public.navieras n group by public._catalogo_clave(n.nombre) having count(*) > 1
    union all
    select 'categorías de gasto: ' || string_agg(c.nombre, ' / ' order by c.nombre)
      from public.categorias_gasto c group by public._catalogo_clave(c.nombre) having count(*) > 1
  ) x;
  if v_lista is not null then
    raise exception 'Hay nombres que se repiten sin importar mayúsculas, tildes ni espacios: %.', v_lista
      using hint = 'Renombra uno antes de migrar.';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 3. Columnas: el origen (nulo = compartido) y la versión.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
alter table public.puertos
  add column origen_id uuid references public.origenes (id) on delete cascade,
  add column creado_en timestamptz not null default now(),
  add column actualizado_en timestamptz not null default now();
alter table public.navieras
  add column origen_id uuid references public.origenes (id) on delete cascade,
  add column creado_en timestamptz not null default now(),
  add column actualizado_en timestamptz not null default now();
alter table public.categorias_gasto
  add column origen_id uuid references public.origenes (id) on delete cascade,
  add column creado_en timestamptz not null default now(),
  add column actualizado_en timestamptz not null default now();

comment on column public.puertos.origen_id is 'El origen del que es propio; nulo = compartido con todos los orígenes. Un propio activo tapa al compartido de su clave (nombre y país, _catalogo_clave) en su origen.';
comment on column public.navieras.origen_id is 'El origen del que es propia; nula = compartida con todos los orígenes. Una propia activa tapa a la compartida de su clave (_catalogo_clave) en su origen.';
comment on column public.categorias_gasto.origen_id is 'El origen del que es propia; nula = compartida con todos los orígenes. Una propia activa tapa a la compartida de su clave (_catalogo_clave) en su origen.';

-- La versión se mueve siempre hacia adelante, también dos veces en una transacción, y sólo si cambió algo.
create or replace function public.catalogo_logistica_version() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'actualizado_en') is distinct from (to_jsonb(old) - 'actualizado_en') then
    new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  else
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;
revoke all on function public.catalogo_logistica_version() from public, anon, authenticated;

create trigger trg_catalogo_logistica_version before update on public.puertos
  for each row execute function public.catalogo_logistica_version();
create trigger trg_catalogo_logistica_version before update on public.navieras
  for each row execute function public.catalogo_logistica_version();
create trigger trg_catalogo_logistica_version before update on public.categorias_gasto
  for each row execute function public.catalogo_logistica_version();

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 4. Únicos por (origen, clave), con `nulls not distinct`: dos compartidos con la misma clave chocan. El origen va primero: el índice sirve a la
--    FK y a la lectura «lo que usa un origen». Un puerto sin país choca con otro sin país del mismo nombre.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
alter table public.puertos drop constraint puertos_nombre_pais_key;
alter table public.navieras drop constraint navieras_nombre_key;
alter table public.categorias_gasto drop constraint categorias_gasto_nombre_key;
create unique index puertos_origen_clave_key on public.puertos
  (origen_id, public._catalogo_clave(nombre), public._catalogo_clave(pais)) nulls not distinct;
create unique index navieras_origen_clave_key on public.navieras
  (origen_id, public._catalogo_clave(nombre)) nulls not distinct;
create unique index categorias_gasto_origen_clave_key on public.categorias_gasto
  (origen_id, public._catalogo_clave(nombre)) nulls not distinct;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 5. Se leen como siempre (catálogos, no datos sensibles) y se escriben sólo por RPC.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
drop policy "puertos: crear" on public.puertos;
drop policy "puertos: editar" on public.puertos;
drop policy "puertos: borrar" on public.puertos;
drop policy "navieras: crear" on public.navieras;
drop policy "navieras: editar" on public.navieras;
drop policy "navieras: borrar" on public.navieras;
drop policy "categorias_gasto: crear" on public.categorias_gasto;
drop policy "categorias_gasto: editar" on public.categorias_gasto;
drop policy "categorias_gasto: borrar" on public.categorias_gasto;
revoke insert, update, delete, truncate, references, trigger on public.puertos, public.navieras, public.categorias_gasto from authenticated, anon;
grant select on public.puertos, public.navieras, public.categorias_gasto to authenticated;

comment on table public.puertos is 'Puertos de transporte: propios de un origen o compartidos con todos. Se escriben sólo por puerto_crear y puerto_guardar; no se borran (se desactivan).';
comment on table public.navieras is 'Navieras: propias de un origen o compartidas con todos. Se escriben sólo por naviera_crear y naviera_guardar; no se borran (se desactivan).';
comment on table public.categorias_gasto is 'Categorías de gasto: propias de un origen o compartidas con todos. Se escriben sólo por categoria_gasto_crear, categoria_gasto_guardar y categoria_gasto_eliminar (sólo sin gastos).';

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 6. Ayudantes.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

-- El nombre de un origen, o 22023 si no existe (con una concesión de todos los orígenes `tiene_permiso` daría verdadero para cualquier id).
create or replace function public._catalogo_logistica_origen(p_origen uuid) returns text
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_nombre text;
begin
  select o.nombre into v_nombre from public.origenes o where o.id = p_origen;                         -- origenes_pkey
  if v_nombre is null then
    raise exception 'Ese origen no existe.' using errcode = '22023', hint = 'origen';
  end if;
  return v_nombre;
end;
$$;
revoke all on function public._catalogo_logistica_origen(uuid) from public, anon, authenticated;

-- Quién cambia un ítem de un catálogo de logística. Propio: `logistica.catalogos.gestionar` en su origen. Compartido: en cada origen que lo usa, que
-- son todos (también los inactivos, como las tablas) salvo los de `p_tapan`, que lo tapan con un propio. `p_creando` cambia «usa» por «usaría»;
-- `p_femenino`, «lo» por «la».
create or replace function public._catalogo_logistica_exigir(p_origen uuid, p_tapan uuid[], p_nombre text, p_creando boolean, p_femenino boolean)
  returns void
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_o record;
begin
  perform public.assert_activo();
  if p_origen is not null then
    if not public.tiene_permiso('logistica.catalogos.gestionar', p_origen) then
      raise exception 'No puedes configurar la logística de %.', public._catalogo_logistica_origen(p_origen) using errcode = '42501';
    end if;
    return;
  end if;
  perform public.assert_permiso('logistica.catalogos.gestionar');
  for v_o in select o.id, o.nombre from public.origenes o
              where not (o.id = any (coalesce(p_tapan, '{}'::uuid[])))
              order by o.nombre collate "C", o.id loop
    if not public.tiene_permiso('logistica.catalogos.gestionar', v_o.id) then
      raise exception 'No puedes cambiar «%»: % % %, donde no puedes configurar la logística.', p_nombre,
        case when p_femenino then 'la' else 'lo' end, case when p_creando then 'usaría' else 'usa' end, v_o.nombre
        using errcode = '42501';
    end if;
  end loop;
end;
$$;
revoke all on function public._catalogo_logistica_exigir(uuid, uuid[], text, boolean, boolean) from public, anon, authenticated;

-- El rechazo de un nombre repetido: dice dónde está el que choca y si está desactivado.
create or replace function public._catalogo_logistica_repetido(p_sujeto text, p_nombre text, p_origen uuid, p_activo boolean, p_femenino boolean)
  returns text
  language sql stable security definer
  set search_path = ''
as $$
  select 'Ya hay ' || p_sujeto || ' «' || p_nombre || '»'
         || case when coalesce(p_activo, true) then '' when p_femenino then ' (desactivada)' else ' (desactivado)' end
         || case when p_origen is null
                 then case when p_femenino then ' compartida' else ' compartido' end || ' con todos los orígenes.'
                 else ' en ' || coalesce((select o.nombre from public.origenes o where o.id = p_origen), 'otro origen') || '.' end;
$$;
revoke all on function public._catalogo_logistica_repetido(text, text, uuid, boolean, boolean) from public, anon, authenticated;

-- Texto de un formulario: espacios colapsados y recortado.
create or replace function public._catalogo_logistica_texto(p_texto text) returns text
  language sql immutable
  set search_path = ''
as $$
  select btrim(regexp_replace(coalesce(p_texto, ''), '[[:space:]]+', ' ', 'g'));
$$;
revoke all on function public._catalogo_logistica_texto(text) from public, anon, authenticated;

-- Las claves que acepta un formulario: cualquier otra es 22023 con la clave en `hint`.
create or replace function public._catalogo_logistica_claves(p_datos jsonb, p_validas text[]) returns void
  language plpgsql immutable
  set search_path = ''
as $$
declare k text; v_orden numeric;
begin
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Faltan los datos.' using errcode = '22023';
  end if;
  for k in select jsonb_object_keys(p_datos) order by 1 loop
    if not (k = any (p_validas)) then
      raise exception 'No se cambia «%».', k using errcode = '22023', hint = k;
    end if;
  end loop;
  if p_datos ? 'activo' and jsonb_typeof(p_datos -> 'activo') <> 'boolean' then
    raise exception 'Activo es sí o no.' using errcode = '22023', hint = 'activo';
  end if;
  if p_datos ? 'orden' then
    if jsonb_typeof(p_datos -> 'orden') <> 'number' then
      raise exception 'El orden es un número entero de 0 a 32767.' using errcode = '22023', hint = 'orden';
    end if;
    v_orden := (p_datos ->> 'orden')::numeric;
    if v_orden <> trunc(v_orden) or v_orden not between 0 and 32767 then
      raise exception 'El orden es un número entero de 0 a 32767.' using errcode = '22023', hint = 'orden';
    end if;
  end if;
end;
$$;
revoke all on function public._catalogo_logistica_claves(jsonb, text[]) from public, anon, authenticated;

-- Un puerto con lo que trae `p_datos` encima de `p_base`, validado (los largos y textos de `entities/transporte/catalogo.ts`).
create or replace function public._puerto_de_jsonb(p_base public.puertos, p_datos jsonb) returns public.puertos
  language plpgsql immutable
  set search_path = ''
as $$
declare t public.puertos := p_base;
begin
  perform public._catalogo_logistica_claves(p_datos, array['nombre', 'pais', 'codigo', 'activo', 'orden']);
  if p_datos ? 'nombre' then t.nombre := public._catalogo_logistica_texto(p_datos ->> 'nombre'); end if;
  if p_datos ? 'pais' then t.pais := nullif(public._catalogo_logistica_texto(p_datos ->> 'pais'), ''); end if;
  if p_datos ? 'codigo' then t.codigo := nullif(upper(regexp_replace(coalesce(p_datos ->> 'codigo', ''), '[[:space:]]+', '', 'g')), ''); end if;
  if p_datos ? 'activo' then t.activo := (p_datos ->> 'activo')::boolean; end if;
  if p_datos ? 'orden' then t.orden := (p_datos ->> 'orden')::smallint; end if;
  if coalesce(t.nombre, '') = '' then
    raise exception 'Escribe el nombre.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(t.nombre) > 80 then
    raise exception 'El nombre admite hasta 80 letras.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(t.pais) > 60 then
    raise exception 'El país admite hasta 60 letras.' using errcode = '22023', hint = 'pais';
  end if;
  if char_length(t.codigo) > 12 then
    raise exception 'El código admite hasta 12 caracteres.' using errcode = '22023', hint = 'codigo';
  end if;
  return t;
end;
$$;
revoke all on function public._puerto_de_jsonb(public.puertos, jsonb) from public, anon, authenticated;

create or replace function public._naviera_de_jsonb(p_base public.navieras, p_datos jsonb) returns public.navieras
  language plpgsql immutable
  set search_path = ''
as $$
declare t public.navieras := p_base;
begin
  perform public._catalogo_logistica_claves(p_datos, array['nombre', 'activo']);
  if p_datos ? 'nombre' then t.nombre := public._catalogo_logistica_texto(p_datos ->> 'nombre'); end if;
  if p_datos ? 'activo' then t.activo := (p_datos ->> 'activo')::boolean; end if;
  if coalesce(t.nombre, '') = '' then
    raise exception 'Escribe el nombre.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(t.nombre) > 80 then
    raise exception 'El nombre admite hasta 80 letras.' using errcode = '22023', hint = 'nombre';
  end if;
  return t;
end;
$$;
revoke all on function public._naviera_de_jsonb(public.navieras, jsonb) from public, anon, authenticated;

create or replace function public._categoria_gasto_de_jsonb(p_base public.categorias_gasto, p_datos jsonb) returns public.categorias_gasto
  language plpgsql immutable
  set search_path = ''
as $$
declare t public.categorias_gasto := p_base;
begin
  perform public._catalogo_logistica_claves(p_datos, array['nombre', 'proposito', 'activo', 'orden']);
  if p_datos ? 'nombre' then t.nombre := public._catalogo_logistica_texto(p_datos ->> 'nombre'); end if;
  if p_datos ? 'proposito' then t.proposito := nullif(p_datos ->> 'proposito', ''); end if;
  if p_datos ? 'activo' then t.activo := (p_datos ->> 'activo')::boolean; end if;
  if p_datos ? 'orden' then t.orden := (p_datos ->> 'orden')::smallint; end if;
  if coalesce(t.nombre, '') = '' then
    raise exception 'Escribe el nombre.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(t.nombre) > 60 then
    raise exception 'El nombre admite hasta 60 letras.' using errcode = '22023', hint = 'nombre';
  end if;
  -- La lista del check `categorias_gasto_proposito_check` (y de `PROPOSITOS_DE_CATEGORIA`).
  if t.proposito is not null and not (t.proposito = any (array['tributos', 'flete', 'grua', 'chaperia', 'despachante', 'otro'])) then
    raise exception 'Elige uno de los propósitos de la lista.' using errcode = '22023', hint = 'proposito';
  end if;
  return t;
end;
$$;
revoke all on function public._categoria_gasto_de_jsonb(public.categorias_gasto, jsonb) from public, anon, authenticated;

-- Los orígenes que tapan a un compartido con esa clave: los que tienen un propio activo de la misma clave. Decenas de filas por tabla.
create or replace function public._puerto_tapan(p_nombre text, p_pais text) returns uuid[]
  language sql stable security definer
  set search_path = ''
as $$
  select coalesce(array_agg(distinct p.origen_id), '{}'::uuid[]) from public.puertos p
   where p.origen_id is not null and p.activo
     and public._catalogo_clave(p.nombre) = public._catalogo_clave(p_nombre)
     and public._catalogo_clave(p.pais) = public._catalogo_clave(p_pais);
$$;
revoke all on function public._puerto_tapan(text, text) from public, anon, authenticated;

create or replace function public._naviera_tapan(p_nombre text) returns uuid[]
  language sql stable security definer
  set search_path = ''
as $$
  select coalesce(array_agg(distinct n.origen_id), '{}'::uuid[]) from public.navieras n
   where n.origen_id is not null and n.activo and public._catalogo_clave(n.nombre) = public._catalogo_clave(p_nombre);
$$;
revoke all on function public._naviera_tapan(text) from public, anon, authenticated;

create or replace function public._categoria_gasto_tapan(p_nombre text) returns uuid[]
  language sql stable security definer
  set search_path = ''
as $$
  select coalesce(array_agg(distinct c.origen_id), '{}'::uuid[]) from public.categorias_gasto c
   where c.origen_id is not null and c.activo and public._catalogo_clave(c.nombre) = public._catalogo_clave(p_nombre);
$$;
revoke all on function public._categoria_gasto_tapan(text) from public, anon, authenticated;

-- Cuánto se usa (acotado a 51: la app dice «más de 50»).
create or replace function public._puerto_uso(p_id uuid) returns integer
  language sql stable security definer
  set search_path = ''
as $$
  select count(*)::integer from (
    (select 1 from public.transportes t where t.puerto_origen_id = p_id limit 51)                     -- transportes_puerto_origen_id_idx
    union all
    (select 1 from public.transportes t where t.puerto_destino_id = p_id limit 51)                    -- transportes_puerto_destino_id_idx
    union all
    (select 1 from public.flujos_transporte_oferta o where o.puerto_id = p_id limit 51)               -- flujos_transporte_oferta_puerto_id_idx
    limit 51) q;
$$;
revoke all on function public._puerto_uso(uuid) from public, anon, authenticated;

create or replace function public._naviera_uso(p_id uuid) returns integer
  language sql stable security definer
  set search_path = ''
as $$
  select count(*)::integer from (
    (select 1 from public.transportes t where t.naviera_id = p_id limit 51)                           -- transportes_naviera_id_idx
    union all
    (select 1 from public.flujos_transporte_oferta o where o.naviera_id = p_id limit 51)              -- flujos_transporte_oferta_naviera_id_idx
    limit 51) q;
$$;
revoke all on function public._naviera_uso(uuid) from public, anon, authenticated;

create or replace function public._categoria_gasto_uso(p_id uuid) returns integer
  language sql stable security definer
  set search_path = ''
as $$
  select count(*)::integer from (select 1 from public.gastos g where g.categoria_id = p_id limit 51) q;  -- gastos_categoria_id_idx
$$;
revoke all on function public._categoria_gasto_uso(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 7. RPC. Crear: id del intento obligatorio e idempotente; propio (`p_origen`) o compartido (nulo). Guardar: versión (`PT409`), sólo lo que cambia,
--    nunca el origen (pasar de propio a compartido no se ofrece). Un nombre repetido es 23505 con hint `nombre`.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create or replace function public.puerto_crear(p_id uuid, p_origen uuid, p_datos jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare t public.puertos; o public.puertos; v_choca public.puertos;
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023', hint = 'id';
  end if;
  if p_origen is not null then
    perform public._catalogo_logistica_origen(p_origen);
    perform public._catalogo_logistica_exigir(p_origen, null, null, true, false);
  else
    perform public.assert_permiso('logistica.catalogos.gestionar');
  end if;
  t.activo := true;
  t := public._puerto_de_jsonb(t, p_datos);

  perform pg_advisory_xact_lock(hashtextextended('catalogos_logistica:puertos', 0));
  select * into o from public.puertos x where x.id = p_id;                                            -- puertos_pkey
  if o.id is not null then
    -- El mismo intento en otro destino no delata la fila.
    if o.origen_id is distinct from p_origen then
      raise exception 'No puedes configurar la logística de ese origen.' using errcode = '42501';
    end if;
    return jsonb_build_object('id', o.id, 'actualizado_en', o.actualizado_en, 'repetido', true);
  end if;
  if p_origen is null then
    perform public._catalogo_logistica_exigir(null, public._puerto_tapan(t.nombre, t.pais), t.nombre, true, false);
  end if;
  if not (p_datos ? 'orden') then
    -- Al final de la lista (bajo el candado, sin pasar del tope de smallint). Decenas de filas.
    t.orden := least(coalesce((select max(x.orden) from public.puertos x), 0) + 10, 32767);
  end if;

  begin
    insert into public.puertos (id, origen_id, nombre, pais, codigo, activo, orden)
    values (p_id, p_origen, t.nombre, t.pais, t.codigo, t.activo, t.orden)
    returning * into t;
  exception when unique_violation then
    select * into v_choca from public.puertos x                                                         -- puertos_origen_clave_key
     where x.origen_id is not distinct from p_origen
       and public._catalogo_clave(x.nombre) = public._catalogo_clave(t.nombre)
       and public._catalogo_clave(x.pais) = public._catalogo_clave(t.pais);
    raise exception '%', public._catalogo_logistica_repetido('un puerto', coalesce(v_choca.nombre, t.nombre), p_origen, v_choca.activo, false)
      using errcode = '23505', hint = 'nombre';
  end;
  return jsonb_build_object('id', t.id, 'actualizado_en', t.actualizado_en, 'repetido', false);
end;
$$;
comment on function public.puerto_crear(uuid, uuid, jsonb) is
  'Crea un puerto propio de p_origen o compartido (p_origen nulo). p_datos: nombre, pais, codigo, activo, orden (sin orden, al final; otra clave → 22023). Propio: logistica.catalogos.gestionar en su origen; compartido: en cada origen que lo usaría. Idempotente por p_id. Repetido → 23505 hint nombre. Devuelve {id, actualizado_en, repetido}.';
revoke all on function public.puerto_crear(uuid, uuid, jsonb) from public, anon;
grant execute on function public.puerto_crear(uuid, uuid, jsonb) to authenticated, service_role;

create or replace function public.puerto_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare o public.puertos; t public.puertos; v_choca public.puertos; v_uso integer;
begin
  perform public.assert_activo();
  select * into o from public.puertos x where x.id = p_id for no key update;                           -- puertos_pkey
  if not found then
    raise exception 'Ese puerto ya no existe.' using errcode = 'PT409';
  end if;
  if o.origen_id is not null then
    perform public._catalogo_logistica_exigir(o.origen_id, null, o.nombre, false, false);
  else
    perform public.assert_permiso('logistica.catalogos.gestionar');
  end if;
  t := public._puerto_de_jsonb(o, p_cambios);
  if (t.nombre, t.pais, t.codigo, t.activo, t.orden) is not distinct from (o.nombre, o.pais, o.codigo, o.activo, o.orden) then
    return jsonb_build_object('actualizado_en', o.actualizado_en, 'uso', null, 'sin_cambios', true);
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este puerto mientras lo editabas.');
  if o.origen_id is null then
    -- Al renombrar, sólo quedan fuera los orígenes que lo tapan antes y después.
    perform public._catalogo_logistica_exigir(null,
      array(select unnest(public._puerto_tapan(o.nombre, o.pais)) intersect select unnest(public._puerto_tapan(t.nombre, t.pais))),
      o.nombre, false, false);
  end if;
  begin
    update public.puertos x set nombre = t.nombre, pais = t.pais, codigo = t.codigo, activo = t.activo, orden = t.orden
     where x.id = p_id
    returning * into t;
  exception when unique_violation then
    select * into v_choca from public.puertos x
     where x.origen_id is not distinct from o.origen_id and x.id <> p_id
       and public._catalogo_clave(x.nombre) = public._catalogo_clave(t.nombre)
       and public._catalogo_clave(x.pais) = public._catalogo_clave(t.pais);
    raise exception '%', public._catalogo_logistica_repetido('un puerto', coalesce(v_choca.nombre, t.nombre), o.origen_id, v_choca.activo, false)
      using errcode = '23505', hint = 'nombre';
  end;
  if o.activo and not t.activo then
    v_uso := public._puerto_uso(p_id);
  end if;
  return jsonb_build_object('actualizado_en', t.actualizado_en, 'uso', v_uso, 'sin_cambios', false);
end;
$$;
comment on function public.puerto_guardar(uuid, timestamptz, jsonb) is
  'Corrige un puerto con sólo lo que cambió (nombre, pais, codigo, activo, orden) y la versión leída (PT409). Devuelve {actualizado_en, uso, sin_cambios}; uso (≤ 51: transportes y ofertas) sólo al desactivar.';
revoke all on function public.puerto_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.puerto_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;

create or replace function public.naviera_crear(p_id uuid, p_origen uuid, p_datos jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare t public.navieras; o public.navieras; v_choca public.navieras;
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023', hint = 'id';
  end if;
  if p_origen is not null then
    perform public._catalogo_logistica_origen(p_origen);
    perform public._catalogo_logistica_exigir(p_origen, null, null, true, true);
  else
    perform public.assert_permiso('logistica.catalogos.gestionar');
  end if;
  t.activo := true;
  t := public._naviera_de_jsonb(t, p_datos);

  perform pg_advisory_xact_lock(hashtextextended('catalogos_logistica:navieras', 0));
  select * into o from public.navieras x where x.id = p_id;                                           -- navieras_pkey
  if o.id is not null then
    if o.origen_id is distinct from p_origen then
      raise exception 'No puedes configurar la logística de ese origen.' using errcode = '42501';
    end if;
    return jsonb_build_object('id', o.id, 'actualizado_en', o.actualizado_en, 'repetido', true);
  end if;
  if p_origen is null then
    perform public._catalogo_logistica_exigir(null, public._naviera_tapan(t.nombre), t.nombre, true, true);
  end if;

  begin
    insert into public.navieras (id, origen_id, nombre, activo)
    values (p_id, p_origen, t.nombre, t.activo)
    returning * into t;
  exception when unique_violation then
    select * into v_choca from public.navieras x                                                        -- navieras_origen_clave_key
     where x.origen_id is not distinct from p_origen and public._catalogo_clave(x.nombre) = public._catalogo_clave(t.nombre);
    raise exception '%', public._catalogo_logistica_repetido('una naviera', coalesce(v_choca.nombre, t.nombre), p_origen, v_choca.activo, true)
      using errcode = '23505', hint = 'nombre';
  end;
  return jsonb_build_object('id', t.id, 'actualizado_en', t.actualizado_en, 'repetido', false);
end;
$$;
comment on function public.naviera_crear(uuid, uuid, jsonb) is
  'Crea una naviera propia de p_origen o compartida (p_origen nulo). p_datos: nombre, activo. Mismos permisos, idempotencia y rechazos que puerto_crear. Devuelve {id, actualizado_en, repetido}.';
revoke all on function public.naviera_crear(uuid, uuid, jsonb) from public, anon;
grant execute on function public.naviera_crear(uuid, uuid, jsonb) to authenticated, service_role;

create or replace function public.naviera_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare o public.navieras; t public.navieras; v_choca public.navieras; v_uso integer;
begin
  perform public.assert_activo();
  select * into o from public.navieras x where x.id = p_id for no key update;                          -- navieras_pkey
  if not found then
    raise exception 'Esa naviera ya no existe.' using errcode = 'PT409';
  end if;
  if o.origen_id is not null then
    perform public._catalogo_logistica_exigir(o.origen_id, null, o.nombre, false, true);
  else
    perform public.assert_permiso('logistica.catalogos.gestionar');
  end if;
  t := public._naviera_de_jsonb(o, p_cambios);
  if (t.nombre, t.activo) is not distinct from (o.nombre, o.activo) then
    return jsonb_build_object('actualizado_en', o.actualizado_en, 'uso', null, 'sin_cambios', true);
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta naviera mientras la editabas.');
  if o.origen_id is null then
    perform public._catalogo_logistica_exigir(null,
      array(select unnest(public._naviera_tapan(o.nombre)) intersect select unnest(public._naviera_tapan(t.nombre))),
      o.nombre, false, true);
  end if;
  begin
    update public.navieras x set nombre = t.nombre, activo = t.activo where x.id = p_id
    returning * into t;
  exception when unique_violation then
    select * into v_choca from public.navieras x
     where x.origen_id is not distinct from o.origen_id and x.id <> p_id
       and public._catalogo_clave(x.nombre) = public._catalogo_clave(t.nombre);
    raise exception '%', public._catalogo_logistica_repetido('una naviera', coalesce(v_choca.nombre, t.nombre), o.origen_id, v_choca.activo, true)
      using errcode = '23505', hint = 'nombre';
  end;
  if o.activo and not t.activo then
    v_uso := public._naviera_uso(p_id);
  end if;
  return jsonb_build_object('actualizado_en', t.actualizado_en, 'uso', v_uso, 'sin_cambios', false);
end;
$$;
comment on function public.naviera_guardar(uuid, timestamptz, jsonb) is
  'Corrige una naviera con sólo lo que cambió (nombre, activo) y la versión leída (PT409). Devuelve {actualizado_en, uso, sin_cambios}; uso (≤ 51) sólo al desactivar.';
revoke all on function public.naviera_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.naviera_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;

create or replace function public.categoria_gasto_crear(p_id uuid, p_origen uuid, p_datos jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare t public.categorias_gasto; o public.categorias_gasto; v_choca public.categorias_gasto;
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023', hint = 'id';
  end if;
  if p_origen is not null then
    perform public._catalogo_logistica_origen(p_origen);
    perform public._catalogo_logistica_exigir(p_origen, null, null, true, true);
  else
    perform public.assert_permiso('logistica.catalogos.gestionar');
  end if;
  t.activo := true;
  t := public._categoria_gasto_de_jsonb(t, p_datos);

  perform pg_advisory_xact_lock(hashtextextended('catalogos_logistica:categorias_gasto', 0));
  select * into o from public.categorias_gasto x where x.id = p_id;                                   -- categorias_gasto_pkey
  if o.id is not null then
    if o.origen_id is distinct from p_origen then
      raise exception 'No puedes configurar la logística de ese origen.' using errcode = '42501';
    end if;
    return jsonb_build_object('id', o.id, 'actualizado_en', o.actualizado_en, 'repetido', true);
  end if;
  if p_origen is null then
    perform public._catalogo_logistica_exigir(null, public._categoria_gasto_tapan(t.nombre), t.nombre, true, true);
  end if;
  if not (p_datos ? 'orden') then
    t.orden := least(coalesce((select max(x.orden) from public.categorias_gasto x), 0) + 10, 32767);
  end if;

  begin
    insert into public.categorias_gasto (id, origen_id, nombre, proposito, activo, orden)
    values (p_id, p_origen, t.nombre, t.proposito, t.activo, t.orden)
    returning * into t;
  exception when unique_violation then
    select * into v_choca from public.categorias_gasto x                                                -- categorias_gasto_origen_clave_key
     where x.origen_id is not distinct from p_origen and public._catalogo_clave(x.nombre) = public._catalogo_clave(t.nombre);
    raise exception '%', public._catalogo_logistica_repetido('una categoría', coalesce(v_choca.nombre, t.nombre), p_origen, v_choca.activo, true)
      using errcode = '23505', hint = 'nombre';
  end;
  return jsonb_build_object('id', t.id, 'actualizado_en', t.actualizado_en, 'repetido', false);
end;
$$;
comment on function public.categoria_gasto_crear(uuid, uuid, jsonb) is
  'Crea una categoría de gasto propia de p_origen o compartida (p_origen nulo). p_datos: nombre, proposito, activo, orden. Mismos permisos, idempotencia y rechazos que puerto_crear. Devuelve {id, actualizado_en, repetido}.';
revoke all on function public.categoria_gasto_crear(uuid, uuid, jsonb) from public, anon;
grant execute on function public.categoria_gasto_crear(uuid, uuid, jsonb) to authenticated, service_role;

create or replace function public.categoria_gasto_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare o public.categorias_gasto; t public.categorias_gasto; v_choca public.categorias_gasto; v_uso integer;
begin
  perform public.assert_activo();
  select * into o from public.categorias_gasto x where x.id = p_id for no key update;                  -- categorias_gasto_pkey
  if not found then
    raise exception 'Esa categoría ya no existe.' using errcode = 'PT409';
  end if;
  if o.origen_id is not null then
    perform public._catalogo_logistica_exigir(o.origen_id, null, o.nombre, false, true);
  else
    perform public.assert_permiso('logistica.catalogos.gestionar');
  end if;
  t := public._categoria_gasto_de_jsonb(o, p_cambios);
  if (t.nombre, t.proposito, t.activo, t.orden) is not distinct from (o.nombre, o.proposito, o.activo, o.orden) then
    return jsonb_build_object('actualizado_en', o.actualizado_en, 'uso', null, 'sin_cambios', true);
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta categoría mientras la editabas.');
  if o.origen_id is null then
    perform public._catalogo_logistica_exigir(null,
      array(select unnest(public._categoria_gasto_tapan(o.nombre)) intersect select unnest(public._categoria_gasto_tapan(t.nombre))),
      o.nombre, false, true);
  end if;
  begin
    update public.categorias_gasto x set nombre = t.nombre, proposito = t.proposito, activo = t.activo, orden = t.orden
     where x.id = p_id
    returning * into t;
  exception when unique_violation then
    select * into v_choca from public.categorias_gasto x
     where x.origen_id is not distinct from o.origen_id and x.id <> p_id
       and public._catalogo_clave(x.nombre) = public._catalogo_clave(t.nombre);
    raise exception '%', public._catalogo_logistica_repetido('una categoría', coalesce(v_choca.nombre, t.nombre), o.origen_id, v_choca.activo, true)
      using errcode = '23505', hint = 'nombre';
  end;
  if o.activo and not t.activo then
    v_uso := public._categoria_gasto_uso(p_id);
  end if;
  return jsonb_build_object('actualizado_en', t.actualizado_en, 'uso', v_uso, 'sin_cambios', false);
end;
$$;
comment on function public.categoria_gasto_guardar(uuid, timestamptz, jsonb) is
  'Corrige una categoría de gasto con sólo lo que cambió (nombre, proposito, activo, orden) y la versión leída (PT409). Devuelve {actualizado_en, uso, sin_cambios}; uso (≤ 51 gastos) sólo al desactivar.';
revoke all on function public.categoria_gasto_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.categoria_gasto_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;

create or replace function public.categoria_gasto_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare o public.categorias_gasto; v_uso integer;
begin
  perform public.assert_activo();
  select * into o from public.categorias_gasto x where x.id = p_id for update;                         -- categorias_gasto_pkey
  if not found then
    raise exception 'Esa categoría ya no existe.' using errcode = 'PT409';
  end if;
  perform public._catalogo_logistica_exigir(o.origen_id,
    case when o.origen_id is null then public._categoria_gasto_tapan(o.nombre) end, o.nombre, false, true);
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta categoría mientras la editabas.');
  v_uso := public._categoria_gasto_uso(p_id);
  if v_uso > 0 then
    raise exception '«%» tiene gastos: desactívala.', o.nombre using errcode = '23503', hint = 'uso', detail = v_uso::text;
  end if;
  begin
    delete from public.categorias_gasto x where x.id = p_id;
  exception when foreign_key_violation then
    -- Un gasto entró entre la cuenta y el borrado.
    raise exception '«%» tiene gastos: desactívala.', o.nombre using errcode = '23503', hint = 'uso', detail = '1';
  end;
  return jsonb_build_object('accion', 'eliminada');
end;
$$;
comment on function public.categoria_gasto_eliminar(uuid, timestamptz) is
  'Elimina una categoría de gasto sin gastos, con la versión leída (PT409). Con gastos → 23503 hint uso (el uso, ≤ 51, en detail): se desactiva con categoria_gasto_guardar.';
revoke all on function public.categoria_gasto_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.categoria_gasto_eliminar(uuid, timestamptz) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 8. Un propio de otro origen no se elige: transporte, oferta y gastos. Lo ya guardado no se revalida si no cambia.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
create or replace function public._transporte_validar(p_flujo uuid, p_fase uuid, o public.transportes, n public.transportes, p_titulo text) returns void
  language plpgsql stable
  set search_path = ''
as $$
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
$$;

create or replace function public.flujo_oferta_guardar(p_flujo uuid, p_actualizado_en_esperado timestamptz, p_puertos_origen uuid[],
                                                      p_puertos_destino uuid[], p_navieras uuid[]) returns timestamptz
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_hint text;
  v_transporte boolean;
  v_origen uuid[];
  v_destino uuid[];
  v_navieras uuid[];
  v_flujo public.flujos;
  v_ajeno text;
begin
  -- Forma, por arreglo y en su orden; nulo vale vacío.
  v_hint := case
    when array_position(p_puertos_origen, null) is not null then 'puertos_origen'
    when array_position(p_puertos_destino, null) is not null then 'puertos_destino'
    when array_position(p_navieras, null) is not null then 'navieras'
  end;
  if v_hint is not null then
    raise exception 'Un puerto o una naviera viene vacío.' using errcode = '22023', hint = v_hint;
  end if;
  v_hint := case
    when cardinality(p_puertos_origen) > 200 then 'puertos_origen'
    when cardinality(p_puertos_destino) > 200 then 'puertos_destino'
    when cardinality(p_navieras) > 200 then 'navieras'
  end;
  if v_hint is not null then
    raise exception 'Son demasiados: hasta 200 por lista.' using errcode = '22023', hint = v_hint;
  end if;
  v_origen := coalesce((select array_agg(distinct x) from unnest(p_puertos_origen) x), '{}');
  v_destino := coalesce((select array_agg(distinct x) from unnest(p_puertos_destino) x), '{}');
  v_navieras := coalesce((select array_agg(distinct x) from unnest(p_navieras) x), '{}');

  v_flujo := public._flujo_para_editar(p_flujo, p_actualizado_en_esperado);

  v_transporte := public.flujo_regla_activa(p_flujo, 'transporte');
  if not v_transporte then
    raise exception 'La oferta de transporte se guarda con la regla «Transporte» encendida.' using errcode = '23514', hint = 'transporte';
  end if;

  -- Existencia antes de escribir (puertos_pkey, navieras_pkey).
  v_hint := case
    when exists (select 1 from unnest(v_origen) x where not exists (select 1 from public.puertos p where p.id = x)) then 'puertos_origen'
    when exists (select 1 from unnest(v_destino) x where not exists (select 1 from public.puertos p where p.id = x)) then 'puertos_destino'
    when exists (select 1 from unnest(v_navieras) x where not exists (select 1 from public.navieras n where n.id = x)) then 'navieras'
  end;
  if v_hint is not null then
    raise exception 'Un puerto o una naviera ya no existe. Recarga e intenta de nuevo.' using errcode = '23503', hint = v_hint;
  end if;

  -- Un propio de otro origen no se ofrece (el flujo de repuestos, sin origen, sólo ofrece compartidos).
  select x.nombre, x.hint into v_ajeno, v_hint from (
    (select p.nombre, 'puertos_origen' as hint, 1 as o from unnest(v_origen) u join public.puertos p on p.id = u
      where p.origen_id is not null and p.origen_id is distinct from v_flujo.origen_id order by p.nombre limit 1)
    union all
    (select p.nombre, 'puertos_destino', 2 from unnest(v_destino) u join public.puertos p on p.id = u
      where p.origen_id is not null and p.origen_id is distinct from v_flujo.origen_id order by p.nombre limit 1)
    union all
    (select n.nombre, 'navieras', 3 from unnest(v_navieras) u join public.navieras n on n.id = u
      where n.origen_id is not null and n.origen_id is distinct from v_flujo.origen_id order by n.nombre limit 1)
  ) x order by x.o limit 1;
  if v_ajeno is not null then
    raise exception '«%» es de otro origen.', v_ajeno using errcode = '22023', hint = v_hint;
  end if;

  -- flujos_transporte_oferta_flujo_id_idx
  delete from public.flujos_transporte_oferta where flujo_id = p_flujo;
  insert into public.flujos_transporte_oferta (flujo_id, tipo, puerto_id, naviera_id)
  select p_flujo, 'puerto_origen', x, null::uuid from unnest(v_origen) x
  union all
  select p_flujo, 'puerto_destino', x, null::uuid from unnest(v_destino) x
  union all
  select p_flujo, 'naviera', null::uuid, x from unnest(v_navieras) x;

  return public._flujo_tocar(p_flujo);
end $$;

-- Una categoría propia sólo vale para unidades de su origen (y nunca para un repuesto, que no tiene origen).
create or replace function public._gasto_categoria_del_origen(p_categoria uuid, p_vehiculos uuid[], p_es_repuesto boolean) returns void
  language plpgsql stable
  set search_path = ''
as $$
declare v_origen uuid;
begin
  select c.origen_id into v_origen from public.categorias_gasto c where c.id = p_categoria;           -- categorias_gasto_pkey
  if v_origen is null then
    return;
  end if;
  if p_es_repuesto
     or exists (select 1 from unnest(p_vehiculos) u join public.vehiculos v on v.id = u where v.origen_id is distinct from v_origen) then  -- vehiculos_pkey
    raise exception 'Esa categoría es de otro origen.' using errcode = '22023', hint = 'categoria_id';
  end if;
end;
$$;
revoke all on function public._gasto_categoria_del_origen(uuid, uuid[], boolean) from public, anon, authenticated;

create or replace function public._gasto_validar(p_vehiculo uuid, p_repuesto uuid, p_categoria uuid, p_monto numeric, p_ruta text) returns void
  language plpgsql stable
  set search_path = ''
as $$
begin
  if p_categoria is not null and not exists (select 1 from public.categorias_gasto c where c.id = p_categoria and c.activo) then
    raise exception 'Elige una categoría de gasto activa.' using errcode = '22023', hint = 'categoria_id';
  end if;
  if p_categoria is not null then
    perform public._gasto_categoria_del_origen(p_categoria, case when p_vehiculo is not null then array[p_vehiculo] else '{}'::uuid[] end,
                                               p_repuesto is not null);
  end if;
  if p_monto is null then
    raise exception 'Falta el monto.' using errcode = '23502', hint = 'monto';
  end if;
  if p_monto < 0 then
    raise exception 'El monto no puede ser negativo.' using errcode = '22023', hint = 'monto';
  end if;
  if not public._comprobante_ruta_valida(coalesce(p_vehiculo, p_repuesto), p_ruta) then
    raise exception 'El comprobante no está en la carpeta de esta unidad.' using errcode = '22023', hint = 'comprobante_ruta';
  end if;
end;
$$;

create or replace function public.gastos_prorratear(p_lote uuid, p_vehiculos uuid[], p_categoria uuid, p_moneda text, p_monto numeric, p_tipo_cambio uuid,
                                                   p_fecha date, p_proveedor text, p_comprobante_ruta text, p_notas text) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare n int := coalesce(cardinality(p_vehiculos), 0); v uuid; c record; p record; v_centavos bigint; v_cada bigint; v_sobran bigint; v_parte numeric;
  v_id uuid; v_ids uuid[] := '{}'::uuid[];
begin
  perform public.assert_activo();
  if p_lote is null then
    raise exception 'Falta el id del reparto.' using errcode = '23502', hint = 'lote';
  end if;
  if n < 1 or n > 200 or array_position(p_vehiculos, null) is not null
     or n <> cardinality(array(select distinct x from unnest(p_vehiculos) x)) then
    raise exception 'Elige entre 1 y 200 vehículos, sin repetir.' using errcode = '22023', hint = 'vehiculos';
  end if;
  foreach v in array p_vehiculos loop
    if not public.puede_vehiculo(v, 'logistica.gastos.editar') then
      raise exception 'No tienes el permiso «logistica.gastos.editar».' using errcode = '42501';
    end if;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended('gastos_prorratear:' || p_lote::text, 0));
  -- D8 · por gastos_lote_idx.
  if exists (select 1 from public.gastos g where g.lote_id = p_lote) then
    if (select array_agg(x order by x) from unnest(p_vehiculos) x)
       is distinct from (select array_agg(g.vehiculo_id order by g.vehiculo_id) from public.gastos g where g.lote_id = p_lote) then
      raise exception 'Ese reparto ya existe con otros vehículos.' using errcode = '23505', hint = 'lote';
    end if;
    return jsonb_build_object('lote', p_lote, 'ya_existia', true, 'ids',
      to_jsonb(array(select g.id from unnest(p_vehiculos) with ordinality u (v, o) join public.gastos g on g.vehiculo_id = u.v and g.lote_id = p_lote
                      order by u.o)));
  end if;
  foreach v in array p_vehiculos loop
    if not public._dinero_regla_activa(v, null, 'gastos') then
      raise exception 'Los gastos están apagados en el flujo de uno de los vehículos.' using errcode = '23514';
    end if;
  end loop;
  if p_categoria is null then
    raise exception 'Elige una categoría de gasto activa.' using errcode = '23502', hint = 'categoria_id';
  end if;
  perform public._gasto_validar(p_vehiculos[1], null, p_categoria, p_monto, p_comprobante_ruta);
  -- Todas las unidades, no sólo la primera: una categoría propia sólo vale si todas son de su origen.
  perform public._gasto_categoria_del_origen(p_categoria, p_vehiculos, false);
  c := public._monto_en_base(p_moneda, p_tipo_cambio, p_monto);
  v_centavos := (p_monto * 100)::bigint;
  v_cada := v_centavos / n;
  v_sobran := v_centavos % n;
  for i in 1 .. n loop
    v_parte := (v_cada + case when i <= v_sobran then 1 else 0 end)::numeric / 100;
    p := public._monto_en_base(p_moneda, c.tipo_cambio_id, v_parte, c.tipo_cambio_aplicado);
    insert into public.gastos (vehiculo_id, categoria_id, proveedor, moneda, monto, tipo_cambio_id, tipo_cambio_aplicado, monto_base, fecha, comprobante_ruta,
                               notas, creado_por, lote_id)
    values (p_vehiculos[i], p_categoria, nullif(btrim(p_proveedor), ''), p_moneda, v_parte, p.tipo_cambio_id, p.tipo_cambio_aplicado, p.monto_base,
            coalesce(p_fecha, current_date), p_comprobante_ruta, nullif(btrim(p_notas), ''), (select auth.uid()), p_lote)
    returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;
  return jsonb_build_object('lote', p_lote, 'ya_existia', false, 'ids', to_jsonb(v_ids));
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 9. La unidad de un grupo trae su origen (nulo en un repuesto): «Editar grupo» ofrece lo que usan los orígenes de sus unidades.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
create or replace function public.transporte_grupo(p_tipo text, p_clave text) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $_$
declare
  v_clave text := public._transporte_clave(p_tipo, p_clave);
  r public.transportes; v_n int := 0; v_ocultas boolean := false; v_unidades jsonb := '[]'::jsonb; v_titulo text; v_fase uuid; v_fase_nombre text;
  v_origen uuid;
begin
  perform public.assert_activo();
  if not (public.tiene_permiso('logistica.ver') or public.tiene_permiso('repuestos.ver')) then
    raise exception 'No tienes permiso para ver la logística.' using errcode = '42501';
  end if;
  for r in execute format('select t.* from public.transportes t where t.%I = $1 and '
    || '(exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)'
    || ' or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null))'
    || ' order by t.id limit 201', p_tipo) using v_clave
  loop
    v_n := v_n + 1;
    exit when v_n > 200;
    if not public.puede_unidad(r.vehiculo_id, r.repuesto_id, 'logistica.ver', 'repuestos.ver') then
      v_ocultas := true;
      continue;
    end if;
    if r.vehiculo_id is not null then
      select v.titulo, v.fase_id, f.nombre, v.origen_id into v_titulo, v_fase, v_fase_nombre, v_origen
        from public.vehiculos v left join public.fases f on f.id = v.fase_id where v.id = r.vehiculo_id;
    else
      select i.descripcion, i.fase_id, f.nombre, null::uuid into v_titulo, v_fase, v_fase_nombre, v_origen
        from public.repuestos_items i left join public.fases f on f.id = i.fase_id where i.id = r.repuesto_id;
    end if;
    v_unidades := v_unidades || jsonb_build_object(
      'transporte_id', r.id, 'vehiculo_id', r.vehiculo_id, 'repuesto_id', r.repuesto_id, 'titulo', v_titulo, 'fase_id', v_fase, 'fase', v_fase_nombre,
      'origen_id', v_origen,
      'naviera_id', r.naviera_id, 'puerto_origen_id', r.puerto_origen_id, 'puerto_destino_id', r.puerto_destino_id, 'contenedor', r.contenedor,
      'booking', r.booking, 'zarpe_el', r.zarpe_el, 'eta_el', r.eta_el, 'arribo_el', r.arribo_el, 'actualizado_en', r.actualizado_en,
      'editable', public.puede_unidad(r.vehiculo_id, r.repuesto_id, 'logistica.transporte.editar', 'repuestos.editar'));
  end loop;
  return jsonb_build_object('tipo', p_tipo, 'clave', v_clave, 'unidades', v_unidades, 'hay_mas', v_n > 200, 'hay_ocultas', v_ocultas);
end;
$_$;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 10. El permiso pasa a ser por origen (la nube no vuelve a correr el seed; `seed.sql` dice lo mismo). Las concesiones de todos los orígenes siguen.
-- ---------------------------------------------------------------------------------------------------------------------------------------------
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden)
values ('logistica.catalogos.gestionar', 'logistica', 'Catálogos de logística',
        'Puertos, navieras, categorías de gasto y tipos de documento (por origen; los compartidos, en cada origen que los usa)', true, false,
        'puerto_crear, puerto_guardar, naviera_crear, naviera_guardar, categoria_gasto_crear, categoria_gasto_guardar, categoria_gasto_eliminar, tipo_documento_*',
        430)
on conflict (clave) do update set por_origen = true, descripcion = excluded.descripcion, aplicado_en = excluded.aplicado_en;
