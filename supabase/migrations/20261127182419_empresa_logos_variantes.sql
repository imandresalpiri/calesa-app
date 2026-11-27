-- Variantes del logo (docs/GLOSARIO.md › «Variante del logo»): el logo de la empresa en las versiones que necesita (para fondo oscuro, ícono,
-- monocromo…), para el editor de artes y la ventana de cámara del Modo Live. «Principal» y «Para fondo oscuro» siguen siendo las columnas de
-- siempre de `ajustes_empresa` (`logo_ruta`, `logo_oscuro_ruta`: las leen el acceso, la barra, los íconos y la tarjeta de la cotización) y la
-- lista las trae como las dos primeras; esta tabla guarda las demás, con nombre, hasta 12, escritas por RPC con `empresa.ajustes.gestionar`.

-- El tope: espejo de `TOPE_DE_LOGOS` (`src/modules/empresa/entities/logos.ts`).
create function public._logos_empresa_tope() returns integer
  language sql immutable
  set search_path = ''
as $$ select 12 $$;

-- La clave de un nombre: sin mayúsculas, tildes ni espacios. «Para Fondo  Oscuro» y «parafondooscuro» son el mismo.
create function public._logo_nombre_clave(p_nombre text) returns text
  language sql immutable strict
  set search_path = ''
as $$ select public._sin_tildes(pg_catalog.regexp_replace(p_nombre, '\s', '', 'g')) $$;

revoke all on function public._logos_empresa_tope() from public, anon, authenticated;
revoke all on function public._logo_nombre_clave(text) from public, anon, authenticated;
grant execute on function public._logos_empresa_tope() to authenticated, service_role;
grant execute on function public._logo_nombre_clave(text) to authenticated, service_role;

create table public.logos_empresa (
  id uuid primary key,
  nombre text not null
    constraint logos_empresa_nombre_valido check (nombre = btrim(nombre) and char_length(nombre) between 1 and 40),
  ruta text not null
    constraint logos_empresa_ruta_valida check (ruta ~ '^logos/[0-9a-f]{64}\.(svg|png|webp|jpg)$'),
  tipo text not null
    constraint logos_empresa_tipo_valido check (tipo in ('svg', 'png', 'webp', 'jpg')),
  ancho integer not null constraint logos_empresa_ancho_valido check (ancho between 1 and 20000),
  alto integer not null constraint logos_empresa_alto_valido check (alto between 1 and 20000),
  orden integer not null,
  creado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint logos_empresa_tipo_de_la_ruta check (ruta like '%.' || tipo)
);

comment on table public.logos_empresa is
  'Variantes del logo de la empresa (hasta 12), además de las dos columnas de ajustes_empresa. Las lee toda persona activa; se escriben sólo por logo_variante_* con empresa.ajustes.gestionar.';

-- Un nombre una sola vez, sin importar mayúsculas, tildes ni espacios (lo repite la RPC con el mensaje y el campo en el `hint`).
create unique index logos_empresa_nombre_key on public.logos_empresa (public._logo_nombre_clave(nombre));
-- La lectura en su orden y `storage_refcount('marca', ruta)`, que cuenta por ruta sin recorrer la tabla.
create index logos_empresa_orden_idx on public.logos_empresa (orden, id);
create index logos_empresa_ruta_idx on public.logos_empresa (ruta);
-- La FK a quien la subió: al borrar una persona, `set null` busca por acá.
create index logos_empresa_creado_por_idx on public.logos_empresa (creado_por) where creado_por is not null;

alter table public.logos_empresa enable row level security;
revoke all on table public.logos_empresa from anon, authenticated;
grant select on table public.logos_empresa to authenticated;
grant all on table public.logos_empresa to service_role;

create policy "logos_empresa: leer" on public.logos_empresa
  for select to authenticated
  using ((select public.es_usuario_activo()));

-- Cuántas ventanas de cámara eligieron un logo (`live.ventana` › `logo`): lo que cuenta «Quitar» y lo que limpia la RPC al quitarlo.
create index preferencias_live_ventana_logo_idx on public.preferencias_usuario ((valor ->> 'logo')) where clave = 'live.ventana';

