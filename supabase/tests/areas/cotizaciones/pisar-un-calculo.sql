-- Pisar un cálculo al cotizar (glosario: «Pisar un cálculo»; docs/COTIZADOR.md › «Pisar un cálculo»): la celda de un `tabla`, `tramo` o `calculo` que no es el
-- total se edita con el nivel de siempre y lo escrito queda fijo. No depende de otro archivo (`SOLO=areas/cotizaciones/pisar-un-calculo.sql`); cada bloque abre su
-- transacción y la revierte. La primera cuenta nace dueña: el terreno empieza por `pc_duena()`.
--
-- Qué asegura:
--   P1. `_cotizacion_pisables()`: los cálculos con celda del diseño (y el pct calculado de un secundario), sin el total ni lo que no tiene celda, ordenados; con un
--       id repetido manda el último nodo; de nadie (sin authenticated, anon ni PUBLIC), estable y con search_path vacío.
--   P2. La hoja: la celda de un cálculo se edita sin motivo; el porcentaje sigue al monto sólo en el par de la hoja (un pct que sólo él nombra); la celda de un
--       nivel que se ve y no se edita dice el nivel; la que no se ve no llega.
--   P3. Evaluar: lo escrito sobre un cálculo manda, reescribe el pct de su par y lo calculado va a `calculados` (sin pisados, no viene); un pct compartido no
--       se reescribe; el total y lo que no tiene celda se descartan; los `pisables` no los manda nadie (`entradas_invalidas`).
--   P4. Crear: con un cálculo pisado guarda lo escrito y nunca `calculados`; el total y lo que no tiene celda no se pisan; quien ve y no edita el nivel, 42501
--       `nodo_no_editable`; quien no lo ve, `nodo_inexistente`. Lo calculado de un nodo que quien mira no ve no viaja.
--   P5. Guardar: lo guardado de un par por la hoja no lleva su pct (`_cotizacion_entradas_de()`), el de un pct compartido sí; abrir y guardar sin tocar nada no
--       escribe; la revisión nombra el formato del cálculo pisado (`etiquetas.calculos`) sólo a quien lo ve.
--   P6. Cotizar encima se lleva lo pisado.

create temp sequence pc_telefono;

create or replace function pg_temp.pc_duena() returns uuid language plpgsql as $f$
declare v uuid;
begin
  select ur.usuario_id into v from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where r.clave = 'dueno' order by ur.usuario_id limit 1;
  if v is null then
    v := gen_random_uuid();
    insert into auth.users (id, email, raw_app_meta_data) values (v, v || '@ejemplo.com', '{"invitado": true}');
  end if;
  return v;
end $f$;

