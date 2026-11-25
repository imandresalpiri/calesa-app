-- Lo que la cabecera trae por defecto y los enlaces de la ayuda en la hoja (docs/COTIZADOR.md › «La lectura que abre la hoja»): `cotizacion_hoja()`
-- suma a la cabecera `ajustes` (el ⚙ de la cabecera: `cotizaciones.configurar` del origen y al menos un modo) y, sólo si el diseño las trae, las tres
-- claves por defecto; la ayuda de texto lleva sus enlaces. Una celda que el nivel esconde no viaja, ni su ayuda. Un diseño viejo trae lo de siempre.
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno dentro de su transacción y la revierte.

create or replace function pg_temp.ceh_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, detail, hint, mensaje} si falla.
create or replace function pg_temp.ceh_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_m text; v_e text;
begin
  perform pg_temp.ceh_como(p_quien);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'detail', v_d, 'hint', v_h, 'mensaje', v_m);
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

-- Una persona con un rol propio y esas claves en ese origen.
create or replace function pg_temp.ceh_persona(p_id uuid, p_origen uuid, p_claves text[]) returns void language plpgsql as $f$
declare v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Cabecera ' || right(p_id::text, 4), invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('ceh_' || right(p_id::text, 4), 'Cabecera ' || right(p_id::text, 4)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c, case when c like 'cotizaciones.nivel.%' then null else p_origen end, 'todos');
  end loop;
end $f$;

create or replace function pg_temp.ceh_origen(p_clave text) returns uuid language sql as $f$
  insert into public.origenes (clave, nombre) values (p_clave, 'Cabecera ' || p_clave) returning id
$f$;

create or replace function pg_temp.ceh_semilla(p_clave text) returns public.formulas language sql as $f$
  select f.* from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave = p_clave and f.estado = 'publicada'
$f$;

-- Pone la ayuda `p_ayuda` en la celda `p_nodo` del diseño.
create or replace function pg_temp.ceh_con_ayuda(p_diseno jsonb, p_nodo text, p_ayuda jsonb) returns jsonb language plpgsql as $f$
declare d jsonb := p_diseno; i int; k int;
begin
  for i in 0 .. jsonb_array_length(d -> 'secciones') - 1 loop
    for k in 0 .. jsonb_array_length(d -> 'secciones' -> i -> 'items') - 1 loop
      if d -> 'secciones' -> i -> 'items' -> k ->> 'tipo' = 'celda' and d -> 'secciones' -> i -> 'items' -> k ->> 'nodo' = p_nodo then
        d := jsonb_set(d, array['secciones', i::text, 'items', k::text, 'ayuda'], p_ayuda);
      end if;
    end loop;
  end loop;
  return d;
end $f$;

-- Guarda `p_diseno` (con la definición y los params de la semilla `s`) como borrador del origen y lo publica: el resultado de publicar.
create or replace function pg_temp.ceh_publicar(p_quien uuid, p_origen uuid, s public.formulas, p_diseno jsonb) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  r := pg_temp.ceh_corre(p_quien, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_actualizado_en_esperado => null)',
                                         p_origen, s.definicion, s.params, p_diseno));
  if r ? 'error' then raise exception 'guardar el borrador: %', r; end if;
  r := pg_temp.ceh_corre(p_quien, format('select to_jsonb(public.formula_publicar(p_origen => %L, p_nota => %L))', p_origen, 'Cabecera'));
  if r ? 'error' then raise exception 'publicar: %', r; end if;
  return r;
end $f$;

-- @test cabecera en la hoja: un diseño viejo trae la cabecera de siempre más `ajustes`, verdadero sólo para quien configura el origen
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000ce01';
  a constant uuid := '00000000-0000-4000-8000-00000000ce02';
  o uuid := (select x.id from public.origenes x where x.clave = 'subasta_usa');
  r jsonb;
begin
  perform pg_temp.ceh_persona(q, o, array['cotizaciones.configurar', 'cotizaciones.ver', 'cotizaciones.crear']);
  perform pg_temp.ceh_persona(a, o, array['cotizaciones.ver', 'cotizaciones.crear']);
  r := pg_temp.ceh_corre(q, format('select public.cotizacion_hoja(%L)', o));
  if r ? 'error' then raise exception 'la hoja de la dueña: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'cabecera') k) is distinct from array['ajustes', 'modos', 'moneda_bs', 'ver_total_bs'] then
    raise exception 'la cabecera de un diseño viejo: %', r -> 'cabecera';
  end if;
  if jsonb_path_query_first(r, '$.cabecera.ajustes') is distinct from 'true'::jsonb then raise exception 'la dueña sin el ⚙ de la cabecera: %', r -> 'cabecera'; end if;
  r := pg_temp.ceh_corre(a, format('select public.cotizacion_hoja(%L)', o));
  if r ? 'error' then raise exception 'la hoja de la asesora: %', r; end if;
  if jsonb_path_query_first(r, '$.cabecera.ajustes') is distinct from 'false'::jsonb then raise exception 'la asesora con el ⚙ de la cabecera: %', r -> 'cabecera'; end if;
end $$;
rollback;

-- @test cabecera en la hoja: sin modos (oficina) no hay ⚙ de la cabecera, ni para quien configura
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000ce03';
  o uuid := (select x.id from public.origenes x where x.clave = 'oficina');
  r jsonb;
begin
  perform pg_temp.ceh_persona(q, o, array['cotizaciones.configurar', 'cotizaciones.ver', 'cotizaciones.crear']);
  r := pg_temp.ceh_corre(q, format('select public.cotizacion_hoja(%L)', o));
  if r ? 'error' then raise exception 'la hoja: %', r; end if;
  if jsonb_path_query_first(r, '$.cabecera.modos') is distinct from '[]'::jsonb then raise exception 'oficina trae modos: %', r -> 'cabecera'; end if;
  if jsonb_path_query_first(r, '$.cabecera.ajustes') is distinct from 'false'::jsonb then raise exception 'sin modos con el ⚙ de la cabecera: %', r -> 'cabecera'; end if;
