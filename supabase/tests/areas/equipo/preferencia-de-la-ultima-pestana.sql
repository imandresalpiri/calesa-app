-- La última pestaña de cada origen (`origenes.ultima_pestana`): la base sólo admite un objeto de hasta 30 entradas uuid → nombre de pestaña
-- en minúsculas, y cada persona escribe la suya. No depende de otro archivo (`SOLO=areas/equipo/preferencia-de-la-ultima-pestana.sql`).
--
-- Qué asegura:
--   U1. Acepta `{}`, una entrada y 30; rechaza (23514) una lista, un texto, null de jsonb, una clave que no es uuid, un valor que no es texto,
--       uno con mayúsculas y 31 entradas.
--   U2. Una persona no escribe la preferencia de otra (la policy de siempre) y no queda fila.

create or replace function pg_temp.up_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  return v_id;
end $f$;

-- Guarda esa preferencia como `p_quien` para `p_duena`: 'ok' o el código del error.
create or replace function pg_temp.up_guardar(p_quien uuid, p_duena uuid, p_valor jsonb) returns text language plpgsql as $f$
declare v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    insert into public.preferencias_usuario (usuario_id, clave, valor) values (p_duena, 'origenes.ultima_pestana', p_valor)
      on conflict (usuario_id, clave) do update set valor = excluded.valor;
  exception when others then
    get stacked diagnostics v_e = returned_sqlstate;
    reset role;
    return v_e;
  end;
  reset role;
  return 'ok';
end $f$;

create or replace function pg_temp.up_entradas(p_n int) returns jsonb language sql as $f$
  select jsonb_object_agg(gen_random_uuid()::text, 'fases') from generate_series(1, p_n)
$f$;

-- @test última pestaña: sólo un objeto de hasta 30 entradas uuid → pestaña (U1)
begin;
do $$
declare p uuid := pg_temp.up_persona(); c record; v text;
begin
  for c in select * from (values
    ('{}'::jsonb),
    (jsonb_build_object(gen_random_uuid()::text, 'planilla')),
    (pg_temp.up_entradas(30))
  ) t (valor) loop
    v := pg_temp.up_guardar(p, p, c.valor);
    if v <> 'ok' then raise exception 'U1: % debía aceptarse: %', left(c.valor::text, 80), v; end if;
  end loop;
  for c in select * from (values
    ('[]'::jsonb),
    ('"planilla"'::jsonb),
    ('null'::jsonb),
    ('{"no-uuid": "fases"}'::jsonb),
    (jsonb_build_object(gen_random_uuid()::text, 1)),
    (jsonb_build_object(gen_random_uuid()::text, 'Fases')),
    (pg_temp.up_entradas(31))
  ) t (valor) loop
    v := pg_temp.up_guardar(p, p, c.valor);
    if v <> '23514' then raise exception 'U1: % debía rechazarse por el check: %', left(c.valor::text, 80), v; end if;
  end loop;
end $$;
rollback;

-- @test última pestaña: nadie escribe la de otra persona (U2)
begin;
do $$
declare ana uuid := pg_temp.up_persona(); beto uuid := pg_temp.up_persona(); v text;
begin
  v := pg_temp.up_guardar(beto, ana, jsonb_build_object(gen_random_uuid()::text, 'hoja'));
  if v <> '42501' then raise exception 'U2: Beto escribió la preferencia de Ana: %', v; end if;
  if exists (select 1 from public.preferencias_usuario where usuario_id = ana) then raise exception 'U2: quedó una fila de Ana'; end if;
end $$;
rollback;
