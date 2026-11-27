-- Medición de la logística para cientos de miles de vehículos: el número de cada fase, la lista de una fase, la bandeja del día (`/logistica`), la lista
-- de una fase filtrada por un contenedor o un embarque, los embarques y contenedores por su id y la migración de los textos de booking y contenedor a embarques y contenedores.
-- `pnpm db:medir:volumen` (o `MEDIR_SOLO=medir-logistica pnpm db:medir:volumen`), contra el Supabase LOCAL con la siembra de volumen (la dueña y los
-- 50.000 leads «Volumen» de `sembrar.sql`). Todo en una transacción que se revierte; `session_replication_role = replica` arma el terreno sin triggers.
--
-- El terreno, en un origen propio: 8 fases de logística que alertan a los 5 días (la octava es final), una jubilada con 300, con un requisito bloqueante
-- en la fase 4 (los trabados de la fase 3); 300.000 vehículos vivos (1/2.000 de ellos sin fase, 1 % sin resolver, 3 % no ganadas, el 4 % de Ana por
-- `creado_por` y el 1 % por la cartera de Ana); el 40 % con transporte (la mitad en 7.500 contenedores de 8, uno de cada tres en su embarque; la otra mitad suelta; ETA
-- de hoy ± 30 días, la mitad sin arribo, 0,5 % con zarpe hoy) y el 25 % con un
-- documento aprobado que vence en los próximos 60 días (el 1 %, uno por revisar). La fase 3 pasa de 15.000 a 120.000 vehículos sin cambiar el total.
--
-- Qué se mide (las consultas de adentro con el plan genérico y como postgres, que es como corren las definer; las RPC como cada persona):
-- el plan de cada consulta (su índice, sin `Seq Scan` de la tabla grande, sin descartar filas que crezcan), el tiempo, los bytes de cada respuesta y que
-- el número de las fases no crece con N (bloques por relación con la fase 3 a 15.000 y a 120.000, ±10 %).
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.vehiculos, public.transportes, public.documentos;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
select set_config('medir.tam_fase', :'tam_fase', true) \g /dev/null
select set_config('medir.tam_bandeja', :'tam_bandeja', true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'falta la dueña de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if (select count(*) from public.vehiculos where eliminado_en is null) > 20000 then
    raise exception 'la base ya trae % vehículos vivos: la medición cuenta con llegar a 300.000 (pnpm db:reset)', (select count(*) from public.vehiculos where eliminado_en is null);
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir la logística: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000f7');
insert into auth.users (id, email, raw_app_meta_data) select id, 'medir-logistica-' || clave || '@ejemplo.com', '{"invitado": true}' from _p where clave <> 'duena';
update public.perfiles set nombre = 'Medir logística ' || id, invitacion_aceptada_en = now() where id in (select id from _p where clave <> 'duena');
with r as (insert into public.roles (clave, nombre) values ('medir_logistica_propios', 'Medir logística propios') returning id),
     c as (insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
           select id, k, null, 'propios' from r, unnest(array['logistica.ver', 'vehiculos.ver', 'logistica.documentos.aprobar', 'logistica.documentos.subir']) k returning rol_id)
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select p.id, (select id from r), true from _p p where p.clave = 'ana';

create temp table _o (id uuid not null, flujo uuid not null);
insert into public.origenes (clave, nombre, tipo) values ('medir_log', 'Medir logística', 'manual');
insert into _o select o.id, (select f.id from public.flujos f where f.origen_id = o.id) from public.origenes o where o.clave = 'medir_log';
insert into public.flujos_reglas (flujo_id, regla, activa) select flujo, 'alerta_demora', true from _o on conflict (flujo_id, regla) do update set activa = excluded.activa;
create temp table _f (i int primary key, id uuid not null);
with f as (insert into public.fases (flujo_id, nombre, orden, es_logistica, demora_dias, es_final)
           select (select flujo from _o), 'Medir fase ' || g, g * 10, true, case when g = 8 then null else 5 end, g = 8 from generate_series(1, 8) g returning id, orden)
insert into _f select (orden / 10)::int, id from f;
insert into public.fases (flujo_id, nombre, orden, es_logistica, activa) values ((select flujo from _o), 'Medir jubilada', 5, true, false);
insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id)
select (select flujo from _o), a.id, b.id from _f a join _f b on b.i = a.i + 1;
create temp table _t (id uuid not null);
with t as (insert into public.tipos_documento (nombre, modo_vencimiento, aviso_dias) values ('Medir renovable', 'renovar', 30) returning id) insert into _t select id from t;
insert into public.fases_requisitos (fase_id, tipo, bloqueante, tipo_documento_id) select (select id from _f where i = 4), 'documento', true, (select id from _t);
-- La cartera de Ana: 100 de los leads «Volumen».
create temp table _cartera (i int primary key, lead uuid not null);
insert into _cartera select row_number() over (order by id), id from public.leads where nombre like 'Volumen %' and eliminado_en is null limit 100;
do $$ begin
  if (select count(*) from _cartera) <> 100 then raise exception 'esperaba los leads «Volumen» de la siembra'; end if;