-- Una persona con un rol propio y esas claves en todos los orígenes.
create or replace function pg_temp.pc_persona(p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('pc_' || substr(replace(v_id::text, '-', ''), 1, 12), 'PC ' || substr(v_id::text, 1, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, detail, hint} si falla.
create or replace function pg_temp.pc_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_e text; v_m text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'detail', nullif(v_d, ''), 'hint', nullif(v_h, ''));
  end;
  reset role;
  return v;
end $f$;

-- Un origen con su fórmula publicada (la transferencia, un par por la hoja; el giro y el giro extra comparten su pct y el extra no tiene celda; el costo,
-- del nivel «costos»), un lead, un vehículo y tres personas: `k` ve y edita «costos», `kv` sólo lo ve y `a` no.
create or replace function pg_temp.pc_terreno() returns jsonb language plpgsql as $f$
declare duena uuid := pg_temp.pc_duena(); o uuid; f uuid; l uuid; v uuid;
  v_base constant text[] := array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'leads.ver', 'vehiculos.ver'];
  v_def jsonb := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
    jsonb_build_object('id', 'remate', 'tipo', 'input', 'etiqueta', 'Remate', 'bucket', 'origen'),
    jsonb_build_object('id', 'transf_pct', 'tipo', 'constante', 'etiqueta', 'Transferencia (%)', 'formato', 'pct'),
    jsonb_build_object('id', 'transferencia', 'tipo', 'calculo', 'op', 'porcentaje_de', 'de', jsonb_build_array('remate'), 'pct', 'transf_pct',
                       'etiqueta', 'Transferencia a USA', 'bucket', 'origen'),
    jsonb_build_object('id', 'giro_pct', 'tipo', 'constante', 'etiqueta', 'Giro (%)', 'formato', 'pct'),
    jsonb_build_object('id', 'giro', 'tipo', 'calculo', 'op', 'porcentaje_de', 'de', jsonb_build_array('remate'), 'pct', 'giro_pct', 'etiqueta', 'Giro', 'bucket', 'origen'),
    jsonb_build_object('id', 'giro_extra', 'tipo', 'calculo', 'op', 'porcentaje_de', 'de', jsonb_build_array('remate'), 'pct', 'giro_pct', 'etiqueta', 'Giro extra',
                       'bucket', 'origen'),
    jsonb_build_object('id', 'costo', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('remate'), 'etiqueta', 'Costo interno', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('remate', 'transferencia', 'giro', 'giro_extra', 'costo'),
                       'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'), 'total_en', 'tc');
  v_par jsonb := '{"transf_pct": 0.04, "giro_pct": 0.1}';
  v_dis jsonb := jsonb_build_object(
    'cabecera', jsonb_build_object('ver_total_bs', false, 'modos', jsonb_build_array(jsonb_build_object('clave', 'paralelo', 'nombre', 'Paralelo', 'total_en', 'tc',
      'buckets', jsonb_build_array(jsonb_build_object('bucket', 'origen', 'nodo', 'tc'))))),
    'secciones', jsonb_build_array(
      jsonb_build_object('id', 'compra', 'titulo', 'Compra', 'presentacion', 'principal', 'items', jsonb_build_array(
        jsonb_build_object('tipo', 'celda', 'nodo', 'tc', 'ancho', 'mitad'),
        jsonb_build_object('tipo', 'celda', 'nodo', 'remate', 'ancho', 'mitad'),
        jsonb_build_object('tipo', 'celda', 'nodo', 'transferencia', 'ancho', 'mitad', 'secundario', 'porcentaje'),
        jsonb_build_object('tipo', 'celda', 'nodo', 'giro', 'ancho', 'mitad', 'secundario', 'porcentaje'))),
      jsonb_build_object('id', 'interno', 'titulo', 'Interno', 'presentacion', 'principal', 'nivel_ver', 'costos', 'nivel_editar', 'costos', 'items', jsonb_build_array(
        jsonb_build_object('tipo', 'celda', 'nodo', 'costo', 'ancho', 'completo')))),
    'tarjeta_total', jsonb_build_object('nodo', 'total', 'secundarios', '[]'::jsonb));
