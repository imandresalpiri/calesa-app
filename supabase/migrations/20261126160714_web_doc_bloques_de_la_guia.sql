-- Los bloques de una guía que no son texto: separador, galería (1 a 12 imágenes), botón y video (sólo enlaces de YouTube o Vimeo en su forma
-- canónica). Se suman a la lista blanca de `_web_doc_html()` en el primer nivel del documento; el HTML sale sin `<iframe>` ni atributos libres.
-- Los legales no los llevan. Las imágenes de una galería cuentan en `storage_refcount('web', …)`.

create or replace function public._web_doc_galeria(p_nodo jsonb) returns text
language plpgsql immutable set search_path = '' as $$
declare
  v_attrs jsonb := p_nodo -> 'attrs';
  v_imagenes jsonb;
  v_html text;
begin
  if jsonb_typeof(v_attrs) is distinct from 'object'
     or exists (select 1 from jsonb_object_keys(v_attrs) k where k <> 'imagenes')
     or jsonb_typeof(v_attrs -> 'imagenes') is distinct from 'array' then
    raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
  end if;
  v_imagenes := v_attrs -> 'imagenes';
  if jsonb_array_length(v_imagenes) not between 1 and 12 then
    raise exception 'Una galería lleva de 1 a 12 imágenes.' using errcode = '22023', hint = 'doc';
  end if;
  select string_agg(public._web_doc_imagen(jsonb_set('{"type": "image", "attrs": null}'::jsonb, '{attrs}', e.x)), '' order by e.n)
    into v_html from jsonb_array_elements(v_imagenes) with ordinality e (x, n);
  return '<figure class="guia-galeria">' || v_html || '</figure>';
end;
$$;

create or replace function public._web_doc_boton(p_nodo jsonb) returns text
language plpgsql immutable set search_path = '' as $$
declare
  v_attrs jsonb := p_nodo -> 'attrs';
  v_texto text;
  v_href text;
begin
  if jsonb_typeof(v_attrs) is distinct from 'object'
     or exists (select 1 from jsonb_object_keys(v_attrs) k where k not in ('texto', 'href'))
     or jsonb_typeof(v_attrs -> 'texto') is distinct from 'string'
     or jsonb_typeof(v_attrs -> 'href') is distinct from 'string' then
    raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
  end if;
  v_texto := v_attrs ->> 'texto';
  v_href := v_attrs ->> 'href';
  if btrim(v_texto, E' \n\t') = '' or char_length(v_texto) > 60 then
    raise exception 'El texto del botón lleva de 1 a 60 caracteres.' using errcode = '22023', hint = 'doc';
  end if;
  if not public._seguimiento_href_valido(v_href) then
    raise exception 'Ese enlace no se admite: usa una dirección http, https, mailto o tel.' using errcode = '22023', hint = 'doc';
  end if;
  return '<a class="guia-boton" href="' || public._web_html_escapar(v_href) || '" rel="noopener noreferrer nofollow">'
    || public._web_html_escapar(v_texto) || '</a>';
end;
$$;

create or replace function public._web_doc_video(p_nodo jsonb) returns text
language plpgsql immutable set search_path = '' as $$
declare
  v_attrs jsonb := p_nodo -> 'attrs';
  v_url text;
  v_proveedor text;
begin
  if jsonb_typeof(v_attrs) is distinct from 'object'
     or exists (select 1 from jsonb_object_keys(v_attrs) k where k <> 'url')
     or jsonb_typeof(v_attrs -> 'url') is distinct from 'string' then
    raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
  end if;
  v_url := v_attrs ->> 'url';
  v_proveedor := case
    when v_url ~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$' then 'youtube'
    when v_url ~ '^https://vimeo\.com/[0-9]{1,12}$' then 'vimeo'
  end;
  if v_proveedor is null then
    raise exception 'Ese video no se admite: usa un enlace de YouTube o Vimeo.' using errcode = '22023', hint = 'doc';
  end if;
  return '<figure class="guia-video" data-video="' || v_proveedor || '"><a href="' || public._web_html_escapar(v_url)
    || '" rel="noopener noreferrer nofollow">' || public._web_html_escapar(v_url) || '</a></figure>';
end;
$$;

-- Sólo la base las ejecuta (las llama `_web_doc_nodo`): ni la app ni el sitio.
revoke all on function public._web_doc_galeria(jsonb), public._web_doc_boton(jsonb), public._web_doc_video(jsonb) from public, anon, authenticated;
grant execute on function public._web_doc_galeria(jsonb), public._web_doc_boton(jsonb), public._web_doc_video(jsonb) to service_role;

comment on function public._web_doc_galeria(jsonb) is 'El HTML de una galería de la guía (1 a 12 imágenes del bucket web). Espejo: web/entities/contenido/doc-bloques.ts.';
comment on function public._web_doc_boton(jsonb) is 'El HTML de un botón de la guía (texto de 1 a 60 y enlace seguro). Espejo: web/entities/contenido/doc-bloques.ts.';
comment on function public._web_doc_video(jsonb) is 'El HTML de un video de la guía (enlace canónico de YouTube o Vimeo, sin iframe). Espejo: web/entities/contenido/doc-bloques.ts.';


