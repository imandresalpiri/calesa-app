-- La vista de la lista de embarques de Logística (`embarques.vista`): la base sólo admite tabla o tarjetas.
-- No depende de otro archivo (`SOLO=areas/equipo/preferencia-de-la-vista-de-embarques.sql`).
--
-- Qué asegura:
--   VE1. `embarques.vista` acepta «tabla» y «tarjetas»; rechaza otra palabra, otra mayúscula, un número o un objeto (23514).

create or replace function pg_temp.pve_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  return v_id;
end $f$;

-- Guarda la preferencia como su dueña: 'ok' o el código del error.
create or replace function pg_temp.pve_guardar(p_quien uuid, p_valor text) returns text language plpgsql as $f$
declare v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    insert into public.preferencias_usuario (usuario_id, clave, valor) values (p_quien, 'embarques.vista', p_valor::jsonb)
      on conflict (usuario_id, clave) do update set valor = excluded.valor;
  exception when others then
    get stacked diagnostics v_e = returned_sqlstate;
    reset role;
    return v_e;
  end;
  reset role;
  return 'ok';
end $f$;

-- @test preferencia de la vista de embarques: sólo tabla o tarjetas (VE1)
begin;
do $$
declare p uuid := pg_temp.pve_persona(); c record; v text;
begin
  for c in select * from (values ('"tabla"'), ('"tarjetas"')) t (valor) loop
    v := pg_temp.pve_guardar(p, c.valor);
    if v <> 'ok' then raise exception 'VE1: la vista % debía aceptarse: %', c.valor, v; end if;
  end loop;
  for c in select * from (values ('"lista"'), ('"Tabla"'), ('1'), ('null'), ('{}'), ('true')) t (valor) loop
    v := pg_temp.pve_guardar(p, c.valor);
    if v <> '23514' then raise exception 'VE1: la vista % debía rechazarse por el check: %', c.valor, v; end if;
  end loop;
end $$;
rollback;
