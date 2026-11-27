-- La bandeja del día de `/logistica/bandeja`: `logistica_bandeja_grupo` (siete grupos por cursor, con conteo con tope, de un origen). No depende de otro archivo
-- (`SOLO=areas/alertas/bandeja-del-dia.sql`). Cada bloque abre su transacción y la revierte. El plan con volumen: `medir-logistica.sql`.
--
-- Qué asegura:
--   G1. El alcance de cada grupo: lo visible (el menor de logistica.ver y vehiculos.ver), «propios» sólo lo suyo y lo de su cartera, nunca la papelera
--       ni las no ganadas.
--   G2. El cursor no repite ni salta (empates de fase_desde) y el tope se acota.
--   G3. El conteo sólo viene sin cursor: 100 con `hay_mas` cuando hay 101.
--   G4. Trabados: los que les falta un bloqueante para la fase siguiente; se paran a las 200 evaluadas con `cortada` y por dónde seguir.
--   G5. Por aprobar pide `logistica.documentos.aprobar`; por vencer pide `logistica.documentos.subir`, la ventana de aviso y el modo.
--   G6. Llegadas (fase final, arribo cargado o ETA futura, fuera) y salidas (sólo el zarpe de hoy, el día de la empresa).
--   G7. Sin resolver.
--   G8. Un grupo o un cursor a medias dan 22023 con su hint.
--   G9. Privilegios: `anon` no ejecuta la RPC ni `authenticated` los ayudantes.
--   G10. La bandeja es de un origen: lo de otro origen que la persona también ve no entra, en ningún grupo.
--   G11. Sin origen, 22023 con hint p_origen.

create or replace function pg_temp.bd_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-bd@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

create or replace function pg_temp.bd_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.bd_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('bd_' || substr(v_id::text, 1, 8), 'bd ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Un origen manual con su flujo, la regla de la demora y dos fases (la primera alerta a los 3 días), unidas.
create or replace function pg_temp.bd_origen(out o uuid, out uno uuid, out dos uuid) language plpgsql as $f$
declare s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8); fl uuid;
begin
  insert into public.origenes (clave, nombre, tipo) values ('bd_' || s, 'bd origen ' || s, 'manual') returning id into o;
  fl := (select id from public.flujos where origen_id = o);
  insert into public.flujos_reglas (flujo_id, regla, activa) values (fl, 'alerta_demora', true)
  on conflict (flujo_id, regla) do update set activa = excluded.activa;
  insert into public.fases (flujo_id, nombre, orden, es_logistica, demora_dias) values (fl, 'bd uno', 10, true, 3) returning id into uno;
  insert into public.fases (flujo_id, nombre, orden, es_logistica) values (fl, 'bd dos', 20, true) returning id into dos;
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (fl, uno, dos);
end $f$;

create or replace function pg_temp.bd_vehiculo(p_origen uuid, p_fase uuid, p_creado_por uuid default null, p_desde timestamptz default null) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, creado_por) values (p_origen, 'bd vehículo', p_fase, p_desde, p_creado_por) returning id;
$f$;

create or replace function pg_temp.bd_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.bd_grupo(p_quien uuid, p_origen uuid, p_grupo text, p_tope int default 20, p_conteo int default null, p_desde text default null,
  p_id text default null) returns jsonb language sql as $f$
  select pg_temp.bd_corre(p_quien, format('select public.logistica_bandeja_grupo(%L, %L, %s, %L, %L, %L)', p_grupo, p_origen, p_tope, p_conteo, p_desde, p_id));
$f$;

-- Los ids de las filas (el vehículo, o el documento si lo hay), en su orden.
create or replace function pg_temp.bd_ids(p jsonb) returns uuid[] language sql as $f$
  select coalesce(array_agg(coalesce(x ->> 'documento_id', x ->> 'vehiculo_id', x ->> 'id')::uuid order by i), '{}')
    from jsonb_array_elements(p -> 'filas') with ordinality y(x, i);
$f$;

-- De los ids leídos, los que son de `p_origen` (un vehículo suyo o un documento de uno suyo): la base de desarrollo puede traer más.
create or replace function pg_temp.bd_en(p_ids uuid[], p_origen uuid) returns uuid[] language sql as $f$
  select coalesce(array_agg(x order by i), '{}') from unnest(p_ids) with ordinality y(x, i)
   where exists (select 1 from public.vehiculos v where v.id = x and v.origen_id = p_origen)
      or exists (select 1 from public.documentos d join public.vehiculos v on v.id = d.vehiculo_id where d.id = x and v.origen_id = p_origen);