end $$;
grant select on _p, _o, _f to authenticated;

-- Los vehículos: g de 1 a 300.000, en dos tandas. La primera, 195.000: la fase 3 con 15.000 y las otras siete (y la jubilada, con 300) se reparten el resto.
-- La segunda, 105.000 más, todos a la fase 3 (120.000 con 300.000 en total): sumar y no mover, para no dejar filas muertas en los índices.
set local session_replication_role = replica;
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por, desde, lead_creado_en, lead_reciente_en)
select c.lead, (select id from _p where clave = 'ana'), 'compartido', (select id from _p where clave = 'duena'), now(), l.creado_en, coalesce(l.ultimo_seguimiento_en, l.creado_en)
  from _cartera c join public.leads l on l.id = c.lead;
create function pg_temp.vehiculos_de(p_desde int, p_hasta int) returns void language sql as $f$
insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en, fase_id, fase_desde, situacion, subasta_resultado, subasta_resuelta_en)
select (select id from _o), 'Medir logística ' || g,
       case when g % 25 = 0 then (select id from _p where clave = 'ana') else (select id from _p where clave = 'duena') end,
       case when g % 100 = 7 then (select lead from _cartera where i = 1 + (g / 100) % 100) end,
       timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds',
       x.fase, case when x.fase is not null then now() - ((g % 200) + 1) * interval '1 day' end,
       case when g % 100 = 0 then 'sin_resolver' when g % 100 in (1, 2, 3) then 'no_ganada' else 'fase' end,
       case when g % 100 in (1, 2, 3) then 'no_ganada' end, case when g % 100 in (1, 2, 3) then now() end
  from generate_series(p_desde, p_hasta) g
 cross join lateral (select case when g % 2000 = 0 then null
                                 when g <= 15000 or g > 195000 then (select id from _f where i = 3)
                                 when g between 15001 and 15300 then (select id from public.fases where nombre = 'Medir jubilada')
                                 else (select id from _f where i = (array[1, 2, 4, 5, 6, 7, 8])[1 + g % 7]) end as fase) x;
$f$;
select pg_temp.vehiculos_de(1, 195000);
set local session_replication_role = origin;
analyze public.vehiculos;
do $$ begin
  if (select count(*) from public.vehiculos where origen_id = (select id from _o) and eliminado_en is null) <> 195000 then raise exception 'esperaba 195.000 vehículos del origen'; end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las funciones de medición
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _fallas (texto text);
create temp table _med (titulo text, ms numeric, bytes int, buffers bigint);
grant all on _fallas, _med to authenticated;

-- Una medición: el EXPLAIN (ANALYZE, BUFFERS) de `p_sql`, 7 corridas y la mediana de las 5 últimas. `p_rol`: 'authenticated' (una RPC, como la persona `p_quien`) o
-- 'postgres' (la consulta de adentro, como corren las definer, con el `auth.uid()` de `p_quien`). `p_indice` es el que el plan debe nombrar;
-- ningún `Seq Scan` de `vehiculos`, `transportes`, `documentos`, `embarques` ni `contenedores`; sin descartar más de `p_descarta` filas. `p_bytes`: el tope de la respuesta (una RPC).
create function pg_temp.m(p_titulo text, p_rol text, p_quien text, p_sql text, p_ms numeric, p_indice text default null, p_bytes int default null, p_descarta numeric default 500)
returns void language plpgsql as $$
declare
  v_id uuid := (select id from _p where clave = p_quien);
  v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; i int; v_texto text; v_mediana numeric; v_bytes int; v_b bigint; v_clave text;
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
  if p_rol = 'authenticated' then set local role authenticated; end if;
  for i in 1 .. 7 loop
    execute 'explain (analyze, buffers, format json) ' || p_sql into v_plan;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_b := 0;
    foreach v_clave in array array['Shared Hit Blocks', 'Shared Read Blocks'] loop
      v_b := v_b + coalesce((v_plan -> 0 -> 'Plan' ->> v_clave)::bigint, 0);
    end loop;
    v_buf := v_buf || v_b;
  end loop;
  v_texto := v_plan::text;
  if p_bytes is not null then
    execute 'select octet_length(t::text) from (' || p_sql || ') x(t)' into v_bytes;
  end if;
  reset role;
  v_mediana := (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m);
  insert into _med values (p_titulo || ' · ' || p_quien, v_mediana, v_bytes, (select percentile_disc(0.5) within group (order by b) from unnest(v_buf) b));
  if v_mediana > p_ms then insert into _fallas values (format('%s · %s: %s ms, el presupuesto es %s', p_titulo, p_quien, round(v_mediana, 1), p_ms)); end if;
  if v_bytes > p_bytes then insert into _fallas values (format('%s · %s: %s bytes, el presupuesto es %s', p_titulo, p_quien, v_bytes, p_bytes)); end if;
  if p_indice is not null and v_texto not like '%"Index Name": "' || p_indice || '"%' then
    insert into _fallas values (format('%s · %s no camina %s (camina: %s)', p_titulo, p_quien, p_indice,
      (select string_agg(distinct m[1], ', ') from regexp_matches(v_texto, '"Index Name": "([^"]+)"', 'g') m)));
  end if;
  if v_texto ~ '"Node Type": "Seq Scan"[^{}]*?"Relation Name": "(vehiculos|transportes|documentos|embarques|contenedores)"' then
    insert into _fallas values (format('%s · %s recorre una tabla entera', p_titulo, p_quien));
  end if;
  if coalesce((select sum(m[1]::numeric) from regexp_matches(v_texto, '"Rows Removed by Filter": (\d+)', 'g') m), 0) > p_descarta then
    insert into _fallas values (format('%s · %s descarta %s filas', p_titulo, p_quien,
      (select sum(m[1]::numeric) from regexp_matches(v_texto, '"Rows Removed by Filter": (\d+)', 'g') m)));
  end if;
