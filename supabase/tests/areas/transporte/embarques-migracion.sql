-- El movimiento de los textos de booking y contenedor a embarques y contenedores (`_embarques_desde_textos(regclass)`). No depende de otro archivo
-- (`SOLO=areas/transporte/embarques-migracion.sql`). Cada bloque abre su transacción y la revierte. Siembra `pg_temp.transportes_textos` como la
-- arma la migración (los textos ya no están en `transportes`).
--
-- Qué asegura:
--   M1. Un booking con dos contenedores y una unidad suelta da un embarque con los dos contenedores y la unidad directa; las unidades leen la ETA
--       del embarque y no guardan propios. Un contenedor sin booking queda sin embarque y su unidad conserva lo suyo; una unidad sin claves no
--       cambia. Un booking en dos orígenes da dos embarques. Un ítem va al origen del vehículo de su proyecto; uno de una clave con sólo ítems,
--       a un embarque sin origen; uno que sigue a su vehículo no cambia. Por campo gana el más repetido; empate: el más reciente. Una unidad con
--       otro booking sigue a su contenedor y se cuenta. Los números que devuelve.
--   M2. Una segunda pasada devuelve todo en 0 y deja `transportes`, `embarques` y `contenedores` idénticos (también `actualizado_en`).
--   M3. No escribe en la auditoría ni mueve la versión de las unidades.

create or replace function pg_temp.emm_sembrar() returns jsonb language plpgsql as $f$
declare
  s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  o1 uuid; o2 uuid; n1 uuid; n2 uuid; pr uuid; pr2 uuid;
  v jsonb := '{}'::jsonb; k text; id uuid;
