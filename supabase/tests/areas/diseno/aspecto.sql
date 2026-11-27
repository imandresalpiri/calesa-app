-- El aspecto del diseño de la hoja (docs/COTIZADOR.md › «El diseño de la hoja»; docs/GLOSARIO.md › «Aspecto»): por las RPC de siempre. Guardar el
-- borrador revisa su forma; publicar, el tono de la cabecera y el de cada sección; un tono que sólo nombra el diseño no se elimina; y `cotizacion_hoja()`
-- copia el aspecto (con su tipo) y los tonos que pinta, recortados al nivel de quien mira. Las reglas, su orden y su `donde` los cubre el juego
-- compartido (`validar-diseno.sql` y `validar-diseno.test.ts`); acá, el camino de cada RPC.
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno dentro de su transacción y la revierte.

create or replace function pg_temp.asp_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, detail, hint, mensaje} si falla.
create or replace function pg_temp.asp_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_m text; v_e text;
begin
  perform pg_temp.asp_como(p_quien);
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
create or replace function pg_temp.asp_persona(p_id uuid, p_origen uuid, p_claves text[]) returns void language plpgsql as $f$
declare v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Aspecto ' || right(p_id::text, 4), invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('asp_' || right(p_id::text, 4), 'Aspecto ' || right(p_id::text, 4)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c, case when c like 'cotizaciones.nivel.%' then null else p_origen end, 'todos');
  end loop;
end $f$;

