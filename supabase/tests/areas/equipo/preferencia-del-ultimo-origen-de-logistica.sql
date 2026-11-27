-- El último origen de logística (`logistica.ultimo_origen`): la base sólo admite un uuid como texto, y cada persona escribe la suya. No depende
-- de otro archivo (`SOLO=areas/equipo/preferencia-del-ultimo-origen-de-logistica.sql`).
--
-- Qué asegura:
--   UO1. Acepta un uuid (también en mayúsculas); rechaza (23514) un texto que no es uuid, un número, un objeto, una lista y null de jsonb.
--   UO2. Una persona no escribe la preferencia de otra (la policy de siempre) y no queda fila.

create or replace function pg_temp.uo_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  return v_id;
end $f$;

-- Guarda esa preferencia como `p_quien` para `p_duena`: 'ok' o el código del error.
create or replace function pg_temp.uo_guardar(p_quien uuid, p_duena uuid, p_valor jsonb) returns text language plpgsql as $f$
declare v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    insert into public.preferencias_usuario (usuario_id, clave, valor) values (p_duena, 'logistica.ultimo_origen', p_valor)
      on conflict (usuario_id, clave) do update set valor = excluded.valor;
  exception when others then
    get stacked diagnostics v_e = returned_sqlstate;
    reset role;
    return v_e;
  end;
  reset role;
  return 'ok';
end $f$;

-- @test último origen de logística: sólo un uuid como texto (UO1)
begin;
do $$
declare p uuid := pg_temp.uo_persona(); c record; v text;
begin
  for c in select * from (values
    (to_jsonb(gen_random_uuid()::text)),
    (to_jsonb(upper(gen_random_uuid()::text)))
  ) t (valor) loop
    v := pg_temp.uo_guardar(p, p, c.valor);
    if v <> 'ok' then raise exception 'UO1: % debía aceptarse: %', c.valor, v; end if;
  end loop;
  for c in select * from (values
    ('"x"'::jsonb),
    ('7'::jsonb),
    (jsonb_build_object('id', gen_random_uuid())),
    (jsonb_build_array(gen_random_uuid())),
    ('null'::jsonb)
  ) t (valor) loop
    v := pg_temp.uo_guardar(p, p, c.valor);
    if v <> '23514' then raise exception 'UO1: % debía rechazarse por el check: %', c.valor, v; end if;
  end loop;
end $$;
rollback;

-- @test último origen de logística: nadie escribe la de otra persona (UO2)
begin;
do $$
declare ana uuid := pg_temp.uo_persona(); beto uuid := pg_temp.uo_persona(); v text;
begin
  v := pg_temp.uo_guardar(beto, ana, to_jsonb(gen_random_uuid()::text));
  if v <> '42501' then raise exception 'UO2: Beto escribió la preferencia de Ana: %', v; end if;
  if exists (select 1 from public.preferencias_usuario where usuario_id = ana) then raise exception 'UO2: quedó una fila de Ana'; end if;
end $$;
rollback;