begin
  insert into public.origenes (clave, nombre, tipo) values ('emm1_' || s, 'emm origen 1 ' || s, 'manual') returning origenes.id into o1;
  insert into public.origenes (clave, nombre, tipo) values ('emm2_' || s, 'emm origen 2 ' || s, 'manual') returning origenes.id into o2;
  insert into public.navieras (nombre) values ('emm naviera 1 ' || s) returning navieras.id into n1;
  insert into public.navieras (nombre) values ('emm naviera 2 ' || s) returning navieras.id into n2;
  foreach k in array array['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12', 'v13'] loop
    insert into public.vehiculos (origen_id, titulo) values (o1, 'emm ' || k) returning vehiculos.id into id;
    v := v || jsonb_build_object(k, id);
  end loop;
  insert into public.vehiculos (origen_id, titulo) values (o2, 'emm w1') returning vehiculos.id into id;
  v := v || jsonb_build_object('w1', id);
  insert into public.repuestos_proyectos (vehiculo_id) values ((v ->> 'v7')::uuid) returning repuestos_proyectos.id into pr;
  insert into public.repuestos_proyectos (vehiculo_etiqueta) values ('emm proyecto 2') returning repuestos_proyectos.id into pr2;
  insert into public.repuestos_items (proyecto_id, descripcion) values (pr, 'emm i1') returning repuestos_items.id into id;
  v := v || jsonb_build_object('i1', id);
  insert into public.repuestos_items (proyecto_id, descripcion) values (pr2, 'emm i2') returning repuestos_items.id into id;
  v := v || jsonb_build_object('i2', id);
  insert into public.repuestos_items (proyecto_id, descripcion) values (pr, 'emm i3') returning repuestos_items.id into id;
  v := v || jsonb_build_object('i3', id);
  v := v || jsonb_build_object('o1', o1, 'o2', o2, 'n1', n1, 'n2', n2);

  -- (clave, booking, contenedor, naviera, eta, actualizado_en). Las fechas de cambio fijas: el empate lo gana la más reciente.
  create temp table emm_casos (k text, booking text, contenedor text, naviera uuid, eta date, cambio timestamptz, sigue boolean default false);
  insert into emm_casos values
    ('v1', 'B1', 'C1', null, '2026-12-10', '2026-11-01 10:00+00', false),
    ('v2', 'b 1', 'c1', null, null, '2026-11-01 10:00+00', false),      -- se normaliza a B1 / C1
    ('v13', 'B5', 'C1', null, null, '2026-11-01 10:00+00', false),      -- otro booking: sigue a C1 (B1)
    ('v3', 'B1', 'C2', null, null, '2026-11-01 10:00+00', false),
    ('v4', 'B1', null, null, null, '2026-11-01 10:00+00', false),
    ('v5', null, 'C3', n1, '2026-12-20', '2026-11-01 10:00+00', false), -- contenedor sin booking
    ('v6', null, null, n1, '2026-12-21', '2026-11-01 10:00+00', false), -- sin claves
    ('v7', 'B2', null, null, null, '2026-11-01 10:00+00', false),
    ('w1', 'B2', null, null, null, '2026-11-01 10:00+00', false),       -- el mismo booking en otro origen
    ('i1', 'B2', null, null, null, '2026-11-01 10:00+00', false),       -- ítem: el origen del vehículo de su proyecto (v7, o1)
    ('i2', 'B9', null, null, null, '2026-11-01 10:00+00', false),       -- ítem de una clave sólo de ítems: sin origen
    ('i3', null, null, null, null, '2026-11-01 10:00+00', true), -- sigue a su vehículo
    ('v8', 'B3', null, n1, null, '2026-11-01 10:00+00', false),         -- empate: gana la más reciente (v9, n2)
    ('v9', 'B3', null, n2, null, '2026-11-02 10:00+00', false),
    ('v10', 'B4', null, n1, null, '2026-11-01 10:00+00', false),        -- moda: n1 le gana a la más reciente
    ('v11', 'B4', null, n1, null, '2026-11-01 10:00+00', false),
    ('v12', 'B4', null, n2, null, '2026-11-03 10:00+00', false);

  set local session_replication_role = replica;
  insert into public.transportes (vehiculo_id, repuesto_id, sigue_al_vehiculo, naviera_id, eta_el, actualizado_en, creado_en)
  select case when c.k like 'i%' then null else (v ->> c.k)::uuid end, case when c.k like 'i%' then (v ->> c.k)::uuid end,
         c.sigue, c.naviera, c.eta, c.cambio, c.cambio
    from emm_casos c;
  set local session_replication_role = origin;

  create temp table transportes_textos as
  select t.id as transporte_id, t.vehiculo_id, t.repuesto_id, ve.origen_id as origen_vehiculo, pv.origen_id as origen_proyecto,
         c.booking, c.contenedor, t.naviera_id, t.puerto_origen_id, t.puerto_destino_id, t.zarpe_el, t.eta_el, t.arribo_el,
         t.creado_en, t.actualizado_en
    from emm_casos c
    join public.transportes t on t.vehiculo_id = case when c.k like 'i%' then null else (v ->> c.k)::uuid end
                              or t.repuesto_id = case when c.k like 'i%' then (v ->> c.k)::uuid end
    left join public.vehiculos ve on ve.id = t.vehiculo_id
    left join public.repuestos_items i on i.id = t.repuesto_id
    left join public.repuestos_proyectos p on p.id = i.proyecto_id
    left join public.vehiculos pv on pv.id = p.vehiculo_id
   where c.booking is not null or c.contenedor is not null;
  return v;
end $f$;

-- El transporte de la unidad `k`, resuelto.
create or replace function pg_temp.emm_de(p jsonb, k text) returns public.transportes_con_embarque language sql as $f$
  select t.* from public.transportes_con_embarque t
   where t.vehiculo_id = case when k like 'i%' then null else (p ->> k)::uuid end
      or t.repuesto_id = case when k like 'i%' then (p ->> k)::uuid end;
$f$;

create or replace function pg_temp.emm_fila(p jsonb, k text) returns public.transportes language sql as $f$
  select t.* from public.transportes t
   where t.vehiculo_id = case when k like 'i%' then null else (p ->> k)::uuid end
      or t.repuesto_id = case when k like 'i%' then (p ->> k)::uuid end;
$f$;

create or replace function pg_temp.emm_embarque(p_origen uuid, p_booking text) returns public.embarques language sql as $f$
  select e.* from public.embarques e where e.booking = p_booking and e.origen_id is not distinct from p_origen;
$f$;