-- El nombre recortado y validado, con el campo en el `hint`. «Principal» y «Para fondo oscuro» son de las dos columnas de siempre.
create function public._logo_nombre(p_texto text) returns text
  language plpgsql immutable
  set search_path = ''
as $$
declare v text := btrim(coalesce(p_texto, ''));
begin
  if v = '' then
    raise exception 'Escribe un nombre.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(v) > 40 then
    raise exception 'El nombre puede tener hasta 40 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  if public._logo_nombre_clave(v) in ('principal', 'parafondooscuro') then
    raise exception 'Ya existe «%».', case when public._logo_nombre_clave(v) = 'principal' then 'Principal' else 'Para fondo oscuro' end
      using errcode = '22023', hint = 'nombre';
  end if;
  return v;
end;
$$;

revoke all on function public._logo_nombre(text) from public, anon, authenticated;
grant execute on function public._logo_nombre(text) to service_role;

-- La lista entera, como la devuelve cada escritura y la lectura: «Principal» y «Para fondo oscuro» primero (de las columnas de ajustes, sin archivo
-- si no hay logo) y las demás en su orden. De las dos primeras no hay medidas ni versión: su versión es la de la fila de ajustes.
create function public._logos_empresa_lista() returns jsonb
  language sql stable security definer
  set search_path = ''
as $$
  select jsonb_build_object(
    'tope', public._logos_empresa_tope(),
    'variantes',
      (select jsonb_build_array(
         jsonb_build_object('id', 'principal', 'nombre', 'Principal', 'ruta', a.logo_ruta,
                            'tipo', substring(a.logo_ruta from '\.([a-z]+)$'), 'ancho', null, 'alto', null,
                            'orden', 0, 'actualizado_en', null, 'uso', 'principal'),
         jsonb_build_object('id', 'oscuro', 'nombre', 'Para fondo oscuro', 'ruta', a.logo_oscuro_ruta,
                            'tipo', substring(a.logo_oscuro_ruta from '\.([a-z]+)$'), 'ancho', null, 'alto', null,
                            'orden', 0, 'actualizado_en', null, 'uso', 'oscuro'))
         from public.ajustes_empresa a where a.id = 1)
      || coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', l.id, 'nombre', l.nombre, 'ruta', l.ruta, 'tipo', l.tipo, 'ancho', l.ancho, 'alto', l.alto,
                 'orden', l.orden, 'actualizado_en', l.actualizado_en, 'uso', null
               ) order by l.orden, l.id)
          from (select x.* from public.logos_empresa x order by x.orden, x.id limit public._logos_empresa_tope() + 1) l
      ), '[]'::jsonb));
$$;

revoke all on function public._logos_empresa_lista() from public, anon, authenticated;
grant execute on function public._logos_empresa_lista() to service_role;

-- La única lectura de las variantes, para toda persona activa.
create function public.logos_empresa_leer() returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
begin
  perform public.assert_activo();
  return public._logos_empresa_lista();
end;
$$;

