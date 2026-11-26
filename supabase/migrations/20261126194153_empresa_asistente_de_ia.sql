-- El asistente de IA (docs/GLOSARIO.md › Asistente de IA): la integración `asistente_ia`, una IA compatible con la API de OpenAI que redacta
-- los textos de compartir. Lo no secreto (proveedor, dirección, modelo, prompt base y atajos) va en `integraciones.config`; la clave, en Vault
-- (`integracion:asistente_ia`), y de ella la app sólo sabe cuándo se guardó y sus últimos 4 caracteres (`config.clave_termina_en`, escritos
-- sólo por `integracion_guardar_secreto`). Los usos se cuentan por persona y mes en `asistente_ia_usos`, escrita sólo por
-- `asistente_ia_contar_uso()`.

-- 1. La fila de la integración, apagada y con lo de fábrica. Los ids de los atajos son fijos: los mismos que `ATAJOS_POR_DEFECTO`
--    (`src/modules/empresa/entities/asistente-ia/config.ts`).
insert into public.integraciones (clave, activa, config)
values (
  'asistente_ia',
  false,
  jsonb_build_object(
    'preajuste', 'deepseek',
    'url_base', 'https://api.deepseek.com',
    'modelo', 'deepseek-chat',
    'prompt_base', 'Escribe de tú, con un tono cercano y profesional. Usa sólo los datos del texto: no inventes precios, fechas ni plazos.',
    'atajos', jsonb_build_array(
      jsonb_build_object(
        'id', 'a5157e00-0000-4000-8000-000000000001',
        'nombre', 'Para WhatsApp',
        'instruccion', 'Mensaje en primera persona para iniciar un chat con un cliente. No es un anuncio: cercano y breve. Cierra invitando a responder y firma con el nombre de quien comparte.',
        'activo', true,
        'max_tokens', 260
      ),
      jsonb_build_object(
        'id', 'a5157e00-0000-4000-8000-000000000002',
        'nombre', 'Para Facebook',
        'instruccion', 'Anuncio largo, emocional y premium. Gancho fuerte, beneficios en viñetas con emojis, la fecha de subasta si la hay y una invitación a escribir. No menciones el lote.',
        'activo', true,
        'max_tokens', 650
      ),
      jsonb_build_object(
        'id', 'a5157e00-0000-4000-8000-000000000003',
        'nombre', 'Para TikTok',
        'instruccion', 'Gancho fuerte, texto corto y dinámico. Cierra con 4 a 6 hashtags del vehículo y de la importación de vehículos en el país de la empresa. No menciones el lote.',
        'activo', true,
        'max_tokens', 220
      ),
      jsonb_build_object(
        'id', 'a5157e00-0000-4000-8000-000000000004',
        'nombre', 'Más corto',
        'instruccion', 'Hazlo más corto: conserva lo esencial y todos los datos.',
        'activo', true,
        'max_tokens', 300
      ),
      jsonb_build_object(
        'id', 'a5157e00-0000-4000-8000-000000000005',
        'nombre', 'Más formal',
        'instruccion', 'Hazlo más formal y profesional, sin emojis.',
        'activo', true,
        'max_tokens', 700
      )
    ),
    'clave_termina_en', null
  )
)
on conflict (clave) do nothing;

-- 2. Lo que se guarda del asistente desde «Configurar…» (proveedor) o «Prompt base y atajos» (indicaciones): cada grupo entero si viene, validado
--    campo por campo con su `hint`, sobre lo guardado. `clave_termina_en` no se acepta del navegador: queda lo guardado. Espejo de
--    `esquemaGuardarAsistente` y `esquemaGuardarIndicaciones` (`src/modules/empresa/features/integraciones/schemas/integraciones.ts`) y de los topes
--    de `entities/asistente-ia/config.ts`.
create function public._asistente_ia_config(p_guardada jsonb, p_nueva jsonb) returns jsonb
  language plpgsql stable
  set search_path = ''
as $$
declare
  v_resultado jsonb := coalesce(p_guardada, '{}'::jsonb);
  v_proveedor boolean := p_nueva ?| array['preajuste', 'url_base', 'modelo'];
  v_indicaciones boolean := p_nueva ?| array['prompt_base', 'atajos'];
  v_uuid constant text := '^[0123456789abcdef]{8}-[0123456789abcdef]{4}-[0123456789abcdef]{4}-[0123456789abcdef]{4}-[0123456789abcdef]{12}$';
  v_url text;
  v_modelo text;
  v_prompt text;
  v_atajo jsonb;
  v_id text;
  v_nombre text;
  v_instruccion text;
  v_tokens text;
  v_ids text[] := array[]::text[];
  v_nombres text[] := array[]::text[];
  v_atajos jsonb := '[]'::jsonb;