create or replace function pg_temp.emm_foto(p jsonb) returns jsonb language sql as $f$
  select jsonb_build_object(
    't', (select jsonb_agg(to_jsonb(t) order by t.id) from public.transportes t
           where t.vehiculo_id in (select value::uuid from jsonb_each_text(p) where key ~ '^(v|w)')
              or t.repuesto_id in (select value::uuid from jsonb_each_text(p) where key ~ '^i')),
    'e', (select jsonb_agg(to_jsonb(e) order by e.id) from public.embarques e where e.booking ~ '^B[0-9]$'),
    'c', (select jsonb_agg(to_jsonb(c) order by c.id) from public.contenedores c where c.numero ~ '^C[0-9]$'));
$f$;

-- @test embarques: la migración crea embarques y contenedores por origen y asigna las unidades (M1)
begin;
do $$
declare p jsonb := pg_temp.emm_sembrar(); r jsonb; k text; e1 public.embarques; c1 public.contenedores; c3 public.contenedores; x public.transportes_con_embarque;
  f public.transportes; o1 uuid; o2 uuid;
begin
  o1 := (p ->> 'o1')::uuid; o2 := (p ->> 'o2')::uuid;
  r := public._embarques_desde_textos('pg_temp.transportes_textos');
  if r is distinct from jsonb_build_object(
       'embarques_creados', 7, 'contenedores_creados', 3, 'unidades_asignadas', 15, 'embarques_con_datos_distintos', 2,
       'bookings_en_varios_origenes', 1, 'contenedores_en_varios_origenes', 0, 'vehiculos_con_otro_booking_por_su_contenedor', 1,
       'claves_corregidas', 0, 'sin_origen', jsonb_build_object('embarques', 1, 'contenedores', 0)) then
    raise exception 'M1: los números no son los esperados: %', r;
  end if;
  -- Un booking con dos contenedores y una unidad suelta.
  e1 := pg_temp.emm_embarque(o1, 'B1');
  select * into c1 from public.contenedores c where c.numero = 'C1' and c.origen_id = o1;
  if e1.id is null or c1.embarque_id is distinct from e1.id
     or (select c.embarque_id from public.contenedores c where c.numero = 'C2' and c.origen_id = o1) is distinct from e1.id then
    raise exception 'M1: C1 y C2 debían ir en el embarque B1 de o1';
  end if;
  if e1.eta_el is distinct from '2026-12-10'::date then raise exception 'M1: el embarque B1 debía tomar la ETA de v1: %', e1.eta_el; end if;
  foreach k in array array['v1', 'v2', 'v13', 'v3', 'v4'] loop
    x := pg_temp.emm_de(p, k);
    if x.embarque_id is distinct from e1.id or x.booking is distinct from 'B1' or x.eta_el is distinct from '2026-12-10'::date then
      raise exception 'M1: % debía leer el embarque B1 y su ETA: %', k, to_jsonb(x);
    end if;
  end loop;
  f := pg_temp.emm_fila(p, 'v1');
  if f.contenedor_id is distinct from c1.id or f.embarque_id is not null or f.eta_el is not null then
    raise exception 'M1: v1 debía ir en C1 sin ETA propia: %', to_jsonb(f);
  end if;
  f := pg_temp.emm_fila(p, 'v4');
  if f.embarque_id is distinct from e1.id or f.contenedor_id is not null then raise exception 'M1: v4 debía ir suelta en B1: %', to_jsonb(f); end if;
  -- El contenedor sin booking y la unidad sin claves.
  select * into c3 from public.contenedores c where c.numero = 'C3' and c.origen_id = o1;
  f := pg_temp.emm_fila(p, 'v5');
  if c3.embarque_id is not null or f.contenedor_id is distinct from c3.id or f.eta_el is distinct from '2026-12-20'::date
     or f.naviera_id is distinct from (p ->> 'n1')::uuid then
    raise exception 'M1: v5 debía ir en C3, sin embarque y con lo suyo: %', to_jsonb(f);
  end if;
  f := pg_temp.emm_fila(p, 'v6');
  if f.contenedor_id is not null or f.embarque_id is not null or f.eta_el is distinct from '2026-12-21'::date then
    raise exception 'M1: v6 no debía cambiar: %', to_jsonb(f);
  end if;
  -- Un booking en dos orígenes y los ítems.
  if (pg_temp.emm_de(p, 'v7')).embarque_id is distinct from (pg_temp.emm_embarque(o1, 'B2')).id
     or (pg_temp.emm_de(p, 'w1')).embarque_id is distinct from (pg_temp.emm_embarque(o2, 'B2')).id
     or (pg_temp.emm_embarque(o1, 'B2')).id = (pg_temp.emm_embarque(o2, 'B2')).id then
    raise exception 'M1: B2 debía dar un embarque por origen';
  end if;
  if (pg_temp.emm_de(p, 'i1')).embarque_id is distinct from (pg_temp.emm_embarque(o1, 'B2')).id then
    raise exception 'M1: i1 debía ir al B2 del origen del vehículo de su proyecto';
  end if;
  if (pg_temp.emm_de(p, 'i2')).embarque_id is distinct from (pg_temp.emm_embarque(null, 'B9')).id or (pg_temp.emm_embarque(null, 'B9')).id is null then
    raise exception 'M1: i2 debía ir a un embarque B9 sin origen';
  end if;
  f := pg_temp.emm_fila(p, 'i3');
  if not f.sigue_al_vehiculo or f.contenedor_id is not null or f.embarque_id is not null then raise exception 'M1: i3 no debía cambiar'; end if;
  -- Empate y moda.
  if (pg_temp.emm_embarque(o1, 'B3')).naviera_id is distinct from (p ->> 'n2')::uuid then raise exception 'M1: el empate lo gana la más reciente'; end if;
  if (pg_temp.emm_embarque(o1, 'B4')).naviera_id is distinct from (p ->> 'n1')::uuid then raise exception 'M1: la moda le gana a la más reciente'; end if;
  -- El booking que ninguna unidad conserva queda como embarque, vacío.
  if (pg_temp.emm_embarque(o1, 'B5')).id is null then raise exception 'M1: B5 debía quedar como embarque'; end if;
