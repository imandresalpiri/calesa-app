-- Las categorías de las FAQ como catálogo (`web_categorias_faqs`) y el nombre único de las categorías de guías. No depende de otro
-- archivo (`SOLO=areas/web/categorias-faqs.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   W1. Con web.contenido.gestionar se crea, renombra y borra una categoría vacía escribiendo directo; sin el permiso, crear da 42501 y
--       renombrar o borrar no tocan ninguna fila. anon no lee la tabla.
--   W2. El nombre se guarda limpio y es único sin importar mayúsculas, tildes ni espacios: «Ya existe «Envíos».» (23505, hint `nombre`),
--       también al renombrar; más de 60 letras se rechaza.
--   W3. Una categoría con preguntas no se borra directo (la FK). `web_categoria_faq_eliminar`: sin mover se rechaza (23503, hint
--       `preguntas`); moviendo, las preguntas pasan al destino (o quedan sin categoría) y la categoría se va; un destino inactivo o la
--       misma se rechaza; una versión vieja da PT409; sin el permiso, 42501.
--   W4. La forma de `web.faqs` no cambia (`pregunta, respuesta, categoria, orden`, `categoria` texto con el nombre) y anon la lee; en
--       `web.guias`, `categoria` es el slug y `categoria_etiqueta` el nombre.
--   W5. Las categorías de guías tienen el mismo nombre único normalizado.

create or replace function pg_temp.wcf_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-wcf@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('wcf_' || substr(v_id::text, 1, 8), 'WCF ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): `{v: <resultado>}` o `{error, mensaje, hint}`. Un `returning`/`select` sin filas da `v` nulo.
create or replace function pg_temp.wcf_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v text; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return jsonb_build_object('v', v);
end $f$;

create or replace function pg_temp.wcf_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: se esperaba % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

-- @test web categorías de faq: con el permiso se crea, renombra y borra directo; sin él, no (W1)
begin;
do $$
declare
  v_editor uuid := pg_temp.wcf_persona(array['web.contenido.gestionar']);
  v_nadie uuid := pg_temp.wcf_persona(array[]::text[]);
  v jsonb;
  v_id uuid;
begin
  perform pg_temp.wcf_es('W1 crear sin permiso',
    pg_temp.wcf_corre(v_nadie, 'insert into public.web_categorias_faqs (nombre, orden) values (''Envíos'', 10) returning id'), '42501');
  v := pg_temp.wcf_corre(v_editor, 'insert into public.web_categorias_faqs (nombre, orden) values (''Envíos'', 10) returning id');
  v_id := (v ->> 'v')::uuid;
  if v_id is null then raise exception 'W1: con el permiso no se creó: %', v; end if;
  if (pg_temp.wcf_corre(v_nadie, format('update public.web_categorias_faqs set nombre = ''Otra'' where id = %L returning id', v_id)) ->> 'v') is not null
     or (pg_temp.wcf_corre(v_nadie, format('delete from public.web_categorias_faqs where id = %L returning id', v_id)) ->> 'v') is not null then
    raise exception 'W1: sin el permiso se escribió';
  end if;
  if (pg_temp.wcf_corre(v_nadie, 'select count(*) from public.web_categorias_faqs') ->> 'v')::int < 1 then
    raise exception 'W1: quien tiene sesión debe leer el catálogo';
  end if;
  v := pg_temp.wcf_corre(v_editor, format(
    'update public.web_categorias_faqs set nombre = ''Envíos y entregas'' where id = %L and actualizado_en = %L returning id',
    v_id, (select actualizado_en from public.web_categorias_faqs where id = v_id)));
  if v ->> 'v' is null or (select nombre from public.web_categorias_faqs where id = v_id) is distinct from 'Envíos y entregas' then
    raise exception 'W1: no se renombró: %', v;
  end if;
  if (pg_temp.wcf_corre(v_editor, format('delete from public.web_categorias_faqs where id = %L returning id', v_id)) ->> 'v') is null then
    raise exception 'W1: no se borró la categoría vacía';
  end if;
  set local role anon;
  begin
    perform 1 from public.web_categorias_faqs limit 1;
    raise exception 'W1: anon leyó el catálogo';
  exception when insufficient_privilege then
    null;
  end;
  reset role;
end $$;
rollback;

-- @test web categorías de faq: el nombre se guarda limpio y no se repite sin importar mayúsculas, tildes ni espacios (W2)
begin;
do $$
declare
  v_editor uuid := pg_temp.wcf_persona(array['web.contenido.gestionar']);
  v jsonb;
  v_otra uuid;
begin
  delete from public.web_faqs;
  delete from public.web_categorias_faqs;
  v := pg_temp.wcf_corre(v_editor, 'insert into public.web_categorias_faqs (nombre) values (''  Envíos   y  pagos '') returning nombre');
  if v ->> 'v' is distinct from 'Envíos y pagos' then raise exception 'W2: el nombre no se guardó limpio: %', v; end if;
  v := pg_temp.wcf_corre(v_editor, 'insert into public.web_categorias_faqs (nombre) values (''ENVIOS Y   PAGOS'') returning id');
  perform pg_temp.wcf_es('W2 repetida', v, '23505', 'nombre');
  if v ->> 'mensaje' is distinct from 'Ya existe «Envíos y pagos».' then raise exception 'W2: el mensaje: %', v; end if;
  insert into public.web_categorias_faqs (nombre) values ('Garantía') returning id into v_otra;
  perform pg_temp.wcf_es('W2 renombrar a una que existe',
    pg_temp.wcf_corre(v_editor, format('update public.web_categorias_faqs set nombre = ''envios y pagos'' where id = %L returning id', v_otra)),
    '23505', 'nombre');
  perform pg_temp.wcf_es('W2 largo',
    pg_temp.wcf_corre(v_editor, format('insert into public.web_categorias_faqs (nombre) values (%L) returning id', repeat('a', 61))),
    '23514', 'nombre');
  perform pg_temp.wcf_es('W2 vacío',
    pg_temp.wcf_corre(v_editor, 'insert into public.web_categorias_faqs (nombre) values (''   '') returning id'), '23514', 'nombre');
end $$;
rollback;

-- @test web categorías de faq: quitar una con preguntas las mueve antes, por la RPC (W3)
begin;
do $$
declare
  v_editor uuid := pg_temp.wcf_persona(array['web.contenido.gestionar']);
  v_nadie uuid := pg_temp.wcf_persona(array[]::text[]);
  v_a uuid; v_b uuid; v_inactiva uuid; v_version timestamptz;
begin
  delete from public.web_faqs;
  delete from public.web_categorias_faqs;
  insert into public.web_categorias_faqs (nombre, orden) values ('Envíos', 10) returning id into v_a;
  insert into public.web_categorias_faqs (nombre, orden) values ('Pagos', 20) returning id into v_b;
  insert into public.web_categorias_faqs (nombre, orden, activa) values ('Vieja', 30, false) returning id into v_inactiva;
  insert into public.web_faqs (pregunta, respuesta, categoria_id, orden) values ('¿1?', 'R', v_a, 1), ('¿2?', 'R', v_a, 2), ('¿3?', 'R', v_b, 3);
  v_version := (select actualizado_en from public.web_categorias_faqs where id = v_a);
  perform pg_temp.wcf_es('W3 borrar directo con preguntas',
    pg_temp.wcf_corre(v_editor, format('delete from public.web_categorias_faqs where id = %L returning id', v_a)), '23503');
  perform pg_temp.wcf_es('W3 sin permiso',
    pg_temp.wcf_corre(v_nadie, format('select public.web_categoria_faq_eliminar(%L, %L)', v_a, v_version)), '42501');
  perform pg_temp.wcf_es('W3 versión vieja',
    pg_temp.wcf_corre(v_editor, format('select public.web_categoria_faq_eliminar(%L, %L)', v_a, v_version - interval '1 second')), 'PT409');
  perform pg_temp.wcf_es('W3 sin mover',
    pg_temp.wcf_corre(v_editor, format('select public.web_categoria_faq_eliminar(%L, %L)', v_a, v_version)), '23503', 'preguntas');
  perform pg_temp.wcf_es('W3 destino inactivo',
    pg_temp.wcf_corre(v_editor, format('select public.web_categoria_faq_eliminar(%L, %L, true, %L)', v_a, v_version, v_inactiva)),
    '22023', 'destino');
  perform pg_temp.wcf_es('W3 destino la misma',
    pg_temp.wcf_corre(v_editor, format('select public.web_categoria_faq_eliminar(%L, %L, true, %L)', v_a, v_version, v_a)),
    '22023', 'destino');
  perform pg_temp.wcf_es('W3 mover a otra',
    pg_temp.wcf_corre(v_editor, format('select public.web_categoria_faq_eliminar(%L, %L, true, %L)', v_a, v_version, v_b)), null);
  if exists (select 1 from public.web_categorias_faqs where id = v_a) then raise exception 'W3: la categoría sigue'; end if;
  if (select count(*) from public.web_faqs where categoria_id = v_b) <> 3 then raise exception 'W3: las preguntas no pasaron al destino'; end if;
  perform pg_temp.wcf_es('W3 mover a sin categoría',
    pg_temp.wcf_corre(v_editor, format('select public.web_categoria_faq_eliminar(%L, %L, true)',
      v_b, (select actualizado_en from public.web_categorias_faqs where id = v_b))), null);
  if exists (select 1 from public.web_faqs where categoria_id is not null) then raise exception 'W3: quedaron preguntas con categoría'; end if;
  perform pg_temp.wcf_es('W3 vacía',
    pg_temp.wcf_corre(v_editor, format('select public.web_categoria_faq_eliminar(%L, %L)',
      v_inactiva, (select actualizado_en from public.web_categorias_faqs where id = v_inactiva))), null);
  if exists (select 1 from public.web_categorias_faqs) then raise exception 'W3: no se quitó la vacía'; end if;
end $$;
rollback;

-- @test web categorías de faq: web.faqs y web.guias conservan su forma (W4)
begin;
do $$
begin
  if (select array_agg(column_name::text || ':' || data_type order by ordinal_position) from information_schema.columns
      where table_schema = 'web' and table_name = 'faqs')
     <> array['pregunta:text', 'respuesta:text', 'categoria:text', 'orden:smallint'] then
    raise exception 'W4: la forma de web.faqs: %', (select array_agg(column_name::text || ':' || data_type order by ordinal_position)
      from information_schema.columns where table_schema = 'web' and table_name = 'faqs');
  end if;
  delete from public.web_faqs;
  insert into public.web_categorias_faqs (nombre) values ('Envíos');
  insert into public.web_faqs (pregunta, respuesta, categoria_id, publicada)
  values ('¿W4?', 'R', (select id from public.web_categorias_faqs where nombre = 'Envíos'), true);
  insert into public.web_categorias_guias (slug, nombre) values ('wcf-envios', 'Envíos');
  -- Publicar pide `web.guias.publicar` a quien escribe; aquí sólo importa la forma de la vista.
  alter table public.web_guias disable trigger trg_web_guia_publicar_validar;
  insert into public.web_guias (titulo, slug, categoria_id, publicada_en)
  values ('WCF', 'wcf-guia', (select id from public.web_categorias_guias where slug = 'wcf-envios'), now() - interval '1 minute');
  set local role anon;
  if (select categoria from web.faqs where pregunta = '¿W4?') is distinct from 'Envíos' then
    raise exception 'W4: anon no lee el nombre de la categoría en web.faqs';
  end if;
  if (select jsonb_build_array(categoria, categoria_etiqueta) from web.guias where slug = 'wcf-guia')
     is distinct from jsonb_build_array('wcf-envios', 'Envíos') then
    raise exception 'W4: web.guias: %', (select jsonb_build_array(categoria, categoria_etiqueta) from web.guias where slug = 'wcf-guia');
  end if;
  reset role;
end $$;
rollback;

-- @test web categorías de guías: el nombre es único sin importar mayúsculas, tildes ni espacios (W5)
begin;
do $$
declare
  v_editor uuid := pg_temp.wcf_persona(array['web.contenido.gestionar']);
  v jsonb;
begin
  insert into public.web_categorias_guias (slug, nombre) values ('wcf-envios', 'Envíos');
  v := pg_temp.wcf_corre(v_editor, 'insert into public.web_categorias_guias (slug, nombre) values (''wcf-envios-2'', '' envios '') returning id');
  perform pg_temp.wcf_es('W5 repetida', v, '23505', 'nombre');
  if v ->> 'mensaje' is distinct from 'Ya existe «Envíos».' then raise exception 'W5: el mensaje: %', v; end if;
  v := pg_temp.wcf_corre(v_editor, 'insert into public.web_categorias_guias (slug, nombre) values (''wcf-pagos'', '' Pagos  y cuotas '') returning nombre');
  if v ->> 'v' is distinct from 'Pagos y cuotas' then raise exception 'W5: el nombre no se guardó limpio: %', v; end if;
end $$;
rollback;
