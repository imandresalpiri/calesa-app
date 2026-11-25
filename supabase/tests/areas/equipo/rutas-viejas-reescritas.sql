-- Migración de datos: se borra al aplastar (`pnpm db:aplastar`), con su entrada en `DATOS_DE_PRUEBA` de `scripts/probar-schema.mjs`.
-- Lo guardado que nombra un parámetro mudado pasa a su nombre de hoy (`.claude/rules/rutas.md` › 2). La prueba vuelve a ejecutar el texto de
-- la migración (`_migracion_de_rutas`, la que empieza con `-- reescribir_rutas_viejas`) sobre filas sembradas aquí. No depende de otro archivo
-- (`SOLO=areas/equipo/rutas-viejas-reescritas.sql`).
--
-- Qué asegura:
--   R1. Una vista del inventario con `situacion` queda con `subasta` y `fase` (la primera propia en su orden; las fases y `ninguna` sin repetir y
--       en el orden en que venían), sin `situacion` ni `cursor`; un `subasta` o `fase` que ya estaba se respeta; lo que no se entiende se pierde
--       sin dejar `"fase": null`. Una vista de leads con `situacion` y una del inventario ya de hoy no se tocan.
--   R2. La última pestaña de un origen: flujo → fases; formula, formulas y tablas → planilla; datos se olvida; el resto queda. El check de la
--       preferencia sigue valiendo (la escritura no cae) y una preferencia ya de hoy no se toca.
--   R3. Idempotente: correrla otra vez no reescribe ninguna fila (ni un `ctid` nuevo).
--   R4. No escribe en la auditoría.

create or replace function pg_temp.rv_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  return v_id;
end $f$;

