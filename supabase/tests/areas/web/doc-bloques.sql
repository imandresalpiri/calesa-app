-- Los bloques de una guía que no son texto en la base: separador, galería, botón y video (`_web_doc_galeria`, `_web_doc_boton`, `_web_doc_video`
-- dentro de `_web_doc_html()`). La tabla de casos completa la corre `src/modules/web/entities/contenido/doc.test.ts` contra estas mismas
-- funciones (PGlite); aquí, lo que sale por `web.guias`, lo que se rechaza, el refcount de la galería y que los legales no los llevan. No
-- depende de otro archivo (`SOLO=areas/web/doc-bloques.sql`); cada bloque abre su transacción y la revierte. Los privilegios de las funciones
-- nuevas los cubre D4 de `doc-html.sql` (enumera `_web_doc%`).
--
-- Qué asegura:
--   B1. Una guía con los cuatro bloques sale de `web.guias` (como anon) con el HTML exacto, sin `<iframe` ni `<script`.
--   B2. Un video de otro host, una galería de 13 imágenes y un botón de 61 caracteres dan 22023, hint `doc`, con su motivo.
--   B3. `storage_refcount('web', ruta)` cuenta una imagen que sólo está en una galería, suma la portada de otra guía y deja de contarla al quitarla.
--   B4. Los legales rechazan un separador, una galería, un botón y un video (22023, hint `legales`).

create or replace function pg_temp.db_error(p_doc jsonb) returns jsonb language plpgsql as $f$
declare v_m text; v_e text; v_h text;
begin
  perform public._web_doc_html(p_doc);
  return jsonb_build_object('html', 'sin error');
exception when others then
  get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
  return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', v_h);
end $f$;

create or replace function pg_temp.db_doc(p_nodo jsonb) returns jsonb language sql as $f$
  select jsonb_build_object('type', 'doc', 'content', jsonb_build_array(p_nodo));
$f$;

-- @test web doc bloques: los cuatro bloques salen por web.guias con su HTML exacto (B1)
begin;
do $$
declare
  v_doc jsonb := '{"type": "doc", "content": [
    {"type": "paragraph", "content": [{"type": "text", "text": "Hola"}]},
    {"type": "horizontalRule"},
    {"type": "gallery", "attrs": {"imagenes": [{"ruta": "g/a.webp", "alt": "Uno"}, {"ruta": "g/b.png"}]}},
    {"type": "button", "attrs": {"texto": "Cotiza <ya>", "href": "https://a.test/x?a=1&b=2"}},
    {"type": "video", "attrs": {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}}]}';
  v_html text;
begin
  -- Publicar pide web.guias.publicar (G1 de `guias-publicar.sql`); aquí sólo importa lo que sale por la vista.
  alter table public.web_guias disable trigger trg_web_guia_publicar_validar;
  insert into public.web_guias (slug, titulo, cuerpo_doc, publicada_en) values ('db-b1', 'B1', v_doc, now() - interval '1 minute');
  alter table public.web_guias enable trigger trg_web_guia_publicar_validar;
  set local role anon;
  select cuerpo_html into v_html from web.guias where slug = 'db-b1';
  reset role;
  if v_html is distinct from '<p>Hola</p><hr><figure class="guia-galeria"><img data-ruta="g/a.webp" alt="Uno"><img data-ruta="g/b.png" alt=""></figure>'
       || '<a class="guia-boton" href="https://a.test/x?a=1&amp;b=2" rel="noopener noreferrer nofollow">Cotiza &lt;ya&gt;</a>'
       || '<figure class="guia-video" data-video="youtube"><a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" rel="noopener noreferrer nofollow">https://www.youtube.com/watch?v=dQw4w9WgXcQ</a></figure>'
     or v_html ~* '<iframe|<script' then
    raise exception 'B1: web.guias trae %', v_html;
  end if;
end $$;
rollback;

-- @test web doc bloques: un video de otro host, 13 imágenes y un botón largo se rechazan con su motivo (B2)
do $$
declare
  v jsonb;
  v_trece jsonb := (select jsonb_agg(jsonb_build_object('ruta', 'g/' || i || '.webp')) from generate_series(1, 13) i);