end $$;

-- Los bloques que lee de cada relación una ejecución de `p_sql` (como la persona `p_quien`).
create function pg_temp.bloques(p_quien text, p_sql text) returns jsonb language plpgsql as $$
declare
  v_id uuid := (select id from _p where clave = p_quien);
  v_idx oid := 'public.vehiculos_cadena_idx'::regclass; v_veh oid := 'public.vehiculos'::regclass; a bigint; b bigint; c bigint; d bigint;
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  a := pg_stat_get_xact_blocks_fetched(v_idx); c := pg_stat_get_xact_blocks_fetched(v_veh);
  execute p_sql;
  b := pg_stat_get_xact_blocks_fetched(v_idx); d := pg_stat_get_xact_blocks_fetched(v_veh);
  reset role;
  return jsonb_build_object('indice', b - a, 'vehiculos', d - c);
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las consultas de adentro, preparadas (plan genérico), como corren dentro de las RPC
-- ---------------------------------------------------------------------------------------------------------------------------------
set local plan_cache_mode = force_generic_plan;
-- El número de una fase: n + 1 claves por vehiculos_cadena_idx.
prepare m_cuenta(uuid, uuid, int) as select count(*) from (select 1 from public.vehiculos v
  where v.origen_id = $1 and v.fase_id = $2 and v.eliminado_en is null and v.situacion <> 'no_ganada' order by v.fase_id, v.fase_desde, v.id limit $3) x;
prepare m_demora(uuid, uuid, int, int) as select count(*) from (select 1 from public.vehiculos v
  where v.origen_id = $1 and v.fase_id = $2 and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_desde < now() - make_interval(days => $4) order by v.fase_id, v.fase_desde, v.id limit $3) x;
prepare m_cuenta_sin_fase(uuid, int) as select count(*) from (select 1 from public.vehiculos v
  where v.origen_id = $1 and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id is null and v.fase_desde is null order by v.fase_id, v.fase_desde, v.id limit $2) x;
-- Las 50 primeras demoradas de una fase (los trabados).
prepare m_demoradas(uuid, uuid, int) as select v.id from public.vehiculos v
  where v.origen_id = $1 and v.fase_id = $2 and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_desde < now() - make_interval(days => $3)
  order by v.fase_desde, v.id limit 50;
prepare m_demoradas_cursor(uuid, uuid, int, timestamptz, uuid, int) as select v.id from public.vehiculos v
  where v.origen_id = $1 and v.fase_id = $2 and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_desde < now() - make_interval(days => $3)
    and (v.fase_desde, v.id) > ($4 - make_interval(days => $3), $5)
  order by v.fase_desde, v.id limit $6;
-- La lista de una fase de la dueña, con cursor profundo (como `_logistica_columna`), y la de Ana: de lo propio, por la clave primaria.
prepare m_columna_cursor(uuid, uuid, timestamptz, uuid, int) as select v.id from public.vehiculos v
  where v.origen_id = $1 and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id = $2 and v.fase_desde < 'infinity' and (v.fase_desde, v.id) > ($3, $4)
  order by v.fase_id, v.fase_desde, v.id limit $5;
prepare m_columna_propios(uuid, uuid, timestamptz, uuid, int) as select v.id from unnest(public._logistica_lo_propio($1)) as u(id) join public.vehiculos v on v.id = u.id
  where v.origen_id = $1 and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id = $2 and v.fase_desde < 'infinity' and (v.fase_desde, v.id) > ($3, $4)
  order by v.fase_desde, v.id limit $5;
prepare m_lo_propio(uuid) as select public._logistica_lo_propio($1);
-- La bandeja: por aprobar, por vencer, llegadas, salidas y sin resolver.
prepare m_aprobar(timestamptz, uuid) as select d.id from public.documentos d where d.estado = 'subido' and d.eliminado_en is null and (d.creado_en, d.id) > ($1, $2)
  order by d.creado_en, d.id limit 200;
