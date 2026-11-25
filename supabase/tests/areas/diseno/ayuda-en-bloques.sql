-- La ayuda de una celda en bloques en la base (docs/COTIZADOR.md › «El diseño de la hoja (D7)»): el texto de cada regla nueva (qué diseño da cada una, su
-- orden y su `donde` los cubre el juego compartido de `validar-diseno.sql`), la ayuda de antes leída como bloques, el catálogo de tablas de un origen
-- y que sólo publicar a mano lo pasa: la N+1 de una tabla publica aunque la ayuda muestre una columna que ya no está.
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno dentro de su transacción y la revierte.

-- El rechazo de validar_diseno sobre un diseño mínimo con `p_ayuda` como la ayuda de la celda «a» y `p_tablas` como el catálogo; nulo si vale.
-- «a» es un dato que se tipea (acepta un valor); «tc_p», un tipo de cambio (no).
create or replace function pg_temp.aeb_rechazo(p_ayuda jsonb, p_tablas jsonb default null) returns jsonb language plpgsql as $f$
declare
  v_def jsonb := '{"nodos": [{"id": "a", "tipo": "input", "etiqueta": "A", "salida": "total", "bucket": "exterior"},
                             {"id": "tc_p", "tipo": "tipo_cambio", "clave": "paralelo", "etiqueta": "P", "formato": "raw"}],
                   "buckets": {"exterior": "tc_p"}, "total_en": "tc_p"}';
  v_diseno jsonb := '{"cabecera": {"modos": [{"clave": "paralelo", "nombre": "Paralelo", "buckets": [{"bucket": "exterior", "nodo": "tc_p"}], "total_en": "tc_p"}],
                                   "ver_total_bs": true},
                      "secciones": [{"id": "s", "presentacion": "principal",
                                     "items": [{"tipo": "celda", "nodo": "a", "ancho": "completo"}, {"tipo": "celda", "nodo": "tc_p", "ancho": "completo"}]}],
                      "tarjeta_total": {"nodo": "a", "secundarios": []}}';
  v_d text; v_h text; v_m text;
begin
  v_diseno := jsonb_set(v_diseno, '{secciones,0,items,0,ayuda}', p_ayuda);
  perform public.validar_diseno(v_def, v_diseno, '{}', '{}', '{}', p_tablas);
  return null;
exception when invalid_parameter_value then
  get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
  return jsonb_build_object('regla', v_d, 'donde', v_h, 'mensaje', v_m);
end $f$;

-- @test ayuda en bloques: cada regla nueva da su código, `donde` y el texto de motivos-de-diseno.ts; la de antes se lee como bloques sin catálogo
do $$
declare
  r record;
  v jsonb;
