-- Lo que la fase exige (paso 6.07-1, C10–C12, D17). No depende de otro archivo (`SOLO=areas/transporte/exigido.sql`). Los ayudantes son copia de
-- `guardar.sql`. Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   X1. Con `transporte.contenedor` bloqueante en la fase: vaciar el contenedor por la RPC da 23514 hint contenedor y sigue; cambiarlo por otro pasa; con
--       el requisito no bloqueante, vaciar pasa.
--   X2. Con una de las 3 unidades de un contenedor (la última por id) en una fase que exige naviera y booking: vaciar la naviera del embarque por
--       `embarque_guardar` da 23514 hint naviera_id y sacar el contenedor del embarque por `contenedor_guardar`, 23514 hint booking; nada cambia.
--   X3. Un update directo como superusuario también da 23514: sobre `embarques.eta_el` y sobre `transportes.contenedor_id` (la unidad dejaría de ver
--       la ETA de su embarque); vaciar lo que la fase no exige pasa.
--   X4. Borrar una naviera que usa una unidad cuya fase exige `transporte.naviera` bloqueante da 23514 y la fila sigue (D17).
--   X5. Un contenedor que sale de su embarque deja a sus unidades sin booking: con `transporte.booking` bloqueante, 23514 hint booking.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.trn_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-tr@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('tr_' || substr(v_id::text, 1, 8), 'tr ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, 'todos');
  end loop;
  return v_id;
end $f$;

-- Un origen (con su flujo y sus reglas encendidas), una fase y un vehículo en ella.
create or replace function pg_temp.trn_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fa uuid; v uuid; v2 uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('tr_' || s, 'tr origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('tr2_' || s, 'tr origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl, 'tr en tránsito', 1, true) returning id into fa;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'tr vehículo', fa) returning id into v;
  insert into public.vehiculos (origen_id, titulo) values (o2, 'tr vehículo 2') returning id into v2;
  return jsonb_build_object('o', o, 'o2', o2, 'flujo', fl, 'fase', fa, 'v', v, 'v2', v2);
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.trn_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text;
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
  return coalesce(v, '{}'::jsonb);
end $f$;

create or replace function pg_temp.trn_guardar(p_quien uuid, p_v uuid, p_esperada timestamptz, p_cambios jsonb, p_r uuid default null) returns jsonb
language sql as $f$
  -- Con una esperada, también las versiones vigentes de su embarque y su contenedor: quien guarda vio lo de ahora (el PT409 por el embarque o el
  -- contenedor, en `con-embarque.sql`).
  select pg_temp.trn_corre(p_quien, format('select public.transporte_guardar(%L, %L, %L, %L, %L, %L)', p_v, p_r, p_esperada, p_cambios,
    (select x.embarque_actualizado_en from public.transportes_con_embarque x where p_esperada is not null and (x.vehiculo_id = p_v or x.repuesto_id = p_r)),
    (select x.contenedor_actualizado_en from public.transportes_con_embarque x where p_esperada is not null and (x.vehiculo_id = p_v or x.repuesto_id = p_r))));
$f$;

create or replace function pg_temp.trn_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.trn_pasa(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'actualizado_en' is null then raise exception '%: debía guardar y dio %', p_que, p_r; end if;
  return (p_r ->> 'actualizado_en')::timestamptz;
end $f$;

create or replace function pg_temp.trn_requisito(p_fase uuid, p_clave text, p_bloqueante boolean default true) returns uuid language sql as $f$
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato) values (p_fase, 'dato', p_bloqueante, p_clave) returning id;
$f$;

-- Un superusuario corre `p_sql`: null si pasa, o `{error, mensaje, hint}`.
create or replace function pg_temp.trn_directo(p_sql text) returns jsonb language plpgsql as $f$
declare v_m text; v_e text; v_h text;
begin
  execute p_sql;
  return null;
exception when others then
  get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
  return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
end $f$;