-- Sumar una al final, con el id del intento: repetirlo devuelve el mismo. El tope y el nombre se revisan tras el candado de la tabla.
create function public.logo_variante_crear(p_id uuid, p_nombre text, p_ruta text, p_tipo text, p_ancho integer, p_alto integer) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare v_nombre text; v_version timestamptz; v_hay integer;
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  v_nombre := public._logo_nombre(p_nombre);
  if p_ruta is null or p_ruta !~ '^logos/[0-9a-f]{64}\.(svg|png|webp|jpg)$' or p_tipo is distinct from substring(p_ruta from '\.([a-z]+)$') then
    raise exception 'El archivo del logo no es válido.' using errcode = '22023', hint = 'archivo';
  end if;
  if p_ancho is null or p_alto is null or p_ancho not between 1 and 20000 or p_alto not between 1 and 20000 then
    raise exception 'No se pudo leer cuánto mide el logo.' using errcode = '22023', hint = 'archivo';
  end if;
  lock table public.logos_empresa in share row exclusive mode;
  select l.actualizado_en into v_version from public.logos_empresa l where l.id = p_id;
  if found then
    return jsonb_build_object('id', p_id, 'ruta', p_ruta, 'repetido', true, 'lista', public._logos_empresa_lista());
  end if;
  select count(*) into v_hay from (select 1 from public.logos_empresa limit public._logos_empresa_tope()) t;
  if v_hay >= public._logos_empresa_tope() then
    raise exception 'Ya hay % logos guardados: quita uno para sumar otro.', public._logos_empresa_tope()
      using errcode = '22023', hint = 'tope';
  end if;
  if exists (select 1 from public.logos_empresa l where public._logo_nombre_clave(l.nombre) = public._logo_nombre_clave(v_nombre)) then
    raise exception 'Ya existe «%».', v_nombre using errcode = '22023', hint = 'nombre';
  end if;
  insert into public.logos_empresa (id, nombre, ruta, tipo, ancho, alto, orden, creado_por)
  values (p_id, v_nombre, p_ruta, p_tipo, p_ancho, p_alto,
          coalesce((select max(l.orden) from public.logos_empresa l), 0) + 1, (select auth.uid()))
  returning actualizado_en into v_version;
  return jsonb_build_object('id', p_id, 'ruta', p_ruta, 'actualizado_en', v_version, 'lista', public._logos_empresa_lista());
end;
$$;

-- Cambiarle el nombre, con su versión.
create function public.logo_variante_renombrar(p_id uuid, p_actualizado_en_esperado timestamptz, p_nombre text) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare o public.logos_empresa; v_nombre text; v_version timestamptz;
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  v_nombre := public._logo_nombre(p_nombre);
  lock table public.logos_empresa in share row exclusive mode;
  select * into o from public.logos_empresa l where l.id = p_id for update;
  if not found then
    raise exception 'Ese logo ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado,
    'Otra persona cambió este logo mientras lo editabas.');
  if o.nombre = v_nombre then
    return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'lista', public._logos_empresa_lista());
  end if;
  if exists (select 1 from public.logos_empresa l
              where l.id <> p_id and public._logo_nombre_clave(l.nombre) = public._logo_nombre_clave(v_nombre)) then
    raise exception 'Ya existe «%».', v_nombre using errcode = '22023', hint = 'nombre';
  end if;
  update public.logos_empresa l
     set nombre = v_nombre,
         actualizado_en = greatest(clock_timestamp(), o.actualizado_en + interval '1 microsecond')
   where l.id = p_id
  returning l.actualizado_en into v_version;
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'lista', public._logos_empresa_lista());
end;
$$;

-- Ordenar: `p_ids` es la lista entera de las variantes en su orden nuevo (arrastrando o con el teclado). Si la lista ya no es la que se tenía
-- a la vista (otra persona sumó o quitó una), PT409: el orden no es contenido y no mueve la versión de ninguna.
create function public.logo_variantes_ordenar(p_ids uuid[]) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  if p_ids is null then
    raise exception 'Falta la lista de logos.' using errcode = '22023';
  end if;
  lock table public.logos_empresa in share row exclusive mode;
  if cardinality(p_ids) <> (select count(distinct x) from unnest(p_ids) x)
     or exists (select 1 from unnest(p_ids) x where not exists (select 1 from public.logos_empresa l where l.id = x))
     or exists (select 1 from public.logos_empresa l where l.id <> all (p_ids)) then
    raise exception 'La lista de logos cambió mientras la ordenabas.' using errcode = 'PT409';
  end if;
  update public.logos_empresa l set orden = n.pos
    from (select x.id, x.pos::integer from unnest(p_ids) with ordinality as x(id, pos)) n
   where l.id = n.id and l.orden <> n.pos;
  return jsonb_build_object('lista', public._logos_empresa_lista());
end;
$$;