$f$;

create or replace function pg_temp.bd_mismos(p_que text, p_dio uuid[], p_debia uuid[]) returns void language plpgsql as $f$
begin
  if (select coalesce(array_agg(x order by x), '{}') from unnest(p_dio) x) is distinct from
     (select coalesce(array_agg(x order by x), '{}') from unnest(p_debia) x) then
    raise exception '%: debía ver % y vio %', p_que, p_debia, p_dio;
  end if;
end $f$;

create or replace function pg_temp.bd_igual(p_que text, p_dio anyelement, p_debia anyelement) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_debia then raise exception '%: debía ser % y fue %', p_que, p_debia, p_dio; end if;
end $f$;

-- Todas las páginas de un grupo (de a p_tope) hasta que no haya siguiente: los ids leídos, en orden.
create or replace function pg_temp.bd_todas(p_quien uuid, p_origen uuid, p_grupo text, p_tope int) returns uuid[] language plpgsql as $f$
declare r jsonb; v_ids uuid[] := '{}'; v_desde text; v_id text; v_vueltas int := 0;
begin
  loop
    r := pg_temp.bd_grupo(p_quien, p_origen, p_grupo, p_tope, null, v_desde, v_id);
    if r ? 'error' then raise exception 'bd_todas: %', r; end if;
    v_ids := v_ids || pg_temp.bd_ids(r);
    v_vueltas := v_vueltas + 1;
    exit when not (r ->> 'hay_mas')::boolean;
    v_desde := r #>> '{siguiente,desde}'; v_id := r #>> '{siguiente,id}';
    if v_vueltas > 50 then raise exception 'bd_todas: no termina'; end if;
  end loop;
  return v_ids;
end $f$;