-- @test transporte: no se vacía el contenedor que la fase exige; cambiarlo o sin bloqueante pasa (X1)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; r jsonb; v1 timestamptz; q uuid;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  v1 := pg_temp.trn_pasa('X1 crear', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, null, '{"contenedor": "MSKU1"}'));
  q := pg_temp.trn_requisito((t ->> 'fase')::uuid, 'transporte.contenedor');
  r := pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v1, '{"contenedor": null}');
  perform pg_temp.trn_es('X1 vaciar', r, '23514', 'contenedor');
  if (select contenedor from public.transportes_con_embarque where vehiculo_id = (t ->> 'v')::uuid) is distinct from 'MSKU1' then raise exception 'X1: debía seguir'; end if;
  v1 := pg_temp.trn_pasa('X1 cambiar por otro', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v1, '{"contenedor": "MSKU2"}'));
  update public.fases_requisitos set bloqueante = false where id = q;
  perform pg_temp.trn_pasa('X1 no bloqueante', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v1, '{"contenedor": null}'));
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: un update directo como superusuario tampoco vacía lo exigido (X3)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; r jsonb;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  perform pg_temp.trn_pasa('X3 crear', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, null,
                                                         '{"booking": "BK1", "contenedor": "CX3", "zarpe_el": "2026-11-20", "eta_el": "2026-12-01"}'));
  perform pg_temp.trn_requisito((t ->> 'fase')::uuid, 'transporte.eta');
  r := pg_temp.trn_directo(format('update public.embarques set eta_el = null where booking = %L and origen_id = %L', 'BK1', t ->> 'o'));
  perform pg_temp.trn_es('X3 directo en el embarque', r, '23514', 'eta_el');
  r := pg_temp.trn_directo(format('update public.transportes set contenedor_id = null where vehiculo_id = %L', t ->> 'v'));
  perform pg_temp.trn_es('X3 directo en la unidad', r, '23514', 'eta_el');
  if pg_temp.trn_directo(format('update public.embarques set zarpe_el = null where booking = %L and origen_id = %L', 'BK1', t ->> 'o')) is not null then
    raise exception 'X3: vaciar lo que la fase no exige debía pasar';
  end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: no se borra una naviera que una fase exige como bloqueante (X4)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; r jsonb; nav uuid;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  insert into public.navieras (nombre) values ('tr naviera') returning id into nav;
  perform pg_temp.trn_pasa('X4 crear', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, null, jsonb_build_object('naviera_id', nav)));
  perform pg_temp.trn_requisito((t ->> 'fase')::uuid, 'transporte.naviera');
  r := pg_temp.trn_directo(format('delete from public.navieras where id = %L', nav));
  perform pg_temp.trn_es('X4 borrar la naviera', r, '23514', 'naviera_id');
  if (select naviera_id from public.transportes where vehiculo_id = (t ->> 'v')::uuid) is distinct from nav then raise exception 'X4: la fila debía seguir'; end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: vaciar la naviera del embarque o sacar del embarque al contenedor de 3 con una unidad que lo exige no cambia nada (X2)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; r jsonb; fx uuid; v_ult uuid; v uuid; i int; nav uuid; emb uuid; cont uuid;
        emb_antes timestamptz; cont_antes timestamptz;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  for i in 1..3 loop
    insert into public.vehiculos (origen_id, titulo, fase_id) values ((t ->> 'o')::uuid, 'tr x2 ' || i, (t ->> 'fase')::uuid) returning id into v;
    perform pg_temp.trn_pasa('X2 ' || i, pg_temp.trn_guardar(p, v, null, '{"booking": "BKX2", "contenedor": "CONTX2"}'));
  end loop;
  select embarque_id, contenedor_id into emb, cont from public.transportes_con_embarque where contenedor = 'CONTX2' limit 1;
  insert into public.navieras (nombre) values ('tr naviera x2') returning id into nav;
  update public.embarques set naviera_id = nav where id = emb;
  -- La última por id de transporte, en una fase que exige la naviera y el booking: las otras dos no lo exigen.
  select vehiculo_id into v_ult from public.transportes_con_embarque where contenedor = 'CONTX2' order by id desc limit 1;
  insert into public.fases (flujo_id, nombre, orden) values ((t ->> 'flujo')::uuid, 'tr pide naviera y booking', 2) returning id into fx;
  perform pg_temp.trn_requisito(fx, 'transporte.naviera');
  perform pg_temp.trn_requisito(fx, 'transporte.booking');
  update public.vehiculos set fase_id = fx where id = v_ult;
  select actualizado_en into emb_antes from public.embarques where id = emb;
  select actualizado_en into cont_antes from public.contenedores where id = cont;

  -- trg_embarque_exigido, por embarque_guardar: la naviera del embarque es la de sus 3 unidades.
  r := pg_temp.trn_corre(p, format('select public.embarque_guardar(%L, %L, %L)', emb, emb_antes, '{"naviera_id": null}'));
  perform pg_temp.trn_es('X2 vaciar la naviera del embarque', r, '23514', 'naviera_id');
  if (select naviera_id is distinct from nav or actualizado_en is distinct from emb_antes from public.embarques where id = emb) then
    raise exception 'X2: el embarque debía seguir con su naviera y su versión';
  end if;

  -- trg_contenedor_exigido, por contenedor_guardar: fuera del embarque, sus 3 unidades se quedan sin booking.
  r := pg_temp.trn_corre(p, format('select public.contenedor_guardar(%L, %L, %L)', cont, cont_antes, '{"embarque_id": null}'));
  perform pg_temp.trn_es('X2 sacar el contenedor del embarque', r, '23514', 'booking');
  if (select embarque_id is distinct from emb or actualizado_en is distinct from cont_antes from public.contenedores where id = cont) then
    raise exception 'X2: el contenedor debía seguir en su embarque y con su versión';
  end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: un contenedor que sale de su embarque no deja sin booking a la unidad cuya fase lo exige (X5)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; r jsonb;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  perform pg_temp.trn_pasa('X5 crear', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, null, '{"booking": "BKX5", "contenedor": "CX5"}'));
  perform pg_temp.trn_requisito((t ->> 'fase')::uuid, 'transporte.booking');
  r := pg_temp.trn_directo(format('update public.contenedores set embarque_id = null where numero = %L and origen_id = %L', 'CX5', t ->> 'o'));
  perform pg_temp.trn_es('X5 el contenedor sale', r, '23514', 'booking');
  if (select booking from public.transportes_con_embarque where vehiculo_id = (t ->> 'v')::uuid) is distinct from 'BKX5' then
    raise exception 'X5: debía seguir en su embarque';
  end if;
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;
