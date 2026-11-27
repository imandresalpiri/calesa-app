-- Plantillas de arte y su biblioteca de imágenes (docs/GLOSARIO.md › «Arte», «Plantilla de arte», «Formato de arte», «Biblioteca de imágenes»,
-- «Plantilla por defecto»). Una plantilla de arte es de un origen y de un formato, nace privada de quien la crea y quien tiene
-- `artes.empresa.gestionar` la hace de la empresa (o privada otra vez). La ve quien ve cotizaciones de su origen: la privada, sólo su autor.
-- Su documento es un JSON versionado (`src/modules/artes/entities/documento.ts`) que nombra las imágenes de la biblioteca por id; la tabla
-- puente `artes_plantillas_imagenes` lleva esas referencias para contar los usos por índice. La biblioteca tiene imágenes de la empresa
-- (las carga quien gestiona) y personales (sólo su dueño), en el bucket privado `artes`, por hash. Cada persona elige su plantilla por
-- defecto de imagen y de PDF en cada origen (`artes_por_defecto`). Todo se escribe por RPC.

-- ---------------------------------------------------------------------------------------------------
-- La clave (la misma fila que `seed.sql`) y, en una base que ya tiene roles, el dueño la recibe. En un reset local las migraciones corren antes
-- del seed: el seed se la da al dueño con su `cross join`.
-- ---------------------------------------------------------------------------------------------------
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden) values
  ('artes.empresa.gestionar', 'artes', 'Gestionar las de la empresa',
   'Hacer de la empresa o privada una plantilla de arte, editar o eliminar las de la empresa y cargar la biblioteca de imágenes de la empresa',
   false, false,
   'artes_plantilla_guardar, artes_plantilla_visibilidad, artes_plantilla_eliminar, artes_imagen_crear, artes_imagen_renombrar, artes_imagen_quitar',
   695)
on conflict (clave) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, por_origen = excluded.por_origen,
  con_alcance = excluded.con_alcance, aplicado_en = excluded.aplicado_en, modulo = excluded.modulo, orden = excluded.orden;

do $$
declare v_nuevos text;
begin
  with concedidos as (
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    select r.id, 'artes.empresa.gestionar', 'todos'::public.alcance_permiso
      from public.roles r
     where r.clave = 'dueno'
    on conflict do nothing
    returning rol_id)
  select string_agg(r.clave, ', ' order by r.clave) into v_nuevos from concedidos c join public.roles r on r.id = c.rol_id;
  raise notice 'artes.empresa.gestionar concedido a los roles: %', coalesce(v_nuevos, '(ninguno nuevo)');
end $$;

-- ---------------------------------------------------------------------------------------------------
-- El bucket: privado (una imagen personal no es pública), servido con URL firmada. Las rutas son por hash: `imagenes/<sha256>.<ext>` y
-- `miniaturas/<sha256>.<ext>`. 5 MB por objeto: lo que se sube ya está reducido (`src/modules/artes/entities/imagenes.ts`).
-- ---------------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('artes', 'artes', false, 5242880, '{image/webp,image/png,image/jpeg,image/svg+xml}')
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------------------------------
-- Los formatos: espejo de `FORMATOS_DE_ARTE` (`src/modules/artes/entities/formatos.ts`; los compara `scripts/guardas/formatos-de-arte.test.ts`).
-- Los de imagen en px; los de PDF (Carta y A4) en puntos, la unidad de `@react-pdf/renderer`. Personalizado: cada lado de 320 a 4096 px.
-- ---------------------------------------------------------------------------------------------------
create function public._artes_medidas_validas(p_formato text, p_ancho integer, p_alto integer) returns boolean
  language sql immutable
  set search_path = ''
as $$
  select coalesce(case p_formato
    when 'cuadrado' then p_ancho = 1080 and p_alto = 1080
    when 'vertical' then p_ancho = 1080 and p_alto = 1350
    when 'historia' then p_ancho = 1080 and p_alto = 1920
    when 'horizontal' then p_ancho = 1200 and p_alto = 630
    when 'pantalla' then p_ancho = 1920 and p_alto = 1080
    when 'personalizado' then p_ancho between 320 and 4096 and p_alto between 320 and 4096
    when 'carta' then p_ancho = 612 and p_alto = 792
    when 'a4' then p_ancho = 595 and p_alto = 842
    else false end, false)
$$;

-- Qué se arma con un formato: Carta y A4 son PDF; los demás, imagen.
create function public._artes_tipo_del_formato(p_formato text) returns text
  language sql immutable
  set search_path = ''
as $$ select case when p_formato in ('carta', 'a4') then 'pdf' else 'imagen' end $$;

-- La forma mínima del documento que la base exige (la completa la valida `esquemaDelDocumento`): un objeto con `version` ≥ 1 y de 1 a 20
-- páginas. El tope de tamaño va aparte: 512 KiB medidos como los guarda la base (`jsonb::text`, que mide más que `JSON.stringify`).
create function public._artes_documento_valido(p_documento jsonb) returns boolean
  language sql immutable
  set search_path = ''
as $$
  select coalesce(
    jsonb_typeof(p_documento) = 'object'
    and case when jsonb_typeof(p_documento -> 'version') = 'number' then (p_documento ->> 'version')::numeric >= 1 else false end
    and case when jsonb_typeof(p_documento -> 'paginas') = 'array' then jsonb_array_length(p_documento -> 'paginas') between 1 and 20 else false end
  , false)
$$;

revoke all on function public._artes_medidas_validas(text, integer, integer) from public, anon, authenticated;
revoke all on function public._artes_tipo_del_formato(text) from public, anon, authenticated;
revoke all on function public._artes_documento_valido(jsonb) from public, anon, authenticated;
grant execute on function public._artes_medidas_validas(text, integer, integer) to service_role;
grant execute on function public._artes_tipo_del_formato(text) to service_role;
grant execute on function public._artes_documento_valido(jsonb) to service_role;

-- ---------------------------------------------------------------------------------------------------
-- Las tablas
-- ---------------------------------------------------------------------------------------------------
create table public.artes_plantillas (
  -- Lo genera el navegador: crear es idempotente por id.
  id uuid primary key,
  nombre text not null
    constraint artes_plantillas_nombre_valido check (nombre = btrim(nombre) and char_length(nombre) between 1 and 80),
  formato text not null
    constraint artes_plantillas_formato_valido
      check (formato in ('cuadrado', 'vertical', 'historia', 'horizontal', 'pantalla', 'personalizado', 'carta', 'a4')),
  -- Las medidas viven sólo aquí (no en el documento); como el formato, no se editan.
  ancho integer not null,
  alto integer not null,
  origen_id uuid not null references public.origenes (id) on delete cascade,
  visibilidad text not null default 'privada'
    constraint artes_plantillas_visibilidad_valida check (visibilidad in ('privada', 'empresa')),
  autor_id uuid not null references public.perfiles (id) on delete cascade,
  documento jsonb not null,
  miniatura_ruta text
    constraint artes_plantillas_miniatura_valida check (miniatura_ruta ~ '^miniaturas/[0-9a-f]{64}\.(webp|png|jpg)$'),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint artes_plantillas_medidas_validas check (public._artes_medidas_validas(formato, ancho, alto)),
  constraint artes_plantillas_documento_valido check (public._artes_documento_valido(documento)),
  constraint artes_plantillas_documento_tope check (octet_length(documento::text) <= 524288)
);

