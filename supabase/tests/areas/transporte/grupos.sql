-- La lista de grupos de transporte (paso 6.07-3, C16–C24, D35–D40). No depende de otro archivo (`SOLO=areas/transporte/grupos.sql`). Cada bloque abre su
-- transacción y la revierte. Los ayudantes son copia de `grupo.sql`; los embarques, contenedores y transportes se siembran como superusuario (lo que
-- se prueba es leer). Las claves llevan un prefijo propio de la corrida, y las búsquedas se acotan con él.
--
-- Qué asegura:
--   T1. Visibilidad y origen: la lista es de un origen (p_origen). Un booking con una unidad en cada origen y un repuesto cuenta en cada origen sólo
--       la suya (transporte_grupo, el panel, sigue juntando todas); una unidad en la papelera no cuenta (D19); un booking de sólo ocultas no sale; el
--       de repuestos (sin origen) no sale en ninguno; sin logistica.ver ni repuestos.ver, 42501; sin origen, 22023 p_origen.
--   T2. Datos y filtros: dos unidades con distinta ETA dan eta_el nulo y «eta_el» en varios, la naviera común sale; naviera, en_transito y
--       puerto_destino dejan sólo los grupos con alguna que cumple; un filtro de más, un uuid mal escrito o un tipo que no existe, 22023 con la clave.
--   T3. Cursor y prefijo: con tope 2, dos grupos y siguiente = el segundo; desde ahí, el resto y siguiente nulo; un prefijo con minúsculas y espacios
--       acota; un prefijo de 2, 22023; el cursor nulo y el vacío son la primera página; el cursor es el id del contenedor (o del embarque) de la
--       clave (D43): una clave, un id que no existe, el de otro origen o el de un transporte dan 22023.
--   T4. Recorrido y escala: con 2.000 transportes en 1.000 embarques que no cumplen la naviera antes del que sí, la primera llamada vuelve cortada,
--       sin grupos y con un siguiente que es un id, no una clave (D43); seguir desde él llega al que cumple. La sonda y las filas del grupo, en su plan
--       genérico, van por un índice con el origen en su condición (la sonda: embarques_origen_booking_idx o, con un solo origen sembrado, el
--       planificador puede preferir embarques_booking_origen_key; con volumen, docs/RENDIMIENTO.md), embarques_booking_origen_key y
--       transportes_embarque_idx (las filas), sin recorrer embarques, contenedores ni transportes.

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

create or replace function pg_temp.trn_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

-- Un origen con vehículos que se ven, otro que no, y un prefijo propio para las claves.
create or replace function pg_temp.trn_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; s text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
begin
  insert into public.origenes (clave, nombre, tipo) values ('trg_' || lower(s), 'trg origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('trg2_' || lower(s), 'trg origen 2 ' || s, 'manual') returning id into o2;
  return jsonb_build_object('o', o, 'o2', o2, 'p', 'Q' || s);
end $f$;

-- El transporte de un vehículo o un ítem (como superusuario) en el embarque `p_booking` y el contenedor `p_contenedor` de su origen (nulo = de
-- repuestos), que se crean si faltan: el embarque nuevo lleva la naviera y las fechas; sin embarque, son de la unidad.
create or replace function pg_temp.trn_transporte(p_vehiculo uuid, p_repuesto uuid, p_origen uuid, p_booking text, p_contenedor text,
  p_naviera uuid, p_eta date, p_arribo date, p_destino uuid) returns void language plpgsql as $f$
declare e uuid; c uuid;
begin
  if p_booking is not null then
    select x.id into e from public.embarques x where x.booking = p_booking and x.origen_id is not distinct from p_origen;
    if e is null then
      insert into public.embarques (origen_id, booking, naviera_id, eta_el, arribo_el, puerto_destino_id)
      values (p_origen, p_booking, p_naviera, p_eta, p_arribo, p_destino) returning id into e;
    end if;
  end if;
  if p_contenedor is not null then
    select x.id into c from public.contenedores x where x.numero = p_contenedor and x.origen_id is not distinct from p_origen;
    if c is null then
      insert into public.contenedores (origen_id, numero, embarque_id) values (p_origen, p_contenedor, e) returning id into c;
    end if;
  end if;
  insert into public.transportes (vehiculo_id, repuesto_id, contenedor_id, embarque_id, naviera_id, eta_el, arribo_el, puerto_destino_id)
  values (p_vehiculo, p_repuesto, c, case when c is null then e end,
          case when e is null then p_naviera end, case when e is null then p_eta end, case when e is null then p_arribo end,
          case when e is null then p_destino end);
end $f$;

-- Un vehículo del origen con su transporte: devuelve el id del vehículo.
create or replace function pg_temp.trn_unidad(p_origen uuid, p_booking text, p_contenedor text default null, p_naviera uuid default null,
  p_eta date default null, p_arribo date default null, p_destino uuid default null) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo) values (p_origen, 'trg ' || coalesce(p_booking, p_contenedor)) returning id into v;
  perform pg_temp.trn_transporte(v, null, p_origen, p_booking, p_contenedor, p_naviera, p_eta, p_arribo, p_destino);
  return v;