prepare m_vencer(date, int, date, uuid) as select x.id from public.documentos x
  where x.estado = 'aprobado' and x.eliminado_en is null and x.vence_el is not null and x.vence_el between $1 and $1 + $2 and (x.vence_el, x.id) > ($3, $4)
  order by x.vence_el, x.id limit 200;
prepare m_llegadas(date, date, uuid) as select t.id from public.transportes t
  where t.arribo_el is null and t.vehiculo_id is not null and t.eta_el is not null and t.eta_el <= $1 and (t.eta_el, t.id) < ($2, $3)
  order by t.eta_el desc, t.id desc limit 200;
prepare m_salidas(date, uuid) as select t.id from public.transportes t where t.vehiculo_id is not null and t.zarpe_el = $1 and t.id > $2 order by t.id limit 200;
prepare m_sin_resolver(uuid, timestamptz, uuid, int) as select v.id from public.vehiculos v
  where v.origen_id = $1 and v.situacion = 'sin_resolver' and v.eliminado_en is null and (v.creado_en, v.id) > ($2, $3) order by v.creado_en, v.id limit $4;

-- Los puntos de partida de los cursores profundos.
create temp table _cur (clave text primary key, ts timestamptz, id uuid);
grant select on _cur to authenticated;
create function pg_temp.cursores(p_todos boolean) returns void language plpgsql as $$
declare o uuid := (select id from _o); f3 uuid := (select id from _f where i = 3); v_hoy date := public._bandeja_dia_hoy(); v_ts timestamptz; v_id uuid; v_d date;
begin
  select v.fase_desde, v.id into v_ts, v_id from public.vehiculos v
   where v.origen_id = o and v.fase_id = f3 and v.eliminado_en is null and v.situacion <> 'no_ganada' order by v.fase_desde, v.id offset 4000 limit 1;
  insert into _cur values ('fase3', v_ts, v_id);
  select v.fase_desde, v.id into v_ts, v_id from public.vehiculos v
   where v.origen_id = o and v.fase_id = f3 and v.creado_por = (select id from _p where clave = 'ana') and v.eliminado_en is null and v.situacion <> 'no_ganada' order by v.fase_desde, v.id offset 100 limit 1;
  insert into _cur values ('fase3_ana', v_ts, v_id);
  -- Con la primera tanda aún no hay transportes ni documentos: la bandeja se mide con la segunda.
  if not p_todos then return; end if;
  select d.creado_en, d.id into v_ts, v_id from public.documentos d where d.estado = 'subido' and d.eliminado_en is null order by d.creado_en, d.id offset 1000 limit 1;
  insert into _cur values ('aprobar', v_ts, v_id);
  select x.vence_el, x.id into v_d, v_id from public.documentos x where x.estado = 'aprobado' and x.eliminado_en is null and x.vence_el between v_hoy and v_hoy + 30 order by x.vence_el, x.id offset 5000 limit 1;
  insert into _cur values ('vencer', v_d::timestamp at time zone 'UTC', v_id);
  select t.eta_el, t.id into v_d, v_id from public.transportes t where t.arribo_el is null and t.vehiculo_id is not null and t.eta_el <= v_hoy order by t.eta_el desc, t.id desc offset 2000 limit 1;
  insert into _cur values ('llegadas', v_d::timestamp at time zone 'UTC', v_id);
  select v.creado_en, v.id into v_ts, v_id from public.vehiculos v where v.origen_id = o and v.situacion = 'sin_resolver' and v.eliminado_en is null order by v.creado_en, v.id offset 1000 limit 1;
  insert into _cur values ('sin_resolver', v_ts, v_id);
  select t.id into v_id from public.transportes t where t.zarpe_el = v_hoy order by t.id offset 100 limit 1;
  insert into _cur values ('salidas', v_hoy::timestamp at time zone 'UTC', v_id);
  select v.fase_desde + interval '5 days', v.id into v_ts, v_id from public.vehiculos v
   where v.origen_id = o and v.fase_id = f3 and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_desde < now() - interval '5 days' order by v.fase_desde, v.id offset 4000 limit 1;
  insert into _cur values ('demorados', v_ts, v_id);
end $$;
select pg_temp.cursores(false);
do $$ begin
  if (select count(*) from _cur where id is null) > 0 then raise exception 'los cursores profundos no caen: %', (select jsonb_agg(clave) from _cur where id is null); end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las mediciones, con la fase 3 a 15.000 y después a 120.000
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _bloques (fase text, quien text, indice bigint, vehiculos bigint);
create function pg_temp.tanda(p_fase text) returns void language plpgsql as $$
declare
  o uuid := (select id from _o); f3 uuid := (select id from _f where i = 3); v_hoy date := public._bandeja_dia_hoy();
  c_fase int := current_setting('medir.tam_fase')::int; c_bandeja int := current_setting('medir.tam_bandeja')::int;
  r record; q text; b jsonb;