comment on table public.artes_plantillas is
  'Plantillas de arte: un formato, un origen, privada (sólo su autor) o de la empresa (quien ve cotizaciones de su origen). El documento no se lee en las listas. Se escriben sólo por artes_plantilla_*.';

-- La lista sin filtro, por origen (y visibilidad) y «Mías», cada una en su orden de cursor `(actualizado_en desc, id desc)`.
create index artes_plantillas_recientes_idx on public.artes_plantillas (actualizado_en desc, id desc);
create index artes_plantillas_origen_idx on public.artes_plantillas (origen_id, visibilidad, actualizado_en desc, id desc);
create index artes_plantillas_autor_idx on public.artes_plantillas (autor_id, actualizado_en desc, id desc);
-- `storage_refcount('artes', …)`, el barrido y la policy de leer de `storage.objects` cuentan por ruta sin recorrer la tabla.
create index artes_plantillas_miniatura_idx on public.artes_plantillas (miniatura_ruta) where miniatura_ruta is not null;

create table public.artes_imagenes (
  id uuid primary key,
  nombre text not null
    constraint artes_imagenes_nombre_valido check (nombre = btrim(nombre) and char_length(nombre) between 1 and 80),
  ruta text not null
    constraint artes_imagenes_ruta_valida check (ruta ~ '^imagenes/[0-9a-f]{64}\.(webp|png|jpg|svg)$'),
  -- La de 480 px para las listas; un SVG es su propia miniatura.
  miniatura_ruta text not null,
  tipo text not null
    constraint artes_imagenes_tipo_valido check (tipo in ('webp', 'png', 'jpg', 'svg')),
  ancho integer not null constraint artes_imagenes_ancho_valido check (ancho between 1 and 20000),
  alto integer not null constraint artes_imagenes_alto_valido check (alto between 1 and 20000),
  ambito text not null
    constraint artes_imagenes_ambito_valido check (ambito in ('empresa', 'personal')),
  dueno_id uuid references public.perfiles (id) on delete cascade,
  creado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint artes_imagenes_tipo_de_la_ruta check (ruta like '%.' || tipo),
  constraint artes_imagenes_miniatura_valida
    check ((tipo = 'svg' and miniatura_ruta = ruta) or (tipo <> 'svg' and miniatura_ruta ~ '^miniaturas/[0-9a-f]{64}\.(webp|png|jpg)$')),
  constraint artes_imagenes_dueno_del_ambito check ((ambito = 'personal') = (dueno_id is not null))
);

comment on table public.artes_imagenes is
  'Biblioteca de imágenes de las artes: de la empresa (la carga quien tiene artes.empresa.gestionar, la ve quien ve Artes) o personal (sólo su dueño). Objetos del bucket artes por hash. Se escriben sólo por artes_imagen_*.';

create index artes_imagenes_ambito_idx on public.artes_imagenes (ambito, actualizado_en desc, id desc);
create index artes_imagenes_dueno_idx on public.artes_imagenes (dueno_id, actualizado_en desc, id desc) where dueno_id is not null;
create index artes_imagenes_recientes_idx on public.artes_imagenes (actualizado_en desc, id desc);
create index artes_imagenes_ruta_idx on public.artes_imagenes (ruta);
create index artes_imagenes_miniatura_idx on public.artes_imagenes (miniatura_ruta);
create index artes_imagenes_creado_por_idx on public.artes_imagenes (creado_por) where creado_por is not null;

-- Las imágenes que nombra cada documento: el conteo de usos por índice. La FK a la imagen (sin cascada) serializa a quien la referencia
-- (`key share`) contra quien la quita (`for update`).
create table public.artes_plantillas_imagenes (
  plantilla_id uuid not null references public.artes_plantillas (id) on delete cascade,
  imagen_id uuid not null references public.artes_imagenes (id),
  primary key (plantilla_id, imagen_id)
);

comment on table public.artes_plantillas_imagenes is
  'Qué imágenes de la biblioteca nombra el documento de cada plantilla de arte. La mantienen artes_plantilla_crear, _guardar y _duplicar; la lee quien ve la plantilla.';

create index artes_plantillas_imagenes_imagen_idx on public.artes_plantillas_imagenes (imagen_id);

create table public.artes_por_defecto (
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  origen_id uuid not null references public.origenes (id) on delete cascade,
  tipo text not null constraint artes_por_defecto_tipo_valido check (tipo in ('imagen', 'pdf')),
  -- Si la plantilla se borra, la fila cae y lo que se comparte vuelve a lo de hoy (la imagen de la tarjeta, el PDF de la cotización).
  plantilla_id uuid not null references public.artes_plantillas (id) on delete cascade,
  actualizado_en timestamptz not null default now(),
  primary key (usuario_id, origen_id, tipo)
);

comment on table public.artes_por_defecto is
  'La plantilla de arte por defecto de cada persona, por origen y tipo (imagen o PDF). Sin fila, lo de hoy. La lee sólo su dueño; se escribe por artes_por_defecto_poner.';

create index artes_por_defecto_plantilla_idx on public.artes_por_defecto (plantilla_id);
create index artes_por_defecto_origen_idx on public.artes_por_defecto (origen_id);

alter table public.artes_plantillas enable row level security;
alter table public.artes_imagenes enable row level security;
alter table public.artes_plantillas_imagenes enable row level security;
alter table public.artes_por_defecto enable row level security;
revoke all on table public.artes_plantillas from anon, authenticated;
revoke all on table public.artes_imagenes from anon, authenticated;
revoke all on table public.artes_plantillas_imagenes from anon, authenticated;
revoke all on table public.artes_por_defecto from anon, authenticated;
grant select on table public.artes_plantillas to authenticated;
grant select on table public.artes_imagenes to authenticated;
grant select on table public.artes_plantillas_imagenes to authenticated;
grant select on table public.artes_por_defecto to authenticated;
grant all on table public.artes_plantillas to service_role;
grant all on table public.artes_imagenes to service_role;
grant all on table public.artes_plantillas_imagenes to service_role;
grant all on table public.artes_por_defecto to service_role;

-- La de la empresa la ve quien ve cotizaciones de su origen; la privada, sólo su autor (y también con ese origen a la vista).
create policy "artes_plantillas: leer" on public.artes_plantillas
  for select to authenticated
  using (
    (select public.es_usuario_activo())
    and origen_id = any ((select public.origenes_con_alcance('cotizaciones.ver', 'propios'))::uuid[])
    and (visibilidad = 'empresa' or autor_id = (select auth.uid()))
  );

create policy "artes_imagenes: leer" on public.artes_imagenes
  for select to authenticated
  using (
    (select public.es_usuario_activo())
    and (select public.tiene_permiso('cotizaciones.ver'))
    and (ambito = 'empresa' or dueno_id = (select auth.uid()))
  );

-- Aplica la RLS de la plantilla.
create policy "artes_plantillas_imagenes: leer" on public.artes_plantillas_imagenes
  for select to authenticated
  using (exists (select 1 from public.artes_plantillas p where p.id = plantilla_id));