begin
  if exists (
    select 1 from jsonb_object_keys(p_nueva) k
    where k not in ('preajuste', 'url_base', 'modelo', 'prompt_base', 'atajos', 'clave_termina_en')
  ) then
    raise exception 'La configuración no tiene la forma esperada.' using errcode = '22023';
  end if;

  if v_proveedor then
    if not (p_nueva ?& array['preajuste', 'url_base', 'modelo']) then
      raise exception 'El proveedor se guarda entero: el proveedor, la dirección y el modelo.' using errcode = '22023', hint = 'url_base';
    end if;
    if coalesce(p_nueva ->> 'preajuste', '') not in ('deepseek', 'otro') then
      raise exception 'Elige un proveedor.' using errcode = '22023', hint = 'preajuste';
    end if;
    if jsonb_typeof(p_nueva -> 'url_base') is distinct from 'string' then
      raise exception 'La dirección tiene que empezar con https://.' using errcode = '22023', hint = 'url_base';
    end if;
    v_url := btrim(p_nueva ->> 'url_base');
    if char_length(v_url) > 2000 then
      raise exception 'La dirección es demasiado larga.' using errcode = '22023', hint = 'url_base';
    end if;
    if v_url !~* '^https://[a-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]]*)?$'
       and v_url !~* '^http://(localhost|127\.0\.0\.1)(:[0-9]{1,5})?(/[^[:space:]]*)?$' then
      raise exception 'La dirección tiene que empezar con https://.' using errcode = '22023', hint = 'url_base';
    end if;
    if jsonb_typeof(p_nueva -> 'modelo') is distinct from 'string' then
      raise exception 'Escribe el modelo.' using errcode = '22023', hint = 'modelo';
    end if;
    v_modelo := p_nueva ->> 'modelo';
    if char_length(v_modelo) not between 1 and 100 or v_modelo ~ '[[:space:]]' then
      raise exception 'El modelo va sin espacios y hasta 100 caracteres.' using errcode = '22023', hint = 'modelo';
    end if;
    v_resultado := v_resultado || jsonb_build_object('preajuste', p_nueva ->> 'preajuste', 'url_base', v_url, 'modelo', v_modelo);
  end if;

  if v_indicaciones then
    if not (p_nueva ?& array['prompt_base', 'atajos']) then
      raise exception 'El prompt base y los atajos se guardan juntos.' using errcode = '22023', hint = 'atajos';
    end if;
    if jsonb_typeof(p_nueva -> 'prompt_base') is distinct from 'string' then
      raise exception 'El prompt base no tiene la forma esperada.' using errcode = '22023', hint = 'prompt_base';
    end if;
    v_prompt := btrim(p_nueva ->> 'prompt_base');
    if char_length(v_prompt) > 4000 then
      raise exception 'El prompt base no puede pasar de 4.000 caracteres.' using errcode = '22023', hint = 'prompt_base';
    end if;
    if jsonb_typeof(p_nueva -> 'atajos') is distinct from 'array' then
      raise exception 'Los atajos no tienen la forma esperada.' using errcode = '22023', hint = 'atajos';
    end if;
    if jsonb_array_length(p_nueva -> 'atajos') > 20 then
      raise exception 'Puede haber hasta 20 atajos.' using errcode = '22023', hint = 'atajos';
    end if;
    for v_atajo in select e.value from jsonb_array_elements(p_nueva -> 'atajos') e loop
      if jsonb_typeof(v_atajo) is distinct from 'object'
         or jsonb_typeof(v_atajo -> 'id') is distinct from 'string'
         or jsonb_typeof(v_atajo -> 'nombre') is distinct from 'string'
         or jsonb_typeof(v_atajo -> 'instruccion') is distinct from 'string'
         or jsonb_typeof(v_atajo -> 'activo') is distinct from 'boolean'
         or jsonb_typeof(v_atajo -> 'max_tokens') is distinct from 'number' then
        raise exception 'Un atajo no tiene la forma esperada.' using errcode = '22023', hint = 'atajos';
      end if;
      v_id := lower(v_atajo ->> 'id');
      if v_id !~ v_uuid or v_id = any (v_ids) then
        raise exception 'Un atajo no tiene la forma esperada.' using errcode = '22023', hint = 'atajos';
      end if;
      v_nombre := btrim(v_atajo ->> 'nombre');
      if char_length(v_nombre) not between 1 and 40 then
        raise exception 'Cada atajo lleva un nombre de hasta 40 caracteres.' using errcode = '22023', hint = 'atajos';
      end if;
      if lower(v_nombre) = any (v_nombres) then
        raise exception 'Ya hay un atajo con ese nombre.' using errcode = '22023', hint = 'atajos';
      end if;
      v_instruccion := btrim(v_atajo ->> 'instruccion');
      if char_length(v_instruccion) not between 1 and 500 then
        raise exception 'Cada atajo lleva una instrucción de hasta 500 caracteres.' using errcode = '22023', hint = 'atajos';
      end if;
      v_tokens := v_atajo ->> 'max_tokens';
      if v_tokens !~ '^[0123456789]{1,4}$' or v_tokens::integer not between 16 and 2000 then
        raise exception 'Un atajo no tiene la forma esperada.' using errcode = '22023', hint = 'atajos';
      end if;
      v_ids := v_ids || v_id;
      v_nombres := v_nombres || lower(v_nombre);
      v_atajos := v_atajos || jsonb_build_array(jsonb_build_object(
        'id', v_id,
        'nombre', v_nombre,
        'instruccion', v_instruccion,
        'activo', (v_atajo -> 'activo')::boolean,
        'max_tokens', v_tokens::integer
      ));
    end loop;
    v_resultado := v_resultado || jsonb_build_object('prompt_base', v_prompt, 'atajos', v_atajos);
  end if;

  return (v_resultado - 'clave_termina_en')
    || jsonb_build_object('clave_termina_en', coalesce(p_guardada -> 'clave_termina_en', 'null'::jsonb));