-- @test bandeja del día: demorados y trabados por alcance, «propios», papelera y no ganadas (G1)
begin;
do $$
declare
  x record := pg_temp.bd_origen(); o uuid := x.o; uno uuid := x.uno; dos uuid := x.dos;
  duena uuid := pg_temp.bd_persona(array['logistica.ver', 'vehiculos.ver']);
  prop uuid := pg_temp.bd_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || o], 'propios');
  otra uuid := pg_temp.bd_persona(array['vehiculos.ver']);
  sin_log uuid := pg_temp.bd_persona(array['vehiculos.ver']);
  v_lead uuid; v_mia uuid; v_ajena uuid; v_cartera uuid; v_papelera uuid; v_fresca uuid; t uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('BD lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), prop) returning id into v_lead;
  v_mia := pg_temp.bd_vehiculo(o, uno, prop, now() - interval '10 days');
  v_ajena := pg_temp.bd_vehiculo(o, uno, otra, now() - interval '9 days');
  v_cartera := pg_temp.bd_vehiculo(o, uno, otra, now() - interval '8 days');
  update public.vehiculos set lead_id = v_lead where id = v_cartera;
  v_papelera := pg_temp.bd_vehiculo(o, uno, prop, now() - interval '7 days');
  update public.vehiculos set eliminado_en = now() where id = v_papelera;
  v_fresca := pg_temp.bd_vehiculo(o, uno, prop, now() - interval '1 day');
  update public.fases set es_final = true where id = dos;   -- una fase final no alerta
  perform pg_temp.bd_vehiculo(o, dos, prop, now() - interval '30 days');
  insert into public.tipos_documento (nombre) values ('BD tipo ' || substr(gen_random_uuid()::text, 1, 8)) returning id into t;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, tipo_documento_id) values (dos, 'documento', true, t);

  perform pg_temp.bd_mismos('G1 demorados de la dueña', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(duena, o, 'demorados')), o), array[v_mia, v_ajena, v_cartera]);
  perform pg_temp.bd_mismos('G1 demorados de «propios»', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(prop, o, 'demorados')), o), array[v_mia, v_cartera]);
  perform pg_temp.bd_igual('G1 demorados en orden de vencimiento', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(duena, o, 'demorados')), o), array[v_mia, v_ajena, v_cartera]);
  perform pg_temp.bd_mismos('G1 trabados de la dueña', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(duena, o, 'trabados')), o), array[v_mia, v_ajena, v_cartera]);
  perform pg_temp.bd_mismos('G1 trabados de «propios»', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(prop, o, 'trabados')), o), array[v_mia, v_cartera]);
  perform pg_temp.bd_igual('G1 el motivo del trabado', pg_temp.bd_grupo(duena, o, 'trabados') #>> '{filas,0,fase_siguiente}', 'bd dos');
  perform pg_temp.bd_mismos('G1 sin logistica.ver del origen, nada', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(sin_log, o, 'demorados')), o), '{}');
  -- Una no ganada no cuenta aunque esté demorada: se prueba con la situación de verdad en G7; acá, que la fila trae su situación.
  perform pg_temp.bd_igual('G1 la fila trae la situación', pg_temp.bd_grupo(duena, o, 'demorados') #>> '{filas,0,situacion}', 'fase');
  perform pg_temp.bd_igual('G1 sin cursor ni conteo pedido, el conteo es nulo', pg_temp.bd_grupo(duena, o, 'demorados') -> 'conteo', 'null'::jsonb);
end $$;
rollback;

-- @test bandeja del día: el cursor no repite ni salta con empates y el tope se acota (G2)
begin;
do $$
declare
  x record := pg_temp.bd_origen(); o uuid := x.o; uno uuid := x.uno;
  duena uuid := pg_temp.bd_persona(array['logistica.ver', 'vehiculos.ver']);
  v_instante timestamptz := now() - interval '10 days'; esperado uuid[]; leido uuid[];
begin
  -- Cinco demoradas con el mismo fase_desde y tres más con otro.
  perform pg_temp.bd_vehiculo(o, uno, null, v_instante) from generate_series(1, 5);
  perform pg_temp.bd_vehiculo(o, uno, null, v_instante - interval '1 day') from generate_series(1, 3);
  esperado := array(select v.id from public.vehiculos v where v.origen_id = o and v.fase_id = uno);
  leido := pg_temp.bd_en(pg_temp.bd_todas(duena, o, 'demorados', 2), o);
  perform pg_temp.bd_mismos('G2 de a 2 se leen todas, una vez cada una', leido, esperado);
  perform pg_temp.bd_igual('G2 sin repetidos', cardinality(leido), cardinality(esperado));
  perform pg_temp.bd_igual('G2 un tope enorme se acota a 50', jsonb_array_length(pg_temp.bd_grupo(duena, o, 'demorados', 100000) -> 'filas'), 8);
  perform pg_temp.bd_igual('G2 la primera página trae su siguiente', pg_temp.bd_grupo(duena, o, 'demorados', 2) #>> '{siguiente,id}' is not null, true);
  perform pg_temp.bd_igual('G2 la última no trae siguiente', pg_temp.bd_grupo(duena, o, 'demorados', 50) -> 'siguiente', 'null'::jsonb);
end $$;
rollback;

-- @test bandeja del día: el conteo sólo viene sin cursor y se acota a 100 (G3)
begin;
do $$
declare
  x record := pg_temp.bd_origen(); o uuid := x.o; uno uuid := x.uno;
  duena uuid := pg_temp.bd_persona(array['logistica.ver', 'vehiculos.ver']);
  r jsonb;
begin
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde)
  select o, 'bd ' || g, uno, now() - interval '10 days' - g * interval '1 minute' from generate_series(1, 101) g;
  r := pg_temp.bd_grupo(duena, o, 'demorados', 5, 100);
  perform pg_temp.bd_igual('G3 con 101, el conteo', r -> 'conteo', '{"n": 100, "hay_mas": true}'::jsonb);
  perform pg_temp.bd_igual('G3 las filas son las del tope', jsonb_array_length(r -> 'filas'), 5);
  r := pg_temp.bd_grupo(duena, o, 'demorados', 5, 1000);
  perform pg_temp.bd_igual('G3 el conteo se acota a 100', r -> 'conteo', '{"n": 100, "hay_mas": true}'::jsonb);
  r := pg_temp.bd_grupo(duena, o, 'demorados', 5, 200, (pg_temp.bd_grupo(duena, o, 'demorados', 5) #>> '{siguiente,desde}'), (pg_temp.bd_grupo(duena, o, 'demorados', 5) #>> '{siguiente,id}'));
  perform pg_temp.bd_igual('G3 con cursor no hay conteo', r -> 'conteo', 'null'::jsonb);
  delete from public.vehiculos where origen_id = o and titulo <> 'bd 1' and titulo <> 'bd 2';
  r := pg_temp.bd_grupo(duena, o, 'demorados', 5, 100);
  perform pg_temp.bd_igual('G3 con 2, el conteo exacto sin hay_mas', r -> 'conteo', '{"n": 2, "hay_mas": false}'::jsonb);
end $$;
rollback;

-- @test bandeja del día: trabados con su motivo y cortada a las 200 evaluadas (G4)
begin;
do $$
declare
  x record := pg_temp.bd_origen(); o uuid := x.o; uno uuid := x.uno; dos uuid := x.dos;
  duena uuid := pg_temp.bd_persona(array['logistica.ver', 'vehiculos.ver']);
  r jsonb; t uuid; v_ids uuid[];
begin
  -- 210 demoradas sin ningún requisito en la fase siguiente: ninguna trabada, y se evalúan sólo 200.
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde)
  select o, 'bd ' || g, uno, now() - interval '10 days' - g * interval '1 minute' from generate_series(1, 210) g;
  r := pg_temp.bd_grupo(duena, o, 'trabados', 20, 100);
  perform pg_temp.bd_igual('G4 sin bloqueantes, ningún trabado', r -> 'filas', '[]'::jsonb);
  perform pg_temp.bd_igual('G4 se paró a las 200 evaluadas', r ->> 'cortada', 'true');
  perform pg_temp.bd_igual('G4 dice por dónde seguir', r #>> '{siguiente,id}' is not null, true);
  perform pg_temp.bd_igual('G4 el conteo dice que hay más', r -> 'conteo', '{"n": 0, "hay_mas": true}'::jsonb);
  -- Seguir desde ahí evalúa las diez que quedan, sin repetir.
  r := pg_temp.bd_grupo(duena, o, 'trabados', 20, null, r #>> '{siguiente,desde}', r #>> '{siguiente,id}');
  perform pg_temp.bd_igual('G4 al seguir, termina', r ->> 'cortada', 'false');
  -- Con un bloqueante en la fase siguiente, todas quedan trabadas y se pagina por cursor.
  insert into public.tipos_documento (nombre) values ('BD tipo ' || substr(gen_random_uuid()::text, 1, 8)) returning id into t;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, tipo_documento_id) values (dos, 'documento', true, t);
  r := pg_temp.bd_grupo(duena, o, 'trabados', 20, 100);
  perform pg_temp.bd_igual('G4 con el bloqueante, una página de 20', jsonb_array_length(r -> 'filas'), 20);
  perform pg_temp.bd_igual('G4 hay más', r ->> 'hay_mas', 'true');
  perform pg_temp.bd_igual('G4 el conteo con el tope', r -> 'conteo', '{"n": 100, "hay_mas": true}'::jsonb);
  perform pg_temp.bd_igual('G4 el motivo', r #>> '{filas,0,motivo}' like 'Documento: BD tipo%', true);
  v_ids := pg_temp.bd_en(pg_temp.bd_todas(duena, o, 'trabados', 50), o);
  perform pg_temp.bd_igual('G4 recorrida a pedazos (hasta donde llegan las evaluadas por llamada)', cardinality(v_ids) >= 150, true);
end $$;
rollback;

-- @test bandeja del día: por aprobar pide aprobar; por vencer pide subir, la ventana de aviso y el modo (G5)
begin;
do $$
declare
  x record := pg_temp.bd_origen(); o uuid := x.o; uno uuid := x.uno;
  duena uuid := pg_temp.bd_persona(array['logistica.ver', 'vehiculos.ver', 'logistica.documentos.aprobar', 'logistica.documentos.subir']);
  solo_ver uuid := pg_temp.bd_persona(array['logistica.ver', 'vehiculos.ver']);
  aprueba uuid := pg_temp.bd_persona(array['logistica.ver', 'vehiculos.ver', 'logistica.documentos.aprobar']);
  sube uuid := pg_temp.bd_persona(array['logistica.ver', 'vehiculos.ver', 'logistica.documentos.subir']);
  prop uuid := pg_temp.bd_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || o, 'logistica.documentos.aprobar@' || o, 'logistica.documentos.subir@' || o], 'propios');
  v_mio uuid; v_otro uuid; t_renovar uuid; t_ninguno uuid; t_solicitar uuid;
  d_subido uuid; d_subido_ajeno uuid; d_pronto uuid; d_lejos uuid; d_vencido uuid; d_sin_modo uuid; d_solicitar uuid; v_hoy date;
begin
  v_hoy := public._bandeja_dia_hoy();
  v_mio := pg_temp.bd_vehiculo(o, uno, prop);
  v_otro := pg_temp.bd_vehiculo(o, uno, null);
  insert into public.tipos_documento (nombre, modo_vencimiento, aviso_dias) values ('BD renovar ' || substr(gen_random_uuid()::text, 1, 8), 'renovar', 30) returning id into t_renovar;
  insert into public.tipos_documento (nombre, modo_vencimiento, aviso_dias) values ('BD solicitar ' || substr(gen_random_uuid()::text, 1, 8), 'solicitar', 10) returning id into t_solicitar;
  insert into public.tipos_documento (nombre) values ('BD ninguno ' || substr(gen_random_uuid()::text, 1, 8)) returning id into t_ninguno;
  insert into public.documentos (vehiculo_id, tipo_documento_id) values (v_mio, t_ninguno) returning id into d_subido;
  insert into public.documentos (vehiculo_id, tipo_documento_id) values (v_otro, t_ninguno) returning id into d_subido_ajeno;
  -- Aprobados con vencimiento (un trigger deja entrar todo como «subido»: se insertan sin triggers): en 20 días (dentro de los 30 del aviso), en 60 (fuera), ayer (vencido), sin modo, y en 5 con «solicitar» (aviso 10).
  set local session_replication_role = replica;
  insert into public.documentos (vehiculo_id, tipo_documento_id, estado, vence_el) values (v_mio, t_renovar, 'aprobado', v_hoy + 20) returning id into d_pronto;
  insert into public.documentos (vehiculo_id, tipo_documento_id, estado, vence_el) values (v_otro, t_renovar, 'aprobado', v_hoy + 60) returning id into d_lejos;
  insert into public.documentos (vehiculo_id, tipo_documento_id, estado, vence_el) values (v_otro, t_renovar, 'aprobado', v_hoy - 1) returning id into d_vencido;
  insert into public.documentos (vehiculo_id, tipo_documento_id, estado, vence_el) values (v_otro, t_ninguno, 'aprobado', v_hoy + 5) returning id into d_sin_modo;
  insert into public.documentos (vehiculo_id, tipo_documento_id, estado, vence_el) values (v_otro, t_solicitar, 'aprobado', v_hoy + 5) returning id into d_solicitar;
  set local session_replication_role = origin;

  perform pg_temp.bd_mismos('G5 por aprobar, quien aprueba', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(aprueba, o, 'por_aprobar')), o), array[d_subido, d_subido_ajeno]);
  perform pg_temp.bd_mismos('G5 por aprobar sin el permiso, nada', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(solo_ver, o, 'por_aprobar')), o), '{}');
  perform pg_temp.bd_mismos('G5 por aprobar sólo con subir, nada', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(sube, o, 'por_aprobar')), o), '{}');
  perform pg_temp.bd_mismos('G5 por aprobar «propios»', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(prop, o, 'por_aprobar')), o), array[d_subido]);
  perform pg_temp.bd_mismos('G5 por vencer, quien sube', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(sube, o, 'por_vencer')), o), array[d_pronto, d_solicitar]);
  perform pg_temp.bd_igual('G5 por vencer por fecha', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(duena, o, 'por_vencer')), o), array[d_solicitar, d_pronto]);
  perform pg_temp.bd_mismos('G5 por vencer sin el permiso, nada', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(solo_ver, o, 'por_vencer')), o), '{}');
  perform pg_temp.bd_mismos('G5 por vencer con aprobar sólo, nada', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(aprueba, o, 'por_vencer')), o), '{}');
  perform pg_temp.bd_mismos('G5 por vencer «propios»', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(prop, o, 'por_vencer')), o), array[d_pronto]);
  perform pg_temp.bd_igual('G5 la fila trae el modo y el vencimiento', pg_temp.bd_grupo(duena, o, 'por_vencer') #>> '{filas,1,modo}', 'renovar');
  perform pg_temp.bd_igual('G5 el cursor de por vencer sigue sin repetir', pg_temp.bd_en(pg_temp.bd_todas(duena, o, 'por_vencer', 1), o), array[d_solicitar, d_pronto]);
  perform pg_temp.bd_igual('G5 el cursor de por aprobar sigue sin repetir', cardinality(pg_temp.bd_en(pg_temp.bd_todas(aprueba, o, 'por_aprobar', 1), o)), 2);
  -- Un documento de un vehículo en la papelera no sale.
  update public.vehiculos set eliminado_en = now() where id = v_otro;
  perform pg_temp.bd_mismos('G5 la papelera no cuenta', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(aprueba, o, 'por_aprobar')), o), array[d_subido]);