-- Un tono del catálogo (los colores del amarillo de la semilla, que pasan el AA).
create or replace function pg_temp.asp_tono(p_clave text) returns void language sql as $f$
  insert into public.tonos (clave, nombre, hex, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
  values (p_clave, 'Aspecto ' || p_clave, '#fff7d6', '#fff7d6', '#e9d27a', '#1b2130', '#3e3f3c', '#797251', '#f2f4f8')
$f$;

-- Un origen nuevo con la fórmula publicada de `subasta_usa` como borrador de esa persona (guardado por la RPC): devuelve el origen.
create or replace function pg_temp.asp_origen(p_clave text) returns uuid language plpgsql as $f$
declare o uuid;
begin
  insert into public.origenes (clave, nombre) values (p_clave, 'Aspecto ' || p_clave) returning id into o;
  return o;
end $f$;

create or replace function pg_temp.asp_semilla() returns public.formulas language sql as $f$
  select f.* from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave = 'subasta_usa' and f.estado = 'publicada'
$f$;

-- El diseño de `subasta_usa` con todo el aspecto: la cabecera, «compra» (principal) y «cif» (avanzado, de «costos») con su tono, y un ítem de
-- cada tipo con ancho, alto, letra y énfasis.
create or replace function pg_temp.asp_con_aspecto(p_diseno jsonb, p_tono_compra text, p_tono_cif text, p_tono_cabecera text) returns jsonb language plpgsql as $f$
declare d jsonb := p_diseno; i int; k int; s jsonb; it jsonb;
begin
  d := jsonb_set(d, '{cabecera}', (d -> 'cabecera') || jsonb_build_object('tono', p_tono_cabecera, 'relleno', 'grande', 'letra', 'grande', 'enfasis', 'fuerte'));
  for i in 0 .. jsonb_array_length(d -> 'secciones') - 1 loop
    s := d -> 'secciones' -> i;
    if s ->> 'id' = 'compra' then
      s := s || jsonb_build_object('ancho', 8, 'alto', 2, 'relleno', 'chico', 'separacion', 'grande', 'densidad', 'compacta', 'letra', 'chica',
                                   'enfasis', 'fuerte', 'tono', p_tono_compra);
    elsif s ->> 'id' = 'cif' then
      s := s || jsonb_build_object('ancho', 12, 'tono', p_tono_cif);
    end if;
    for k in 0 .. jsonb_array_length(s -> 'items') - 1 loop
      it := s -> 'items' -> k;
      if it ->> 'tipo' = 'celda' and it ->> 'nodo' = 'fees' then
        it := it || '{"ancho": 8, "alto": 3, "letra": "grande", "enfasis": "fuerte"}';
      elsif it ->> 'tipo' in ('atajos', 'variante', 'interruptor', 'subtotal') then
        it := it || '{"ancho": 6, "alto": 2, "letra": "chica", "enfasis": "normal"}';
      end if;
      s := jsonb_set(s, array['items', k::text], it);
    end loop;
    d := jsonb_set(d, array['secciones', i::text], s);
  end loop;
  return d;
end $f$;

-- @test aspecto: guardar el borrador acepta todo el aspecto y rechaza lo que no está en su escala (22023 forma, con la sección en hint)
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000a501';
  o uuid := pg_temp.asp_origen('asp_guardar');
  s public.formulas := pg_temp.asp_semilla();
  d jsonb; r jsonb; v_sql text;
  v_malo record;
begin
  perform pg_temp.asp_persona(q, o, array['cotizaciones.configurar']);
  d := pg_temp.asp_con_aspecto(s.diseno, 'verde', 'naranja', 'amarillo');
  v_sql := 'select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_actualizado_en_esperado => null)';
  r := pg_temp.asp_corre(q, format(v_sql, o, s.definicion, s.params, d));
  if r ? 'error' then raise exception 'no guardó un diseño con todo el aspecto: %', r; end if;
  if (select f.diseno from public.formulas f where f.origen_id = o and f.estado = 'borrador') is distinct from d then
    raise exception 'el borrador no guarda el aspecto tal cual';
  end if;
  delete from public.formulas where origen_id = o;
  -- Cada uno, una sola cosa fuera de su escala: el rechazo es de forma y nombra la sección.
  for v_malo in
    select * from (values
      ('relleno enorme', jsonb_set(d, '{secciones,2,relleno}', '"enorme"'), 'compra'),
      ('ancho 13 en una celda', jsonb_set(d, '{secciones,2,items,0,ancho}', '13'), 'compra'),
      ('alto 0 en una sección', jsonb_set(d, '{secciones,2,alto}', '0'), 'compra'),
      ('alto 2,5 en un ítem', jsonb_set(d, '{secciones,0,items,0,alto}', '2.5'), 'hoja'),
      ('tono en mayúsculas', jsonb_set(d, '{secciones,2,tono}', '"Verde"'), 'compra'),
      ('ancho en la cabecera', jsonb_set(d, '{cabecera,ancho}', '6'), null)
    ) as m(nombre, diseno, donde)
  loop
    r := pg_temp.asp_corre(q, format(v_sql, o, s.definicion, s.params, v_malo.diseno));
    if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'forma' or nullif(r ->> 'hint', '') is distinct from v_malo.donde then
      raise exception '%: esperaba 22023 forma@%, dio %', v_malo.nombre, v_malo.donde, r;
    end if;
  end loop;
  if exists (select 1 from public.formulas where origen_id = o) then raise exception 'se guardó un diseño fuera de escala'; end if;
end $$;
rollback;

-- @test aspecto: publicar con el tono de la cabecera o de una sección fuera del catálogo da 22023 tono_inexistente con su hint y su texto
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000a502';
  o uuid := pg_temp.asp_origen('asp_publicar');
  s public.formulas := pg_temp.asp_semilla();
  r jsonb; v_caso record;
begin
  perform pg_temp.asp_persona(q, o, array['cotizaciones.configurar']);
  for v_caso in
    select * from (values
      ('la cabecera', pg_temp.asp_con_aspecto(s.diseno, 'verde', 'naranja', 'no_existe'), 'cabecera',
       'La cabecera usa un tono que no está en el catálogo.'),
      ('una sección', pg_temp.asp_con_aspecto(s.diseno, 'no_existe', 'naranja', 'amarillo'), 'compra',
       'La sección «compra» usa un tono que no está en el catálogo.')
    ) as c(nombre, diseno, hint, mensaje)
  loop
    r := pg_temp.asp_corre(q, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_actualizado_en_esperado => null)',
                                     o, s.definicion, s.params, v_caso.diseno));
    if r ? 'error' then raise exception '%: guardar (sólo la forma) falló: %', v_caso.nombre, r; end if;
    r := pg_temp.asp_corre(q, format('select to_jsonb(public.formula_publicar(p_origen => %L, p_nota => %L))', o, 'Con aspecto'));
    if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'tono_inexistente' or r ->> 'hint' is distinct from v_caso.hint
       or r ->> 'mensaje' is distinct from v_caso.mensaje then
      raise exception '%: esperaba 22023 tono_inexistente@%, dio %', v_caso.nombre, v_caso.hint, r;
    end if;
    if exists (select 1 from public.formulas where origen_id = o and estado = 'publicada') then raise exception '%: se publicó', v_caso.nombre; end if;
    delete from public.formulas where origen_id = o;
  end loop;
  -- Con los tres tonos en el catálogo se publica.
  r := pg_temp.asp_corre(q, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_actualizado_en_esperado => null)',
                                   o, s.definicion, s.params, pg_temp.asp_con_aspecto(s.diseno, 'verde', 'naranja', 'amarillo')));
  r := pg_temp.asp_corre(q, format('select to_jsonb(public.formula_publicar(p_origen => %L, p_nota => %L))', o, 'Con aspecto'));
  if r ? 'error' then raise exception 'no publicó con los tonos del catálogo: %', r; end if;