end;
$$;

revoke all on function public._asistente_ia_config(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public._asistente_ia_config(jsonb, jsonb) to service_role;

-- El origen (esquema, host y puerto) de una dirección ya validada: a él viaja la clave. Espejo de `origenDeLaDireccion()`
-- (`entities/asistente-ia/config.ts`).
create function public._asistente_ia_origen(p_url text) returns text
  language sql immutable
  set search_path = ''
as $$ select lower(substring(btrim(coalesce(p_url, '')) from '^[A-Za-z]+://[^/]+')) $$;

revoke all on function public._asistente_ia_origen(text) from public, anon, authenticated;
grant execute on function public._asistente_ia_origen(text) to service_role;

-- 3. `integracion_guardar`: las ramas de apibara y de la web pública quedan como estaban. La del asistente valida con `_asistente_ia_config()`; si
--    la dirección cambia de origen con una clave guardada, la clave se borra de Vault y el asistente se apaga (quien gestiona no puede llevar la
--    clave guardada a su propio servidor sin haberla leído). El asistente no se activa sin clave.
create or replace function public.integracion_guardar(p_clave text, p_actualizado_en_esperado timestamp with time zone, p_activa boolean default null::boolean, p_config jsonb default null::jsonb)
  returns timestamp with time zone
  language plpgsql security definer
  set search_path = ''
as $_$
declare
  v public.integraciones;
  v_nueva timestamptz;
  v_config jsonb := p_config;
  v_url text;
  v_activa boolean;
  v_secreto_guardado_en timestamptz;
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  select * into v from public.integraciones i where i.clave = p_clave for update;
  if not found then
    raise exception 'Esa integración no existe.';
  end if;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta integración mientras la editabas.');
  if p_config is not null and jsonb_typeof(p_config) <> 'object' then
    raise exception 'La configuración no tiene la forma esperada.';
  end if;
  if v.clave = 'apibara' and p_config is not null
     and coalesce(p_config ->> 'endpoint', '') !~ '^https://([a-z0-9-]+\.)*apibara\.tech(:[0-9]+)?(/[^[:space:]]*)?$' then
    raise exception 'La dirección de apibara tiene que empezar con https:// y ser de apibara.tech.';
  end if;
  if v.clave = 'web_publica' and p_config is not null then
    v_url := nullif(btrim(coalesce(p_config ->> 'revalidar_url', '')), '');
    if v_url is not null and length(v_url) > 2000 then
      raise exception 'La dirección es demasiado larga.' using errcode = '22023', hint = 'revalidar_url';
    end if;
    if v_url is not null
       and v_url !~* '^https://[a-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]]*)?$'
       and v_url !~* '^http://(localhost|127\.0\.0\.1)(:[0-9]{1,5})?(/[^[:space:]]*)?$' then
      raise exception 'La dirección de revalidación tiene que empezar con https://.' using errcode = '22023', hint = 'revalidar_url';
    end if;
    v_config := jsonb_build_object('revalidar_url', v_url);
  end if;
  v_activa := coalesce(p_activa, v.activa);
  v_secreto_guardado_en := v.secreto_guardado_en;
  if v.clave = 'asistente_ia' and p_config is not null then
    v_config := public._asistente_ia_config(v.config, p_config);
    if v.secreto_guardado_en is not null
       and public._asistente_ia_origen(v_config ->> 'url_base') is distinct from public._asistente_ia_origen(v.config ->> 'url_base') then
      delete from vault.secrets s where s.name = 'integracion:asistente_ia';
      v_secreto_guardado_en := null;
      v_config := jsonb_set(v_config, '{clave_termina_en}', 'null'::jsonb);
      v_activa := coalesce(p_activa, false);
    end if;
  end if;
  if coalesce(p_activa, v.activa) and v.clave = 'apibara' and v.secreto_guardado_en is null then
    raise exception 'Guarda la clave de apibara antes de activarla.';
  end if;
  if v_activa and v.clave = 'asistente_ia' and v_secreto_guardado_en is null then
    raise exception 'Carga la clave del asistente antes de activarlo.' using errcode = '22023', hint = 'activa';
  end if;
  update public.integraciones i set
    activa = v_activa,
    config = coalesce(v_config, i.config),
    secreto_guardado_en = v_secreto_guardado_en,
    actualizado_por = (select auth.uid())
  where i.clave = v.clave
  returning i.actualizado_en into v_nueva;
  return v_nueva;
end;
$_$;

revoke all on function public.integracion_guardar(text, timestamp with time zone, boolean, jsonb) from public, anon;
grant execute on function public.integracion_guardar(text, timestamp with time zone, boolean, jsonb) to authenticated, service_role;

-- 4. `integracion_guardar_secreto`: igual que antes y, sólo para el asistente, guarda en el mismo `update` los últimos 4 caracteres de la clave
--    (lo único que la tarjeta dice de ella además de cuándo se guardó).
create or replace function public.integracion_guardar_secreto(p_clave text, p_secreto text, p_actualizado_en_esperado timestamp with time zone)
  returns timestamp with time zone
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v public.integraciones;
  v_nombre text := 'integracion:' || p_clave;
  v_secreto text := btrim(coalesce(p_secreto, ''));
  v_id uuid;
  v_nueva timestamptz;
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  select * into v from public.integraciones i where i.clave = p_clave for update;
  if not found then
    raise exception 'Esa integración no existe.';
  end if;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta integración mientras la editabas.');
  if length(v_secreto) < 8 or length(v_secreto) > 500 then
    raise exception 'La clave tiene que tener entre 8 y 500 caracteres.';
  end if;
  select s.id into v_id from vault.secrets s where s.name = v_nombre;
  if v_id is null then
    perform vault.create_secret(new_secret => v_secreto, new_name => v_nombre, new_description => 'Secreto de la integración ' || p_clave);
  else
    perform vault.update_secret(secret_id => v_id, new_secret => v_secreto);
  end if;
  update public.integraciones i set
    secreto_guardado_en = now(),
    config = case
      when i.clave = 'asistente_ia' then jsonb_set(i.config, '{clave_termina_en}', to_jsonb(right(v_secreto, 4)))
      else i.config
    end,
    actualizado_por = (select auth.uid())
  where i.clave = v.clave
  returning i.actualizado_en into v_nueva;
  return v_nueva;
end;
$$;

revoke all on function public.integracion_guardar_secreto(text, text, timestamp with time zone) from public, anon;
grant execute on function public.integracion_guardar_secreto(text, text, timestamp with time zone) to authenticated, service_role;

-- 5. Los usos del asistente (docs/GLOSARIO.md › Usos del asistente): uno por cada pedido al que el proveedor respondió (un 2xx), por persona y mes
--    de la zona de la empresa. Sin tope de uso. Se escribe sólo por `asistente_ia_contar_uso()`; cada persona lee la suya y quien gestiona la
--    empresa, las de todos.
create table public.asistente_ia_usos (
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  mes date not null constraint asistente_ia_usos_mes_primer_dia check (extract(day from mes) = 1),
  usos integer not null constraint asistente_ia_usos_positivos check (usos > 0),
  actualizado_en timestamptz not null default now(),
  primary key (usuario_id, mes)
);

comment on table public.asistente_ia_usos is 'Usos del asistente de IA por persona y mes (el primer día del mes en la zona de la empresa). Uno por pedido al que el proveedor respondió; lo suma sólo asistente_ia_contar_uso(). Sin tope de uso.';

-- El top del mes y su conteo con tope (`asistente_ia_usos_del_mes()`: `limit 6` y `limit 101`). La clave primaria cubre la FK y la policy.
create index asistente_ia_usos_mes_usos_idx on public.asistente_ia_usos (mes, usos desc, usuario_id);

alter table public.asistente_ia_usos enable row level security;
revoke all on table public.asistente_ia_usos from anon, authenticated;
grant select on table public.asistente_ia_usos to authenticated;
grant all on table public.asistente_ia_usos to service_role;

create policy "asistente_ia_usos: leer" on public.asistente_ia_usos
  for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.tiene_permiso('empresa.ajustes.gestionar')));