begin
  -- El número de cada fase: las consultas de adentro.
  perform pg_temp.m('resumen: el número de una fase (la consulta)', 'postgres', 'duena', format('execute m_cuenta(%L, %L, 1001)', o, f3), 10, 'vehiculos_cadena_idx');
  perform pg_temp.m('resumen: los demorados de una fase (la consulta)', 'postgres', 'duena', format('execute m_demora(%L, %L, 1001, 5)', o, f3), 10, 'vehiculos_cadena_idx');
  perform pg_temp.m('resumen: «Sin fase» (la consulta)', 'postgres', 'duena', format('execute m_cuenta_sin_fase(%L, 1001)', o), 10, 'vehiculos_cadena_idx');
  perform pg_temp.m('resumen: las 50 demoradas de una fase (la consulta)', 'postgres', 'duena', format('execute m_demoradas(%L, %L, 5)', o, f3), 10, 'vehiculos_cadena_idx');
  perform pg_temp.m('lo propio de Ana (la consulta)', 'postgres', 'ana', format('execute m_lo_propio(%L)', o), 150);
  -- Las RPC.
  perform pg_temp.m('resumen', 'authenticated', 'duena', format('select public.logistica_cadena_resumen(%L, 1000)', o), 50, null, 4096);
  perform pg_temp.m('resumen', 'authenticated', 'ana', format('select public.logistica_cadena_resumen(%L, 1000)', o), 250, null, 4096);
  b := pg_temp.bloques('duena', format('select public.logistica_cadena_resumen(%L, 1000)', o));
  insert into _bloques values (p_fase, 'duena', (b ->> 'indice')::bigint, (b ->> 'vehiculos')::bigint);
  if p_fase <> '15.000' then return; end if;
  return;
end $$;

create function pg_temp.tanda_lista(p_fase text) returns void language plpgsql as $$
declare
  o uuid := (select id from _o); f3 uuid := (select id from _f where i = 3); c_fase int := current_setting('medir.tam_fase')::int; ca record; cd record;
begin
  select * into ca from _cur where clave = 'fase3_ana';
  select * into cd from _cur where clave = 'fase3';
  -- La lista de una fase (la de 50, con cursor profundo): la dueña por vehiculos_cadena_idx y Ana por lo propio.
  perform pg_temp.m('lista de la fase (la consulta), cursor profundo', 'postgres', 'duena', format('execute m_columna_cursor(%L, %L, %L, %L, %s)', o, f3, cd.ts, cd.id, c_fase + 1), 25, 'vehiculos_cadena_idx');
  perform pg_temp.m('lista de la fase (la consulta), de lo propio', 'postgres', 'ana', format('execute m_columna_propios(%L, %L, %L, %L, %s)', o, f3, ca.ts, ca.id, c_fase + 1), 200, 'vehiculos_pkey');
  perform pg_temp.m('lista de la fase', 'authenticated', 'duena',
    format('select public.logistica_cadena_columna(%L, %L, %L, %L, %s)', o, f3, cd.ts, cd.id, c_fase), 10, null, 24576);
  perform pg_temp.m('lista de la fase', 'authenticated', 'ana',
    format('select public.logistica_cadena_columna(%L, %L, %L, %L, %s)', o, f3, ca.ts, ca.id, c_fase), 200, null, 24576);
end $$;
grant execute on all functions in schema pg_temp to authenticated;

select pg_temp.tanda('15.000');

-- La fase 3 pasa a 120.000 (y el total a 300.000): 105.000 más, y el transporte (40 %) y el documento (25 %, aprobado y vence en 60 días; el 1 %, por revisar) de todos.
-- El transporte, como lo dejaban los textos de antes de los embarques: la mitad en contenedores de 8 (uno de cada tres con booking; las unidades de un contenedor
-- comparten las fechas) y la otra mitad suelta con fechas propias; ETA de hoy ± 30 días, la mitad sin arribo y el 0,5 % con zarpe hoy. Pasa a embarques y
-- contenedores con la función de la migración (`_embarques_desde_textos`), cronometrada.
set local session_replication_role = replica;
select pg_temp.vehiculos_de(195001, 300000);
create temp table _textos as
select x.id as vehiculo_id,
       case when k.c then 'MEDC' || lpad(k.k::text, 5, '0') end as contenedor,
       case when k.c and k.k % 3 = 0 then 'MEDB' || lpad(k.k::text, 5, '0') end as booking,
       case when s.sale then public._bandeja_dia_hoy() end as zarpe_el,
       case when s.sale then public._bandeja_dia_hoy() + 20 else public._bandeja_dia_hoy() + (k.k % 61)::int - 30 end as eta_el,
       case when k.k % 2 = 0 and not s.sale then public._bandeja_dia_hoy() + (k.k % 61)::int - 30 end as arribo_el
  from (select id, row_number() over (order by id) as g from public.vehiculos where origen_id = (select id from _o)) x
 cross join lateral (select x.g % 5 = 0 as c, case when x.g % 5 = 0 then (x.g - 5) / 40 else x.g end as k) k
 cross join lateral (select case when k.c then k.k % 200 = 7 else k.k % 200 = 6 end as sale) s
 where x.g % 5 in (0, 1);