-- Dónde se usa una variante (`p_id`: su id, o `oscuro`): cuántas ventanas de cámara la eligieron, con tope de 100. Es lo que dice «Quitar» antes de confirmar.
create function public.logo_variante_usos(p_id text) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  return jsonb_build_object('ventanas_de_camara', (
    select count(*) from (
      select 1 from public.preferencias_usuario p
       where p.clave = 'live.ventana' and p.valor ->> 'logo' = p_id
       limit 101) t));
end;
$$;

-- Quitarla: se va de la lista y de la ventana de cámara de quien la había elegido (que vuelve a la principal). Devuelve su ruta para que
-- quien llama la borre del bucket si nadie más la usa. Una que ya no está no es error.
create function public.logo_variante_quitar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare o public.logos_empresa;
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  lock table public.logos_empresa in share row exclusive mode;
  select * into o from public.logos_empresa l where l.id = p_id for update;
  if not found then
    return jsonb_build_object('id', p_id, 'ruta', null, 'lista', public._logos_empresa_lista());
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado,
    'Otra persona cambió este logo. Recarga y decide de nuevo.');
  delete from public.logos_empresa l where l.id = p_id;
  update public.preferencias_usuario p set valor = p.valor - 'logo'
   where p.clave = 'live.ventana' and p.valor ->> 'logo' = p_id::text;
  return jsonb_build_object('id', p_id, 'ruta', o.ruta, 'lista', public._logos_empresa_lista());
end;
$$;

revoke all on function public.logos_empresa_leer() from public, anon;
revoke all on function public.logo_variante_crear(uuid, text, text, text, integer, integer) from public, anon;
revoke all on function public.logo_variante_renombrar(uuid, timestamptz, text) from public, anon;
revoke all on function public.logo_variantes_ordenar(uuid[]) from public, anon;
revoke all on function public.logo_variante_usos(text) from public, anon;
revoke all on function public.logo_variante_quitar(uuid, timestamptz) from public, anon;
grant execute on function public.logos_empresa_leer() to authenticated, service_role;
grant execute on function public.logo_variante_crear(uuid, text, text, text, integer, integer) to authenticated, service_role;
grant execute on function public.logo_variante_renombrar(uuid, timestamptz, text) to authenticated, service_role;
grant execute on function public.logo_variantes_ordenar(uuid[]) to authenticated, service_role;
grant execute on function public.logo_variante_usos(text) to authenticated, service_role;
grant execute on function public.logo_variante_quitar(uuid, timestamptz) to authenticated, service_role;

-- La ventana de cámara elige su logo (`logo`): nada = la principal, `oscuro` = «Para fondo oscuro» o el id de una variante (docs/GLOSARIO.md ›
-- «Ventana de cámara»). Espejo de `esquemaDeLaVentanaDeCamara`.
create or replace function public._preferencia_live_ventana_valida(p_valor jsonb) returns boolean
  language sql immutable
  set search_path = ''
