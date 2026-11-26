-- Migración de datos: se borra al aplastar (`pnpm db:aplastar`), con su entrada en `DATOS_DE_PRUEBA` de `scripts/probar-schema.mjs`.
-- Las categorías de texto de las FAQ pasan al catálogo y las categorías de guías repetidas se unen. La prueba devuelve la columna
-- `web_faqs.categoria` de antes (o quita el índice único de las guías), siembra y ejecuta otra vez la sección de datos de la migración
-- (`_migracion_de_categorias`, la que empieza con `-- web_categorias_catalogo`: lo que va entre `-- datos:inicio` y `-- datos:fin`).
-- No depende de otro archivo (`SOLO=areas/web/categorias-migracion.sql`).
--
-- Qué asegura:
--   C1. FAQ: los textos que sólo difieren en mayúsculas, tildes o espacios quedan en una categoría: gana el más usado; si empatan, el de
--       la pregunta de menor orden. Se ordenan por su primera pregunta; un texto vacío o nulo queda sin categoría; uno de más de 60
--       letras se corta; la columna se va y `web.faqs` entrega el nombre.
--   C2. Idempotente: con la columna de vuelta y los mismos textos, no crea categorías ni reescribe preguntas (ni un `ctid` nuevo).
--   C3. No mueve la versión de las preguntas.
--   C4. Guías: de las repetidas gana la de más guías (si empatan, la de menor orden); sus guías pasan a ella sin mover su versión, cada
--       perdedora queda inactiva y renombrada «nombre (slug)», y el índice único vuelve.