create or replace function pg_temp.rv_migrar() returns void language plpgsql as $f$
begin
  execute (select doc #>> '{}' from _migracion_de_rutas);
end $f$;

-- Una persona con vistas y pestañas viejas y de hoy, para R3 y R4.
create or replace function pg_temp.rv_sembrar() returns uuid language plpgsql as $f$
declare p uuid := pg_temp.rv_persona(); o text := gen_random_uuid()::text; u text := gen_random_uuid()::text;
begin
  insert into public.vistas_guardadas (usuario_id, pantalla, nombre, params) values
    (p, 'vehiculos', 'vieja', jsonb_build_object('origen', o, 'situacion', 'en_subasta,' || u, 'cursor', 'x')),
    (p, 'vehiculos', 'de hoy', jsonb_build_object('origen', o, 'subasta', 'vivas'));
  insert into public.preferencias_usuario (usuario_id, clave, valor)
    values (p, 'origenes.ultima_pestana', jsonb_build_object(o, 'flujo', u, 'datos'));
  return p;
end $f$;

-- @test rutas viejas: una vista con «Situación» queda con «Subasta» y «Fase»; la de leads y la de hoy no se tocan (R1)
begin;
do $$
declare
  p uuid := pg_temp.rv_persona();
  o text := gen_random_uuid()::text;
  u1 text := gen_random_uuid()::text;
  u2 text := gen_random_uuid()::text;
  c record;
  v jsonb;
begin
  insert into public.vistas_guardadas (usuario_id, pantalla, nombre, params) values
    (p, 'vehiculos', 'perdidas', jsonb_build_object('origen', o, 'situacion', 'no_ganada', 'cursor', 'x', 'q', 'E2E')),
    (p, 'vehiculos', 'mezcla',
      jsonb_build_object('origen', o, 'situacion', 'sin_resolver,en_subasta,' || u1 || ',ninguna,' || u1 || ',' || u2)),
    (p, 'vehiculos', 'previa', jsonb_build_object('origen', o, 'situacion', 'no_ganada,' || u1, 'subasta', 'vivas', 'fase', u2)),
    (p, 'vehiculos', 'basura', jsonb_build_object('origen', o, 'situacion', 'basura')),
    (p, 'leads', 'de leads', jsonb_build_object('situacion', 'no_ganada', 'cursor', 'x')),
    (p, 'vehiculos', 'de hoy', jsonb_build_object('origen', o, 'subasta', 'vivas', 'cursor', 'y'));
  perform pg_temp.rv_migrar();
  for c in select * from (values
    ('perdidas', jsonb_build_object('origen', o, 'q', 'E2E', 'subasta', 'no_ganadas')),
    ('mezcla', jsonb_build_object('origen', o, 'subasta', 'vivas', 'fase', u1 || ',ninguna,' || u2)),
    ('previa', jsonb_build_object('origen', o, 'subasta', 'vivas', 'fase', u2)),
    ('basura', jsonb_build_object('origen', o)),
    ('de leads', jsonb_build_object('situacion', 'no_ganada', 'cursor', 'x')),
    ('de hoy', jsonb_build_object('origen', o, 'subasta', 'vivas', 'cursor', 'y'))
  ) t (nombre, esperado) loop
    select params into v from public.vistas_guardadas where usuario_id = p and nombre = c.nombre;
    if v is distinct from c.esperado then raise exception 'R1: «%» quedó %, debía %', c.nombre, v, c.esperado; end if;
  end loop;
end $$;
rollback;

-- @test rutas viejas: la última pestaña con el nombre de antes queda con el de hoy, y «datos» se olvida (R2)
begin;
do $$
declare
  p uuid := pg_temp.rv_persona(); q uuid := pg_temp.rv_persona(); r uuid := pg_temp.rv_persona();
  a text := gen_random_uuid()::text; b text := gen_random_uuid()::text; c text := gen_random_uuid()::text;
  d text := gen_random_uuid()::text; e text := gen_random_uuid()::text; f text := gen_random_uuid()::text;
  v jsonb;
begin
  insert into public.preferencias_usuario (usuario_id, clave, valor) values
    (p, 'origenes.ultima_pestana', jsonb_build_object(a, 'flujo', b, 'formulas', c, 'datos', d, 'campos', e, 'formula', f, 'tablas')),
    (q, 'origenes.ultima_pestana', jsonb_build_object(a, 'datos')),
    (r, 'origenes.ultima_pestana', jsonb_build_object(a, 'fases', b, 'planilla'));
  perform pg_temp.rv_migrar();
  select valor into v from public.preferencias_usuario where usuario_id = p and clave = 'origenes.ultima_pestana';
  if v is distinct from jsonb_build_object(a, 'fases', b, 'planilla', d, 'campos', e, 'planilla', f, 'planilla') then
    raise exception 'R2: las pestañas quedaron %', v;
  end if;
  select valor into v from public.preferencias_usuario where usuario_id = q and clave = 'origenes.ultima_pestana';
  if v is distinct from '{}'::jsonb then raise exception 'R2: sólo «datos» debía quedar vacía: %', v; end if;
  select valor into v from public.preferencias_usuario where usuario_id = r and clave = 'origenes.ultima_pestana';
  if v is distinct from jsonb_build_object(a, 'fases', b, 'planilla') then raise exception 'R2: la de hoy cambió: %', v; end if;
end $$;
rollback;

-- @test rutas viejas: correrla otra vez no reescribe ninguna fila (R3)
begin;
do $$
declare p uuid := pg_temp.rv_sembrar(); antes jsonb; despues jsonb;
begin
  perform pg_temp.rv_migrar();
  select jsonb_build_object(
           'vistas', (select jsonb_agg(jsonb_build_array(ctid::text, params) order by id) from public.vistas_guardadas where usuario_id = p),
           'pestanas', (select jsonb_agg(jsonb_build_array(ctid::text, valor)) from public.preferencias_usuario where usuario_id = p))
    into antes;
  perform pg_temp.rv_migrar();
  select jsonb_build_object(
           'vistas', (select jsonb_agg(jsonb_build_array(ctid::text, params) order by id) from public.vistas_guardadas where usuario_id = p),
           'pestanas', (select jsonb_agg(jsonb_build_array(ctid::text, valor)) from public.preferencias_usuario where usuario_id = p))
    into despues;
  if antes is distinct from despues then raise exception 'R3: la segunda corrida cambió %  →  %', antes, despues; end if;
  if exists (select 1 from public.vistas_guardadas where usuario_id = p and params ? 'situacion') then
    raise exception 'R3: la primera corrida no reescribió la vista: %', antes;
  end if;
end $$;
rollback;

-- @test rutas viejas: no escribe en la auditoría (R4)
begin;
do $$
declare p uuid := pg_temp.rv_sembrar(); ultima bigint := (select coalesce(max(id), 0) from public.actividad);
begin
  perform pg_temp.rv_migrar();
  if exists (select 1 from public.actividad where id > ultima) then
    raise exception 'R4: la migración escribió en la auditoría: %',
      (select jsonb_agg(accion) from public.actividad where id > ultima);
  end if;
  if exists (select 1 from public.vistas_guardadas where usuario_id = p and params ? 'situacion') then
    raise exception 'R4: no reescribió la vista sembrada';
  end if;
end $$;
rollback;