end $$;
rollback;

-- @test aspecto: _tono_en_uso ve un tono que sólo nombra una sección (en un borrador y en una versión archivada) y tono_eliminar da 23503
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000a503';
  o uuid := pg_temp.asp_origen('asp_en_uso');
  s public.formulas := pg_temp.asp_semilla();
  v_tono uuid; r jsonb;
begin
  perform pg_temp.asp_tono('asp_solo_seccion');
  perform pg_temp.asp_tono('asp_solo_cabecera');
  perform pg_temp.asp_persona(q, o, array['cotizaciones.configurar']);
  if public._tono_en_uso('asp_solo_seccion') is not null then raise exception 'un tono que nadie nombra ya está en uso'; end if;
  -- En un borrador.
  r := pg_temp.asp_corre(q, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_actualizado_en_esperado => null)',
                                   o, s.definicion, s.params, pg_temp.asp_con_aspecto(s.diseno, 'asp_solo_seccion', 'naranja', 'asp_solo_cabecera')));
  if r ? 'error' then raise exception 'guardar: %', r; end if;
  if public._tono_en_uso('asp_solo_seccion') is distinct from 'Aspecto asp_en_uso' then raise exception 'el borrador no lo usa: %', public._tono_en_uso('asp_solo_seccion'); end if;
  if public._tono_en_uso('asp_solo_cabecera') is distinct from 'Aspecto asp_en_uso' then raise exception 'la cabecera del borrador no lo usa'; end if;
  -- En una versión archivada (la que se publicó y después quedó atrás).
  update public.formulas set estado = 'archivada', version = 1, visibilidad = s.visibilidad where origen_id = o;
  if public._tono_en_uso('asp_solo_seccion') is distinct from 'Aspecto asp_en_uso' then raise exception 'la archivada no lo usa'; end if;
  -- Eliminarlo da 23503 con el origen.
  select t.id into v_tono from public.tonos t where t.clave = 'asp_solo_seccion';
  r := pg_temp.asp_corre(q, format('select public.tono_eliminar(%L, (select actualizado_en from public.tonos where id = %L))', v_tono, v_tono));
  if r ->> 'error' is distinct from '23503' or position('Aspecto asp_en_uso' in r ->> 'mensaje') = 0 then raise exception 'eliminar un tono en uso: %', r; end if;
  if not exists (select 1 from public.tonos where id = v_tono) then raise exception 'se eliminó'; end if;
end $$;
rollback;

-- @test aspecto: cotizacion_hoja copia el aspecto con su tipo (sin los niveles) y pinta los tonos de las secciones que dibuja y de la cabecera
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000a504';
  a constant uuid := '00000000-0000-4000-8000-00000000a505';
  o uuid := pg_temp.asp_origen('asp_hoja');
  s public.formulas := pg_temp.asp_semilla();
  r jsonb; v_sec jsonb; v_it jsonb; v_tonos text[];