create or replace function pg_temp.wcm_migrar() returns void language plpgsql as $f$
begin
  execute (select substring(doc #>> '{}' from '-- datos:inicio(.*)-- datos:fin') from _migracion_de_categorias);
end $f$;

-- La forma de antes de las FAQ: la columna `categoria` con el nombre de su categoría y ninguna categoría en el catálogo.
create or replace function pg_temp.wcm_volver_atras() returns void language plpgsql as $f$
begin
  alter table public.web_faqs add column categoria text;
  update public.web_faqs f set categoria = c.nombre from public.web_categorias_faqs c where c.id = f.categoria_id;
  update public.web_faqs set categoria_id = null where categoria_id is not null;
  delete from public.web_categorias_faqs;
end $f$;

-- «envíos» (dos veces, una con espacios de más) le gana a «Envíos» (una, de menor orden); «Pagos» y «pagos» empatan y gana el de menor
-- orden; uno vacío, uno nulo y uno largo.
create or replace function pg_temp.wcm_sembrar_faqs() returns void language plpgsql as $f$
begin
  delete from public.web_faqs;
  insert into public.web_faqs (pregunta, respuesta, publicada, orden, categoria) values
    ('wcm 1', 'R', true, 1, 'Envíos'),
    ('wcm 2', 'R', true, 5, 'envíos'),
    ('wcm 3', 'R', false, 6, ' envíos  '),
    ('wcm 4', 'R', true, 10, 'Pagos'),
    ('wcm 5', 'R', true, 3, 'pagos'),
    ('wcm 6', 'R', true, 20, '   '),
    ('wcm 7', 'R', true, 21, null),
    ('wcm 8', 'R', true, 30, repeat('x', 70));
end $f$;

create or replace function pg_temp.wcm_categoria_de(p_pregunta text) returns text language sql as $f$
  select c.nombre from public.web_faqs f join public.web_categorias_faqs c on c.id = f.categoria_id where f.pregunta = p_pregunta
$f$;

-- @test categorías migradas: las de FAQ se unen por la clave, gana la más usada y se ordenan por su primera pregunta (C1)
begin;
do $$
begin
  perform pg_temp.wcm_volver_atras();
  perform pg_temp.wcm_sembrar_faqs();
  perform pg_temp.wcm_migrar();
  if pg_temp.wcm_categoria_de('wcm 1') is distinct from 'envíos' or pg_temp.wcm_categoria_de('wcm 2') is distinct from 'envíos'
     or pg_temp.wcm_categoria_de('wcm 3') is distinct from 'envíos' then
    raise exception 'C1: la más usada: % / % / %', pg_temp.wcm_categoria_de('wcm 1'), pg_temp.wcm_categoria_de('wcm 2'),
      pg_temp.wcm_categoria_de('wcm 3');
  end if;
  if pg_temp.wcm_categoria_de('wcm 4') is distinct from 'pagos' or pg_temp.wcm_categoria_de('wcm 5') is distinct from 'pagos' then
    raise exception 'C1: el empate lo gana la de menor orden: % / %', pg_temp.wcm_categoria_de('wcm 4'), pg_temp.wcm_categoria_de('wcm 5');
  end if;
  if (select array_agg(nombre order by orden) from public.web_categorias_faqs) <> array['envíos', 'pagos', repeat('x', 60)] then
    raise exception 'C1: las categorías y su orden: %', (select array_agg(nombre order by orden) from public.web_categorias_faqs);
  end if;
  if exists (select 1 from public.web_categorias_faqs where orden % 10 <> 0) then raise exception 'C1: el orden no va de 10 en 10'; end if;
  if exists (select 1 from public.web_faqs where pregunta in ('wcm 6', 'wcm 7') and categoria_id is not null) then
    raise exception 'C1: un texto vacío o nulo quedó con categoría';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'web_faqs' and column_name = 'categoria') then
    raise exception 'C1: la columna de antes sigue';
  end if;
  if (select categoria from web.faqs where pregunta = 'wcm 4') is distinct from 'pagos'
     or (select categoria from web.faqs where pregunta = 'wcm 6') is not null then
    raise exception 'C1: web.faqs no entrega el nombre de la categoría';
  end if;
end $$;
rollback;

-- @test categorías migradas: correrla otra vez no crea categorías ni reescribe preguntas (C2)
begin;
do $$
declare antes jsonb; despues jsonb;
begin
  perform pg_temp.wcm_volver_atras();
  perform pg_temp.wcm_sembrar_faqs();
  perform pg_temp.wcm_migrar();
  alter table public.web_faqs add column categoria text;
  update public.web_faqs f set categoria = s.categoria from (values ('wcm 1', 'Envíos'), ('wcm 2', 'envíos'), ('wcm 3', ' envíos  '),
    ('wcm 4', 'Pagos'), ('wcm 5', 'pagos'), ('wcm 6', '   '), ('wcm 8', repeat('x', 70))) s (pregunta, categoria)
  where f.pregunta = s.pregunta;
  select jsonb_build_object(
           'faqs', (select jsonb_agg(jsonb_build_array(ctid::text, categoria_id, actualizado_en) order by id) from public.web_faqs),
           'categorias', (select jsonb_agg(jsonb_build_array(ctid::text, nombre, orden) order by id) from public.web_categorias_faqs))
    into antes;
  perform pg_temp.wcm_migrar();
  select jsonb_build_object(
           'faqs', (select jsonb_agg(jsonb_build_array(ctid::text, categoria_id, actualizado_en) order by id) from public.web_faqs),
           'categorias', (select jsonb_agg(jsonb_build_array(ctid::text, nombre, orden) order by id) from public.web_categorias_faqs))
    into despues;
  if antes is distinct from despues then raise exception 'C2: la segunda corrida cambió algo'; end if;
end $$;
rollback;

-- @test categorías migradas: no mueve la versión de las preguntas (C3)
begin;
do $$
declare antes jsonb;
begin
  perform pg_temp.wcm_volver_atras();
  perform pg_temp.wcm_sembrar_faqs();
  antes := (select jsonb_object_agg(id, actualizado_en) from public.web_faqs);
  perform pg_temp.wcm_migrar();
  if antes is distinct from (select jsonb_object_agg(id, actualizado_en) from public.web_faqs) then
    raise exception 'C3: movió la versión de una pregunta';
  end if;
  if (select count(*) from public.web_faqs where categoria_id is not null) <> 6 then
    raise exception 'C3: no migró las preguntas sembradas';
  end if;
end $$;
rollback;

-- @test categorías migradas: las de guías repetidas se unen en la de más guías y las demás quedan inactivas con su slug (C4)
begin;
do $$
declare antes jsonb;
begin
  drop index public.web_categorias_guias_nombre_key;
  drop trigger trg_catalogo_nombre on public.web_categorias_guias;
  insert into public.web_categorias_guias (slug, nombre, orden) values
    ('wcm-envios-a', 'Envíos', 1), ('wcm-envios-b', 'envios', 2), ('wcm-envios-c', ' ENVIOS ', 0),
    ('wcm-pagos-a', 'Pagos', 5), ('wcm-pagos-b', 'pagos', 3);
  insert into public.web_guias (titulo, slug, categoria_id)
  select 'WCM ' || s.slug, s.slug, (select id from public.web_categorias_guias where slug = s.categoria)
  from (values ('wcm-guia-1', 'wcm-envios-a'), ('wcm-guia-2', 'wcm-envios-b'), ('wcm-guia-3', 'wcm-envios-b')) s (slug, categoria);
  antes := (select jsonb_object_agg(id, actualizado_en) from public.web_guias where slug like 'wcm-%');
  perform pg_temp.wcm_migrar();
  if exists (select 1 from public.web_guias g join public.web_categorias_guias c on c.id = g.categoria_id
             where g.slug like 'wcm-guia-%' and c.slug <> 'wcm-envios-b') then
    raise exception 'C4: una guía no pasó a la ganadora: %', (select jsonb_agg(jsonb_build_array(g.slug, c.slug))
      from public.web_guias g join public.web_categorias_guias c on c.id = g.categoria_id where g.slug like 'wcm-guia-%');
  end if;
  if antes is distinct from (select jsonb_object_agg(id, actualizado_en) from public.web_guias where slug like 'wcm-%') then
    raise exception 'C4: movió la versión de una guía';
  end if;
  if (select jsonb_object_agg(slug, jsonb_build_array(nombre, activa)) from public.web_categorias_guias where slug like 'wcm-%')
     is distinct from jsonb_build_object(
       'wcm-envios-a', jsonb_build_array('Envíos (wcm-envios-a)', false),
       'wcm-envios-b', jsonb_build_array('envios', true),
       'wcm-envios-c', jsonb_build_array('ENVIOS (wcm-envios-c)', false),
       'wcm-pagos-a', jsonb_build_array('Pagos (wcm-pagos-a)', false),
       'wcm-pagos-b', jsonb_build_array('pagos', true)) then
    raise exception 'C4: las categorías quedaron %', (select jsonb_object_agg(slug, jsonb_build_array(nombre, activa))
      from public.web_categorias_guias where slug like 'wcm-%');
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'web_categorias_guias_nombre_key') then
    raise exception 'C4: el índice único no volvió';
  end if;
end $$;
rollback;