insert into public.transportes (vehiculo_id, zarpe_el, eta_el, arribo_el) select vehiculo_id, zarpe_el, eta_el, arribo_el from _textos;
insert into public.documentos (vehiculo_id, tipo_documento_id, estado, vence_el)
select x.id, (select id from _t), case when x.g % 100 = 4 then 'subido' else 'aprobado' end::public.estado_documento,
       case when x.g % 100 <> 4 then public._bandeja_dia_hoy() + (x.g % 60)::int end
  from (select id, row_number() over (order by id) as g from public.vehiculos where origen_id = (select id from _o)) x where x.g % 4 = 0;
set local session_replication_role = origin;
create temp table transportes_textos as
select t.id as transporte_id, t.vehiculo_id, t.repuesto_id, (select id from _o) as origen_vehiculo, null::uuid as origen_proyecto,
       x.booking, x.contenedor, t.naviera_id, t.puerto_origen_id, t.puerto_destino_id, t.zarpe_el, t.eta_el, t.arribo_el, t.creado_en, t.actualizado_en
  from _textos x join public.transportes t on t.vehiculo_id = x.vehiculo_id
 where x.contenedor is not null or x.booking is not null;
do $$
declare v_desde timestamptz := clock_timestamp(); r jsonb; v_s numeric;
  v_transportes int := (select count(*) from public.transportes t join public.vehiculos v on v.id = t.vehiculo_id where v.origen_id = (select id from _o));
begin
  r := public._embarques_desde_textos('pg_temp.transportes_textos');
  v_s := extract(epoch from clock_timestamp() - v_desde);
  raise notice 'medicion|Logística, la migración a embarques y contenedores con % transportes (s)|%', v_transportes, round(v_s, 1);
  raise notice 'nota|La migración: %|', r;
  if v_s > 60 then insert into _fallas values (format('la migración a embarques y contenedores tarda %s s, el presupuesto es 60', round(v_s, 1))); end if;
  if (r ->> 'contenedores_creados')::int <> 7500 or (r ->> 'embarques_creados')::int <> 2500 or (r ->> 'unidades_asignadas')::int <> 60000 then
    raise exception 'esperaba 7.500 contenedores, 2.500 embarques y 60.000 unidades asignadas: %', r;
  end if;
end $$;
analyze public.embarques;
analyze public.contenedores;
analyze public.vehiculos;
analyze public.transportes;
analyze public.documentos;
do $$
declare n int := (select count(*) from public.vehiculos where fase_id = (select id from _f where i = 3)); t int := (select count(*) from public.vehiculos where origen_id = (select id from _o) and eliminado_en is null);
begin
  if n < 119000 or t <> 300000 then raise exception 'esperaba 120.000 en la fase 3 y 300.000 en el origen, y hay % y %', n, t; end if;
  raise notice 'nota|La fase 3 llegó a % vehículos de 300.000|', n;
end $$;
truncate _cur;
select pg_temp.cursores(true);
select pg_temp.tanda('120.000');
select pg_temp.tanda_lista('120.000');

-- La bandeja del origen: cada grupo, la primera página (las 5 de la pestaña con el conteo hasta 100) y una página de 20 con cursor profundo; las consultas de adentro.
create function pg_temp.bandeja() returns void language plpgsql as $$
declare
  o uuid := (select id from _o); v_hoy date := public._bandeja_dia_hoy(); c_tam int := current_setting('medir.tam_bandeja')::int;
  g text; k record; q text; v_ms numeric; v_bytes int;