end $$;
rollback;

-- @test bandeja del día: llegadas (fase final, arribo cargado y ETA futura fuera) y salidas (sólo el zarpe de hoy), propias y por su embarque (G6)
begin;
do $$
declare
  x record := pg_temp.bd_origen(); o uuid := x.o; uno uuid := x.uno; dos uuid := x.dos;
  duena uuid := pg_temp.bd_persona(array['logistica.ver', 'vehiculos.ver']);
  prop uuid := pg_temp.bd_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || o], 'propios');
  v_hoy date := public._bandeja_dia_hoy();
  v_hoy_eta uuid; v_viejo uuid; v_futuro uuid; v_con_arribo uuid; v_final uuid; v_salida uuid; v_ayer uuid; v_mio uuid; v_sale_cont uuid;
  e_hoy uuid; e_futuro uuid; e_arribo uuid; e_sale uuid; e_sale2 uuid; c1 uuid; c2 uuid;
begin
  update public.fases set es_final = true where id = dos;
  v_hoy_eta := pg_temp.bd_vehiculo(o, uno); v_viejo := pg_temp.bd_vehiculo(o, uno); v_futuro := pg_temp.bd_vehiculo(o, uno);
  v_con_arribo := pg_temp.bd_vehiculo(o, uno); v_final := pg_temp.bd_vehiculo(o, dos); v_salida := pg_temp.bd_vehiculo(o, uno);
  v_ayer := pg_temp.bd_vehiculo(o, uno); v_mio := pg_temp.bd_vehiculo(o, uno, prop); v_sale_cont := pg_temp.bd_vehiculo(o, uno);
  -- Las tres rutas de cada tanda: lo propio, el embarque directo y el embarque por su contenedor.
  insert into public.embarques (origen_id, booking, eta_el) values (o, 'BKHOY', v_hoy) returning id into e_hoy;
  insert into public.embarques (origen_id, booking, eta_el) values (o, 'BKFUT', v_hoy + 3) returning id into e_futuro;
  insert into public.embarques (origen_id, booking, eta_el, arribo_el) values (o, 'BKARR', v_hoy - 2, v_hoy - 1) returning id into e_arribo;
  insert into public.embarques (origen_id, booking, zarpe_el) values (o, 'BK1', v_hoy) returning id into e_sale;
  insert into public.embarques (origen_id, booking, zarpe_el) values (o, 'BK2', v_hoy) returning id into e_sale2;
  insert into public.contenedores (origen_id, numero, embarque_id) values (o, 'CONT1', e_hoy) returning id into c1;
  insert into public.contenedores (origen_id, numero, embarque_id) values (o, 'CONT2', e_sale2) returning id into c2;
  insert into public.transportes (vehiculo_id, contenedor_id) values (v_hoy_eta, c1);
  insert into public.transportes (vehiculo_id, eta_el) values (v_viejo, v_hoy - 10);
  insert into public.transportes (vehiculo_id, embarque_id) values (v_futuro, e_futuro);
  insert into public.transportes (vehiculo_id, embarque_id) values (v_con_arribo, e_arribo);
  insert into public.transportes (vehiculo_id, eta_el) values (v_final, v_hoy - 1);
  insert into public.transportes (vehiculo_id, embarque_id) values (v_salida, e_sale);
  insert into public.transportes (vehiculo_id, zarpe_el) values (v_ayer, v_hoy - 1);
  insert into public.transportes (vehiculo_id, zarpe_el, eta_el) values (v_mio, v_hoy, v_hoy - 1);
  insert into public.transportes (vehiculo_id, contenedor_id) values (v_sale_cont, c2);

  perform pg_temp.bd_igual('G6 llegadas, de la más reciente a la más vieja', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(duena, o, 'llegadas')), o), array[v_hoy_eta, v_mio, v_viejo]);
  perform pg_temp.bd_igual('G6 la llegada trae el contenedor', pg_temp.bd_grupo(duena, o, 'llegadas') #>> '{filas,0,contenedor}', 'CONT1');
  perform pg_temp.bd_igual('G6 llegadas de «propios»', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(prop, o, 'llegadas')), o), array[v_mio]);
  perform pg_temp.bd_igual('G6 llegadas por cursor', pg_temp.bd_en(pg_temp.bd_todas(duena, o, 'llegadas', 1), o), array[v_hoy_eta, v_mio, v_viejo]);
  perform pg_temp.bd_mismos('G6 salidas, sólo el zarpe de hoy', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(duena, o, 'salidas')), o), array[v_salida, v_mio, v_sale_cont]);
  perform pg_temp.bd_igual('G6 la salida trae el booking', (select e ->> 'booking' from jsonb_array_elements(pg_temp.bd_grupo(duena, o, 'salidas') -> 'filas') e where e ->> 'vehiculo_id' = v_salida::text), 'BK1');
  perform pg_temp.bd_igual('G6 la salida por su contenedor trae el booking y el contenedor',
    (select (e ->> 'booking') || ' ' || (e ->> 'contenedor') from jsonb_array_elements(pg_temp.bd_grupo(duena, o, 'salidas') -> 'filas') e where e ->> 'vehiculo_id' = v_sale_cont::text), 'BK2 CONT2');
  perform pg_temp.bd_mismos('G6 salidas de «propios»', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(prop, o, 'salidas')), o), array[v_mio]);
  perform pg_temp.bd_igual('G6 salidas por cursor', cardinality(pg_temp.bd_en(pg_temp.bd_todas(duena, o, 'salidas', 1), o)), 3);