begin
  v := pg_temp.db_error(pg_temp.db_doc('{"type": "video", "attrs": {"url": "https://youtu.be/dQw4w9WgXcQ"}}'));
  if v ->> 'error' is distinct from '22023' or v ->> 'hint' is distinct from 'doc'
     or v ->> 'mensaje' is distinct from 'Ese video no se admite: usa un enlace de YouTube o Vimeo.' then
    raise exception 'B2: el video de otro host dio %', v;
  end if;
  v := pg_temp.db_error(pg_temp.db_doc(jsonb_build_object('type', 'gallery', 'attrs', jsonb_build_object('imagenes', v_trece))));
  if v ->> 'error' is distinct from '22023' or v ->> 'hint' is distinct from 'doc'
     or v ->> 'mensaje' is distinct from 'Una galería lleva de 1 a 12 imágenes.' then
    raise exception 'B2: la galería de 13 dio %', v;
  end if;
  v := pg_temp.db_error(pg_temp.db_doc(jsonb_build_object('type', 'button', 'attrs', jsonb_build_object('texto', repeat('a', 61), 'href', 'https://a.test'))));
  if v ->> 'error' is distinct from '22023' or v ->> 'hint' is distinct from 'doc'
     or v ->> 'mensaje' is distinct from 'El texto del botón lleva de 1 a 60 caracteres.' then
    raise exception 'B2: el botón de 61 dio %', v;
  end if;
  v := pg_temp.db_error(pg_temp.db_doc(jsonb_build_object('type', 'gallery', 'attrs', jsonb_build_object('imagenes', jsonb_build_array(jsonb_build_object('ruta', 'https://otro.host/x.png'))))));
  if v ->> 'mensaje' is distinct from 'Esa imagen no se admite: súbela desde el editor.' then
    raise exception 'B2: la imagen ajena de la galería dio %', v;
  end if;
  v := pg_temp.db_error('{"type": "doc", "content": [{"type": "blockquote", "content": [{"type": "horizontalRule"}]}]}');
  if v ->> 'mensaje' is distinct from 'El documento tiene un formato que no se admite.' then
    raise exception 'B2: el separador dentro de una cita dio %', v;
  end if;
end $$;

-- @test web doc bloques: storage_refcount cuenta las imágenes de una galería (B3)
begin;
do $$
declare
  v_galeria jsonb := '{"type": "doc", "content": [{"type": "gallery", "attrs": {"imagenes": [{"ruta": "guias/b3a.webp"}, {"ruta": "guias/b3b.webp"}]}}]}';
begin
  insert into public.web_guias (slug, titulo, cuerpo_doc) values ('db-b3', 'B3', v_galeria);
  if public.storage_refcount('web', 'guias/b3a.webp') <> 1 or public.storage_refcount('web', 'guias/b3b.webp') <> 1
     or public.storage_refcount('web', 'guias/otra.webp') <> 0 or public.storage_refcount('vehiculos', 'guias/b3a.webp') <> 0 then
    raise exception 'B3: la galería dio refcount % y %', public.storage_refcount('web', 'guias/b3a.webp'), public.storage_refcount('web', 'guias/b3b.webp');
  end if;
  insert into public.web_guias (slug, titulo, portada_ruta) values ('db-b3-otra', 'B3 otra', 'guias/b3a.webp');
  if public.storage_refcount('web', 'guias/b3a.webp') <> 2 then
    raise exception 'B3: con la portada de otra guía debía contar 2, dio %', public.storage_refcount('web', 'guias/b3a.webp');
  end if;
  update public.web_guias set cuerpo_doc = '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "a"}]}]}'
   where slug = 'db-b3';
  if public.storage_refcount('web', 'guias/b3a.webp') <> 1 or public.storage_refcount('web', 'guias/b3b.webp') <> 0 then
    raise exception 'B3: quitada la galería dio % y %', public.storage_refcount('web', 'guias/b3a.webp'), public.storage_refcount('web', 'guias/b3b.webp');
  end if;
end $$;
rollback;

-- @test web doc bloques: los legales no llevan separador, galería, botón ni video (B4)
do $$
declare
  v_m text;
  v_h text;
  v_nodo jsonb;
begin
  foreach v_nodo in array array[
    '{"type": "horizontalRule"}'::jsonb,
    '{"type": "gallery", "attrs": {"imagenes": [{"ruta": "a.webp"}]}}'::jsonb,
    '{"type": "button", "attrs": {"texto": "Ir", "href": "https://a.test"}}'::jsonb,
    '{"type": "video", "attrs": {"url": "https://vimeo.com/12"}}'::jsonb] loop
    begin
      perform public._web_legales_validar(jsonb_build_object('terminos', jsonb_build_object('titulo', 'Términos', 'doc',
        jsonb_build_object('type', 'doc', 'content', jsonb_build_array(
          jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'x'))), v_nodo)))), '{}'::jsonb);
      raise exception 'B4: el legal con % no se rechazó', v_nodo ->> 'type' using errcode = 'P0001';
    exception when sqlstate '22023' then
      get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
      if v_h is distinct from 'legales' or v_m is distinct from 'Los legales llevan sólo texto, títulos, listas, citas y enlaces.' then
        raise exception 'B4: % dio % (%)', v_nodo ->> 'type', v_m, v_h;
      end if;
    end;
  end loop;
end $$;