end $$;
rollback;

-- @test cabecera en la hoja: con las tres claves por defecto la hoja las trae tal cual y sigue trayendo todos los modos
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000ce04';
  o uuid := pg_temp.ceh_origen('ceh_claves');
  s public.formulas := pg_temp.ceh_semilla('subasta_usa');
  r jsonb;
begin
  perform pg_temp.ceh_persona(q, o, array['cotizaciones.configurar', 'cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.crear.sin_lead',
                                          'cotizaciones.crear.sin_vehiculo', 'cotizaciones.nivel.costos.ver']);
  perform pg_temp.ceh_publicar(q, o, s, jsonb_set(s.diseno, '{cabecera}', (s.diseno -> 'cabecera')
                                         || '{"modo_por_defecto": "unificado", "ver_total_bs_por_defecto": true, "modos_visibles": ["unificado"]}'));
  r := pg_temp.ceh_corre(q, format('select public.cotizacion_hoja(%L)', o));
  if r ? 'error' then raise exception 'la hoja: %', r; end if;
  if jsonb_path_query_first(r, '$.cabecera.modo_por_defecto') is distinct from '"unificado"'::jsonb
     or jsonb_path_query_first(r, '$.cabecera.ver_total_bs_por_defecto') is distinct from 'true'::jsonb
     or jsonb_path_query_first(r, '$.cabecera.modos_visibles') is distinct from '["unificado"]'::jsonb then
    raise exception 'la cabecera con lo de por defecto: %', r -> 'cabecera';
  end if;
  -- Los modos siguen siendo todos: la visibilidad es sólo del encabezado.
  if jsonb_array_length(jsonb_path_query_first(r, '$.cabecera.modos')) <> 2 then raise exception 'la hoja perdió un modo: %', r -> 'cabecera'; end if;
end $$;
rollback;

-- @test cabecera en la hoja: los enlaces de la ayuda viajan con su celda; los de una celda que el nivel esconde, no
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000ce05';
  a constant uuid := '00000000-0000-4000-8000-00000000ce06';
  o uuid := pg_temp.ceh_origen('ceh_enlaces');
  s public.formulas := pg_temp.ceh_semilla('subasta_usa');
  d jsonb;
  r jsonb;
begin
  perform pg_temp.ceh_persona(q, o, array['cotizaciones.configurar', 'cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.nivel.costos.ver']);
  perform pg_temp.ceh_persona(a, o, array['cotizaciones.ver', 'cotizaciones.crear']);
  d := pg_temp.ceh_con_ayuda(s.diseno, 'fees', '{"texto": "Lo cobra la subasta.", "enlaces": [{"titulo": "Copart", "url": "https://www.copart.com/"},
                                                                                             {"titulo": "IAA", "url": "https://www.iaai.com/"}]}');
  d := pg_temp.ceh_con_ayuda(d, 'fob', '{"texto": "Valor FOB.", "enlaces": [{"titulo": "Escondido", "url": "https://ceh-escondido.example/"}]}');
  perform pg_temp.ceh_publicar(q, o, s, d);

  r := pg_temp.ceh_corre(q, format('select public.cotizacion_hoja(%L)', o));
  if r ? 'error' then raise exception 'la hoja de la dueña: %', r; end if;
  if jsonb_path_query_first(r, 'strict $.secciones[*].items[*] ? (@.nodo == "fees").ayuda') is distinct from
     '[{"tipo": "texto", "texto": "Lo cobra la subasta."},
       {"tipo": "enlaces", "enlaces": [{"titulo": "Copart", "url": "https://www.copart.com/"}, {"titulo": "IAA", "url": "https://www.iaai.com/"}]}]'::jsonb then
    raise exception 'la ayuda con enlaces: %', jsonb_path_query_first(r, 'strict $.secciones[*].items[*] ? (@.nodo == "fees")');
  end if;
  if jsonb_path_query_first(r, 'strict $.secciones[*].items[*] ? (@.nodo == "fob").ayuda[1].enlaces[0].titulo') is distinct from '"Escondido"'::jsonb then
    raise exception 'quien ve «costos» no recibe los enlaces de «fob»';
  end if;
  -- Una ayuda de texto sin enlaces no trae un bloque de enlaces.
  if exists (select 1 from jsonb_path_query(r, 'strict $.secciones[*].items[*] ? (@.nodo != "fees" && @.nodo != "fob" && exists(@.ayuda)).ayuda[*] ? (@.tipo == "enlaces")')) then
    raise exception 'una ayuda sin enlaces trae un bloque de enlaces';
  end if;

  r := pg_temp.ceh_corre(a, format('select public.cotizacion_hoja(%L)', o));
  if r ? 'error' then raise exception 'la hoja de la asesora: %', r; end if;
  if jsonb_path_query_first(r, 'strict $.secciones[*].items[*] ? (@.nodo == "fees").ayuda[1].enlaces[1].url') is distinct from '"https://www.iaai.com/"'::jsonb then
    raise exception 'la asesora no recibe los enlaces de «fees»';
  end if;
  if exists (select 1 from jsonb_path_query(r, 'strict $.secciones[*].items[*] ? (@.nodo == "fob")')) then raise exception 'la asesora recibe «fob»'; end if;
  if exists (select 1 from jsonb_path_query(r, 'strict $.**.url') u where u = '"https://ceh-escondido.example/"'::jsonb) then
    raise exception 'el enlace de una celda escondida viaja';
  end if;
end $$;
rollback;
