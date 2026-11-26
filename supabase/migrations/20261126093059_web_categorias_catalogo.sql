-- web_categorias_catalogo
-- La categoría de una pregunta frecuente deja de ser texto libre: es un elemento del catálogo `web_categorias_faqs` (nombre, orden,
-- activa y versión), con el mismo nombre normalizado que los grupos de campos (índice único sobre `_nombre_de_catalogo`). La FAQ guarda
-- `categoria_id` y la vista pública `web.faqs` sigue entregando el nombre en `categoria`: el sitio no cambia. Las categorías de las
-- guías ganan el mismo trigger de nombre y el índice único normalizado. La sección de datos (al final) crea las categorías desde los
-- textos de hoy, une las de guías repetidas y borra la columna `web_faqs.categoria`.

-- ── El catálogo de categorías de las FAQ ──────────────────────────────────────────────────────────────────────────────────────────

create table public.web_categorias_faqs (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 60),
  orden smallint not null default 0,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.web_categorias_faqs is
  'Categorías de las preguntas frecuentes de la web: nombre único normalizado y orden. Se escribe directo bajo la RLS con la versión esperada; quitar una con preguntas es web_categoria_faq_eliminar.';

create unique index web_categorias_faqs_nombre_key on public.web_categorias_faqs (public._nombre_de_catalogo(nombre));

-- Las mismas policies que `web_faqs`: leer, cualquiera con sesión; escribir, `web.contenido.gestionar`.
alter table public.web_categorias_faqs enable row level security;
revoke all on table public.web_categorias_faqs from anon, authenticated;
grant select, insert, update, delete on table public.web_categorias_faqs to authenticated;
grant all on table public.web_categorias_faqs to service_role;
create policy "web_categorias_faqs: leer" on public.web_categorias_faqs for select to authenticated using (true);
create policy "web_categorias_faqs: crear" on public.web_categorias_faqs for insert to authenticated
  with check ((select public.tiene_permiso('web.contenido.gestionar')));
create policy "web_categorias_faqs: editar" on public.web_categorias_faqs for update to authenticated
  using ((select public.tiene_permiso('web.contenido.gestionar')))
  with check ((select public.tiene_permiso('web.contenido.gestionar')));
create policy "web_categorias_faqs: borrar" on public.web_categorias_faqs for delete to authenticated
  using ((select public.tiene_permiso('web.contenido.gestionar')));

create trigger trg_actualizado_en before update on public.web_categorias_faqs
  for each row execute function public.set_actualizado_en();
create trigger trg_catalogo_nombre before insert or update of nombre on public.web_categorias_faqs
  for each row execute function public._catalogo_nombre('60');
create trigger web_revalidar after insert or delete or update on public.web_categorias_faqs
  for each statement execute function public._web_revalidar_anotar('faqs');

-- La FAQ guarda la referencia. `no action`: una categoría con preguntas no se borra (quitarla es moverlas antes, por la RPC).
alter table public.web_faqs add column categoria_id uuid references public.web_categorias_faqs (id);
create index web_faqs_categoria_idx on public.web_faqs (categoria_id);

-- ── Quitar una categoría de FAQ ───────────────────────────────────────────────────────────────────────────────────────────────────
-- Sólo sin preguntas. Con preguntas y `p_mover`, pasan primero a `p_destino` (nulo = «Sin categoría»). Candados: el de `web_faqs` antes
-- que la fila de la categoría, para que ninguna pregunta la elija mientras se quita.

create or replace function public.web_categoria_faq_eliminar(
  p_categoria uuid, p_actualizado_en_esperado timestamptz, p_mover boolean default false, p_destino uuid default null
) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare c public.web_categorias_faqs; v_n int;
begin
  perform public.assert_permiso('web.contenido.gestionar');
  lock table public.web_faqs in share row exclusive mode;
  select * into c from public.web_categorias_faqs x where x.id = p_categoria for update;
  if not found then raise exception 'Esa categoría ya no existe: recarga.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta categoría mientras la editabas.');
  -- web_faqs_categoria_idx; nunca el total exacto.
  select count(*) into v_n from (select 1 from public.web_faqs f where f.categoria_id = p_categoria limit 101) s;
  if v_n > 0 then
    if not coalesce(p_mover, false) then
      if v_n = 1 then
        raise exception 'Tiene 1 pregunta: muévela a otra categoría antes de quitarla.' using errcode = '23503', hint = 'preguntas';
      end if;
      raise exception 'Tiene % preguntas: muévelas a otra categoría antes de quitarla.',
        case when v_n > 100 then 'más de 100' else v_n::text end
        using errcode = '23503', hint = 'preguntas';
    end if;
    if p_destino is not null and (p_destino = p_categoria or not exists (
      select 1 from public.web_categorias_faqs x where x.id = p_destino and x.activa)) then
      raise exception 'Elige una categoría activa.' using errcode = '22023', hint = 'destino';
    end if;
    update public.web_faqs f set categoria_id = p_destino where f.categoria_id = p_categoria;
  end if;
  delete from public.web_categorias_faqs where id = p_categoria;
end;
$$;

revoke all on function public.web_categoria_faq_eliminar(uuid, timestamptz, boolean, uuid) from public, anon;
grant execute on function public.web_categoria_faq_eliminar(uuid, timestamptz, boolean, uuid) to authenticated, service_role;

