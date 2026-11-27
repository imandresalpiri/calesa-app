-- Medición del historial de fases de un vehículo filtrado por quién y por fase (la tarjeta «Historial» de la página de la unidad, `?historial_quien=` y `?historial_fase=`):
-- `pnpm db:medir:volumen` (`MEDIR_SOLO=medir-historial-de-fases`), contra el Supabase LOCAL con la siembra de volumen (la dueña y Ana de `sembrar.sql`). Todo en una
-- transacción que se revierte: ningún cambio de fase queda.
--
-- Qué se mide: la lectura de `leerHistorialDeLaUnidad` con un filtro (una página de `TAMANO_DE_VER_MAS` + 1 por `creado_en desc, id desc`, la primera y una profunda por el
-- cursor de `aplicarCursor`), con las tres igualdades que suma el filtro: `usuario_id = <persona>`, `usuario_id is null` («Sistema») y `a_fase_id = <fase>`. Como
-- `authenticated` (la policy `historial_fases: leer` con `puede_unidad`), con el plan genérico, `EXPLAIN (ANALYZE, BUFFERS)` ×7 y la mediana de las 5 últimas. Un vehículo
-- «caliente» lleva 5.000 cambios: casi todos de la dueña y en dos fases; uno de cada 50 de Ana, uno de cada 50 del sistema y uno de cada 50 a una tercera fase (lo que se
-- filtra es raro: así un índice que no lo sostiene descarta de a miles). Los demás cambios se reparten entre 100 vehículos.
--
-- Asserta, con 50.000 y con 250.000 cambios: cada filtro por su índice (`historial_fases_vehiculo_quien_idx` para quién y «Sistema», `historial_fases_vehiculo_fase_idx` para la
-- fase), sin `Seq Scan` de `historial_fases`, sin descartar filas y sin leer más de 200 (las 100 del filtro de ese vehículo: con pocas filas estimadas, el plan genérico las junta
-- por bitmap y las ordena; con más, camina el índice en orden y para en n + 1); ≤ 50 ms y ≤ 1.500 buffers (la policy `puede_unidad` cuesta ≈ 14 buffers por fila que mira: el
-- peor caso es mirar las 100); que no crece con N (con 250.000, el tiempo a lo sumo `greatest(1,5 × t, t + 3 ms)` y los buffers 1,2 × + 20). Crece con las filas del filtro en
-- ese vehículo, no con la tabla. La guarda: sin los dos índices, la página camina `historial_fases_vehiculo_idx` y lee y descarta lo que no es del filtro.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.historial_fases;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
select set_config('medir.pagina', (:ver_mas + 1)::text, true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') or not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'faltan la dueña y Ana de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir el historial de fases: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres: el flujo del origen sembrado `subasta_usa` con tres fases, el vehículo caliente y 100 más (sin triggers)
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000a1');
create temp table _o as select o.id as origen, f.id as flujo from public.origenes o join public.flujos f on f.origen_id = o.id where o.clave = 'subasta_usa';
create temp table _f as select row_number() over (order by fz.orden, fz.id)::int as i, fz.id from public.fases fz where fz.flujo_id = (select flujo from _o);
do $$ begin
  if (select count(*) from _o) <> 1 then raise exception 'esperaba el origen sembrado subasta_usa con su flujo'; end if;
  if (select count(*) from _f) < 3 then raise exception 'el flujo de subasta_usa necesita tres fases para medir'; end if;
end $$;
create temp table _v (i int primary key, id uuid not null);
set local session_replication_role = replica;
with v as (insert into public.vehiculos (origen_id, titulo, creado_por) select (select origen from _o), 'Medir fases ' || g, '00000000-0000-0000-0000-0000000000d1'
             from generate_series(0, 100) g returning id, titulo)
insert into _v select replace(titulo, 'Medir fases ', '')::int, id from v;
set local session_replication_role = origin;
grant select on _p, _o, _f, _v to authenticated;

-- Las filas g ∈ [desde, hasta], más nuevas cuanto mayor es g: las 5.000 primeras son del vehículo caliente (`_v.i = 0`), las demás de los otros 100.
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.historial_fases (flujo_id, vehiculo_id, de_fase_id, a_fase_id, nota, usuario_id, creado_en)
  select (select flujo from _o), (select id from _v where i = case when g <= 5000 then 0 else 1 + g % 100 end), null,
         (select id from _f where i = case when g % 50 = 3 then 3 else 1 + g % 2 end),
         null,
         case g % 50 when 1 then (select id from _p where clave = 'ana') when 2 then null else (select id from _p where clave = 'duena') end,
         timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds'
    from generate_series(p_desde, p_hasta) g;
  set local session_replication_role = origin;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las funciones de medición. Corren como quien las llama (authenticated), con el plan genérico.
-- ---------------------------------------------------------------------------------------------------------------------------------
create function pg_temp.medir(p_ejecutar text) returns jsonb language plpgsql as $$
declare
  v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; v_clave text; v_b bigint; i int; v_texto text;
begin
  for i in 1 .. 7 loop
    execute 'explain (analyze, buffers, format json) ' || p_ejecutar into v_plan;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_b := 0;
    foreach v_clave in array array['Shared Hit Blocks', 'Shared Read Blocks'] loop
      v_b := v_b + coalesce((v_plan -> 0 -> 'Plan' ->> v_clave)::bigint, 0);
    end loop;
    v_buf := v_buf || v_b;
  end loop;
  v_texto := v_plan::text;
  return jsonb_build_object(
    'ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
    'buffers', (select percentile_disc(0.5) within group (order by b) from unnest(v_buf) b),
    'indices', coalesce((select jsonb_agg(distinct m[1]) from regexp_matches(v_texto, '"Index Name": "([^"]+)"', 'g') m), '[]'::jsonb),
    'seq', exists (select 1 from regexp_matches(v_texto, '"Node Type": "Seq Scan"[^{}]*?"Relation Name": "historial_fases"', 'g')),
    'sort', v_texto ~ '"Node Type": "(Incremental )?Sort"',
    'filas', coalesce((select max(m[1]::numeric) from regexp_matches(v_texto, '"Actual Rows": (\d+)', 'g') m), 0),
    'descartadas', coalesce((select sum(m[1]::numeric) from regexp_matches(v_texto, '"Rows Removed by Filter": (\d+)', 'g') m), 0));
end $$;

create temp table _med (fase text, filtro text, ruta text, ms numeric, buffers bigint, indices jsonb, seq boolean, sort boolean, descartadas numeric, filas numeric);
grant all on _med to authenticated;

-- La lectura de `historial.client.ts` (las columnas propias; los nombres embebidos son una lectura por PK de cada fila de la página) con cada filtro, y su profunda por cursor.
create function pg_temp.preparar() returns void language plpgsql as $$
declare
  v_cols constant text := 'id, creado_en, nota, de_fase_id, a_fase_id, usuario_id';
  v_orden constant text := ' order by creado_en desc, id desc limit ' || current_setting('medir.pagina');
  v_cursor constant text := ' and creado_en <= $3 and (creado_en < $3 or id < $4)';
begin
  execute 'prepare q_pagina(uuid, uuid) as select ' || v_cols || ' from public.historial_fases where vehiculo_id = $1 and usuario_id = $2' || v_orden;
  execute 'prepare q_cursor(uuid, uuid, timestamptz, bigint) as select ' || v_cols || ' from public.historial_fases where vehiculo_id = $1 and usuario_id = $2' || v_cursor || v_orden;
  execute 'prepare s_pagina(uuid) as select ' || v_cols || ' from public.historial_fases where vehiculo_id = $1 and usuario_id is null' || v_orden;
  execute 'prepare s_cursor(uuid, timestamptz, bigint) as select ' || v_cols || ' from public.historial_fases where vehiculo_id = $1 and usuario_id is null'
    || ' and creado_en <= $2 and (creado_en < $2 or id < $3)' || v_orden;
  execute 'prepare f_pagina(uuid, uuid) as select ' || v_cols || ' from public.historial_fases where vehiculo_id = $1 and a_fase_id = $2' || v_orden;
  execute 'prepare f_cursor(uuid, uuid, timestamptz, bigint) as select ' || v_cols || ' from public.historial_fases where vehiculo_id = $1 and a_fase_id = $2' || v_cursor || v_orden;
end $$;

create function pg_temp.como(p_quien text) returns void language plpgsql as $$
declare v_id uuid := (select id from _p where clave = p_quien);
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;

-- La dueña mira el vehículo caliente con cada filtro: la página 1 y una profunda (la fila 60 de las 100 del filtro).
create function pg_temp.rutas(p_fase text) returns void language plpgsql as $$
declare c record; v_m jsonb; v_v uuid := (select id from _v where i = 0); v_q text; v_ruta text;
begin
  perform pg_temp.como('duena');
  for c in select * from _cur loop
    foreach v_ruta in array array['página 1', 'profunda'] loop
      v_q := case c.filtro
        when 'quién' then case v_ruta when 'página 1' then format('execute q_pagina(%L, %L)', v_v, c.valor) else format('execute q_cursor(%L, %L, %L, %s)', v_v, c.valor, c.ts, c.id) end
        when 'sistema' then case v_ruta when 'página 1' then format('execute s_pagina(%L)', v_v) else format('execute s_cursor(%L, %L, %s)', v_v, c.ts, c.id) end
        else case v_ruta when 'página 1' then format('execute f_pagina(%L, %L)', v_v, c.valor) else format('execute f_cursor(%L, %L, %L, %s)', v_v, c.valor, c.ts, c.id) end
      end;
      v_m := pg_temp.medir(v_q);
      insert into _med values (p_fase, c.filtro, v_ruta, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, v_m -> 'indices', (v_m ->> 'seq')::boolean,
        (v_m ->> 'sort')::boolean, (v_m ->> 'descartadas')::numeric, (v_m ->> 'filas')::numeric);
    end loop;
  end loop;
end $$;

create function pg_temp.fallas(p_fase text, p_quien_idx text, p_fase_idx text) returns text language plpgsql as $$
declare r record; v_fallas text := ''; c_ms constant numeric := 50; c_buf constant bigint := 1500; c_filas constant numeric := 200; v_idx text;
begin
  for r in select * from _med where fase = p_fase order by filtro, ruta loop
    v_idx := case r.filtro when 'fase' then p_fase_idx else p_quien_idx end;
    if r.ms > c_ms then v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s ms, el presupuesto es %s', r.fase, r.filtro, r.ruta, round(r.ms, 1), c_ms); end if;
    if r.buffers > c_buf then v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s buffers, el presupuesto es %s', r.fase, r.filtro, r.ruta, r.buffers, c_buf); end if;
    if r.seq then v_fallas := v_fallas || format(E'\n  %s · %s · %s recorre historial_fases entera', r.fase, r.filtro, r.ruta); end if;
    -- Un `Sort` chico vale: con pocas filas estimadas, el plan genérico junta por bitmap las del filtro del vehículo (≤ 100 aquí) y las ordena. Lo que no vale es leer más que eso.
    if r.filas > c_filas then v_fallas := v_fallas || format(E'\n  %s · %s · %s lee %s filas%s', r.fase, r.filtro, r.ruta, r.filas, case when r.sort then ' y las ordena' else '' end); end if;
    if not r.indices ? v_idx then v_fallas := v_fallas || format(E'\n  %s · %s · %s no camina %s: %s', r.fase, r.filtro, r.ruta, v_idx, r.indices); end if;
    -- La profunda descarta la fila del cursor; lo demás sería recorrer lo que no es del filtro.
    if r.descartadas > 50 then v_fallas := v_fallas || format(E'\n  %s · %s · %s descarta %s filas', r.fase, r.filtro, r.ruta, r.descartadas); end if;
  end loop;
  return v_fallas;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 1: 50.000 cambios; fase 2: 250.000
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(1, 50000);
analyze public.historial_fases;
-- El cursor profundo de cada filtro: su fila 60 de las 100 del vehículo caliente (como postgres, una vez).
create temp table _cur as
  select 'quién'::text as filtro, (select id from _p where clave = 'ana') as valor, h.creado_en as ts, h.id from public.historial_fases h
   where h.vehiculo_id = (select id from _v where i = 0) and h.usuario_id = (select id from _p where clave = 'ana') order by h.creado_en desc, h.id desc offset 60 limit 1;
insert into _cur select 'sistema', null, h.creado_en, h.id from public.historial_fases h
   where h.vehiculo_id = (select id from _v where i = 0) and h.usuario_id is null order by h.creado_en desc, h.id desc offset 60 limit 1;
insert into _cur select 'fase', (select id from _f where i = 3), h.creado_en, h.id from public.historial_fases h
   where h.vehiculo_id = (select id from _v where i = 0) and h.a_fase_id = (select id from _f where i = 3) order by h.creado_en desc, h.id desc offset 60 limit 1;
do $$ begin
  if (select count(*) from _cur) <> 3 then raise exception 'esperaba el cursor profundo de los tres filtros'; end if;
end $$;
grant select on _cur to authenticated;
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.preparar();
select pg_temp.rutas('50.000');
reset role;

select pg_temp.rellenar(50001, 250000);
analyze public.historial_fases;
do $$ begin
  if (select count(*) from public.historial_fases where vehiculo_id in (select id from _v)) <> 250000 then raise exception 'esperaba 250.000 cambios de los vehículos de la medición'; end if;
  if (select count(*) from public.historial_fases where vehiculo_id = (select id from _v where i = 0)) <> 5000 then raise exception 'el vehículo caliente debía tener 5.000 cambios'; end if;
end $$;
set local role authenticated;
select pg_temp.rutas('250.000');
reset role;

do $$
declare
  r record; g record;
  v_fallas text := pg_temp.fallas('50.000', 'historial_fases_vehiculo_quien_idx', 'historial_fases_vehiculo_fase_idx')
                || pg_temp.fallas('250.000', 'historial_fases_vehiculo_quien_idx', 'historial_fases_vehiculo_fase_idx');
begin
  for r in select * from _med order by fase, filtro, ruta loop
    raise notice 'medicion|Historial de fases por %, % · % (ms)|%', r.filtro, r.fase, r.ruta, round(r.ms, 2);
    raise notice 'medicion|Historial de fases por %, % · % (buffers)|%', r.filtro, r.fase, r.ruta, r.buffers;
    raise notice 'medicion|Historial de fases por %, % · % (filas leídas)|%', r.filtro, r.fase, r.ruta, r.filas;
  end loop;
  for g in select a.filtro, a.ruta, a.ms as ms_50, b.ms as ms_250, a.buffers as b_50, b.buffers as b_250
             from _med a join _med b on b.filtro = a.filtro and b.ruta = a.ruta and a.fase = '50.000' and b.fase = '250.000' loop
    if g.ms_250 > greatest(1.5 * g.ms_50, g.ms_50 + 3) then v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s ms y %s', g.filtro, g.ruta, round(g.ms_50, 1), round(g.ms_250, 1)); end if;
    if g.b_250 > 1.2 * g.b_50 + 20 then v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s buffers y %s', g.filtro, g.ruta, g.b_50, g.b_250); end if;
  end loop;
  if v_fallas <> '' then raise exception 'El historial de fases filtrado rompe su presupuesto:%', v_fallas; end if;
end $$;

-- La guarda: sin los dos índices, la página camina `historial_fases_vehiculo_idx` y descarta lo que no es del filtro: tiene que romper los asserts.
drop index public.historial_fases_vehiculo_quien_idx;
drop index public.historial_fases_vehiculo_fase_idx;
analyze public.historial_fases;
set local role authenticated;
deallocate all;
select pg_temp.preparar();
select pg_temp.rutas('antes');
reset role;
do $$
declare v_antes text := pg_temp.fallas('antes', 'historial_fases_vehiculo_idx', 'historial_fases_vehiculo_idx'); r record;
begin
  for r in select * from _med where fase = 'antes' order by filtro, ruta loop
    raise notice 'medicion|Guarda, sin los índices, 250.000 · por % · % (ms)|%', r.filtro, r.ruta, round(r.ms, 2);
    raise notice 'medicion|Guarda, sin los índices, 250.000 · por % · % (buffers)|%', r.filtro, r.ruta, r.buffers;
  end loop;
  if v_antes !~ 'quién · página 1' or v_antes !~ 'fase · página 1' or v_antes !~ 'sistema · página 1' then
    raise exception 'la guarda no muerde: sin los índices alguna página cumple (fallas:%)', coalesce(nullif(v_antes, ''), ' ninguna');
  end if;
end $$;
rollback;
vacuum public.historial_fases;