begin
  for r in select * from (values
    ('[{"tipo": "titulo", "texto": "Fletes"}, {"tipo": "tabla", "tabla": "fletes"}]'::jsonb, '[]'::jsonb, 'ayuda_tabla_inexistente',
     'La ayuda de «a» usa la tabla «fletes», que este origen no tiene o está desactivada.'),
    ('[{"tipo": "tabla", "tabla": "fletes", "columnas": [{"columna": "monto"}, {"columna": "nota"}]}]', '[{"clave": "fletes", "columnas": ["monto"]}]',
     'ayuda_columna_inexistente', 'La ayuda de «a» muestra la columna «nota», que la tabla «fletes» ya no tiene.'),
    ('[{"tipo": "tabla", "tabla": "fletes", "columnas": [{"columna": "monto", "llena": "tc_p"}]}]', null, 'ayuda_llena_no_acepta_valor',
     'En la ayuda de «a», la columna «monto» llena una celda que no acepta un valor: elige un dato que se tipea, una constante o un cálculo que se puede pisar.')
  ) as t(ayuda, tablas, regla, mensaje) loop
    v := pg_temp.aeb_rechazo(r.ayuda, r.tablas);
    if v is distinct from jsonb_build_object('regla', r.regla, 'donde', 'a', 'mensaje', r.mensaje) then
      raise exception '% da %', r.regla, v;
    end if;
  end loop;
  -- Sin catálogo, ni la tabla ni sus columnas se miran; la de antes, tampoco con él (la hoja la deja caer); con él, una clave repetida se queda con
  -- la última (como el `Map` de TS).
  if pg_temp.aeb_rechazo('[{"tipo": "tabla", "tabla": "fletes", "columnas": [{"columna": "nota"}]}]') is not null then
    raise exception 'sin catálogo rechaza la tabla';
  end if;
  if pg_temp.aeb_rechazo('{"tabla": "fletes"}', '[]') is not null then
    raise exception 'la ayuda de antes se mira contra el catálogo';
  end if;
  v := pg_temp.aeb_rechazo('[{"tipo": "texto", "texto": "El **flete** según el país."},
                             {"tipo": "tabla", "tabla": "fletes", "columnas": [{"columna": "pais"}, {"columna": "monto", "llena": "a"}], "resaltar": true}]',
                           '[{"clave": "fletes", "columnas": ["pais"]}, {"clave": "fletes", "columnas": ["pais", "monto"]}]');
  if v is not null then raise exception 'la ayuda en bloques válida da %', v; end if;
  -- La ayuda de antes, como bloques: un texto (más sus enlaces) o una tabla; los bloques, tal cual; sin ayuda, ninguno.
  if public._diseno_bloques_de_la_ayuda('{"texto": "T", "enlaces": [{"titulo": "C", "url": "https://c.com/"}]}')
       is distinct from '[{"tipo": "texto", "texto": "T"}, {"tipo": "enlaces", "enlaces": [{"titulo": "C", "url": "https://c.com/"}]}]'::jsonb
     or public._diseno_bloques_de_la_ayuda('{"texto": "T"}') is distinct from '[{"tipo": "texto", "texto": "T"}]'::jsonb
     or public._diseno_bloques_de_la_ayuda('{"tabla": "fletes"}') is distinct from '[{"tipo": "tabla", "tabla": "fletes"}]'::jsonb
     or public._diseno_bloques_de_la_ayuda('[{"tipo": "titulo", "texto": "T"}]') is distinct from '[{"tipo": "titulo", "texto": "T"}]'::jsonb
     or public._diseno_bloques_de_la_ayuda(null) is distinct from '[]'::jsonb then
    raise exception 'la ayuda de antes no se lee como bloques';
  end if;
end $$;

-- @test ayuda en bloques: el catálogo de un origen trae sus tablas activas y las compartidas, la propia antes que la compartida, y no es de nadie
begin;
do $$
declare o uuid; o2 uuid; v jsonb;
begin
  insert into public.origenes (clave, nombre) values ('prueba_aeb', 'Prueba aeb') returning id into o;
  insert into public.origenes (clave, nombre) values ('prueba_aeb2', 'Prueba aeb dos') returning id into o2;
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas, activa) values
    (o, 'aeb_fletes', 'Fletes', '[{"clave":"pais","etiqueta":"País","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"}]', true),
    (null, 'aeb_fletes', 'Fletes compartida', '[{"clave":"otra","etiqueta":"Otra","tipo":"texto"}]', true),
    (null, 'aeb_comun', 'Común', '[{"clave":"tipo","etiqueta":"Tipo","tipo":"texto"}]', true),
    (o, 'aeb_apagada', 'Apagada', '[{"clave":"x","etiqueta":"X","tipo":"texto"}]', false),
    (o2, 'aeb_ajena', 'Ajena', '[{"clave":"y","etiqueta":"Y","tipo":"texto"}]', true);
  select jsonb_agg(t.value order by t.ord) into v
    from jsonb_array_elements(public._tablas_del_catalogo(o)) with ordinality as t(value, ord) where t.value ->> 'clave' like 'aeb\_%';
  if v is distinct from '[{"clave": "aeb_comun", "columnas": ["tipo"]}, {"clave": "aeb_fletes", "columnas": ["pais", "monto"]}]'::jsonb then
    raise exception 'el catálogo de prueba_aeb es %', v;
  end if;
  select jsonb_agg(t.value order by t.ord) into v
    from jsonb_array_elements(public._tablas_del_catalogo(o2)) with ordinality as t(value, ord) where t.value ->> 'clave' like 'aeb\_%';
  if v is distinct from '[{"clave": "aeb_ajena", "columnas": ["y"]}, {"clave": "aeb_comun", "columnas": ["tipo"]}, {"clave": "aeb_fletes", "columnas": ["otra"]}]'::jsonb then
    raise exception 'el catálogo de prueba_aeb2 es %', v;
  end if;
  if has_function_privilege('authenticated', 'public._tablas_del_catalogo(uuid)', 'execute')
     or has_function_privilege('anon', 'public._tablas_del_catalogo(uuid)', 'execute') then
    raise exception '_tablas_del_catalogo se puede ejecutar desde la app';
  end if;