-- ── Las categorías de las guías ───────────────────────────────────────────────────────────────────────────────────────────────────
-- Ganan el mismo trigger de nombre (sin versión: su gestión no cambia). El índice único se crea al final de la sección de datos,
-- después de unir las repetidas.

create trigger trg_catalogo_nombre before insert or update of nombre on public.web_categorias_guias
  for each row execute function public._catalogo_nombre('60');

-- ── Datos: las categorías de texto pasan al catálogo ──────────────────────────────────────────────────────────────────────────────
-- FAQ: une los textos que sólo difieren en mayúsculas, tildes o espacios; gana el más usado, si empatan el de la pregunta de menor
-- orden (la tabla no tiene fecha de alta) y después el orden binario. Las categorías se ordenan por su primera pregunta. Guías: de
-- las categorías con el mismo nombre normalizado gana la que tiene más guías (después la de menor orden y el slug binario); sus guías
-- pasan a la ganadora y cada perdedora queda inactiva y renombrada «nombre (slug)», que conserva su slug para los enlaces viejos.
-- Idempotente, sin mover versiones; la prueba (`areas/web/categorias-migracion.sql`) corre otra vez sólo esta sección.
-- datos:inicio
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'web_faqs' and column_name = 'categoria') then
    alter table public.web_faqs disable trigger trg_actualizado_en;
    -- El texto nunca tuvo tope en la base: se corta a 60 como el catálogo.
    with usos as (
      select public._nombre_de_catalogo(left(public._nombre_limpio(f.categoria), 60)) as clave,
             public._nombre_limpio(left(public._nombre_limpio(f.categoria), 60)) as nombre, count(*) as n, min(f.orden) as primero
      from public.web_faqs f
      where public._nombre_limpio(f.categoria) <> ''
      group by 1, 2
    ), ganadores as (
      select distinct on (u.clave) u.clave, u.nombre
      from usos u
      order by u.clave, u.n desc, u.primero, u.nombre collate "C"
    ), primeros as (
      select u.clave, min(u.primero) as primero from usos u group by u.clave
    )
    insert into public.web_categorias_faqs (nombre, orden)
    select g.nombre, (row_number() over (order by p.primero, g.clave collate "C") * 10)::smallint
    from ganadores g join primeros p on p.clave = g.clave
    where not exists (select 1 from public.web_categorias_faqs x where public._nombre_de_catalogo(x.nombre) = g.clave);
    update public.web_faqs f set categoria_id = c.id
    from public.web_categorias_faqs c
    where public._nombre_limpio(f.categoria) <> ''
      and public._nombre_de_catalogo(c.nombre) = public._nombre_de_catalogo(left(public._nombre_limpio(f.categoria), 60))
      and f.categoria_id is distinct from c.id;
    alter table public.web_faqs enable trigger trg_actualizado_en;
    -- La vista pública lee la columna vieja: se rehace sobre el catálogo con las mismas columnas, orden y tipos.
    create or replace view web.faqs with (security_invoker = false) as
      select f.pregunta, f.respuesta, c.nombre as categoria, f.orden
      from public.web_faqs f
      left join public.web_categorias_faqs c on c.id = f.categoria_id
      where f.publicada;
    alter table public.web_faqs drop column categoria;
  end if;

  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'web_categorias_guias_nombre_key') then
    create temp table _web_categorias_unidas on commit drop as
      select k.id, k.ganadora
      from (
        select u.id, first_value(u.id) over (partition by u.clave order by u.n desc, u.orden, u.slug collate "C") as ganadora
        from (
          select c.id, c.slug, c.orden, public._nombre_de_catalogo(c.nombre) as clave,
                 (select count(*) from (select 1 from public.web_guias g where g.categoria_id = c.id limit 1001) s) as n
          from public.web_categorias_guias c
        ) u
      ) k
      where k.id <> k.ganadora;
    -- Sólo cambia la categoría de la guía: ni su versión, ni su HTML, ni la validación de publicar.
    alter table public.web_guias disable trigger trg_actualizado_en;
    alter table public.web_guias disable trigger trg_web_guia_cuerpo;
    alter table public.web_guias disable trigger trg_web_guia_publicar_validar;
    update public.web_guias g set categoria_id = k.ganadora
    from _web_categorias_unidas k
    where g.categoria_id = k.id;
    alter table public.web_guias enable trigger trg_actualizado_en;
    alter table public.web_guias enable trigger trg_web_guia_cuerpo;
    alter table public.web_guias enable trigger trg_web_guia_publicar_validar;
    update public.web_categorias_guias c set
      activa = false,
      nombre = public._nombre_limpio(left(
        left(public._nombre_limpio(c.nombre), greatest(1, 60 - char_length(c.slug) - 3)) || ' (' || c.slug || ')', 60))
    from _web_categorias_unidas k
    where c.id = k.id;
    drop table _web_categorias_unidas;
    create unique index web_categorias_guias_nombre_key on public.web_categorias_guias (public._nombre_de_catalogo(nombre));
  end if;
end $$;
-- datos:fin

-- La vista se declara también fuera de la sección (por si la columna ya no estaba), con los mismos grants de siempre.
create or replace view web.faqs with (security_invoker = false) as
  select f.pregunta, f.respuesta, c.nombre as categoria, f.orden
  from public.web_faqs f
  left join public.web_categorias_faqs c on c.id = f.categoria_id
  where f.publicada;
grant select on table web.faqs to anon, authenticated;