end $$;
rollback;

-- @test bandeja del día: sin resolver, de la más vieja a la más nueva, sin las no ganadas ni la papelera (G7)
begin;
do $$
declare
  s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  o uuid; fl uuid; sub uuid;
  duena uuid := pg_temp.bd_persona(array['logistica.ver', 'vehiculos.ver']);
  v_a uuid; v_b uuid; v_ng uuid; v_papelera uuid; v_en_subasta uuid;
begin
  insert into public.origenes (clave, nombre, tipo) values ('bd_' || s, 'bd origen ' || s, 'subasta') returning id into o;
  fl := (select id from public.flujos where origen_id = o);
  insert into public.fases (flujo_id, nombre, orden, es_inicial, es_logistica, es_subasta) values (fl, 'bd subasta', 10, true, true, true) returning id into sub;
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, estado_subasta, subasta_fin_en, creado_en)
  values (o, 'bd a', sub, now(), 'terminada', now() - interval '2 days', now() - interval '3 days') returning id into v_a;
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, estado_subasta, subasta_fin_en, creado_en)
  values (o, 'bd b', sub, now(), 'terminada', now() - interval '2 days', now() - interval '1 day') returning id into v_b;
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, estado_subasta, subasta_fin_en, subasta_resultado, subasta_resuelta_en)
  values (o, 'bd no ganada', sub, now(), 'terminada', now() - interval '2 days', 'no_ganada', now()) returning id into v_ng;
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, estado_subasta, subasta_fin_en)
  values (o, 'bd papelera', sub, now(), 'terminada', now() - interval '2 days') returning id into v_papelera;
  update public.vehiculos set eliminado_en = now() where id = v_papelera;
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, estado_subasta, subasta_fin_en)
  values (o, 'bd en subasta', sub, now(), 'abierta', now() + interval '2 days') returning id into v_en_subasta;
  perform pg_temp.bd_igual('G7 el terreno', (select array_agg(situacion order by titulo) from public.vehiculos where origen_id = o and eliminado_en is null),
                           array['sin_resolver', 'sin_resolver', 'en_subasta', 'no_ganada']);
  perform pg_temp.bd_igual('G7 la más vieja primero, sin las no ganadas ni la papelera', pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(duena, o, 'sin_resolver')), o), array[v_a, v_b]);
  perform pg_temp.bd_igual('G7 por cursor', pg_temp.bd_en(pg_temp.bd_todas(duena, o, 'sin_resolver', 1), o), array[v_a, v_b]);
  perform pg_temp.bd_igual('G7 el conteo cuenta al menos las suyas', (pg_temp.bd_grupo(duena, o, 'sin_resolver', 20, 100) #>> '{conteo,n}')::int >= 2, true);
end $$;
rollback;

-- @test bandeja del día: un grupo o un cursor a medias dan 22023; anon y los ayudantes sin ejecutar (G8, G9)
begin;
do $$
declare
  x record := pg_temp.bd_origen(); o uuid := x.o;
  duena uuid := pg_temp.bd_persona(array['logistica.ver', 'vehiculos.ver']);
  r jsonb; fn text;
begin
  r := pg_temp.bd_grupo(duena, o, 'otro');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'p_grupo' then raise exception 'G8: un grupo desconocido debía dar 22023 p_grupo y dio %', r; end if;
  r := pg_temp.bd_grupo(duena, o, 'demorados', 20, null, now()::text, null);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'cursor' then raise exception 'G8: un cursor sin id debía dar 22023 cursor y dio %', r; end if;
  r := pg_temp.bd_grupo(duena, o, 'demorados', 20, null, null, gen_random_uuid()::text);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'cursor' then raise exception 'G8: un cursor sin fecha debía dar 22023 cursor y dio %', r; end if;
  if has_function_privilege('anon', 'public.logistica_bandeja_grupo(text,uuid,integer,integer,timestamptz,uuid)', 'execute') then raise exception 'G9: anon ejecuta la RPC'; end if;
  if not has_function_privilege('authenticated', 'public.logistica_bandeja_grupo(text,uuid,integer,integer,timestamptz,uuid)', 'execute') then raise exception 'G9: authenticated no ejecuta la RPC'; end if;
  foreach fn in array array['public._bandeja_dia_demorados(integer,timestamptz,uuid,uuid)', 'public._bandeja_dia_trabados(integer,timestamptz,uuid,uuid)',
      'public._bandeja_dia_por_aprobar(integer,timestamptz,uuid,uuid)', 'public._bandeja_dia_por_vencer(integer,timestamptz,uuid,uuid)',
      'public._bandeja_dia_llegadas(integer,timestamptz,uuid,uuid)', 'public._bandeja_dia_salidas(integer,timestamptz,uuid,uuid)',
      'public._bandeja_dia_sin_resolver(integer,timestamptz,uuid,uuid)', 'public._bandeja_dia_alcance(text,uuid)', 'public._bandeja_dia_hoy()'] loop
    if has_function_privilege('authenticated', fn, 'execute') or has_function_privilege('anon', fn, 'execute') then
      raise exception 'G9: ejecutan el ayudante %', fn;
    end if;
  end loop;
end $$;
rollback;

-- @test bandeja del día: es de un origen; lo de otro que la persona también ve no entra; sin origen, 22023 (G10, G11)
begin;
do $$
declare
  a record := pg_temp.bd_origen(); b record := pg_temp.bd_origen();
  duena uuid := pg_temp.bd_persona(array['logistica.ver', 'vehiculos.ver']);
  v_a uuid; v_b uuid; r jsonb; g text;
begin
  v_a := pg_temp.bd_vehiculo(a.o, a.uno, null, now() - interval '10 days');
  v_b := pg_temp.bd_vehiculo(b.o, b.uno, null, now() - interval '10 days');
  r := pg_temp.bd_grupo(duena, a.o, 'demorados', 50);
  perform pg_temp.bd_igual('G10 en A, el de A', v_a = any (pg_temp.bd_ids(r)), true);
  perform pg_temp.bd_igual('G10 en A, nada de B', v_b = any (pg_temp.bd_ids(r)), false);
  perform pg_temp.bd_igual('G10 en B, el de B', v_b = any (pg_temp.bd_ids(pg_temp.bd_grupo(duena, b.o, 'demorados', 50))), true);
  -- Ningún grupo de A trae algo de B.
  foreach g in array array['demorados', 'trabados', 'por_aprobar', 'por_vencer', 'llegadas', 'salidas', 'sin_resolver'] loop
    perform pg_temp.bd_igual('G10 ' || g || ' de A sin B', cardinality(pg_temp.bd_en(pg_temp.bd_ids(pg_temp.bd_grupo(duena, a.o, g, 50)), b.o)), 0);
  end loop;
  r := pg_temp.bd_grupo(duena, null, 'demorados');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'p_origen' then raise exception 'G11: sin origen debía dar 22023 p_origen y dio %', r; end if;
end $$;
rollback;