begin
  perform pg_temp.asp_tono('asp_compra');
  perform pg_temp.asp_tono('asp_cif');
  perform pg_temp.asp_tono('asp_cabecera');
  perform pg_temp.asp_persona(q, o, array['cotizaciones.configurar', 'cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.nivel.costos.ver']);
  perform pg_temp.asp_persona(a, o, array['cotizaciones.ver', 'cotizaciones.crear']);
  r := pg_temp.asp_corre(q, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_actualizado_en_esperado => null)',
                                   o, s.definicion, s.params, pg_temp.asp_con_aspecto(s.diseno, 'asp_compra', 'asp_cif', 'asp_cabecera')));
  r := pg_temp.asp_corre(q, format('select to_jsonb(public.formula_publicar(p_origen => %L, p_nota => %L))', o, 'Con aspecto'));
  if r ? 'error' then raise exception 'publicar: %', r; end if;

  -- Quien ve «costos».
  r := pg_temp.asp_corre(q, format('select public.cotizacion_hoja(%L)', o));
  if r ? 'error' then raise exception 'la hoja: %', r; end if;
  v_sec := jsonb_path_query_first(r, 'strict $.secciones[*] ? (@.id == "compra")');
  if (select array_agg(k order by k) from jsonb_object_keys(v_sec) k)
     is distinct from array['alto', 'ancho', 'densidad', 'enfasis', 'id', 'items', 'letra', 'posicion', 'presentacion', 'relleno', 'separacion', 'titulo', 'tono'] then
    raise exception 'las claves de una sección con aspecto: %', (select array_agg(k order by k) from jsonb_object_keys(v_sec) k);
  end if;
  if v_sec - 'items' - 'id' - 'titulo' - 'presentacion' - 'posicion' is distinct from
     '{"ancho": 8, "alto": 2, "relleno": "chico", "separacion": "grande", "densidad": "compacta", "letra": "chica", "enfasis": "fuerte", "tono": "asp_compra"}'::jsonb then
    raise exception 'el aspecto de la sección: %', v_sec - 'items';
  end if;
  v_it := jsonb_path_query_first(r, 'strict $.secciones[*].items[*] ? (@.tipo == "celda" && @.nodo == "fees")');
  if jsonb_typeof(v_it -> 'ancho') is distinct from 'number' or v_it -> 'ancho' is distinct from '8'::jsonb or v_it -> 'alto' is distinct from '3'::jsonb
     or v_it ->> 'letra' is distinct from 'grande' or v_it ->> 'enfasis' is distinct from 'fuerte' then
    raise exception 'el aspecto de una celda: %', v_it;
  end if;
  -- Los otros tipos lo llevan igual (los atajos y el subtotal están en «cif», de «costos»).
  if (select count(*) from jsonb_path_query(r, 'strict $.secciones[*].items[*] ? (@.tipo != "celda")') i
       where i -> 'ancho' = '6'::jsonb and i -> 'alto' = '2'::jsonb and i ->> 'letra' = 'chica' and i ->> 'enfasis' = 'normal')
     <> (select count(*) from jsonb_path_query(r, 'strict $.secciones[*].items[*] ? (@.tipo != "celda")')) then
    raise exception 'un ítem que no es celda sin su aspecto';
  end if;
  if not exists (select 1 from jsonb_path_query(r, 'strict $.secciones[*].items[*] ? (@.tipo == "atajos")')) then raise exception 'no llegaron los atajos'; end if;
  -- Ningún nivel viaja.
  if exists (select 1 from jsonb_path_query(r, 'strict $.secciones[*]') x where x ? 'nivel_ver' or x ? 'nivel_editar') then raise exception 'viaja un nivel de sección'; end if;
  if (r -> 'cabecera') - 'modos' - 'ver_total_bs' - 'moneda_bs' - 'ajustes' is distinct from '{"tono": "asp_cabecera", "relleno": "grande", "letra": "grande", "enfasis": "fuerte"}'::jsonb then
    raise exception 'el aspecto de la cabecera: %', r -> 'cabecera';
  end if;
  select array_agg(t ->> 'clave' order by t ->> 'clave') into v_tonos from jsonb_array_elements(r -> 'tonos') t;
  if v_tonos is distinct from array['amarillo', 'asp_cabecera', 'asp_cif', 'asp_compra', 'naranja', 'verde'] then raise exception 'los tonos de quien ve todo: %', v_tonos; end if;

  -- Quien no ve «costos»: «cif» no llega, y su tono tampoco.
  r := pg_temp.asp_corre(a, format('select public.cotizacion_hoja(%L)', o));
  if r ? 'error' then raise exception 'la hoja de la asesora: %', r; end if;
  if exists (select 1 from jsonb_path_query(r, 'strict $.secciones[*] ? (@.id == "cif")')) then raise exception 'la asesora recibe «cif»'; end if;
  select array_agg(t ->> 'clave' order by t ->> 'clave') into v_tonos from jsonb_array_elements(r -> 'tonos') t;
  if v_tonos is distinct from array['amarillo', 'asp_cabecera', 'asp_compra', 'naranja', 'verde'] then raise exception 'los tonos de la asesora: %', v_tonos; end if;