begin
  perform set_config('medir.cur', '1', true);
  -- Las consultas de adentro, con su índice.
  select * into k from _cur where clave = 'aprobar';
  perform pg_temp.m('bandeja · por aprobar (la consulta)', 'postgres', 'duena', format('execute m_aprobar(%L, %L)', k.ts, k.id), 15, 'documentos_por_revisar_idx');
  select * into k from _cur where clave = 'vencer';
  perform pg_temp.m('bandeja · por vencer (la consulta)', 'postgres', 'duena', format('execute m_vencer(%L, 60, %L, %L)', v_hoy, (k.ts at time zone 'UTC')::date, k.id), 30, 'documentos_vencen_idx');
  select * into k from _cur where clave = 'llegadas';
  perform pg_temp.m('bandeja · llegadas (la consulta)', 'postgres', 'duena', format('execute m_llegadas(%L, %L, %L)', v_hoy, (k.ts at time zone 'UTC')::date, k.id), 15, 'transportes_llegadas_idx');
  select * into k from _cur where clave = 'salidas';
  perform pg_temp.m('bandeja · salidas (la consulta)', 'postgres', 'duena', format('execute m_salidas(%L, %L)', v_hoy, k.id), 15, 'transportes_salidas_idx');
  select * into k from _cur where clave = 'sin_resolver';
  perform pg_temp.m('bandeja · sin resolver (la consulta)', 'postgres', 'duena', format('execute m_sin_resolver(%L, %L, %L, %s)', o, k.ts, k.id, c_tam + 1), 15, 'vehiculos_situacion_idx');
  select * into k from _cur where clave = 'demorados';
  perform pg_temp.m('bandeja · demorados de un par (la consulta)', 'postgres', 'duena',
    format('execute m_demoradas_cursor(%L, %L, 5, %L, %L, %s)', o, (select id from _f where i = 3), k.ts, k.id, c_tam + 1), 15, 'vehiculos_cadena_idx');
  -- Las RPC: la portada (5 filas y el conteo hasta 100) de cada grupo y una página con cursor.
  foreach g in array array['demorados', 'trabados', 'por_aprobar', 'por_vencer', 'llegadas', 'salidas', 'sin_resolver'] loop
    perform pg_temp.m('bandeja · ' || g || ', la portada', 'authenticated', 'duena',
      format('select public.logistica_bandeja_grupo(%L, %L, 5, 100)', g, o), case g when 'trabados' then 100 else 60 end, null, 6144);
    perform pg_temp.m('bandeja · ' || g || ', la portada', 'authenticated', 'ana',
      format('select public.logistica_bandeja_grupo(%L, %L, 5, 100)', g, o), 300, null, 6144);
    select * into k from _cur where clave = case g when 'por_aprobar' then 'aprobar' when 'por_vencer' then 'vencer' else g end;
    continue when g = 'trabados' or k.id is null;
    perform pg_temp.m('bandeja · ' || g || ', página con cursor profundo', 'authenticated', 'duena',
      format('select public.logistica_bandeja_grupo(%L, %L, %s, null, %L, %L)', g, o, c_tam, k.ts, k.id), 40, null, 12288);
  end loop;
end $$;
grant execute on all functions in schema pg_temp to authenticated;
select pg_temp.bandeja();

-- La lista de una fase filtrada por un contenedor de 8 con su embarque y por ese embarque, los dos por su id (la dueña la lee desde sus unidades, ≤ 2 ms;
-- Ana parte de lo propio, como sin filtro).
create function pg_temp.fase_por_entidad() returns void language plpgsql as $$
declare
  o uuid := (select id from _o); f3 uuid := (select id from _f where i = 3); c_fase int := current_setting('medir.tam_fase')::int;
  v_cont uuid; v_emb uuid; v_caso text; v_filtro jsonb;
begin
  select c.id, c.embarque_id into v_cont, v_emb
    from public.contenedores c
   where c.origen_id = o and c.embarque_id is not null
     and exists (select 1 from public.transportes t join public.vehiculos v on v.id = t.vehiculo_id where t.contenedor_id = c.id and v.fase_id = f3)
   order by c.numero limit 1;
  foreach v_caso in array array['contenedor', 'embarque'] loop
    v_filtro := jsonb_build_object(v_caso, case v_caso when 'contenedor' then v_cont else v_emb end);
    perform pg_temp.m('lista de la fase, por ' || v_caso, 'authenticated', 'duena',
      format('select public.logistica_cadena_columna(%L, %L, null, null, %s, %L)', o, f3, c_fase, v_filtro), 10, null, 24576);
    perform pg_temp.m('lista de la fase, por ' || v_caso, 'authenticated', 'ana',
      format('select public.logistica_cadena_columna(%L, %L, null, null, %s, %L)', o, f3, c_fase, v_filtro), 200, null, 24576);
  end loop;
end $$;
grant execute on all functions in schema pg_temp to authenticated;
select pg_temp.fase_por_entidad();

-- Las entidades por su id: la lista de embarques y la de contenedores del origen (la primera página, una con cursor profundo, la de un estado que nadie
-- cumple, que corta a los 500 mirados, la de un estado común —en tránsito; sin embarque— y la de un prefijo), un embarque de 8 por su id (con sus vehículos, sus declaraciones y lo que les falta), su contenedor y sus
-- unidades para el lote.
create function pg_temp.entidades() returns void language plpgsql as $$
declare
  o uuid := (select id from _o); v_emb uuid; v_cont uuid; v_cur_e uuid; v_cur_c uuid; v_pre_e text; v_pre_c text; q text; v_caso text; v_tipo text; v_ms int;