CREATE OR REPLACE FUNCTION "public"."_web_doc_nodo"("p_nodo" "jsonb", "p_padre" "text", "p_profundidad" integer) RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $_$
declare
  v_tipo text;
  v_admitido boolean;
  v_permitidas text[];
  v_hijos jsonb;
  v_hijo jsonb;
  v_partes text[] := '{}';
  v_attrs jsonb;
  v_inicio int := 1;
  v_nivel text;
  v_interior text;
begin
  if p_profundidad > 6 then
    raise exception 'El documento tiene demasiados niveles.' using errcode = '22023', hint = 'doc';
  end if;
  if jsonb_typeof(p_nodo) <> 'object' or jsonb_typeof(p_nodo -> 'type') is distinct from 'string' then
    raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
  end if;
  v_tipo := p_nodo ->> 'type';
  v_admitido := case p_padre
    when 'raiz' then v_tipo = 'doc'
    when 'doc' then v_tipo in ('paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote', 'image', 'horizontalRule', 'gallery', 'button', 'video')
    when 'blockquote' then v_tipo in ('paragraph', 'bulletList', 'orderedList')
    when 'listItem' then v_tipo in ('paragraph', 'bulletList', 'orderedList')
    when 'bulletList' then v_tipo = 'listItem'
    when 'orderedList' then v_tipo = 'listItem'
    when 'paragraph' then v_tipo in ('text', 'hardBreak')
    when 'heading' then v_tipo in ('text', 'hardBreak')
    else false end;
  if not v_admitido then
    raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
  end if;

  v_permitidas := case v_tipo
    when 'text' then array['type', 'text', 'marks']
    when 'hardBreak' then array['type', 'marks']
    when 'orderedList' then array['type', 'content', 'attrs']
    when 'heading' then array['type', 'content', 'attrs']
    when 'image' then array['type', 'attrs']
    when 'gallery' then array['type', 'attrs']
    when 'button' then array['type', 'attrs']
    when 'video' then array['type', 'attrs']
    when 'horizontalRule' then array['type']
    else array['type', 'content'] end;
  if exists (select 1 from jsonb_object_keys(p_nodo) k where not (k = any (v_permitidas))) then
    raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
  end if;

  if v_tipo = 'text' then
    if jsonb_typeof(p_nodo -> 'text') is distinct from 'string' or (p_nodo ->> 'text') = '' then
      raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
    end if;
    return public._web_doc_marcas(p_nodo -> 'marks', public._web_html_escapar(p_nodo ->> 'text'));
  end if;
  if v_tipo = 'hardBreak' then
    perform public._web_doc_marcas(p_nodo -> 'marks', '');
    return '<br>';
  end if;
  if v_tipo = 'image' then
    return public._web_doc_imagen(p_nodo);
  end if;
  if v_tipo = 'horizontalRule' then
    return '<hr>';
  end if;
  if v_tipo = 'gallery' then
    return public._web_doc_galeria(p_nodo);
  end if;
  if v_tipo = 'button' then
    return public._web_doc_boton(p_nodo);
  end if;
  if v_tipo = 'video' then
    return public._web_doc_video(p_nodo);
  end if;

  if v_tipo = 'heading' then
    v_attrs := p_nodo -> 'attrs';
    if jsonb_typeof(v_attrs) is distinct from 'object'
       or exists (select 1 from jsonb_object_keys(v_attrs) k where k <> 'level')
       or jsonb_typeof(v_attrs -> 'level') is distinct from 'number'
       or (v_attrs ->> 'level') not in ('2', '3') then
      raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
    end if;
    v_nivel := v_attrs ->> 'level';
  end if;
  if v_tipo = 'orderedList' and p_nodo ? 'attrs' then
    v_attrs := p_nodo -> 'attrs';
    if jsonb_typeof(v_attrs) <> 'object'
       or exists (select 1 from jsonb_object_keys(v_attrs) k where k <> 'start')
       or jsonb_typeof(v_attrs -> 'start') is distinct from 'number'
       or (v_attrs ->> 'start') !~ '^[0-9]{1,5}$'
       or (v_attrs ->> 'start')::int < 1 then
      raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
    end if;
    v_inicio := (v_attrs ->> 'start')::int;
  end if;

  v_hijos := p_nodo -> 'content';
  if v_hijos is null then
    if v_tipo in ('bulletList', 'orderedList', 'listItem', 'blockquote') then
      raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
    end if;
  else
    if jsonb_typeof(v_hijos) <> 'array'
       or (v_tipo in ('bulletList', 'orderedList', 'listItem', 'blockquote') and jsonb_array_length(v_hijos) = 0) then
      raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
    end if;
    for v_hijo in select x from jsonb_array_elements(v_hijos) x loop
      v_partes := v_partes || public._web_doc_nodo(v_hijo, v_tipo, p_profundidad + 1);
    end loop;
  end if;
  v_interior := array_to_string(v_partes, '');

  return case v_tipo
    when 'doc' then v_interior
    when 'paragraph' then '<p>' || v_interior || '</p>'
    when 'heading' then '<h' || v_nivel || '>' || v_interior || '</h' || v_nivel || '>'
    when 'bulletList' then '<ul>' || v_interior || '</ul>'
    when 'orderedList' then (case when v_inicio = 1 then '<ol>' else '<ol start="' || v_inicio || '">' end) || v_interior || '</ol>'
    when 'listItem' then '<li>' || v_interior || '</li>'
    when 'blockquote' then '<blockquote>' || v_interior || '</blockquote>'
  end;