as $$
  select coalesce(
    jsonb_typeof(p_valor) = 'object'
    and not exists (
      select 1 from jsonb_object_keys(p_valor) k
       where k <> all (array['x', 'y', 'ancho', 'minimizada', 'espejo', 'ficha_web', 'datos', 'camara', 'logo'])
    )
    and (not (p_valor ? 'x') or case when jsonb_typeof(p_valor -> 'x') = 'number' then (p_valor ->> 'x')::numeric between 0 and 100 else false end)
    and (not (p_valor ? 'y') or case when jsonb_typeof(p_valor -> 'y') = 'number' then (p_valor ->> 'y')::numeric between 0 and 100 else false end)
    and (not (p_valor ? 'ancho') or case when jsonb_typeof(p_valor -> 'ancho') = 'number' then (p_valor ->> 'ancho')::numeric between 200 and 4000 else false end)
    and (not (p_valor ? 'minimizada') or jsonb_typeof(p_valor -> 'minimizada') = 'boolean')
    and (not (p_valor ? 'espejo') or jsonb_typeof(p_valor -> 'espejo') = 'boolean')
    and (not (p_valor ? 'ficha_web') or jsonb_typeof(p_valor -> 'ficha_web') = 'boolean')
    and (not (p_valor ? 'datos') or case when jsonb_typeof(p_valor -> 'datos') = 'array' then
          jsonb_array_length(p_valor -> 'datos') <= 4
          and not exists (
            select 1 from jsonb_array_elements(p_valor -> 'datos') e
             where jsonb_typeof(e) <> 'string' or (e #>> '{}') <> all (array['nombre_y_cargo', 'contacto', 'logo', 'redes_y_web'])
          )
        else false end)
    and (not (p_valor ? 'camara') or jsonb_typeof(p_valor -> 'camara') = 'null'
         or (jsonb_typeof(p_valor -> 'camara') = 'string' and length(p_valor ->> 'camara') <= 300))
    -- El logo: `oscuro` o el id de una variante; null o ausente, la principal.
    and (not (p_valor ? 'logo') or jsonb_typeof(p_valor -> 'logo') = 'null'
         or (jsonb_typeof(p_valor -> 'logo') = 'string'
             and ((p_valor ->> 'logo') = 'oscuro'
                  or (p_valor ->> 'logo') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')))
  , false)
$$;

comment on function public._preferencia_live_ventana_valida(jsonb) is
  'Forma de la preferencia live.ventana: objeto con x, y (0–100), ancho (200–4000), minimizada, espejo, ficha_web, datos (≤ 4 de una lista), camara (texto ≤ 300 o null) y logo (oscuro, el id de una variante o null).';

-- El recuento de referencias de `storage_refcount('marca', …)` suma las variantes del logo (`logos_empresa.ruta`): quien quita una variante
-- borra el objeto sólo si nadie más lo usa (también «Principal», el logo oscuro y los íconos).
CREATE OR REPLACE FUNCTION "public"."storage_refcount"("p_bucket" "text", "p_ruta" "text") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
  select (
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta = p_ruta) +
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta_miniatura = p_ruta) +
    (select count(*) from public.repuestos_items_imagenes where p_bucket = 'repuestos' and ruta = p_ruta) +
    (select count(*) from public.documentos where p_bucket = 'documentos' and ruta = p_ruta and eliminado_en is null) +
    (select count(*) from public.cotizaciones_adjuntos where p_bucket = 'cotizaciones' and ruta = p_ruta) +
    (select count(*) from public.gastos where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.pagos where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.repuestos_compras where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.perfiles where p_bucket = 'avatares' and avatar_ruta = p_ruta) +
    (select count(*) from public.perfiles where p_bucket = 'avatares' and avatar_miniatura_ruta = p_ruta) +
    (select count(*) from public.web_guias where p_bucket = 'web' and portada_ruta = p_ruta) +
    (select count(*) from public.web_guias where p_bucket = 'web' and cuerpo_doc is not null
       and jsonb_path_exists(cuerpo_doc, 'lax $.content[*] ? (@.type == "image").attrs.ruta ? (@ == $r)', jsonb_build_object('r', p_ruta))) +
    (select count(*) from public.web_guias where p_bucket = 'web' and cuerpo_doc is not null
       and jsonb_path_exists(cuerpo_doc, 'lax $.content[*] ? (@.type == "gallery").attrs.imagenes[*].ruta ? (@ == $r)', jsonb_build_object('r', p_ruta))) +
    (select count(*) from public.web_testimonios where p_bucket = 'web' and foto_ruta = p_ruta) +
    (select count(*) from public.ajustes_empresa where p_bucket = 'marca' and (logo_ruta = p_ruta or logo_oscuro_ruta = p_ruta)) +
    (select count(*) from public.logos_empresa where p_bucket = 'marca' and ruta = p_ruta) +
    (select count(*) from public.ajustes_empresa e, jsonb_each_text(coalesce(e.iconos, '{}'::jsonb)) i where p_bucket = 'marca' and i.value = p_ruta)
  )::int;
$_$;