begin
  select c.id, c.embarque_id into v_cont, v_emb from public.contenedores c where c.origen_id = o and c.embarque_id is not null order by c.numero limit 1;
  select e.id into v_cur_e from public.embarques e where e.origen_id = o order by e.booking offset 1000 limit 1;
  select c.id into v_cur_c from public.contenedores c where c.origen_id = o order by c.numero offset 2000 limit 1;
  -- Un prefijo que acota a unos pocos: el booking y el número del medio sin sus dos últimos caracteres.
  select left(e.booking, length(e.booking) - 2) into v_pre_e from public.embarques e where e.id = v_cur_e;
  select left(c.numero, length(c.numero) - 2) into v_pre_c from public.contenedores c where c.id = v_cur_c;
  foreach v_tipo in array array['embarques', 'contenedores'] loop
    foreach v_caso in array array['la primera página', 'con cursor profundo', 'con un estado que nadie cumple', 'con un estado común', 'con un prefijo'] loop
      q := case v_caso
             when 'la primera página' then format('select public.%s_listar(%L, null, 50, %L)', v_tipo, o, '{}')
             when 'con cursor profundo' then format('select public.%s_listar(%L, %L, 50, %L)', v_tipo, o,
                                                     case v_tipo when 'embarques' then v_cur_e else v_cur_c end, '{}')
             -- Los embarques en tránsito; los contenedores sin embarque (dos de cada tres).
             when 'con un estado común' then format('select public.%s_listar(%L, null, 50, %L)', v_tipo, o,
                                                     case v_tipo when 'embarques' then '{"estado": "en_transito"}' else '{"estado": "sin_embarque"}' end)
             when 'con un prefijo' then format('select public.%s_listar(%L, null, 50, %L)', v_tipo, o,
                                                jsonb_build_object('prefijo', case v_tipo when 'embarques' then v_pre_e else v_pre_c end))
             else format('select public.%s_listar(%L, null, 50, %L)', v_tipo, o, '{"estado": "entregado"}') end;
      v_ms := case v_caso when 'con un estado que nadie cumple' then 400 else 250 end;
      perform pg_temp.m('entidades · ' || v_tipo || ', ' || v_caso, 'authenticated', 'duena', q, v_ms, null, 49152);
      perform pg_temp.m('entidades · ' || v_tipo || ', ' || v_caso, 'authenticated', 'ana', q, v_ms, null, 49152);
    end loop;
  end loop;
  perform pg_temp.m('entidades · un embarque por su id', 'authenticated', 'duena', format('select public.embarque_leer(%L)', v_emb), 30, null, 16384);
  perform pg_temp.m('entidades · un embarque por su id', 'authenticated', 'ana', format('select public.embarque_leer(%L)', v_emb), 30, null, 16384);
  perform pg_temp.m('entidades · un contenedor por su id', 'authenticated', 'duena', format('select public.contenedor_leer(%L)', v_cont), 20, null, 12288);
  perform pg_temp.m('entidades · las unidades de un embarque', 'authenticated', 'duena',
    format('select public.transporte_unidades(%L, %L)', 'embarque', v_emb), 20, null, 12288);
end $$;
grant execute on all functions in schema pg_temp to authenticated;
select pg_temp.entidades();

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Lo medido, y lo que no se cumplió
-- ---------------------------------------------------------------------------------------------------------------------------------
do $$
declare r record; v_texto text; v_a record; v_b record;
begin
  for r in select * from _med order by titulo loop
    raise notice 'medicion|Logística, % (ms)|%', r.titulo, round(r.ms, 2);
    if r.bytes is not null then raise notice 'medicion|Logística, % (bytes)|%', r.titulo, r.bytes; end if;
  end loop;
  -- El número de las fases no crece con N: los bloques de la dueña con la fase 3 a 15.000 y a 120.000, ±10 %.
  select * into v_a from _bloques where fase = '15.000' and quien = 'duena';
  select * into v_b from _bloques where fase = '120.000' and quien = 'duena';
  raise notice 'medicion|Logística, resumen: bloques del índice de la cadena con la fase 3 a 15.000|%', v_a.indice;
  raise notice 'medicion|Logística, resumen: bloques del índice de la cadena con la fase 3 a 120.000|%', v_b.indice;
  raise notice 'medicion|Logística, resumen: bloques de vehiculos con la fase 3 a 15.000 (sin VACUUM: el índice visita la tabla)|%', v_a.vehiculos;
  raise notice 'medicion|Logística, resumen: bloques de vehiculos con la fase 3 a 120.000 (sin VACUUM: el índice visita la tabla)|%', v_b.vehiculos;
  if v_b.indice > 1.1 * v_a.indice + 2 or v_b.indice < 0.9 * v_a.indice - 2 then
    insert into _fallas values (format('el resumen crece con N: %s bloques del índice con 15.000 y %s con 120.000', v_a.indice, v_b.indice));
  end if;
  if v_b.vehiculos > 1.1 * v_a.vehiculos + 2 or v_b.vehiculos < 0.9 * v_a.vehiculos - 2 then
    insert into _fallas values (format('el resumen crece con N: %s bloques de vehiculos con 15.000 y %s con 120.000', v_a.vehiculos, v_b.vehiculos));
  end if;
  select string_agg(texto, E'\n  ') into v_texto from _fallas;
  if v_texto is not null then raise exception E'La logística rompe su presupuesto:\n  %', v_texto; end if;
end $$;
rollback;
vacuum public.vehiculos, public.transportes, public.documentos;