end;
$_$;

CREATE OR REPLACE FUNCTION "public"."_web_doc_html"("p_doc" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $_$
declare v_html text;
begin
  if p_doc is null or p_doc = 'null'::jsonb then
    return '';
  end if;
  if octet_length(p_doc::text) > 102400 then
    raise exception 'El documento es demasiado largo.' using errcode = '22023', hint = 'doc';
  end if;
  v_html := public._web_doc_nodo(p_doc, 'raiz', 0);
  if btrim(coalesce((select string_agg(x #>> '{}', '') from jsonb_path_query(p_doc, 'strict $.**.text') x), ''), E' \n\t') = ''
     and not jsonb_path_exists(p_doc, 'lax $.content[*].type ? (@ == "image" || @ == "gallery" || @ == "video" || @ == "button")') then
    return '';
  end if;
  return v_html;
end;
$_$;

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
    (select count(*) from public.ajustes_empresa e, jsonb_each_text(coalesce(e.iconos, '{}'::jsonb)) i where p_bucket = 'marca' and i.value = p_ruta)
  )::int;
$_$;

CREATE OR REPLACE FUNCTION "public"."_web_legales_validar"("p_legales" "jsonb", "p_anterior" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $_$
declare
  k text;
  v jsonb;
  v_ant jsonb;
  v_titulo text;
  v_html text;
  v_salida jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(p_legales) is distinct from 'object' then
    raise exception 'Los legales admiten «terminos» y «privacidad».' using errcode = '22023', hint = 'legales';
  end if;
  for k, v in select e.key, e.value from jsonb_each(p_legales) e loop
    if k not in ('terminos', 'privacidad') then
      raise exception 'Los legales admiten «terminos» y «privacidad».' using errcode = '22023', hint = 'legales';
    end if;
    if jsonb_typeof(v) is distinct from 'object'
       or exists (select 1 from jsonb_object_keys(v) c where c not in ('titulo', 'doc', 'html', 'actualizado_en')) then
      raise exception 'Los legales tienen un formato que no se admite.' using errcode = '22023', hint = 'legales';
    end if;
    v_titulo := case when jsonb_typeof(v -> 'titulo') = 'string' then btrim(v ->> 'titulo') end;
    if v_titulo is null or char_length(v_titulo) not between 1 and 120 then
      raise exception 'Escribe el título de «%».', k using errcode = '22023', hint = 'legales';
    end if;
    if jsonb_typeof(v -> 'doc') is distinct from 'object' then
      raise exception 'Escribe el texto de «%».', k using errcode = '22023', hint = 'legales';
    end if;
    if jsonb_path_exists(v -> 'doc', 'lax $.content[*] ? (@.type == "image")') then
      raise exception 'Los legales no llevan imágenes.' using errcode = '22023', hint = 'legales';
    end if;
    if jsonb_path_exists(v -> 'doc', 'lax $.content[*] ? (@.type == "gallery" || @.type == "button" || @.type == "video" || @.type == "horizontalRule")') then
      raise exception 'Los legales llevan sólo texto, títulos, listas, citas y enlaces.' using errcode = '22023', hint = 'legales';
    end if;
    begin
      v_html := public._web_doc_html(v -> 'doc');
    exception when sqlstate '22023' then
      raise exception '%', sqlerrm using errcode = '22023', hint = 'legales';
    end;
    if v_html = '' then
      raise exception 'Escribe el texto de «%».', k using errcode = '22023', hint = 'legales';
    end if;
    v_ant := p_anterior -> k;
    v_salida := v_salida || jsonb_build_object(k, jsonb_build_object(
      'titulo', v_titulo, 'doc', v -> 'doc', 'html', v_html,
      'actualizado_en', case
        when v_ant ->> 'titulo' = v_titulo and v_ant -> 'doc' = v -> 'doc' and jsonb_typeof(v_ant -> 'actualizado_en') = 'string'
          then v_ant -> 'actualizado_en'
        else to_jsonb(now()) end));
  end loop;
  return v_salida;
end;
$_$;