begin
  insert into public.origenes (clave, nombre) values ('pc_' || substr(gen_random_uuid()::text, 1, 8), 'PC origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false)) returning id into f;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('PC lead', '72171' || lpad(nextval('pg_temp.pc_telefono')::text, 3, '0'), duena, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'PC vehículo', 'toyota') returning id into v;
  update public.tipos_cambio_historial set cambiado_en = now() - interval '10 days' where tipo_cambio_id in (select id from public.tipos_cambio);
  return jsonb_build_object('o', o, 'f', f, 'l', l, 'v', v,
    'k', pg_temp.pc_persona(v_base || array['cotizaciones.nivel.costos.ver', 'cotizaciones.nivel.costos.editar']),
    'kv', pg_temp.pc_persona(v_base || array['cotizaciones.nivel.costos.ver']),
    'a', pg_temp.pc_persona(v_base));
end $f$;

-- La hoja abierta firmada para esa persona.
create or replace function pg_temp.pc_abierta(p_quien uuid, t jsonb) returns text language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  return public._cotizacion_abierta_firmar((t ->> 'o')::uuid, (t ->> 'f')::uuid, now());
end $f$;

-- `cotizacion_evaluar` por el origen, como esa persona y con su hoja abierta.
create or replace function pg_temp.pc_evaluar(p_quien uuid, t jsonb, p_entradas jsonb) returns jsonb language plpgsql as $f$
declare v_abierta text := pg_temp.pc_abierta(p_quien, t);
begin
  return pg_temp.pc_corre(p_quien, format('select public.cotizacion_evaluar(%L::jsonb, null, %L, %L, p_abierta => %L)', p_entradas, t ->> 'o', t ->> 'v', v_abierta));
end $f$;

-- `cotizacion_crear` como esa persona, con el lead y el vehículo del terreno.
create or replace function pg_temp.pc_crear(p_quien uuid, t jsonb, p_entradas jsonb) returns jsonb language plpgsql as $f$
declare v_abierta text := pg_temp.pc_abierta(p_quien, t);
begin
  return pg_temp.pc_corre(p_quien, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, %L::jsonb, %L, %L)', t ->> 'o', t ->> 'l', p_entradas, v_abierta, t ->> 'v'));
end $f$;

-- `cotizacion_guardar` como esa persona, con la versión y el vehículo de hoy de la cotización.
create or replace function pg_temp.pc_guardar(p_quien uuid, p_c uuid, p_entradas jsonb) returns jsonb language plpgsql as $f$
declare c public.cotizaciones;
begin
  select * into c from public.cotizaciones x where x.id = p_c;
  return pg_temp.pc_corre(p_quien, format('select public.cotizacion_guardar(%L, gen_random_uuid(), %L, %L::jsonb, null, null, null, %L, false)',
                                          p_c, c.actualizado_en, p_entradas, c.vehiculo_id));
end $f$;

create or replace function pg_temp.pc_fila(p_c uuid) returns public.cotizaciones language sql as $f$ select * from public.cotizaciones where id = p_c $f$;
create or replace function pg_temp.pc_id(r jsonb) returns uuid language sql as $f$ select (r -> 'cotizacion' ->> 'id')::uuid $f$;
create or replace function pg_temp.pc_celda(r jsonb, p_nodo text) returns jsonb language sql as $f$
  select i from jsonb_path_query(r, 'strict $.secciones[*].items[*]') i where i ->> 'tipo' = 'celda' and i ->> 'nodo' = p_nodo limit 1
$f$;

-- @test pisar un cálculo: P1 los cálculos con celda del diseño y la forma de `_cotizacion_pisables()`
begin;
do $$
declare t jsonb := pg_temp.pc_terreno(); f public.formulas; p record; v jsonb;
begin
  select * into f from public.formulas x where x.id = (t ->> 'f')::uuid;
  -- Del terreno: la transferencia, el giro y el costo (de un nivel); ni el total, ni el giro extra (sin celda), ni un input, ni un pct constante.
  v := public._cotizacion_pisables(f.definicion, f.diseno);
  if v is distinct from '["costo", "giro", "transferencia"]'::jsonb then raise exception 'P1: los del terreno: %', v; end if;
  -- El pct calculado de un secundario cuenta; con un id repetido manda el último nodo; el total con celda, no.
  v := public._cotizacion_pisables(
    '{"nodos": [{"id": "x", "tipo": "input"}, {"id": "p", "tipo": "calculo", "op": "suma", "de": ["x"]},
                {"id": "m", "tipo": "calculo", "op": "porcentaje_de", "de": ["x"], "pct": "p"},
                {"id": "r", "tipo": "calculo", "op": "suma", "de": ["x"]}, {"id": "r", "tipo": "input"},
                {"id": "q", "tipo": "input"}, {"id": "q", "tipo": "tramo", "de": "x", "tramos": []},
                {"id": "total", "tipo": "calculo", "op": "suma", "de": ["x"], "salida": "total"}]}',
    '{"secciones": [{"items": [{"tipo": "celda", "nodo": "m", "secundario": "porcentaje"}, {"tipo": "celda", "nodo": "x"}, {"tipo": "celda", "nodo": "r"},
                               {"tipo": "celda", "nodo": "q"}, {"tipo": "subtotal", "nodo": "p"}, {"tipo": "celda", "nodo": "total"}]}]}');
  if v is distinct from '["m", "p", "q"]'::jsonb then raise exception 'P1: el pct calculado, el id repetido y el total: %', v; end if;
  -- Sin secciones o sin nodos: nada.
  if public._cotizacion_pisables(f.definicion, '{}') is distinct from '[]'::jsonb or public._cotizacion_pisables('{}', f.diseno) is distinct from '[]'::jsonb then
    raise exception 'P1: sin secciones o sin nodos no es la lista vacía';
  end if;
  select x.oid, x.prosecdef, x.provolatile, x.proconfig into p from pg_proc x where x.pronamespace = 'public'::regnamespace and x.proname = '_cotizacion_pisables';
  if p.provolatile <> 's' or not coalesce(p.proconfig @> array['search_path=""'], false) then raise exception 'P1: volatilidad o search_path: % %', p.provolatile, p.proconfig; end if;
  if has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute')
     or exists (select 1 from aclexplode((select proacl from pg_proc where oid = p.oid)) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') then
    raise exception 'P1: _cotizacion_pisables no es de nadie';
  end if;
end $$;
rollback;

-- @test pisar un cálculo: P2 la hoja edita la celda de un cálculo y dice si el porcentaje sigue al monto
begin;
do $$
declare t jsonb := pg_temp.pc_terreno(); r jsonb; it jsonb;
begin
  r := pg_temp.pc_corre((t ->> 'k')::uuid, format('select public.cotizacion_hoja(%L)', t ->> 'o'));
  it := pg_temp.pc_celda(r, 'transferencia');
  if (it ->> 'editable')::boolean is not true or it ? 'motivo' or (it -> 'secundario' ->> 'editable')::boolean is not true
     or it -> 'secundario' -> 'sigue_al_monto' is distinct from 'true'::jsonb then
    raise exception 'P2: la transferencia (un par por la hoja): %', it;
  end if;
  -- El giro comparte su pct con el giro extra: se pisa, pero el porcentaje no sigue al monto.
  it := pg_temp.pc_celda(r, 'giro');
  if (it ->> 'editable')::boolean is not true or it ? 'motivo' or it -> 'secundario' ? 'sigue_al_monto' then raise exception 'P2: el giro (pct compartido): %', it; end if;
  if (pg_temp.pc_celda(r, 'costo') ->> 'editable')::boolean is not true then raise exception 'P2: k no edita el costo: %', pg_temp.pc_celda(r, 'costo'); end if;
  -- Quien ve el nivel y no lo edita: el motivo es el nivel. Quien no lo ve: la celda no llega.
  r := pg_temp.pc_corre((t ->> 'kv')::uuid, format('select public.cotizacion_hoja(%L)', t ->> 'o'));
  it := pg_temp.pc_celda(r, 'costo');
  if (it ->> 'editable')::boolean is not false or it -> 'motivo' ->> 'codigo' is distinct from 'nivel' then raise exception 'P2: kv y el costo: %', it; end if;
  r := pg_temp.pc_corre((t ->> 'a')::uuid, format('select public.cotizacion_hoja(%L)', t ->> 'o'));
  if pg_temp.pc_celda(r, 'costo') is not null or r ? 'error' then raise exception 'P2: a recibe el costo o falla: %', r; end if;
end $$;
rollback;

-- @test pisar un cálculo: P3 evaluar con un cálculo pisado: lo escrito manda, el pct del par se reescribe y lo calculado viaja aparte
begin;
do $$
declare t jsonb := pg_temp.pc_terreno(); k uuid := (t ->> 'k')::uuid; r jsonb; f public.formulas;
begin
  select * into f from public.formulas x where x.id = (t ->> 'f')::uuid;
  -- Sin pisados no viene `calculados`.
  r := pg_temp.pc_evaluar(k, t, '{"inputs": {"remate": 10000}}');
  if r ? 'error' or r ? 'calculados' or (r -> 'valores' ->> 'transferencia')::numeric <> 400 then raise exception 'P3: sin pisados: %', r; end if;
  -- La transferencia pisada: vale lo escrito, su pct es monto ÷ base y lo calculado (400, y el 4 % de su pct) va aparte.
  r := pg_temp.pc_evaluar(k, t, '{"inputs": {"remate": 10000}, "overrides": {"transferencia": 500}}');
  if r ? 'error' or (r -> 'valores' ->> 'transferencia')::numeric <> 500 or (r -> 'valores' ->> 'transf_pct')::numeric <> 0.05
     or r -> 'fuentes' ->> 'transferencia' is distinct from 'override' or r -> 'calculados' is distinct from '{"transf_pct": 0.04, "transferencia": 400}'::jsonb
     or (r -> 'totales' ->> 'usd')::numeric <> 22500 then
    raise exception 'P3: la transferencia pisada: %', r;
  end if;
  -- El giro pisado: su pct compartido no se reescribe y el giro extra sigue con él.
  r := pg_temp.pc_evaluar(k, t, '{"inputs": {"remate": 10000}, "overrides": {"giro": 1500}}');
  if r ? 'error' or (r -> 'valores' ->> 'giro')::numeric <> 1500 or (r -> 'valores' ->> 'giro_pct')::numeric <> 0.1 or (r -> 'valores' ->> 'giro_extra')::numeric <> 1000
     or r -> 'calculados' is distinct from '{"giro": 1000}'::jsonb then
    raise exception 'P3: el giro pisado: %', r;
  end if;
  -- El total no se pisa: el motor lo descarta. Lo que no tiene celda tampoco (el giro extra, que la hoja no dibuja, ni se ve).
  r := pg_temp.pc_evaluar(k, t, '{"inputs": {"remate": 10000}, "overrides": {"total": 1, "giro_extra": 1}}');
  if r ? 'error' or r ? 'calculados'
     or r -> 'overrides_descartados' is distinct from '[{"id": "total", "motivo": "no_sobrescribible"}, {"id": "giro_extra", "motivo": "nodo_inexistente"}]'::jsonb then
    raise exception 'P3: el total y el giro extra: %', r;
  end if;
  if public._cotizacion_recorte(public.evaluar_formula(f.definicion, f.params,
       '{"inputs": {"remate": 10000}, "banderas": {}, "overrides": {"giro_extra": 1}, "vehiculo": {}, "tablas": {}, "tipos_cambio": {"oficial": 10}, "pisables": ["giro", "transferencia"]}', null),
       '{"ok": {"giro_extra": true}}') -> 'overrides_descartados' is distinct from '[{"id": "giro_extra", "motivo": "no_sobrescribible"}]'::jsonb then
    raise exception 'P3: el giro extra sin celda se pisó';
  end if;
  -- Los `pisables` los pone la base: nadie los manda.
  r := pg_temp.pc_evaluar(k, t, '{"inputs": {"remate": 10000}, "pisables": ["total"]}');
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'entradas_invalidas' or r ->> 'hint' is distinct from 'pisables' then
    raise exception 'P3: pisables de quien llama: %', r;
  end if;
end $$;
rollback;

-- @test pisar un cálculo: P4 crear con un cálculo pisado guarda lo escrito, nunca lo calculado, y respeta el nivel
begin;
do $$
declare t jsonb := pg_temp.pc_terreno(); k uuid := (t ->> 'k')::uuid; r jsonb; c public.cotizaciones;
begin
  r := pg_temp.pc_crear(k, t, '{"inputs": {"remate": 10000}, "overrides": {"transferencia": 500}}');
  c := pg_temp.pc_fila(pg_temp.pc_id(r));
  if r ? 'error' or (c.valores ->> 'transferencia')::numeric <> 500 or (c.valores ->> 'transf_pct')::numeric <> 0.05 or c.fuentes ->> 'transferencia' is distinct from 'override'
     or c.total_base <> 22500 then
    raise exception 'P4: crear con la transferencia pisada: % / %', r, to_jsonb(c);
  end if;
  if jsonb_path_exists(to_jsonb(c), 'lax $.**.calculados') or jsonb_path_exists(r, 'lax $.**.calculados') then raise exception 'P4: se guardó o devolvió calculados'; end if;
  -- El total y lo que no tiene celda no se pisan: el total se ve y no se edita (antes que el motor); el giro extra, que la hoja no dibuja, ni se ve.
  r := pg_temp.pc_crear(k, t, '{"inputs": {"remate": 10000}, "overrides": {"total": 1}}');
  if r ->> 'error' is distinct from '42501' or r ->> 'detail' is distinct from 'nodo_no_editable' or r ->> 'hint' is distinct from 'total' then raise exception 'P4: el total: %', r; end if;
  r := pg_temp.pc_crear(k, t, '{"inputs": {"remate": 10000}, "overrides": {"giro_extra": 1}}');
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'nodo_inexistente' or r ->> 'hint' is distinct from 'giro_extra' then raise exception 'P4: el giro extra: %', r; end if;
  -- El nivel: quien lo ve y no lo edita, 42501; quien no lo ve, como si no existiera.
  r := pg_temp.pc_crear((t ->> 'kv')::uuid, t, '{"inputs": {"remate": 10000}, "overrides": {"costo": 9000}}');
  if r ->> 'error' is distinct from '42501' or r ->> 'detail' is distinct from 'nodo_no_editable' or r ->> 'hint' is distinct from 'costo' then raise exception 'P4: kv pisa el costo: %', r; end if;
  r := pg_temp.pc_crear((t ->> 'a')::uuid, t, '{"inputs": {"remate": 10000}, "overrides": {"costo": 9000}}');
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'nodo_inexistente' then raise exception 'P4: a pisa el costo: %', r; end if;
  -- k pisa el costo; lo calculado del costo lo ve k al evaluar la guardada, a no (y a ve lo calculado de lo que sí ve).
  r := pg_temp.pc_crear(k, t, '{"inputs": {"remate": 10000}, "overrides": {"costo": 9000, "giro": 1500}}');
  if r ? 'error' then raise exception 'P4: k pisa el costo: %', r; end if;
  -- Cada una abre la guardada con lo que ve (lo demás lo pone la base, de lo guardado).
  r := pg_temp.pc_corre(k, format('select public.cotizacion_evaluar(''{"inputs": {"remate": 10000}, "overrides": {"costo": 9000, "giro": 1500}}''::jsonb, %L)', pg_temp.pc_id(r)))
       || jsonb_build_object('_id', pg_temp.pc_id(r));
  if r -> 'calculados' is distinct from '{"costo": 10000, "giro": 1000}'::jsonb then raise exception 'P4: lo calculado para k: %', r; end if;
  r := pg_temp.pc_corre((t ->> 'a')::uuid, format('select public.cotizacion_evaluar(''{"inputs": {"remate": 10000}, "overrides": {"giro": 1500}}''::jsonb, %L)', r ->> '_id'));
  if r ? 'error' or r -> 'calculados' is distinct from '{"giro": 1000}'::jsonb or r -> 'valores' ? 'costo' then raise exception 'P4: lo calculado para a: %', r; end if;
end $$;
rollback;

-- @test pisar un cálculo: P5 guardar: lo guardado de un par por la hoja, abrir y guardar sin tocar y la revisión que nombra el cálculo pisado
begin;
do $$
declare t jsonb := pg_temp.pc_terreno(); k uuid := (t ->> 'k')::uuid; a uuid := (t ->> 'a')::uuid; f public.formulas; r jsonb; c uuid; c2 uuid; v_ent jsonb; v_revs bigint;
begin
  select * into f from public.formulas x where x.id = (t ->> 'f')::uuid;
  c := pg_temp.pc_id(pg_temp.pc_crear(k, t, '{"inputs": {"remate": 10000}, "overrides": {"transferencia": 500, "costo": 9000}}'));
  -- Lo guardado: el monto pisado y no su pct (lo calcula el par); el costo, también.
  v_ent := public._cotizacion_entradas_de(f.definicion, (pg_temp.pc_fila(c)).valores, (pg_temp.pc_fila(c)).fuentes);
  if v_ent -> 'overrides' is distinct from '{"costo": 9000, "transferencia": 500}'::jsonb then raise exception 'P5: lo guardado de la transferencia: %', v_ent; end if;
  -- Un pct compartido sobrescrito es lo tipeado: se queda junto al giro pisado.
  c2 := pg_temp.pc_id(pg_temp.pc_crear(k, t, '{"inputs": {"remate": 10000}, "overrides": {"giro": 1500, "giro_pct": 0.2}}'));
  if ((pg_temp.pc_fila(c2)).valores ->> 'giro_extra')::numeric <> 2000 then raise exception 'P5: el giro extra con el pct sobrescrito: %', (pg_temp.pc_fila(c2)).valores; end if;
  v_ent := public._cotizacion_entradas_de(f.definicion, (pg_temp.pc_fila(c2)).valores, (pg_temp.pc_fila(c2)).fuentes);
  if v_ent -> 'overrides' is distinct from '{"giro": 1500, "giro_pct": 0.2}'::jsonb then raise exception 'P5: lo guardado del giro: %', v_ent; end if;
  -- Abrir y guardar sin tocar nada no escribe.
  v_revs := (select count(*) from public.cotizaciones_revisiones x where x.cotizacion_id = c);
  v_ent := public._cotizacion_entradas_de(f.definicion, (pg_temp.pc_fila(c)).valores, (pg_temp.pc_fila(c)).fuentes);
  r := pg_temp.pc_guardar(k, c, v_ent);
  if r ? 'error' or (select count(*) from public.cotizaciones_revisiones x where x.cotizacion_id = c) <> v_revs then raise exception 'P5: guardar sin tocar escribió: %', r; end if;
  -- Volver a pisar la transferencia y el costo: la revisión nombra su formato a quien los ve; a no ve el costo.
  r := pg_temp.pc_guardar(k, c, '{"inputs": {"remate": 10000}, "overrides": {"transferencia": 520, "costo": 9500}}');
  if r ? 'error' or ((pg_temp.pc_fila(c)).valores ->> 'transf_pct')::numeric <> 0.052 then raise exception 'P5: guardar con la transferencia pisada: %', r; end if;
  r := pg_temp.pc_corre(k, format('select public.cotizacion_revisiones(%L)', c));
  if r -> 'etiquetas' -> 'calculos' is distinct from '{"costo": "usd", "total": "usd", "transferencia": "usd"}'::jsonb then raise exception 'P5: las etiquetas de k: %', r -> 'etiquetas'; end if;
  r := pg_temp.pc_corre(a, format('select public.cotizacion_revisiones(%L)', c));
  if r -> 'etiquetas' -> 'calculos' is distinct from '{"total": "usd", "transferencia": "usd"}'::jsonb then raise exception 'P5: las etiquetas de a: %', r -> 'etiquetas'; end if;
end $$;
rollback;

-- @test pisar un cálculo: P6 cotizar encima se lleva lo pisado
begin;
do $$
declare t jsonb := pg_temp.pc_terreno(); k uuid := (t ->> 'k')::uuid; r jsonb; c uuid; n public.cotizaciones;
begin
  c := pg_temp.pc_id(pg_temp.pc_crear(k, t, '{"inputs": {"remate": 10000}, "overrides": {"transferencia": 500}}'));
  r := pg_temp.pc_corre(k, format('select public.cotizacion_encima(gen_random_uuid(), %L)', c));
  n := pg_temp.pc_fila(pg_temp.pc_id(r));
  if r ? 'error' or (n.valores ->> 'transferencia')::numeric <> 500 or (n.valores ->> 'transf_pct')::numeric <> 0.05 or n.fuentes ->> 'transferencia' is distinct from 'override' then
    raise exception 'P6: encima: % / %', r, to_jsonb(n);
  end if;
end $$;
rollback;
