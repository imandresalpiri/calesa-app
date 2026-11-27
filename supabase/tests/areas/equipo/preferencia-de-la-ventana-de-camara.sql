-- La ventana de cámara del Modo Live (`live.ventana`): la base sólo admite un objeto con las claves conocidas y de su forma, y cada persona escribe
-- la suya. No depende de otro archivo (`SOLO=areas/equipo/preferencia-de-la-ventana-de-camara.sql`).
--
-- Qué asegura:
--   V1. Acepta `{}`, una ventana completa, los extremos (0, 100, 200 px, 4 datos) y la cámara en null; rechaza (23514) una lista, un texto, null de
--       jsonb, una clave desconocida, una posición fuera de 0–100, un ancho menor a 200 o mayor a 4000, un booleano que no lo es, un dato que no
--       existe, 5 datos, datos que no son una lista y una cámara que no es texto (o de más de 300 letras).
--   V2. Una persona no escribe la ventana de otra (la policy de siempre) y no queda fila.

create or replace function pg_temp.vc_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  return v_id;
end $f$;

-- Guarda esa preferencia como `p_quien` para `p_duena`: 'ok' o el código del error.
create or replace function pg_temp.vc_guardar(p_quien uuid, p_duena uuid, p_valor jsonb) returns text language plpgsql as $f$
declare v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    insert into public.preferencias_usuario (usuario_id, clave, valor) values (p_duena, 'live.ventana', p_valor)
      on conflict (usuario_id, clave) do update set valor = excluded.valor;
  exception when others then
    get stacked diagnostics v_e = returned_sqlstate;
    reset role;
    return v_e;
  end;
  reset role;
  return 'ok';
end $f$;

-- @test ventana de cámara: sólo la forma admitida (V1)
begin;
do $$
declare p uuid := pg_temp.vc_persona(); c record; v text;
begin
  for c in select * from (values
    ('{}'::jsonb),
    ('{"x": 100, "y": 8, "ancho": 280, "minimizada": false, "espejo": true, "ficha_web": false, "datos": ["nombre_y_cargo", "contacto"], "camara": "abc123"}'::jsonb),
    ('{"x": 0, "y": 0, "ancho": 200, "datos": ["nombre_y_cargo", "contacto", "logo", "redes_y_web"]}'::jsonb),
    ('{"x": 100, "y": 100, "ancho": 4000, "datos": []}'::jsonb),
    ('{"camara": null}'::jsonb),
    ('{"x": 12.5, "y": 33.3}'::jsonb)
  ) t (valor) loop
    v := pg_temp.vc_guardar(p, p, c.valor);
    if v <> 'ok' then raise exception 'V1: % debía aceptarse: %', left(c.valor::text, 80), v; end if;
  end loop;
  for c in select * from (values
    ('[]'::jsonb),
    ('"ventana"'::jsonb),
    ('null'::jsonb),
    ('{"otra": 1}'::jsonb),
    ('{"x": -1}'::jsonb),
    ('{"x": 101}'::jsonb),
    ('{"y": "10"}'::jsonb),
    ('{"ancho": 199}'::jsonb),
    ('{"ancho": 4001}'::jsonb),
    ('{"ancho": "300"}'::jsonb),
    ('{"minimizada": "si"}'::jsonb),
    ('{"espejo": 1}'::jsonb),
    ('{"ficha_web": null}'::jsonb),
    ('{"datos": ["telefono"]}'::jsonb),
    ('{"datos": ["nombre_y_cargo", "contacto", "logo", "redes_y_web", "logo"]}'::jsonb),
    ('{"datos": "logo"}'::jsonb),
    ('{"datos": [1]}'::jsonb),
    ('{"camara": 5}'::jsonb),
    (jsonb_build_object('camara', repeat('a', 301)))
  ) t (valor) loop
    v := pg_temp.vc_guardar(p, p, c.valor);
    if v <> '23514' then raise exception 'V1: % debía rechazarse por el check: %', left(c.valor::text, 80), v; end if;
  end loop;
end $$;
rollback;

-- @test ventana de cámara: nadie escribe la de otra persona (V2)
begin;
do $$
declare ana uuid := pg_temp.vc_persona(); beto uuid := pg_temp.vc_persona(); v text;
begin
  v := pg_temp.vc_guardar(beto, ana, '{"x": 10}'::jsonb);
  if v <> '42501' then raise exception 'V2: Beto escribió la ventana de Ana: %', v; end if;
  if exists (select 1 from public.preferencias_usuario where usuario_id = ana) then raise exception 'V2: quedó una fila de Ana'; end if;
end $$;
rollback;