end $$;
rollback;

-- Ana Aeb, que configura el cotizador de un origen.
create or replace function pg_temp.aeb_persona(p_origen uuid) returns void language plpgsql as $f$
declare v_rol uuid; c_id constant uuid := '00000000-0000-4000-8000-00000000ae0a';
begin
  insert into auth.users (id, email, raw_app_meta_data) values (c_id, c_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Ana Aeb', invitacion_aceptada_en = now() where id = c_id;
  delete from public.usuarios_roles where usuario_id = c_id;
  insert into public.roles (clave, nombre) values ('aeb_configura', 'AEB configura') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (c_id, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.configurar', p_origen, 'todos');
end $f$;

-- Corre un SQL como Ana Aeb y dice cómo terminó: «sin error» o `sqlstate:detail@hint`.
create or replace function pg_temp.aeb_como(p_sql text) returns text language plpgsql as $f$
declare v_d text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000ae0a', true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-8000-00000000ae0a', 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint;
  return sqlstate || ':' || coalesce(nullif(v_d, ''), '-') || '@' || coalesce(v_h, '');
end $f$;

create or replace function pg_temp.aeb_igual(p_dio text, p_esperado text) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_esperado then raise exception 'esperaba «%», dio «%»', p_esperado, p_dio; end if;
end $f$;

-- El diseño de la publicada del origen con `p_ayuda` como la ayuda de la celda de `p_nodo`.
create or replace function pg_temp.aeb_con_ayuda(p_origen uuid, p_nodo text, p_ayuda jsonb) returns jsonb language sql as $f$
  select jsonb_set(f.diseno, '{secciones}', (
    select jsonb_agg(jsonb_set(x.s, '{items}', (
             select jsonb_agg(case when y.i ->> 'tipo' = 'celda' and y.i ->> 'nodo' = p_nodo then y.i || jsonb_build_object('ayuda', p_ayuda) else y.i end
                              order by y.io)
               from jsonb_array_elements(x.s -> 'items') with ordinality y (i, io))) order by x.so)
      from jsonb_array_elements(f.diseno -> 'secciones') with ordinality x (s, so)))
    from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada'
$f$;

-- Guarda como borrador la publicada del origen con el diseño `p_diseno` y lo publica a mano, como Ana Aeb: cómo terminó publicar.
create or replace function pg_temp.aeb_publicar(p_origen uuid, p_diseno jsonb) returns text language plpgsql as $f$
declare p public.formulas; v_hora timestamptz; v text;
begin
  select * into p from public.formulas where origen_id = p_origen and estado = 'publicada';
  select actualizado_en into v_hora from public.formulas where origen_id = p_origen and estado = 'borrador';
  v := pg_temp.aeb_como(format('select public.formula_guardar_borrador(%L, %L, %L, %L, p_actualizado_en_esperado => %L)',
                                     p_origen, p.definicion, p.params, p_diseno, v_hora));
  if v <> 'sin error' then return 'guardar: ' || v; end if;
  return pg_temp.aeb_como(format('select public.formula_publicar(%L, %L)', p_origen, 'Prueba aeb'));
end $f$;

-- Cambia las columnas de la tabla como Ana Aeb, con su versión de hoy.
create or replace function pg_temp.aeb_columnas(p_tabla uuid, p_columnas jsonb) returns text language sql as $f$
  select pg_temp.aeb_como(format('select public.tabla_referencia_columnas(%L, %L, %L)', p_tabla, p_columnas,
                                       (select r.version from public.tablas_referencia r where r.id = p_tabla)))
$f$;

-- @test ayuda en bloques: publicar a mano mira la tabla y las columnas de la ayuda contra el catálogo; la N+1 de la tabla publica aunque la ayuda
-- muestre una columna que se quitó
begin;
do $$
declare
  o uuid := (select id from public.origenes where clave = 'subasta_usa');
  t uuid;
  d jsonb;
  v_cols jsonb;
  v_filas jsonb;
  v_version int;
  c_ayuda constant jsonb := '[{"tipo": "titulo", "texto": "Transporte"},
                              {"tipo": "tabla", "tabla": "transporte_usa_bolivia", "columnas": [{"columna": "tipo"}, {"columna": "nota"}]}]';
begin
  select id, columnas into t, v_cols from public.tablas_referencia where origen_id = o and clave = 'transporte_usa_bolivia';
  if t is null then raise exception 'la semilla no trae transporte_usa_bolivia en subasta_usa'; end if;
  perform pg_temp.aeb_persona(o);
  -- Una columna que la tabla no tiene y una tabla que el origen no tiene.
  d := pg_temp.aeb_con_ayuda(o, 'transporte_bolivia', c_ayuda);
  perform pg_temp.aeb_igual(pg_temp.aeb_publicar(o, d), '22023:ayuda_columna_inexistente@transporte_bolivia');
  perform pg_temp.aeb_igual(pg_temp.aeb_publicar(o, pg_temp.aeb_con_ayuda(o, 'transporte_bolivia', '[{"tipo": "tabla", "tabla": "no_esta"}]')),
                            '22023:ayuda_tabla_inexistente@transporte_bolivia');
  -- Con la columna en la tabla publica; quitarla después se puede (sólo la muestra la ayuda).
  perform pg_temp.aeb_igual(pg_temp.aeb_columnas(t, v_cols || '[{"clave": "nota", "etiqueta": "Nota", "tipo": "texto"}]'), 'sin error');
  perform pg_temp.aeb_igual(pg_temp.aeb_publicar(o, d), 'sin error');
  perform pg_temp.aeb_igual(pg_temp.aeb_columnas(t, v_cols), 'sin error');
  -- La N+1 de publicar la tabla no pasa el catálogo: publica con la ayuda tal cual.
  v_version := (select version from public.formulas where origen_id = o and estado = 'publicada');
  v_filas := (select jsonb_agg(f.valores order by f.orden, f.id) from public.tablas_referencia_filas f where f.tabla_id = t and f.activa);
  v_filas := jsonb_set(v_filas, '{0,cliente}', to_jsonb((v_filas -> 0 ->> 'cliente')::numeric + 1));
  perform pg_temp.aeb_igual(pg_temp.aeb_como(format('select public.tabla_referencia_publicar(%L, %L, %L, %L)', t, v_filas, 'Prueba aeb',
                                                          (select r.version from public.tablas_referencia r where r.id = t))), 'sin error');
  if (select version from public.formulas where origen_id = o and estado = 'publicada') <> v_version + 1
     or (select diseno from public.formulas where origen_id = o and estado = 'publicada') is distinct from d then
    raise exception 'la N+1 de la tabla no publicó con la ayuda tal cual';
  end if;
  -- A mano, la misma ayuda ya no publica.
  perform pg_temp.aeb_igual(pg_temp.aeb_publicar(o, d), '22023:ayuda_columna_inexistente@transporte_bolivia');
end $$;
rollback;