end $f$;

create or replace function pg_temp.trn_grupos(p_quien uuid, p_origen uuid, p_tipo text, p_filtros jsonb, p_tope int default 50, p_desde text default null)
returns jsonb language sql as $f$
  select pg_temp.trn_corre(p_quien, format('select public.transporte_grupos(%L, %L, %L, %L, %L)', p_tipo, p_desde, p_tope, p_filtros, p_origen));
$f$;

-- El grupo de clave `p_clave` en la respuesta (o null).
create or replace function pg_temp.trn_g(p_r jsonb, p_clave text) returns jsonb language sql as $f$
  select x from jsonb_array_elements(coalesce(p_r -> 'grupos', '[]'::jsonb)) x where x ->> 'clave' = p_clave;
$f$;

-- Las claves de la respuesta, en orden.
create or replace function pg_temp.trn_claves(p_r jsonb) returns text[] language sql as $f$
  select coalesce(array_agg(e.x ->> 'clave' order by e.n), '{}') from jsonb_array_elements(coalesce(p_r -> 'grupos', '[]'::jsonb)) with ordinality as e (x, n);
$f$;

-- @test transporte: la lista de grupos es de un origen (el panel junta todos), sin la papelera ni los grupos de sólo ocultas (T1)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p text := t ->> 'p'; todo uuid; uno uuid; rep uuid; sin uuid; pr uuid; item uuid; papelera uuid;
  r jsonb; g jsonb; k text := p || 'BK1'; o uuid := (t ->> 'o')::uuid; o2 uuid := (t ->> 'o2')::uuid;