end $$;
rollback;

-- @test embarques: una segunda pasada no crea ni cambia nada (M2)
begin;
do $$
declare p jsonb := pg_temp.emm_sembrar(); antes jsonb; r jsonb;
begin
  perform public._embarques_desde_textos('pg_temp.transportes_textos');
  antes := pg_temp.emm_foto(p);
  r := public._embarques_desde_textos('pg_temp.transportes_textos');
  if r is distinct from jsonb_build_object(
       'embarques_creados', 0, 'contenedores_creados', 0, 'unidades_asignadas', 0, 'embarques_con_datos_distintos', 0,
       'bookings_en_varios_origenes', 0, 'contenedores_en_varios_origenes', 0, 'vehiculos_con_otro_booking_por_su_contenedor', 0,
       'claves_corregidas', 0, 'sin_origen', jsonb_build_object('embarques', 0, 'contenedores', 0)) then
    raise exception 'M2: la segunda pasada debía dar todo en 0: %', r;
  end if;
  if pg_temp.emm_foto(p) is distinct from antes then raise exception 'M2: la segunda pasada cambió algo'; end if;
end $$;
rollback;

-- @test embarques: la migración no escribe en la auditoría ni mueve las versiones (M3)
begin;
do $$
declare p jsonb := pg_temp.emm_sembrar(); ultima bigint := (select coalesce(max(id), 0) from public.actividad); antes jsonb;
begin
  select jsonb_object_agg(t.id, t.actualizado_en) into antes from public.transportes t
   where t.id in (select x.transporte_id from pg_temp.transportes_textos x);
  perform public._embarques_desde_textos('pg_temp.transportes_textos');
  if exists (select 1 from public.actividad where id > ultima) then
    raise exception 'M3: la migración escribió en la auditoría: %', (select jsonb_agg(accion) from public.actividad where id > ultima);
  end if;
  if (select jsonb_object_agg(t.id, t.actualizado_en) from public.transportes t
       where t.id in (select x.transporte_id from pg_temp.transportes_textos x)) is distinct from antes then
    raise exception 'M3: la migración movió la versión de una unidad';
  end if;
  if current_setting('session_replication_role') <> 'origin' then raise exception 'M3: dejó la auditoría apagada'; end if;
end $$;
rollback;