create policy "artes_por_defecto: leer" on public.artes_por_defecto
  for select to authenticated
  using ((select public.es_usuario_activo()) and usuario_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------------
-- Storage: sube quien ve Artes, a una ruta por hash; lee quien ve una fila que nombra el objeto (las subconsultas aplican la RLS de cada
-- tabla, por sus índices de ruta) o quien lo subió (`owner`, el uuid de quien sube: el objeto recién subido, antes de que exista su fila).
-- Sin update ni delete: lo que nadie usa lo barre `storage_gc_reclamar()`.
-- ---------------------------------------------------------------------------------------------------
create policy "artes: subir" on storage.objects as permissive for insert to authenticated
  with check (
    bucket_id = 'artes'
    and (select public.es_usuario_activo())
    and (select public.tiene_permiso('cotizaciones.ver'))
    and name ~ '^(imagenes/[0-9a-f]{64}\.(webp|png|jpg|svg)|miniaturas/[0-9a-f]{64}\.(webp|png|jpg))$'
  );

create policy "artes: leer" on storage.objects as permissive for select to authenticated
  using (
    bucket_id = 'artes'
    and (select public.es_usuario_activo())
    and (
      owner = (select auth.uid())
      or exists (select 1 from public.artes_imagenes i where i.ruta = objects.name)
      or exists (select 1 from public.artes_imagenes i where i.miniatura_ruta = objects.name)
      or exists (select 1 from public.artes_plantillas p where p.miniatura_ruta = objects.name)
    )
  );

-- ---------------------------------------------------------------------------------------------------
-- Rescate: una ruta que vuelve a usarse sale de la cola de limpieza (o avisa si ya se está borrando).
-- ---------------------------------------------------------------------------------------------------
create function public.artes_plantillas_rescatar() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare v_cambia boolean;
begin
  if tg_op = 'INSERT' then
    v_cambia := new.miniatura_ruta is not null;
  else
    v_cambia := new.miniatura_ruta is not null and new.miniatura_ruta is distinct from old.miniatura_ruta;
  end if;
  if v_cambia then
    perform public.storage_gc_rescatar('artes', new.miniatura_ruta);
  end if;
  return new;
end $$;

create function public.artes_imagenes_rescatar() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  perform public.storage_gc_rescatar('artes', new.ruta);
  if new.miniatura_ruta <> new.ruta then
    perform public.storage_gc_rescatar('artes', new.miniatura_ruta);
  end if;
  return new;
end $$;

revoke all on function public.artes_plantillas_rescatar() from public, anon, authenticated;
revoke all on function public.artes_imagenes_rescatar() from public, anon, authenticated;
grant execute on function public.artes_plantillas_rescatar() to service_role;
grant execute on function public.artes_imagenes_rescatar() to service_role;

create trigger artes_plantillas_rescatar before insert or update of miniatura_ruta on public.artes_plantillas
  for each row execute function public.artes_plantillas_rescatar();
create trigger artes_imagenes_rescatar before insert on public.artes_imagenes
  for each row execute function public.artes_imagenes_rescatar();

-- ---------------------------------------------------------------------------------------------------
-- Ayudantes de las RPC (sólo los llaman las `security definer` de abajo)
-- ---------------------------------------------------------------------------------------------------

-- Quién ve una plantilla de arte: la misma regla que su policy.
create function public._artes_ve_plantilla(p_origen uuid, p_visibilidad text, p_autor uuid) returns boolean
  language sql stable security definer
  set search_path = ''
as $$
  select coalesce(public.es_usuario_activo() and public.tiene_permiso('cotizaciones.ver', p_origen)
                  and (p_visibilidad = 'empresa' or p_autor = (select auth.uid())), false)
$$;

-- Quién la cambia (guardar, eliminar): la privada, su autor; la de la empresa, quien gestiona las artes de la empresa.
create function public._artes_edita_plantilla(p_visibilidad text, p_autor uuid) returns boolean
  language sql stable security definer
  set search_path = ''
as $$
  select coalesce(case when p_visibilidad = 'empresa' then public.tiene_permiso('artes.empresa.gestionar')
                       else p_autor = (select auth.uid()) end, false)
$$;

-- Quién ve una imagen de la biblioteca: la misma regla que su policy.
create function public._artes_ve_imagen(p_ambito text, p_dueno uuid) returns boolean
  language sql stable security definer
  set search_path = ''
as $$
  select coalesce(public.es_usuario_activo() and public.tiene_permiso('cotizaciones.ver')
                  and (p_ambito = 'empresa' or p_dueno = (select auth.uid())), false)
$$;

-- Quién la renombra o la quita: la personal, su dueño; la de la empresa, quien gestiona.
create function public._artes_gestiona_imagen(p_ambito text, p_dueno uuid) returns boolean
  language sql stable security definer
  set search_path = ''
as $$
  select coalesce(case when p_ambito = 'empresa' then public.tiene_permiso('artes.empresa.gestionar')
                       else p_dueno = (select auth.uid()) end, false)
$$;

-- El nombre recortado y validado, con el campo en el `hint`.
create function public._artes_nombre(p_texto text) returns text
  language plpgsql immutable
  set search_path = ''
as $$
declare v text := btrim(coalesce(p_texto, ''));
begin
  if v = '' or char_length(v) > 80 then
    raise exception 'Escribe un nombre de hasta 80 letras.' using errcode = '22023', hint = 'nombre';
  end if;
  return v;
end;
$$;

-- El documento: su forma mínima (22023) y su tope (23514), los dos con `hint = 'documento'`, antes de que el `check` lo diga con la fila
-- entera en el detalle.
create function public._artes_validar_documento(p_documento jsonb) returns void
  language plpgsql immutable
  set search_path = ''
as $$
begin
  if p_documento is null or not public._artes_documento_valido(p_documento) then
    raise exception 'La plantilla de arte no es válida.' using errcode = '22023', hint = 'documento';
  end if;
  if octet_length(p_documento::text) > 524288 then
    raise exception 'La plantilla de arte pesa más de 512 KB.' using errcode = '23514', hint = 'documento';
  end if;
end;
$$;

-- Las imágenes que nombra el documento (las capas de tipo imagen, por `imagenId`), sin repetidas. Un id que no es uuid es un documento inválido;
-- más de 100 distintas, también (`MAXIMO_DE_IMAGENES_POR_PLANTILLA`).
create function public._artes_imagenes_del_documento(p_documento jsonb) returns uuid[]
  language plpgsql immutable
  set search_path = ''
as $$
declare v_ids uuid[] := array[]::uuid[]; v_texto text; v_valido boolean;
begin
  for v_texto in
    select distinct x #>> '{}'
      from jsonb_path_query(p_documento, 'lax $.paginas[*].capas[*] ? (@.tipo == "imagen").imagenId') x
  loop
    v_valido := v_texto is not null and v_texto ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    if not v_valido then
      raise exception 'La plantilla de arte no es válida.' using errcode = '22023', hint = 'documento';
    end if;
    v_ids := v_ids || v_texto::uuid;
  end loop;
  if cardinality(v_ids) > 100 then
    raise exception 'Una plantilla de arte usa hasta 100 imágenes.' using errcode = '22023', hint = 'imagenes';
  end if;
  return v_ids;
end;
$$;

-- Que quien guarda vea cada imagen que nombra y, si la plantilla es de la empresa, que todas sean de la empresa: así nadie ve un hueco donde
-- iba la imagen personal de otra persona.
create function public._artes_validar_imagenes(p_ids uuid[], p_visibilidad text) returns void
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_falta boolean; v_personal boolean;
begin
  v_falta := exists (
    select 1 from unnest(p_ids) x
     where not exists (select 1 from public.artes_imagenes i
                        where i.id = x and (i.ambito = 'empresa' or i.dueno_id = (select auth.uid()))));
  if v_falta then
    raise exception 'Una de las imágenes ya no existe.' using errcode = '22023', hint = 'imagenes';
  end if;
  v_personal := p_visibilidad = 'empresa' and exists (select 1 from public.artes_imagenes i where i.id = any (p_ids) and i.ambito <> 'empresa');
  if v_personal then
    raise exception 'Usa imágenes personales: pásalas a la biblioteca de la empresa o quítalas antes.' using errcode = '22023', hint = 'imagenes';
  end if;
end;
$$;

-- La tabla puente igual a lo que nombra el documento: quita lo que sobra y suma lo que falta.
create function public._artes_poner_referencias(p_plantilla uuid, p_ids uuid[]) returns void
  language plpgsql security definer
  set search_path = ''
as $$
begin
  delete from public.artes_plantillas_imagenes r where r.plantilla_id = p_plantilla and r.imagen_id <> all (p_ids);
  insert into public.artes_plantillas_imagenes (plantilla_id, imagen_id)
  select p_plantilla, x from unnest(p_ids) x
   where not exists (select 1 from public.artes_plantillas_imagenes r where r.plantilla_id = p_plantilla and r.imagen_id = x);
end;
$$;

revoke all on function public._artes_ve_plantilla(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public._artes_edita_plantilla(text, uuid) from public, anon, authenticated;
revoke all on function public._artes_ve_imagen(text, uuid) from public, anon, authenticated;
revoke all on function public._artes_gestiona_imagen(text, uuid) from public, anon, authenticated;
revoke all on function public._artes_nombre(text) from public, anon, authenticated;
revoke all on function public._artes_validar_documento(jsonb) from public, anon, authenticated;
revoke all on function public._artes_imagenes_del_documento(jsonb) from public, anon, authenticated;
revoke all on function public._artes_validar_imagenes(uuid[], text) from public, anon, authenticated;
revoke all on function public._artes_poner_referencias(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public._artes_ve_plantilla(uuid, text, uuid) to service_role;
grant execute on function public._artes_edita_plantilla(text, uuid) to service_role;
grant execute on function public._artes_ve_imagen(text, uuid) to service_role;
grant execute on function public._artes_gestiona_imagen(text, uuid) to service_role;
grant execute on function public._artes_nombre(text) to service_role;
grant execute on function public._artes_validar_documento(jsonb) to service_role;
grant execute on function public._artes_imagenes_del_documento(jsonb) to service_role;
grant execute on function public._artes_validar_imagenes(uuid[], text) to service_role;
grant execute on function public._artes_poner_referencias(uuid, uuid[]) to service_role;

-- ---------------------------------------------------------------------------------------------------
-- Plantillas de arte
-- ---------------------------------------------------------------------------------------------------

-- Crear: nace privada de quien la crea, en un origen del que ve cotizaciones. Repetir el mismo id devuelve la misma (`repetido`).
create function public.artes_plantilla_crear(
  p_id uuid, p_nombre text, p_formato text, p_ancho integer, p_alto integer, p_origen uuid, p_documento jsonb
) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare v_nombre text; v_ids uuid[]; v_version timestamptz; v_autor uuid; v_ve boolean;
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  v_ve := p_origen is not null and public.tiene_permiso('cotizaciones.ver', p_origen);
  if not v_ve then
    raise exception 'Necesitas ver cotizaciones de ese origen para crear una plantilla de arte.' using errcode = '42501', hint = 'origen';
  end if;
  v_nombre := public._artes_nombre(p_nombre);
  if not public._artes_medidas_validas(p_formato, p_ancho, p_alto) then
    raise exception 'Cada lado va de 320 a 4096 px.' using errcode = '22023', hint = 'formato';
  end if;
  perform public._artes_validar_documento(p_documento);
  v_ids := public._artes_imagenes_del_documento(p_documento);
  perform public._artes_validar_imagenes(v_ids, 'privada');
  select p.autor_id, p.actualizado_en into v_autor, v_version from public.artes_plantillas p where p.id = p_id;
  if found then
    if v_autor = (select auth.uid()) then
      return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', true);
    end if;
    raise exception 'Ese identificador ya está en uso.' using errcode = '23505';
  end if;
  begin
    insert into public.artes_plantillas (id, nombre, formato, ancho, alto, origen_id, visibilidad, autor_id, documento)
    values (p_id, v_nombre, p_formato, p_ancho, p_alto, p_origen, 'privada', (select auth.uid()), p_documento)
    returning actualizado_en into v_version;
  exception when unique_violation then
    select p.autor_id, p.actualizado_en into v_autor, v_version from public.artes_plantillas p where p.id = p_id;
    if v_autor = (select auth.uid()) then
      return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', true);
    end if;
    raise exception 'Ese identificador ya está en uso.' using errcode = '23505';
  end;
  perform public._artes_poner_referencias(p_id, v_ids);
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version);
end;
$$;

-- Guardar el nombre, el documento y la miniatura (nula: la que tenía), con su versión. La privada la guarda su autor; la de la empresa, quien
-- gestiona las artes de la empresa.
create function public.artes_plantilla_guardar(
  p_id uuid, p_actualizado_en_esperado timestamptz, p_nombre text, p_documento jsonb, p_miniatura_ruta text
) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_origen uuid; v_visibilidad text; v_autor uuid; v_version timestamptz; v_miniatura text;
  v_nombre text; v_ids uuid[]; v_ve boolean; v_edita boolean; v_nueva timestamptz;
begin
  perform public.assert_activo();
  v_nombre := public._artes_nombre(p_nombre);
  perform public._artes_validar_documento(p_documento);
  v_ids := public._artes_imagenes_del_documento(p_documento);
  if p_miniatura_ruta is not null and p_miniatura_ruta !~ '^miniaturas/[0-9a-f]{64}\.(webp|png|jpg)$' then
    raise exception 'La miniatura no es válida.' using errcode = '22023', hint = 'miniatura';
  end if;
  -- El permiso antes del candado: quien no puede no espera.
  select p.origen_id, p.visibilidad, p.autor_id into v_origen, v_visibilidad, v_autor from public.artes_plantillas p where p.id = p_id;
  v_ve := found and public._artes_ve_plantilla(v_origen, v_visibilidad, v_autor);
  if not v_ve then
    raise exception 'No encontramos esa plantilla de arte.' using errcode = 'P0002';
  end if;
  if not public._artes_edita_plantilla(v_visibilidad, v_autor) then
    raise exception 'Sólo quien gestiona las artes de la empresa puede editarla.' using errcode = '42501';
  end if;
  select p.origen_id, p.visibilidad, p.autor_id, p.actualizado_en, p.miniatura_ruta
    into v_origen, v_visibilidad, v_autor, v_version, v_miniatura
    from public.artes_plantillas p where p.id = p_id for no key update;
  v_ve := found and public._artes_ve_plantilla(v_origen, v_visibilidad, v_autor);
  if not v_ve then
    raise exception 'No encontramos esa plantilla de arte.' using errcode = 'P0002';
  end if;
  v_edita := public._artes_edita_plantilla(v_visibilidad, v_autor);
  if not v_edita then
    raise exception 'Sólo quien gestiona las artes de la empresa puede editarla.' using errcode = '42501';
  end if;
  perform public._exigir_version(v_version, p_actualizado_en_esperado, 'Alguien cambió esta plantilla de arte mientras la mirabas.');
  perform public._artes_validar_imagenes(v_ids, v_visibilidad);
  update public.artes_plantillas p
     set nombre = v_nombre,
         documento = p_documento,
         miniatura_ruta = coalesce(p_miniatura_ruta, v_miniatura),
         actualizado_en = greatest(clock_timestamp(), v_version + interval '1 microsecond')
   where p.id = p_id
  returning p.actualizado_en into v_nueva;
  perform public._artes_poner_referencias(p_id, v_ids);
  -- La miniatura de antes va a la cola si ya nadie la usa (el barrido vuelve a contar bajo candado antes de borrar).
  if p_miniatura_ruta is not null and v_miniatura is distinct from p_miniatura_ruta then
    perform public._encolar_para_limpiar('artes', array[v_miniatura], false);
  end if;
  return jsonb_build_object('actualizado_en', v_nueva);
end;
$$;

-- Duplicar: la copia es privada de quien duplica, del mismo origen y formato, con el documento, la miniatura y las referencias de la fuente.
-- Repetir el mismo id devuelve la misma. El nombre lo arma quien llama (`nombreDeLaCopia()`).
create function public.artes_plantilla_duplicar(p_id_nuevo uuid, p_fuente uuid, p_nombre text) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  f public.artes_plantillas; v_nombre text; v_ids uuid[]; v_version timestamptz; v_autor uuid; v_ve boolean;
begin
  perform public.assert_activo();
  if p_id_nuevo is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  v_nombre := public._artes_nombre(p_nombre);
  select p.autor_id, p.actualizado_en into v_autor, v_version from public.artes_plantillas p where p.id = p_id_nuevo;
  if found then
    if v_autor = (select auth.uid()) then
      return jsonb_build_object('id', p_id_nuevo, 'actualizado_en', v_version, 'repetido', true);
    end if;
    raise exception 'Ese identificador ya está en uso.' using errcode = '23505';
  end if;
  select * into f from public.artes_plantillas p where p.id = p_fuente;
  v_ve := found and public._artes_ve_plantilla(f.origen_id, f.visibilidad, f.autor_id);
  if not v_ve then
    raise exception 'No encontramos esa plantilla de arte.' using errcode = 'P0002';
  end if;
  v_ids := public._artes_imagenes_del_documento(f.documento);
  perform public._artes_validar_imagenes(v_ids, 'privada');
  begin
    insert into public.artes_plantillas (id, nombre, formato, ancho, alto, origen_id, visibilidad, autor_id, documento, miniatura_ruta)
    values (p_id_nuevo, v_nombre, f.formato, f.ancho, f.alto, f.origen_id, 'privada', (select auth.uid()), f.documento, f.miniatura_ruta)
    returning actualizado_en into v_version;
  exception when unique_violation then
    select p.autor_id, p.actualizado_en into v_autor, v_version from public.artes_plantillas p where p.id = p_id_nuevo;
    if v_autor = (select auth.uid()) then
      return jsonb_build_object('id', p_id_nuevo, 'actualizado_en', v_version, 'repetido', true);
    end if;
    raise exception 'Ese identificador ya está en uso.' using errcode = '23505';
  end;
  perform public._artes_poner_referencias(p_id_nuevo, v_ids);
  return jsonb_build_object('id', p_id_nuevo, 'actualizado_en', v_version);
end;
$$;

-- Hacerla de la empresa (todas sus imágenes tienen que ser de la empresa) o privada (de su autor: la plantilla por defecto de otras personas
-- que apuntaba a ella se quita). Es lo que otorga verla: sólo por esta RPC y con `artes.empresa.gestionar`.
create function public.artes_plantilla_visibilidad(p_id uuid, p_actualizado_en_esperado timestamptz, p_visibilidad text) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_origen uuid; v_visibilidad text; v_autor uuid; v_version timestamptz; v_documento jsonb; v_ve boolean; v_nueva timestamptz;
begin
  perform public.assert_permiso('artes.empresa.gestionar');
  if p_visibilidad is null or p_visibilidad not in ('privada', 'empresa') then
    raise exception 'Elige privada o de la empresa.' using errcode = '22023', hint = 'visibilidad';
  end if;
  select p.origen_id, p.visibilidad, p.autor_id into v_origen, v_visibilidad, v_autor from public.artes_plantillas p where p.id = p_id;
  v_ve := found and public._artes_ve_plantilla(v_origen, v_visibilidad, v_autor);
  if not v_ve then
    raise exception 'No encontramos esa plantilla de arte.' using errcode = 'P0002';
  end if;
  select p.origen_id, p.visibilidad, p.autor_id, p.actualizado_en, p.documento
    into v_origen, v_visibilidad, v_autor, v_version, v_documento
    from public.artes_plantillas p where p.id = p_id for no key update;
  v_ve := found and public._artes_ve_plantilla(v_origen, v_visibilidad, v_autor);
  if not v_ve then
    raise exception 'No encontramos esa plantilla de arte.' using errcode = 'P0002';
  end if;
  perform public._exigir_version(v_version, p_actualizado_en_esperado, 'Alguien cambió esta plantilla de arte mientras la mirabas.');
  if v_visibilidad = p_visibilidad then
    return jsonb_build_object('actualizado_en', v_version);
  end if;
  if p_visibilidad = 'empresa' then
    perform public._artes_validar_imagenes(public._artes_imagenes_del_documento(v_documento), 'empresa');
  else
    delete from public.artes_por_defecto d where d.plantilla_id = p_id and d.usuario_id <> v_autor;
  end if;
  update public.artes_plantillas p
     set visibilidad = p_visibilidad,
         actualizado_en = greatest(clock_timestamp(), v_version + interval '1 microsecond')
   where p.id = p_id
  returning p.actualizado_en into v_nueva;
  return jsonb_build_object('actualizado_en', v_nueva);
end;
$$;

-- Eliminar es definitivo (con confirmación en la app): la misma regla que guardar. Las referencias y las por defecto caen en cascada; la
-- miniatura se encola si ya nadie la usa.
create function public.artes_plantilla_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare v_origen uuid; v_visibilidad text; v_autor uuid; v_version timestamptz; v_miniatura text; v_ve boolean; v_edita boolean;
begin
  perform public.assert_activo();
  select p.origen_id, p.visibilidad, p.autor_id into v_origen, v_visibilidad, v_autor from public.artes_plantillas p where p.id = p_id;
  v_ve := found and public._artes_ve_plantilla(v_origen, v_visibilidad, v_autor);
  if not v_ve then
    raise exception 'No encontramos esa plantilla de arte.' using errcode = 'P0002';
  end if;
  if not public._artes_edita_plantilla(v_visibilidad, v_autor) then
    raise exception 'Sólo quien gestiona las artes de la empresa puede eliminarla.' using errcode = '42501';
  end if;
  select p.origen_id, p.visibilidad, p.autor_id, p.actualizado_en, p.miniatura_ruta
    into v_origen, v_visibilidad, v_autor, v_version, v_miniatura
    from public.artes_plantillas p where p.id = p_id for update;
  v_ve := found and public._artes_ve_plantilla(v_origen, v_visibilidad, v_autor);
  if not v_ve then
    raise exception 'No encontramos esa plantilla de arte.' using errcode = 'P0002';
  end if;
  v_edita := public._artes_edita_plantilla(v_visibilidad, v_autor);
  if not v_edita then
    raise exception 'Sólo quien gestiona las artes de la empresa puede eliminarla.' using errcode = '42501';
  end if;
  perform public._exigir_version(v_version, p_actualizado_en_esperado, 'Alguien cambió esta plantilla de arte mientras la mirabas.');
  delete from public.artes_plantillas p where p.id = p_id;
  perform public._encolar_para_limpiar('artes', array[v_miniatura], false);
  return jsonb_build_object('id', p_id, 'eliminada', true);
end;
$$;

-- La plantilla por defecto de quien llama en un origen y un tipo (imagen o PDF). `p_plantilla` nula la quita. La esperada nula dice «no
-- tenía»: si ya hay una, PT409 (nunca pisa). La plantilla tiene que verse, ser de ese origen y armar ese tipo.
create function public.artes_por_defecto_poner(
  p_origen uuid, p_tipo text, p_plantilla uuid, p_actualizado_en_esperado timestamptz
) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_actual timestamptz; v_hay boolean; v_conflicto boolean; v_origen uuid; v_visibilidad text; v_autor uuid; v_formato text;
  v_ve boolean; v_nueva timestamptz;
begin
  perform public.assert_activo();
  if p_origen is null or p_tipo is null or p_tipo not in ('imagen', 'pdf') then
    raise exception 'Elige un origen y si es para imagen o PDF.' using errcode = '22023', hint = 'tipo';
  end if;
  -- La plantilla antes que la fila de por defecto (padre antes que hija, como quien la hace privada o la elimina). `for share`: quien la hace
  -- privada a la vez espera o es esperado, y no queda una por defecto ajena apuntando a una privada.
  if p_plantilla is not null then
    select p.origen_id, p.visibilidad, p.autor_id, p.formato into v_origen, v_visibilidad, v_autor, v_formato
      from public.artes_plantillas p where p.id = p_plantilla for share;
    v_ve := found and public._artes_ve_plantilla(v_origen, v_visibilidad, v_autor);
    if not v_ve then
      raise exception 'No encontramos esa plantilla de arte.' using errcode = 'P0002';
    end if;
    if v_origen <> p_origen then
      raise exception 'Esa plantilla de arte es de otro origen.' using errcode = '22023', hint = 'plantilla';
    end if;
    if public._artes_tipo_del_formato(v_formato) <> p_tipo then
      raise exception 'Esa plantilla de arte no es para %.', case when p_tipo = 'pdf' then 'PDF' else 'imagen' end
        using errcode = '22023', hint = 'plantilla';
    end if;
  end if;
  select d.actualizado_en into v_actual from public.artes_por_defecto d
   where d.usuario_id = (select auth.uid()) and d.origen_id = p_origen and d.tipo = p_tipo for update;
  v_hay := found;
  v_conflicto := (v_hay and v_actual is distinct from p_actualizado_en_esperado) or (not v_hay and p_actualizado_en_esperado is not null);
  if v_conflicto then
    raise exception 'Tu plantilla por defecto cambió en otra pestaña.' using errcode = 'PT409';
  end if;
  if p_plantilla is null then
    delete from public.artes_por_defecto d where d.usuario_id = (select auth.uid()) and d.origen_id = p_origen and d.tipo = p_tipo;
    return jsonb_build_object('quitada', true);
  end if;
  if v_hay then
    update public.artes_por_defecto d
       set plantilla_id = p_plantilla, actualizado_en = greatest(clock_timestamp(), v_actual + interval '1 microsecond')
     where d.usuario_id = (select auth.uid()) and d.origen_id = p_origen and d.tipo = p_tipo
    returning d.actualizado_en into v_nueva;
  else
    begin
      insert into public.artes_por_defecto (usuario_id, origen_id, tipo, plantilla_id)
      values ((select auth.uid()), p_origen, p_tipo, p_plantilla)
      returning actualizado_en into v_nueva;
    exception when unique_violation then
      raise exception 'Tu plantilla por defecto cambió en otra pestaña.' using errcode = 'PT409';
    end;
  end if;
  return jsonb_build_object('actualizado_en', v_nueva);
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Biblioteca de imágenes
-- ---------------------------------------------------------------------------------------------------

-- Sumar una imagen ya subida: la personal, de quien la sube; la de la empresa, con `artes.empresa.gestionar`. Repetir el id devuelve la misma.
create function public.artes_imagen_crear(
  p_id uuid, p_nombre text, p_ruta text, p_miniatura_ruta text, p_tipo text, p_ancho integer, p_alto integer, p_ambito text
) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare v_nombre text; v_version timestamptz; v_creador uuid; v_valida boolean;
begin
  perform public.assert_activo();
  if not public.tiene_permiso('cotizaciones.ver') then
    raise exception 'Necesitas ver cotizaciones en algún origen para usar Artes.' using errcode = '42501';
  end if;
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  if p_ambito is null or p_ambito not in ('empresa', 'personal') then
    raise exception 'Elige si es personal o de la empresa.' using errcode = '22023', hint = 'ambito';
  end if;
  if p_ambito = 'empresa' and not public.tiene_permiso('artes.empresa.gestionar') then
    raise exception 'No tienes el permiso para cambiar las artes de la empresa.' using errcode = '42501';
  end if;
  v_nombre := public._artes_nombre(p_nombre);
  v_valida := p_ruta is not null and p_ruta ~ '^imagenes/[0-9a-f]{64}\.(webp|png|jpg|svg)$'
    and p_tipo is not distinct from substring(p_ruta from '\.([a-z]+)$')
    and p_miniatura_ruta is not null
    and ((p_tipo = 'svg' and p_miniatura_ruta = p_ruta)
         or (p_tipo <> 'svg' and p_miniatura_ruta ~ '^miniaturas/[0-9a-f]{64}\.(webp|png|jpg)$'));
  if not v_valida then
    raise exception 'El archivo de la imagen no es válido.' using errcode = '22023', hint = 'archivo';
  end if;
  if p_ancho is null or p_alto is null or p_ancho not between 1 and 20000 or p_alto not between 1 and 20000 then
    raise exception 'No se pudo leer cuánto mide la imagen.' using errcode = '22023', hint = 'archivo';
  end if;
  select i.creado_por, i.actualizado_en into v_creador, v_version from public.artes_imagenes i where i.id = p_id;
  if found then
    if v_creador = (select auth.uid()) then
      return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', true);
    end if;
    raise exception 'Ese identificador ya está en uso.' using errcode = '23505';
  end if;
  begin
    insert into public.artes_imagenes (id, nombre, ruta, miniatura_ruta, tipo, ancho, alto, ambito, dueno_id, creado_por)
    values (p_id, v_nombre, p_ruta, p_miniatura_ruta, p_tipo, p_ancho, p_alto, p_ambito,
            case when p_ambito = 'personal' then (select auth.uid()) end, (select auth.uid()))
    returning actualizado_en into v_version;
  exception when unique_violation then
    select i.creado_por, i.actualizado_en into v_creador, v_version from public.artes_imagenes i where i.id = p_id;
    if v_creador = (select auth.uid()) then
      return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', true);
    end if;
    raise exception 'Ese identificador ya está en uso.' using errcode = '23505';
  end;
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version);
end;
$$;

-- Cambiarle el nombre, con su versión: la personal, su dueño; la de la empresa, quien gestiona.
create function public.artes_imagen_renombrar(p_id uuid, p_actualizado_en_esperado timestamptz, p_nombre text) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare v_ambito text; v_dueno uuid; v_version timestamptz; v_actual text; v_nombre text; v_ve boolean; v_nueva timestamptz;
begin
  perform public.assert_activo();
  v_nombre := public._artes_nombre(p_nombre);
  select i.ambito, i.dueno_id into v_ambito, v_dueno from public.artes_imagenes i where i.id = p_id;
  v_ve := found and public._artes_ve_imagen(v_ambito, v_dueno);
  if not v_ve then
    raise exception 'No encontramos esa imagen.' using errcode = 'P0002';
  end if;
  if not public._artes_gestiona_imagen(v_ambito, v_dueno) then
    raise exception 'No tienes el permiso para cambiar las artes de la empresa.' using errcode = '42501';
  end if;
  select i.actualizado_en, i.nombre into v_version, v_actual from public.artes_imagenes i where i.id = p_id for no key update;
  if not found then
    raise exception 'No encontramos esa imagen.' using errcode = 'P0002';
  end if;
  perform public._exigir_version(v_version, p_actualizado_en_esperado, 'Alguien cambió esta imagen mientras la mirabas.');
  if v_actual = v_nombre then
    return jsonb_build_object('actualizado_en', v_version);
  end if;
  update public.artes_imagenes i
     set nombre = v_nombre, actualizado_en = greatest(clock_timestamp(), v_version + interval '1 microsecond')
   where i.id = p_id
  returning i.actualizado_en into v_nueva;
  return jsonb_build_object('actualizado_en', v_nueva);
end;
$$;

-- Cuántas plantillas de arte usan una imagen, con tope de 100 (101 = «100+»): todas, también las privadas de otras personas, porque es lo que
-- impide quitarla. Una imagen que quien pregunta no ve, 0.
create function public.artes_imagen_usos(p_id uuid) returns integer
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_ambito text; v_dueno uuid; v_ve boolean;
begin
  perform public.assert_activo();
  select i.ambito, i.dueno_id into v_ambito, v_dueno from public.artes_imagenes i where i.id = p_id;
  v_ve := found and public._artes_ve_imagen(v_ambito, v_dueno);
  if not v_ve then
    return 0;
  end if;
  return (select count(*) from (select 1 from public.artes_plantillas_imagenes r where r.imagen_id = p_id limit 101) t)::integer;
end;
$$;

-- Quitarla: si alguna plantilla de arte la usa, no se quita y devuelve `usos`. Si no, se borra y sus objetos se encolan si ya nadie los usa.
-- Una que ya no está (o que quien llama no ve) no es error.
create function public.artes_imagen_quitar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare v_ambito text; v_dueno uuid; v_version timestamptz; v_ruta text; v_miniatura text; v_ve boolean; v_usos integer;
begin
  perform public.assert_activo();
  select i.ambito, i.dueno_id into v_ambito, v_dueno from public.artes_imagenes i where i.id = p_id;
  v_ve := found and public._artes_ve_imagen(v_ambito, v_dueno);
  if not v_ve then
    return jsonb_build_object('quitada', true);
  end if;
  if not public._artes_gestiona_imagen(v_ambito, v_dueno) then
    raise exception 'No tienes el permiso para cambiar las artes de la empresa.' using errcode = '42501';
  end if;
  -- El candado antes de contar: quien la referencia a la vez (la FK de la tabla puente) espera o es esperado.
  select i.actualizado_en, i.ruta, i.miniatura_ruta into v_version, v_ruta, v_miniatura
    from public.artes_imagenes i where i.id = p_id for update;
  if not found then
    return jsonb_build_object('quitada', true);
  end if;
  perform public._exigir_version(v_version, p_actualizado_en_esperado, 'Alguien cambió esta imagen mientras la mirabas.');
  v_usos := (select count(*) from (select 1 from public.artes_plantillas_imagenes r where r.imagen_id = p_id limit 101) t)::integer;
  if v_usos > 0 then
    return jsonb_build_object('usos', v_usos);
  end if;
  delete from public.artes_imagenes i where i.id = p_id;
  -- El original y la miniatura (la de un SVG es la misma ruta: `_encolar_para_limpiar` la encola una vez).
  perform public._encolar_para_limpiar('artes', array[v_ruta, v_miniatura], false);
  return jsonb_build_object('quitada', true);
end;
$$;

revoke all on function public.artes_plantilla_crear(uuid, text, text, integer, integer, uuid, jsonb) from public, anon;
revoke all on function public.artes_plantilla_guardar(uuid, timestamptz, text, jsonb, text) from public, anon;
revoke all on function public.artes_plantilla_duplicar(uuid, uuid, text) from public, anon;
revoke all on function public.artes_plantilla_visibilidad(uuid, timestamptz, text) from public, anon;
revoke all on function public.artes_plantilla_eliminar(uuid, timestamptz) from public, anon;
revoke all on function public.artes_por_defecto_poner(uuid, text, uuid, timestamptz) from public, anon;
revoke all on function public.artes_imagen_crear(uuid, text, text, text, text, integer, integer, text) from public, anon;
revoke all on function public.artes_imagen_renombrar(uuid, timestamptz, text) from public, anon;
revoke all on function public.artes_imagen_usos(uuid) from public, anon;
revoke all on function public.artes_imagen_quitar(uuid, timestamptz) from public, anon;
grant execute on function public.artes_plantilla_crear(uuid, text, text, integer, integer, uuid, jsonb) to authenticated, service_role;
grant execute on function public.artes_plantilla_guardar(uuid, timestamptz, text, jsonb, text) to authenticated, service_role;
grant execute on function public.artes_plantilla_duplicar(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.artes_plantilla_visibilidad(uuid, timestamptz, text) to authenticated, service_role;
grant execute on function public.artes_plantilla_eliminar(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.artes_por_defecto_poner(uuid, text, uuid, timestamptz) to authenticated, service_role;
grant execute on function public.artes_imagen_crear(uuid, text, text, text, text, integer, integer, text) to authenticated, service_role;
grant execute on function public.artes_imagen_renombrar(uuid, timestamptz, text) to authenticated, service_role;
grant execute on function public.artes_imagen_usos(uuid) to authenticated, service_role;
grant execute on function public.artes_imagen_quitar(uuid, timestamptz) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------
-- Recuento de referencias y barrido del bucket `artes` (docs/DECISIONES.md › «El barrido del bucket `cotizaciones` tiene su rama»)
-- ---------------------------------------------------------------------------------------------------

-- `storage_refcount('artes', …)` suma las imágenes (original y miniatura; la de un SVG es la misma ruta y cuenta una vez) y las miniaturas
-- de las plantillas de arte.
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
    (select count(*) from public.ajustes_empresa e, jsonb_each_text(coalesce(e.iconos, '{}'::jsonb)) i where p_bucket = 'marca' and i.value = p_ruta) +
    (select count(*) from public.artes_imagenes where p_bucket = 'artes' and ruta = p_ruta) +
    (select count(*) from public.artes_imagenes where p_bucket = 'artes' and miniatura_ruta = p_ruta and miniatura_ruta <> ruta) +
    (select count(*) from public.artes_plantillas where p_bucket = 'artes' and miniatura_ruta = p_ruta)
  )::int;
$_$;

-- El barrido encola los objetos viejos del bucket `artes` que ninguna fila nombra (lo mismo que cuenta `storage_refcount('artes', …)`).
CREATE OR REPLACE FUNCTION "public"."storage_gc_encolar_huerfanos"("p_bucket" "text", "p_gracia" interval) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_ventana constant int := 10000;
  v_desde text;
  v_ultimo text;
  v_vistos int;
  n int;
begin
  insert into public.cola_gc_barrido (bucket) values (p_bucket) on conflict (bucket) do nothing;
  -- Una pasada a la vez por bucket: dos corridas que se cruzan no examinan la misma ventana.
  select b.ultimo_nombre into v_desde from public.cola_gc_barrido b where b.bucket = p_bucket for update;
  select count(*), max(o.name) into v_vistos, v_ultimo
    from (select o.name from storage.objects o
           where o.bucket_id = p_bucket and o.name > v_desde
           order by o.name limit v_ventana) o;
  if p_bucket = 'vehiculos' then
    insert into public.cola_gc_storage (bucket, ruta, encolado_en)
    select o.bucket_id, o.name, o.created_at
    from storage.objects o
    where o.bucket_id = 'vehiculos' and o.name > v_desde and o.name <= v_ultimo
      and o.created_at < now() - p_gracia
      and not exists (select 1 from public.vehiculos_imagenes i where i.ruta = o.name)
      and not exists (select 1 from public.vehiculos_imagenes i where i.ruta_miniatura = o.name)
      and not exists (select 1 from public.cola_gc_storage c where c.bucket = 'vehiculos' and c.ruta = o.name)
    on conflict do nothing;
  elsif p_bucket = 'cotizaciones' then
    -- Lo que cuenta `storage_refcount('cotizaciones', …)`: una tabla nueva con rutas de este bucket va aquí y allá (si falta aquí, `storage_gc_reclamar()`
    -- igual la deja al ver el refcount).
    insert into public.cola_gc_storage (bucket, ruta, encolado_en)
    select o.bucket_id, o.name, o.created_at
    from storage.objects o
    where o.bucket_id = 'cotizaciones' and o.name > v_desde and o.name <= v_ultimo
      and o.created_at < now() - p_gracia
      and not exists (select 1 from public.cotizaciones_adjuntos a where a.ruta = o.name)
      and not exists (select 1 from public.cola_gc_storage c where c.bucket = 'cotizaciones' and c.ruta = o.name)
    on conflict do nothing;
  elsif p_bucket = 'artes' then
    -- Lo que cuenta `storage_refcount('artes', …)`: las imágenes (original y miniatura) y las miniaturas de las plantillas de arte.
    insert into public.cola_gc_storage (bucket, ruta, encolado_en)
    select o.bucket_id, o.name, o.created_at
    from storage.objects o
    where o.bucket_id = 'artes' and o.name > v_desde and o.name <= v_ultimo
      and o.created_at < now() - p_gracia
      and not exists (select 1 from public.artes_imagenes i where i.ruta = o.name)
      and not exists (select 1 from public.artes_imagenes i where i.miniatura_ruta = o.name)
      and not exists (select 1 from public.artes_plantillas p where p.miniatura_ruta = o.name)
      and not exists (select 1 from public.cola_gc_storage c where c.bucket = 'artes' and c.ruta = o.name)
    on conflict do nothing;
  else
    insert into public.cola_gc_storage (bucket, ruta, encolado_en)
    select o.bucket_id, o.name, o.created_at
    from storage.objects o
    where o.bucket_id = p_bucket and o.name > v_desde and o.name <= v_ultimo
      and o.created_at < now() - p_gracia
      and public.storage_refcount(o.bucket_id, o.name) = 0
    on conflict do nothing;
  end if;
  get diagnostics n = row_count;
  -- La ventana no se llenó: se llegó al final del bucket y la próxima pasada empieza otra vuelta.
  update public.cola_gc_barrido
     set ultimo_nombre = case when v_vistos < v_ventana then '' else v_ultimo end,
         vuelta_desde = case when v_vistos < v_ventana then now() else vuelta_desde end,
         actualizado_en = now()
   where bucket = p_bucket;
  return n;
end;
$$;

-- El barrido de cada hora pasa también por el bucket `artes` (el navegador no borra: no hay policy de delete).
CREATE OR REPLACE FUNCTION "public"."storage_gc_reclamar"("p_max" integer DEFAULT 100) RETURNS TABLE("bucket" "text", "ruta" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
declare
  r record;
  v_vencido constant interval := interval '1 hour';
begin
  perform public.storage_gc_encolar_huerfanos('vehiculos', public._gracia_de_storage());
  perform public.storage_gc_encolar_huerfanos('cotizaciones', public._gracia_de_storage());
  perform public.storage_gc_encolar_huerfanos('artes', public._gracia_de_storage());
  for r in
    select c.bucket as su_bucket, c.ruta as su_ruta
    from public.cola_gc_storage c
    where c.encolado_en < now() - public._gracia_de_storage()
      and (c.reclamado_en is null or c.reclamado_en < now() - v_vencido)
    order by c.encolado_en
    limit greatest(coalesce(p_max, 0), 0)
  loop
    -- Alguien lo está referenciando ahora mismo: se deja para la próxima pasada.
    if not pg_try_advisory_xact_lock(public._candado_de_objeto(r.su_bucket, r.su_ruta)) then
      continue;
    end if;
    -- Con el candado tomado, toda referencia confirmada ya se ve, y ninguna puede nacer.
    if public.storage_refcount(r.su_bucket, r.su_ruta) > 0 then
      delete from public.cola_gc_storage c where c.bucket = r.su_bucket and c.ruta = r.su_ruta;
    else
      update public.cola_gc_storage c set reclamado_en = now()
      where c.bucket = r.su_bucket and c.ruta = r.su_ruta;
      if found then
        bucket := r.su_bucket;
        ruta := r.su_ruta;
        return next;
      end if;
    end if;
  end loop;
end;
$$;