-- 6. Suma un uso a quien llama, en el mes de la zona de la empresa. Un contador que no pisa nada: sin versión (.claude/rules/migraciones.md).
create function public.asistente_ia_contar_uso() returns integer
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_mes date;
  v_usos integer;
begin
  if v_yo is null or not public.es_usuario_activo() then
    raise exception 'Tu cuenta no puede usar el asistente.' using errcode = '42501';
  end if;
  select date_trunc('month', now() at time zone a.zona_horaria)::date into v_mes from public.ajustes_empresa a where a.id = 1;
  v_mes := coalesce(v_mes, date_trunc('month', now() at time zone 'UTC')::date);
  insert into public.asistente_ia_usos as u (usuario_id, mes, usos)
  values (v_yo, v_mes, 1)
  on conflict (usuario_id, mes) do update set usos = u.usos + 1, actualizado_en = now()
  returning u.usos into v_usos;
  return v_usos;
end;
$$;

revoke all on function public.asistente_ia_contar_uso() from public, anon;
grant execute on function public.asistente_ia_contar_uso() to authenticated, service_role;

-- 7. Los usos de este mes para la tarjeta: hasta 6 personas (5 a la vista y saber si hay más) y cuántas son, con tope (101). Con la RLS de quien
--    pregunta: quien gestiona ve a todos; cada persona, la suya. Por `asistente_ia_usos_mes_usos_idx`; el nombre, por `perfiles_pkey`.
create function public.asistente_ia_usos_del_mes() returns jsonb
  language plpgsql stable security invoker
  set search_path = ''
as $$
declare
  v_mes date;
begin
  select date_trunc('month', now() at time zone a.zona_horaria)::date into v_mes from public.ajustes_empresa a where a.id = 1;
  v_mes := coalesce(v_mes, date_trunc('month', now() at time zone 'UTC')::date);
  return jsonb_build_object(
    'mes', v_mes,
    'personas', coalesce((
      select jsonb_agg(jsonb_build_object('usuario_id', t.usuario_id, 'nombre', t.nombre, 'usos', t.usos) order by t.usos desc, t.usuario_id)
      from (
        select u.usuario_id, coalesce(nullif(btrim(p.nombre), ''), p.email::text, '') as nombre, u.usos
        from public.asistente_ia_usos u
        left join public.perfiles p on p.id = u.usuario_id
        where u.mes = v_mes
        order by u.usos desc, u.usuario_id
        limit 6
      ) t
    ), '[]'::jsonb),
    'cuantas', (select count(*) from (select 1 from public.asistente_ia_usos u where u.mes = v_mes limit 101) c)
  );
end;
$$;

revoke all on function public.asistente_ia_usos_del_mes() from public, anon;
grant execute on function public.asistente_ia_usos_del_mes() to authenticated, service_role;