end $$;
rollback;

-- @test aspecto: unos atajos con `filas: 1.0` (válido: JS lo lee 1) se publican y la hoja los lee como número, sin romperse
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000a507';
  o uuid := pg_temp.asp_origen('asp_filas');
  s public.formulas := pg_temp.asp_semilla();
  d jsonb := s.diseno; r jsonb; i int; k int;
begin
  perform pg_temp.asp_persona(q, o, array['cotizaciones.configurar', 'cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.nivel.costos.ver']);
  for i in 0 .. jsonb_array_length(d -> 'secciones') - 1 loop
    for k in 0 .. jsonb_array_length(d -> 'secciones' -> i -> 'items') - 1 loop
      if d -> 'secciones' -> i -> 'items' -> k ->> 'tipo' = 'atajos' then
        d := jsonb_set(d, array['secciones', i::text, 'items', k::text, 'filas'], '1.0'::jsonb);
      end if;
    end loop;
  end loop;
  if position('"filas": 1.0' in d::text) = 0 then raise exception 'el diseño no lleva filas 1.0: %', d; end if;
  r := pg_temp.asp_corre(q, format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_actualizado_en_esperado => null)',
                                   o, s.definicion, s.params, d));
  r := pg_temp.asp_corre(q, format('select to_jsonb(public.formula_publicar(p_origen => %L, p_nota => %L))', o, 'Filas 1.0'));
  if r ? 'error' then raise exception 'publicar: %', r; end if;
  r := pg_temp.asp_corre(q, format('select public.cotizacion_hoja(%L)', o));
  if r ? 'error' then raise exception 'la hoja con filas 1.0 no se lee: %', r; end if;
  if (select jsonb_array_length(x -> 'chips') from jsonb_path_query(r, 'strict $.secciones[*].items[*] ? (@.tipo == "atajos")') x limit 1) <> 1 then
    raise exception 'los atajos no traen un chip: %', jsonb_path_query_first(r, 'strict $.secciones[*].items[*] ? (@.tipo == "atajos")');
  end if;
end $$;
rollback;

-- @test aspecto: la hoja de la semilla (subasta_usa) no trae ninguna clave de aspecto: las mismas claves de siempre más la posición (y el ⚙ de la cabecera)
begin;
do $$
declare
  q constant uuid := '00000000-0000-4000-8000-00000000a506';
  o uuid := (select x.id from public.origenes x where x.clave = 'subasta_usa');
  r jsonb;
begin
  perform pg_temp.asp_persona(q, o, array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.nivel.costos.ver']);
  r := pg_temp.asp_corre(q, format('select public.cotizacion_hoja(%L)', o));
  if r ? 'error' then raise exception 'la hoja: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'cabecera') k) is distinct from array['ajustes', 'modos', 'moneda_bs', 'ver_total_bs'] then
    raise exception 'la cabecera de la semilla: %', r -> 'cabecera';
  end if;
  if exists (select 1 from jsonb_path_query(r, 'strict $.secciones[*]') x
              where (select array_agg(k order by k) from jsonb_object_keys(x) k) not in (array['id', 'items', 'posicion', 'presentacion', 'titulo'], array['id', 'items', 'posicion', 'presentacion'])) then
    raise exception 'una sección de la semilla trae otras claves';
  end if;
  if exists (select 1 from jsonb_path_query(r, 'strict $.secciones[*].items[*]') i where i ? 'alto' or i ? 'letra' or i ? 'enfasis' or (i ->> 'tipo' <> 'celda' and i ? 'ancho')) then
    raise exception 'un ítem de la semilla trae aspecto';
  end if;
  if exists (select 1 from jsonb_path_query(r, 'strict $.secciones[*].items[*] ? (@.tipo == "celda")') i where jsonb_typeof(i -> 'ancho') <> 'string') then
    raise exception 'una celda de la semilla no trae su ancho con nombre';
  end if;
end $$;
rollback;