begin
  todo := pg_temp.trn_persona(array['logistica.ver', 'repuestos.ver']);
  uno := pg_temp.trn_persona(array['logistica.ver@' || (t ->> 'o')]);
  rep := pg_temp.trn_persona(array['repuestos.ver']);
  sin := pg_temp.trn_persona(array['vehiculos.ver']);
  perform pg_temp.trn_unidad((t ->> 'o')::uuid, k);
  perform pg_temp.trn_unidad((t ->> 'o2')::uuid, k);
  papelera := pg_temp.trn_unidad((t ->> 'o')::uuid, k);
  update public.vehiculos set eliminado_en = now() where id = papelera;
  insert into public.repuestos_proyectos (vehiculo_etiqueta) values ('trg proyecto') returning id into pr;
  insert into public.repuestos_items (proyecto_id, descripcion) values (pr, 'trg ítem') returning id into item;
  perform pg_temp.trn_transporte(null, item, null, k, null, null, null, null, null);
  perform pg_temp.trn_unidad((t ->> 'o2')::uuid, p || 'BK2');
  -- El panel del grupo sigue entre orígenes: las dos unidades vivas y el repuesto.
  g := pg_temp.trn_corre(todo, format('select public.transporte_grupo(%L, %L)', 'booking', k));
  if jsonb_array_length(g -> 'unidades') <> 3 then
    raise exception 'T1: transporte_grupo debía juntar los dos orígenes y el repuesto: %', g;
  end if;
  r := pg_temp.trn_grupos(todo, o, 'booking', jsonb_build_object('prefijo', p));
  if pg_temp.trn_claves(r) is distinct from array[k] or (pg_temp.trn_g(r, k) ->> 'unidades')::int <> 1
     or pg_temp.trn_g(r, k) -> 'hay_ocultas' <> 'false'::jsonb then
    raise exception 'T1: en el origen 1 debía estar sólo BK1 con su unidad (sin la de la papelera ni las de otro origen): %', r;
  end if;
  r := pg_temp.trn_grupos(todo, o2, 'booking', jsonb_build_object('prefijo', p));
  if pg_temp.trn_claves(r) is distinct from array[k, p || 'BK2'] or (pg_temp.trn_g(r, k) ->> 'unidades')::int <> 1 then
    raise exception 'T1: en el origen 2 debían estar BK1 (con la suya) y BK2: %', r;
  end if;
  r := pg_temp.trn_grupos(uno, o, 'booking', jsonb_build_object('prefijo', p));
  if (pg_temp.trn_g(r, k) ->> 'unidades')::int <> 1 or pg_temp.trn_g(r, k) -> 'hay_ocultas' <> 'false'::jsonb then
    raise exception 'T1: quien ve el origen 1 debía ver su unidad sin ocultas: %', r;
  end if;
  r := pg_temp.trn_grupos(uno, o2, 'booking', jsonb_build_object('prefijo', p));
  if r -> 'grupos' <> '[]'::jsonb then
    raise exception 'T1: en un origen que no ve, ningún grupo (son de sólo ocultas): %', r;
  end if;
  r := pg_temp.trn_grupos(rep, o, 'booking', jsonb_build_object('prefijo', p));
  if r -> 'grupos' <> '[]'::jsonb then
    raise exception 'T1: con sólo repuestos.ver, el embarque de repuestos no es de ningún origen: %', r;
  end if;
  perform pg_temp.trn_es('T1 sin origen', pg_temp.trn_grupos(todo, null, 'booking', null), '22023', 'p_origen');
  perform pg_temp.trn_es('T1 sin las claves', pg_temp.trn_grupos(sin, o, 'booking', null), '42501');
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: los datos comunes o «varios» y los filtros cerrados de la lista de grupos (T2)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p text := t ->> 'p'; q uuid; n1 uuid; n2 uuid; dest uuid; r jsonb; g jsonb;
begin
  q := pg_temp.trn_persona(array['logistica.ver']);
  insert into public.navieras (nombre) values ('trg naviera 1 ' || p) returning id into n1;
  insert into public.navieras (nombre) values ('trg naviera 2 ' || p) returning id into n2;
  insert into public.puertos (nombre) values ('trg puerto ' || p) returning id into dest;
  perform pg_temp.trn_unidad((t ->> 'o')::uuid, null, p || 'CA', n1, date '2026-12-01');
  perform pg_temp.trn_unidad((t ->> 'o')::uuid, null, p || 'CA', n1, date '2026-12-05', null, dest);
  perform pg_temp.trn_unidad((t ->> 'o')::uuid, null, p || 'CB', n2, date '2026-12-01', date '2026-12-02');
  r := pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', jsonb_build_object('prefijo', p));
  g := pg_temp.trn_g(r, p || 'CA');
  if g ->> 'naviera_id' is distinct from n1::text or g -> 'eta_el' <> 'null'::jsonb or not (g -> 'varios' ? 'eta_el')
     or not (g -> 'varios' ? 'puerto_destino_id') or g -> 'varios' ? 'naviera_id' or (g ->> 'unidades')::int <> 2 then
    raise exception 'T2: CA debía tener la naviera común, la ETA y el destino en varios: %', g;
  end if;
  g := pg_temp.trn_g(r, p || 'CB');
  if g ->> 'eta_el' is distinct from '2026-12-01' or g -> 'varios' <> '[]'::jsonb then raise exception 'T2: CB debía tener su ETA y nada en varios: %', g; end if;
  r := pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', jsonb_build_object('prefijo', p, 'naviera', n2));
  if pg_temp.trn_claves(r) is distinct from array[p || 'CB'] then raise exception 'T2: la naviera 2 debía dejar sólo CB: %', r; end if;
  r := pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', jsonb_build_object('prefijo', p, 'en_transito', true));
  if pg_temp.trn_claves(r) is distinct from array[p || 'CA'] then raise exception 'T2: en tránsito debía dejar sólo CA: %', r; end if;
  r := pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', jsonb_build_object('prefijo', p, 'en_transito', false));
  if pg_temp.trn_claves(r) is distinct from array[p || 'CB'] then raise exception 'T2: con arribo debía dejar sólo CB: %', r; end if;
  r := pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', jsonb_build_object('prefijo', p, 'puerto_destino', dest));
  if pg_temp.trn_claves(r) is distinct from array[p || 'CA'] then raise exception 'T2: el destino debía dejar sólo CA: %', r; end if;
  perform pg_temp.trn_es('T2 filtro de más', pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', '{"origen": "x"}'), '22023', 'origen');
  perform pg_temp.trn_es('T2 uuid mal escrito', pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', '{"naviera": "no-es"}'), '22023', 'naviera');
  perform pg_temp.trn_es('T2 en_transito que no es sí o no', pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', '{"en_transito": "si"}'), '22023', 'en_transito');
  perform pg_temp.trn_es('T2 tipo', pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'naviera', null), '22023', 'tipo');
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: la lista de grupos por cursor y por prefijo (T3)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p text := t ->> 'p'; q uuid; r jsonb; r2 jsonb;
begin
  q := pg_temp.trn_persona(array['logistica.ver']);
  perform pg_temp.trn_unidad((t ->> 'o')::uuid, null, p || 'ABCU1');
  perform pg_temp.trn_unidad((t ->> 'o')::uuid, null, p || 'ABCU2');
  perform pg_temp.trn_unidad((t ->> 'o')::uuid, null, p || 'ABDU1');
  perform pg_temp.trn_unidad((t ->> 'o')::uuid, null, p || 'ZZZU1');
  r := pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', jsonb_build_object('prefijo', p), 2);
  if pg_temp.trn_claves(r) is distinct from array[p || 'ABCU1', p || 'ABCU2']
     or r ->> 'siguiente' is distinct from (select x.id::text from public.contenedores x where x.numero = p || 'ABCU2')
     or r -> 'cortada' <> 'false'::jsonb then
    raise exception 'T3: tope 2 debía dar ABCU1, ABCU2 y siguiente el contenedor ABCU2 (D43): %', r;
  end if;
  r := pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', jsonb_build_object('prefijo', p), 2, r ->> 'siguiente');
  if pg_temp.trn_claves(r) is distinct from array[p || 'ABDU1', p || 'ZZZU1'] or r -> 'siguiente' <> 'null'::jsonb then
    raise exception 'T3: desde ABCU2 debía dar ABDU1, ZZZU1 y siguiente nulo: %', r;
  end if;
  r := pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', jsonb_build_object('prefijo', lower(p) || 'ab c u'));
  if pg_temp.trn_claves(r) is distinct from array[p || 'ABCU1', p || 'ABCU2'] or r -> 'siguiente' <> 'null'::jsonb then
    raise exception 'T3: el prefijo con minúsculas y espacios debía dar sólo los dos ABCU: %', r;
  end if;
  perform pg_temp.trn_es('T3 prefijo de 2', pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', '{"prefijo": "q-1"}'), '22023', 'prefijo');
  -- C17 · el cursor nulo y el vacío son la primera página.
  r := pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', jsonb_build_object('prefijo', p), 2, null);
  r2 := pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', jsonb_build_object('prefijo', p), 2, '  ');
  if r is distinct from r2 then raise exception 'T3: el cursor vacío debía ser la primera página: % / %', r, r2; end if;
  -- D43 · cursor opaco (el id del contenedor de la clave). Un cursor que no es un id, el de uno que ya no existe o el de un transporte (el cursor de
  -- antes de los embarques), 22023: la lista vuelve a empezar.
  perform pg_temp.trn_es('T3 cursor que es una clave', pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', null, 1, p || 'ABCU2'), '22023', 'cursor');
  perform pg_temp.trn_es('T3 cursor de una fila que no existe', pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', null, 1, gen_random_uuid()::text), '22023', 'cursor');
  perform pg_temp.trn_unidad((t ->> 'o2')::uuid, null, p || 'OTRO1');
  perform pg_temp.trn_es('T3 cursor de otro origen',
    pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', null, 1, (select x.id::text from public.contenedores x where x.numero = p || 'OTRO1')), '22023', 'cursor');
  perform pg_temp.trn_es('T3 cursor de un transporte',
    pg_temp.trn_grupos(q, (t ->> 'o')::uuid, 'contenedor', null, 1,
      (select t.id::text from public.transportes t join public.contenedores x on x.id = t.contenedor_id where x.numero = p || 'ABCU2')), '22023', 'cursor');
end $$;
set constraints public.trg_transporte_invariante, public.trg_contenedor_invariante immediate;
rollback;

-- @test transporte: con 2.000 transportes que no cumplen antes del que sí, la lista vuelve cortada y se sigue; la sonda y el grupo van por su índice (T4)
begin;
create temporary table trn_t4 (p text, quien uuid, n2 uuid, o uuid) on commit drop;
do $$
declare t jsonb := pg_temp.trn_terreno(); p text := t ->> 'p'; q uuid; n1 uuid; n2 uuid;
begin
  q := pg_temp.trn_persona(array['logistica.ver']);
  insert into public.navieras (nombre) values ('trg t4 1 ' || p) returning id into n1;
  insert into public.navieras (nombre) values ('trg t4 2 ' || p) returning id into n2;
  -- 1.000 embarques de dos unidades con la naviera 1 y, al final, uno con la naviera 2.
  insert into public.embarques (origen_id, booking, naviera_id)
  select (t ->> 'o')::uuid, p || 'B' || lpad(n::text, 5, '0'), n1 from generate_series(1, 1000) n;
  with v as (
    insert into public.vehiculos (origen_id, titulo)
    select (t ->> 'o')::uuid, 'trg t4 ' || n from generate_series(1, 2000) n
    returning id, titulo
  )
  insert into public.transportes (vehiculo_id, embarque_id)
  select v.id, e.id from v
    join public.embarques e on e.booking = p || 'B' || lpad(((split_part(v.titulo, ' ', 3)::int + 1) / 2)::text, 5, '0')
                           and e.origen_id = (t ->> 'o')::uuid;
  perform pg_temp.trn_unidad((t ->> 'o')::uuid, p || 'C00001', null, n2);
  insert into trn_t4 values (p, q, n2, (t ->> 'o')::uuid);
end $$;
analyze public.embarques;
analyze public.contenedores;
analyze public.transportes;
do $$
declare x record; r jsonb; vueltas int := 0;
begin
  select * into x from trn_t4;
  r := pg_temp.trn_grupos(x.quien, x.o, 'booking', jsonb_build_object('prefijo', x.p, 'naviera', x.n2));
  if r -> 'cortada' <> 'true'::jsonb or r -> 'grupos' <> '[]'::jsonb or not pg_input_is_valid(r ->> 'siguiente', 'uuid') then
    raise exception 'T4: tras 2.000 filas debía volver cortada, sin grupos y con un siguiente que es un id, no una clave (D43): %', r;
  end if;
  loop
    vueltas := vueltas + 1;
    exit when r -> 'cortada' <> 'true'::jsonb or vueltas > 3;
    r := pg_temp.trn_grupos(x.quien, x.o, 'booking', jsonb_build_object('prefijo', x.p, 'naviera', x.n2), 50, r ->> 'siguiente');
  end loop;
  if pg_temp.trn_claves(r) is distinct from array[x.p || 'C00001'] or r -> 'siguiente' <> 'null'::jsonb then
    raise exception 'T4: siguiendo debía llegar al de la naviera 2: %', r;
  end if;
end $$;
-- El plan genérico de la sonda y de las filas del grupo (los mismos parámetros que plpgsql; las filas, la ruta directa de _transporte_de_la_clave).
set local plan_cache_mode = force_generic_plan;
prepare trn_sonda(uuid, text, text) as select min(e.booking) from public.embarques e where e.origen_id = $1 and e.booking >= $2 and e.booking > $3;
prepare trn_filas(text, uuid) as
  select t.id, t.vehiculo_id, t.repuesto_id, e.naviera_id from public.embarques e join public.transportes t on t.embarque_id = e.id
   where e.booking = $1 and ($2 is null or e.origen_id = $2)
     and (exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)
          or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null))
   limit 201;
do $$
declare consulta text; linea text; plan text; i int := 0; indices text[] := array['(embarques_origen_booking_idx|embarques_booking_origen_key) on embarques e\s+Index Cond: .*origen_id = \$1', 'embarques_booking_origen_key'];
  o uuid := (select x.o from trn_t4 x);
begin
  foreach consulta in array array[format('execute trn_sonda(%L, %L, %L)', o, '', 'Q'), format('execute trn_filas(%L, %L)', 'QB00001', o)] loop
    i := i + 1;
    plan := '';
    for linea in execute 'explain (costs off) ' || consulta loop
      plan := plan || linea || E'\n';
    end loop;
    if plan !~ indices[i] or (i = 2 and plan !~ 'transportes_embarque_idx') or plan ~ 'Seq Scan on (embarques|contenedores|transportes)' then
      raise exception 'T4: la lista de grupos dejó de ir por %: %', indices[i], plan;
    end if;
  end loop;
end $$;
deallocate trn_sonda;
deallocate trn_filas;
rollback;
