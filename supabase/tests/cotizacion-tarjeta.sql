-- `cotizacion_tarjeta(p_formula)` (paso 4.18-1): lo que dibuja la tarjeta (y el PDF) de una versión de la fórmula, con la plantilla publicada del origen validada
-- contra ESA versión (la de la forma 1, convertida a la cuadrícula), sólo con lo del nivel «todos» que la plantilla nombra. docs/COTIZADOR.md › «La lectura de la tarjeta». K4 es el bloque de lo oculto, por cada nivel, que
-- nombra el inventario de `cotizaciones-visibilidad.sql` (`cubierta_por`). Usa `pg_temp.pv_formula` y `pg_temp.pv_plantilla_g1` de `plantilla-validar.sql`, que corre antes.
-- La tarjeta sembrada de USA es una cuadrícula; su forma 1 llega del fixture `entities/plantilla/plantillas-v1-de-las-semillas.json` (tabla
-- `_plantillas_v1_de_las_semillas`, `DATOS_DE_PRUEBA` de `scripts/probar-schema.mjs`).
-- La dueña es `…0001` (la crea `humo.sql`). Cada bloque abre su transacción y la revierte. Compara claves y hojas, nunca texto suelto.

create or replace function pg_temp.ct_como(p_quien uuid) returns void language sql as $f$ select pg_temp.pv_como(p_quien) $f$;
-- La tarjeta de esa versión como esa persona: la respuesta, o {error, mensaje} si falla.
create or replace function pg_temp.ct_tarjeta(p_quien uuid, p_formula uuid) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text;
begin
  perform pg_temp.ct_como(p_quien);
  set local role authenticated;
  begin
    v := public.cotizacion_tarjeta(p_formula);
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return v;
end $f$;

-- Una persona con un rol propio: cada concesión es {clave, origen (nulo = todos), alcance (por omisión «todos»)}.
create or replace function pg_temp.ct_persona(p_concesiones jsonb) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ct_' || substr(v_id::text, 25, 12), 'CT ' || substr(v_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c ->> 'clave', nullif(c ->> 'origen', '')::uuid, coalesce(c ->> 'alcance', 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Pone una plantilla publicada en el origen sin pasar por `plantilla_publicar`: cuelga de su fórmula de trabajo (la única del origen en estas pruebas) y
-- archiva la que había (plantillas_publicada_unica, una por fórmula del origen).
create or replace function pg_temp.ct_publicar(p_origen uuid, p_def jsonb) returns void language plpgsql as $f$
begin
  update public.plantillas_tarjeta set estado = 'archivada' where origen_id = p_origen and estado = 'publicada';
  insert into public.plantillas_tarjeta (origen_id, version, estado, definicion, publicado_en) values (p_origen, (select coalesce(max(version), 0) + 1 from public.plantillas_tarjeta where origen_id = p_origen), 'publicada', p_def, now());
end $f$;
-- La forma 1 de la tarjeta de un origen de USA, como era antes de sembrarse en forma 2.
create or replace function pg_temp.ct_v1(p_clave text) returns jsonb language sql as $f$ select doc -> p_clave from pg_temp._plantillas_v1_de_las_semillas $f$;
create or replace function pg_temp.ct_claves(p jsonb) returns text[] language sql as $f$ select array(select k from jsonb_object_keys(p) k order by k) $f$;
create or replace function pg_temp.ct_nombre_tc(p_clave text) returns text language sql as $f$ select nombre from public.tipos_cambio where clave = p_clave and activo $f$;

-- Una celda de la cuadrícula de la respuesta, por su id.
create or replace function pg_temp.ct_celda(r jsonb, p_id text) returns jsonb language sql as $f$
  select c from jsonb_array_elements(r -> 'definicion' -> 'celdas') c where c ->> 'id' = p_id
$f$;
-- Una cuadrícula de una columna: una fila `nunca` por celda (o con `p_fila` como la fila de la primera).
create or replace function pg_temp.ct_cuadricula(p_celdas jsonb, p_fila jsonb default null) returns jsonb language sql as $f$
  select jsonb_build_object('forma', 2, 'columnas', '[{"id": "a", "ancho": 300}]'::jsonb,
    'filas', (select jsonb_agg(case when o = 1 and p_fila is not null then p_fila || jsonb_build_object('id', 'f1', 'alto', 24)
                                    else jsonb_build_object('id', 'f' || o, 'alto', 24, 'ocultar_si', 'nunca') end order by o)
                from jsonb_array_elements(p_celdas) with ordinality t (c, o)),
    'celdas', (select jsonb_agg(jsonb_build_object('id', 'x' || o, 'fila', 'f' || o, 'columna', 'a', 'contenido', c) order by o)
                 from jsonb_array_elements(p_celdas) with ordinality t (c, o)))
$f$;
-- Una fórmula publicada para K4 en la cuadrícula: g1 (bucket b1 → `tc`, del nivel «todos») con `pub` y el par `pp` (porcentaje de `pub` con su `pct` `centpct`),
-- g2 (bucket b2 → `tccent`) con `pub2` y el centinela `cent`; `cent`, `centpct` y `tccent` en una sección de `p_nivel`.
create or replace function pg_temp.ct_formula_k4(p_origen uuid, p_nivel text, p_tag text) returns uuid language plpgsql as $f$
declare v_def jsonb; v_dis jsonb; v_id uuid;
begin
  v_def := jsonb_build_object(
    'nodos', jsonb_build_array(
      jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
      jsonb_build_object('id', 'tccent', 'tipo', 'tipo_cambio', 'clave', 'paralelo', 'etiqueta', 'TCCENT-' || p_tag, 'formato', 'raw'),
      jsonb_build_object('id', 'pub', 'tipo', 'input', 'etiqueta', 'Pública', 'grupo', 'g1'),
      jsonb_build_object('id', 'centpct', 'tipo', 'input', 'etiqueta', 'CENTPCT-' || p_tag, 'formato', 'pct'),
      jsonb_build_object('id', 'pp', 'tipo', 'calculo', 'op', 'porcentaje_de', 'de', jsonb_build_array('pub'), 'pct', 'centpct', 'etiqueta', 'El par', 'grupo', 'g1'),
      jsonb_build_object('id', 'pub2', 'tipo', 'input', 'etiqueta', 'Pública dos', 'grupo', 'g2'),
      jsonb_build_object('id', 'cent', 'tipo', 'input', 'etiqueta', 'CENT-' || p_tag, 'descripcion', 'CDESC-' || p_tag, 'grupo', 'g2'),
      jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('pub', 'pp', 'pub2', 'cent'), 'etiqueta', 'Total', 'salida', 'total')),
    'buckets', jsonb_build_object('b1', 'tc', 'b2', 'tccent'), 'total_en', 'tc',
    'grupos', jsonb_build_array(jsonb_build_object('id', 'g1', 'etiqueta', 'Uno', 'plazo', '3 días', 'tono', 'verde', 'bucket', 'b1'),
                                jsonb_build_object('id', 'g2', 'etiqueta', 'Dos', 'plazo', '5 días', 'tono', 'verde', 'bucket', 'b2')));
  v_dis := jsonb_build_object('cabecera', jsonb_build_object('ver_total_bs', true, 'modos', '[]'::jsonb),
    'secciones', jsonb_build_array(
      jsonb_build_object('id', 'abierta', 'titulo', 'Abierta', 'presentacion', 'principal', 'items', jsonb_build_array(
        jsonb_build_object('tipo', 'celda', 'nodo', 'tc', 'ancho', 'mitad'), jsonb_build_object('tipo', 'celda', 'nodo', 'pub', 'ancho', 'mitad'),
        jsonb_build_object('tipo', 'celda', 'nodo', 'pp', 'ancho', 'mitad'), jsonb_build_object('tipo', 'celda', 'nodo', 'pub2', 'ancho', 'mitad'))),
      jsonb_build_object('id', 'del_nivel', 'titulo', 'Del nivel', 'presentacion', 'principal', 'nivel_ver', p_nivel, 'nivel_editar', p_nivel, 'items', jsonb_build_array(
        jsonb_build_object('tipo', 'celda', 'nodo', 'tccent', 'ancho', 'mitad'), jsonb_build_object('tipo', 'celda', 'nodo', 'centpct', 'ancho', 'mitad'),
        jsonb_build_object('tipo', 'celda', 'nodo', 'cent', 'ancho', 'mitad')))),
    'tarjeta_total', jsonb_build_object('nodo', 'total', 'secundarios', '[]'::jsonb));
  update public.formulas set estado = 'archivada' where origen_id = p_origen and estado = 'publicada';
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (p_origen, 1, 'publicada', v_def, '{}'::jsonb, v_dis, public._preparar_publicacion(v_def, '{}'::jsonb, v_dis, false), now()) returning id into v_id;
  return v_id;
end $f$;

-- @test tarjeta K1: la de subasta_usa (cuadrícula sembrada) devuelve su cuadrícula tal cual y sólo lo que nombra: sus nodos (la transferencia con su pct, por la comisión del giro), sus grupos, sus tipos de cambio, la variante, los colores con el hex del catálogo y el total
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o uuid := (select id from public.origenes where clave = 'subasta_usa');
  f uuid; r jsonb; v_of uuid; v_pla jsonb; fo public.formulas;
begin
  select * into fo from public.formulas where origen_id = o and version = 1;
  f := fo.id;
  v_pla := (select definicion from public.plantillas_tarjeta where origen_id = o and estado = 'publicada');
  r := pg_temp.ct_tarjeta(duena, f);
  if r ->> 'estado' is distinct from 'lista' then raise exception 'la tarjeta no está lista: %', r; end if;
  if pg_temp.ct_claves(r) is distinct from array['colores', 'definicion', 'estado', 'grupos', 'modos', 'moneda_bs', 'nodos', 'plantilla', 'tipos_de_cambio', 'total', 'variante'] then
    raise exception 'las claves: %', pg_temp.ct_claves(r);
  end if;
  if v_pla ->> 'forma' is distinct from '2' or r -> 'definicion' is distinct from v_pla then
    raise exception 'la definición no es la cuadrícula sembrada';
  end if;
  if (r -> 'plantilla' ->> 'version')::int is distinct from (select version from public.plantillas_tarjeta where origen_id = o and estado = 'publicada') then
    raise exception 'la versión: %', r -> 'plantilla';
  end if;
  -- Los nodos: los miembros, el total y lo aparte, cada uno con su etiqueta, su descripción, su grupo y el pct sólo de un porcentaje: el de la transferencia,
  -- que la comisión del giro muestra en su leyenda (un texto con datos).
  if (select array_agg(x ->> 'id' order by x ->> 'id') from jsonb_array_elements(r -> 'nodos') x)
     is distinct from array['comision', 'cuenta_especial', 'documentacion', 'export', 'fees', 'garantia', 'grua', 'nacionalizacion', 'remate', 'total', 'transferencia',
                            'transferencia_pct', 'transporte_bolivia', 'transporte_chile'] then
    raise exception 'los nodos: %', r -> 'nodos';
  end if;
  if (select x ->> 'pct' from jsonb_array_elements(r -> 'nodos') x where x ->> 'id' = 'transferencia') is distinct from 'transferencia_pct'
     or pg_temp.ct_celda(r, 'c_n_transferencia_leyenda') -> 'contenido'
        <> '{"tipo": "texto", "partes": ["Comisión giro ", {"tipo": "dato", "nodo": "transferencia", "mostrar": "porcentaje"}]}' then
    raise exception 'la comisión del giro con su porcentaje: % %', r -> 'nodos', pg_temp.ct_celda(r, 'c_n_transferencia_leyenda');
  end if;
  if (select x from jsonb_array_elements(r -> 'nodos') x where x ->> 'id' = 'remate')
     is distinct from '{"id": "remate", "etiqueta": "Remate (costo aprox.)", "descripcion": "Probabilidad de compra en subasta", "grupo": "compra", "pct": null}' then
    raise exception 'el nodo remate: %', r -> 'nodos';
  end if;
  if r -> 'grupos' is distinct from '[{"id": "aduana", "etiqueta": "Aduana", "plazo": "4 meses (Aprox.)", "bucket": "aduana"},
                                      {"id": "compra", "etiqueta": "Compra", "plazo": "2 días", "bucket": "exterior"},
                                      {"id": "logistica", "etiqueta": "Logística", "plazo": "7 días", "bucket": "exterior"}]' then
    raise exception 'los grupos: %', r -> 'grupos';
  end if;
  if r -> 'variante' <> jsonb_build_object('nodo', 'variante', 'opciones', (select jsonb_agg(jsonb_build_object('clave', x ->> 'clave', 'titulo', x ->> 'titulo'))
                                            from jsonb_array_elements((select n -> 'opciones' from jsonb_array_elements(fo.definicion -> 'nodos') n where n ->> 'id' = 'variante')) x)) then
    raise exception 'la variante: %', r -> 'variante';
  end if;
  if r -> 'colores' <> (select jsonb_agg(jsonb_build_object('clave', t.clave, 'hex', t.hex) order by t.clave) from public.tonos t where t.clave in ('amarillo', 'naranja', 'verde')) then
    raise exception 'los colores: %', r -> 'colores';
  end if;
  if r -> 'total' <> '{"nodo": "total"}' or r -> 'modos' <> '[]' then raise exception 'el total o los modos: % %', r -> 'total', r -> 'modos'; end if;
  if pg_temp.ct_celda(r, 'c_a_garantia_grupo') -> 'contenido' <> '{"tipo": "texto", "texto": "GARANTÍA PARA LA PARTICIPACIÓN"}' then
    raise exception 'lo aparte con su etiqueta: %', pg_temp.ct_celda(r, 'c_a_garantia_grupo');
  end if;
  -- Una fórmula sin grupos (oficina): sólo el total, sin grupos, tipos de cambio, variante ni colores.
  select id into v_of from public.formulas where origen_id = (select id from public.origenes where clave = 'oficina') and version = 1;
  r := pg_temp.ct_tarjeta(duena, v_of);
  if r ->> 'estado' is distinct from 'lista' or r -> 'grupos' is distinct from '[]' or r -> 'tipos_de_cambio' is distinct from '{"buckets": {}, "modos": {}}'
     or r -> 'variante' is distinct from 'null' or r -> 'colores' is distinct from '[]' or r #>> '{total,nodo}' is distinct from 'total'
     or (select array_agg(x ->> 'id') from jsonb_array_elements(r -> 'nodos') x) is distinct from array['total'] then
    raise exception 'la de oficina: %', r;
  end if;
end $$;
rollback;

-- @test tarjeta K2: sin cotizaciones.ver del origen, una versión que no existe y un borrador dan el mismo 42501 con el mismo texto (también a la dueña); con «propios» y una publicada, sí
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o uuid := (select id from public.origenes where clave = 'subasta_usa');
  o_of uuid := (select id from public.origenes where clave = 'oficina'); f uuid; v_borr uuid; sin uuid; propios uuid; otro uuid; r jsonb; v_quien uuid; v_cual uuid;
  v_no constant jsonb := '{"error": "42501", "mensaje": "No tienes acceso a esa versión de la fórmula."}';
begin
  select id into f from public.formulas where origen_id = o and version = 1;
  insert into public.formulas (origen_id, estado, definicion, params) select origen_id, 'borrador', definicion, params from public.formulas where id = f returning id into v_borr;
  sin := pg_temp.ct_persona('[{"clave": "leads.ver"}, {"clave": "cotizaciones.crear"}]');
  propios := pg_temp.ct_persona(jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o, 'alcance', 'propios')));
  otro := pg_temp.ct_persona(jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o_of)));
  foreach v_quien in array array[sin, duena, propios] loop
    foreach v_cual in array array[gen_random_uuid(), v_borr] loop
      r := pg_temp.ct_tarjeta(v_quien, v_cual);
      if r is distinct from v_no then raise exception 'una versión inexistente o un borrador (%) no da el mismo 42501: %', v_cual = v_borr, r; end if;
    end loop;
  end loop;
  foreach v_quien in array array[sin, otro] loop
    r := pg_temp.ct_tarjeta(v_quien, f);
    if r is distinct from v_no then raise exception 'sin cotizaciones.ver del origen: %', r; end if;
  end loop;
  foreach v_quien in array array[propios, duena] loop
    r := pg_temp.ct_tarjeta(v_quien, f);
    if r ->> 'estado' is distinct from 'lista' then raise exception 'con cotizaciones.ver del origen no hay tarjeta: %', r; end if;
  end loop;
  -- Una versión archivada (la de una guardada) también se lee.
  update public.formulas set estado = 'archivada' where id = f;
  if pg_temp.ct_tarjeta(propios, f) ->> 'estado' is distinct from 'lista' then raise exception 'una archivada no se lee'; end if;
end $$;
rollback;

-- @test tarjeta K3: sin_plantilla exacto con la forma vieja, con la N+1 que restringe un miembro (la N sigue lista) y con una forma 1 que no se convierte; un color borrado: en la forma 1 cae al del grupo, en la cuadrícula no está en `colores` (se dibuja `auto`); otro error sube tal cual
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o_sub uuid := (select id from public.origenes where clave = 'subasta_usa'); o uuid;
  f1 uuid; fn uuid; fn1 uuid; r jsonb; v_pla jsonb;
begin
  select id into f1 from public.formulas where origen_id = o_sub and version = 1;
  v_pla := pg_temp.ct_v1('subasta_usa');
  -- (a) la forma vieja.
  perform pg_temp.ct_publicar(o_sub, '{"paleta": {"fondo": "#ffffff"}, "columnas": [], "grupos": [{"titulo": "Detalle", "filas": "secciones"}]}');
  r := pg_temp.ct_tarjeta(duena, f1);
  if r is distinct from '{"estado": "sin_plantilla"}' then raise exception '(a) la forma vieja: %', r; end if;
  -- (a2) una forma 1 válida cuya conversión rompe una regla de la cuadrícula (un `{{` en una etiqueta: un texto no lleva variables).
  perform pg_temp.ct_publicar(o_sub, jsonb_set(v_pla, '{etiquetas,garantia}', '"Garantía {{monto}}"'));
  r := pg_temp.ct_tarjeta(duena, f1);
  if r is distinct from '{"estado": "sin_plantilla"}' then raise exception '(a2) la que no se convierte: %', r; end if;
  -- (b) la plantilla vale para la N y no para la N+1, que pone un miembro en «costos».
  insert into public.origenes (clave, nombre) values ('ct_k3', 'CT K3') returning id into o;
  fn := pg_temp.pv_formula(o, 1, 'costos', 'k3', 'abierto');
  perform pg_temp.ct_publicar(o, pg_temp.pv_plantilla_g1());
  fn1 := pg_temp.pv_formula(o, 2, 'costos', 'k3', 'miembro');
  r := pg_temp.ct_tarjeta(duena, fn1);
  if r is distinct from '{"estado": "sin_plantilla"}' then raise exception '(b) la N+1: %', r; end if;
  r := pg_temp.ct_tarjeta(duena, fn);
  if r ->> 'estado' is distinct from 'lista' or (select x ->> 'etiqueta' from jsonb_array_elements(r -> 'nodos') x where x ->> 'id' = 'cent') is distinct from 'CENT-k3' then
    raise exception '(b) la N: %', r;
  end if;
  -- (c) un color que sólo elige la plantilla de la forma 1, borrado del catálogo: cae al del grupo.
  insert into public.tonos (clave, nombre, hex, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
  select 'ct_tono', 'CT tono', '#31869b', claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta from public.tonos where clave = 'verde';
  perform pg_temp.ct_publicar(o_sub, jsonb_set(v_pla, '{grupos,0,tono}', '"ct_tono"'));
  r := pg_temp.ct_tarjeta(duena, f1);
  if pg_temp.ct_celda(r, 'c_n_remate_monto') #>> '{estilo,fondo}' is distinct from 'ct_tono'
     or (select x ->> 'hex' from jsonb_array_elements(r -> 'colores') x where x ->> 'clave' = 'ct_tono') is distinct from '#31869b' then
    raise exception '(c) el color elegido: %', r -> 'colores';
  end if;
  delete from public.tonos where clave = 'ct_tono';
  r := pg_temp.ct_tarjeta(duena, f1);
  if r ->> 'estado' is distinct from 'lista' or pg_temp.ct_celda(r, 'c_n_remate_monto') #>> '{estilo,fondo}' is distinct from 'verde'
     or (select array_agg(x ->> 'clave' order by x ->> 'clave') from jsonb_array_elements(r -> 'colores') x) is distinct from array['amarillo', 'naranja', 'verde'] then
    raise exception '(c) con el color borrado: %', r;
  end if;
  -- (c2) en la cuadrícula, un color borrado después de publicar sigue nombrado y no está en `colores`.
  insert into public.tonos (clave, nombre, hex, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
  select 'ct_tono2', 'CT tono 2', '#31869b', claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta from public.tonos where clave = 'verde';
  perform pg_temp.ct_publicar(o_sub, jsonb_set(pg_temp.ct_cuadricula('[{"tipo": "dato", "nodo": "remate", "mostrar": "monto"}]'), '{celdas,0,estilo}', '{"fondo": "ct_tono2"}'));
  if pg_temp.ct_tarjeta(duena, f1) -> 'colores' is distinct from '[{"clave": "ct_tono2", "hex": "#31869b"}]' then raise exception '(c2) el color nombrado'; end if;
  delete from public.tonos where clave = 'ct_tono2';
  r := pg_temp.ct_tarjeta(duena, f1);
  if r ->> 'estado' is distinct from 'lista' or r -> 'colores' is distinct from '[]' or pg_temp.ct_celda(r, 'x1') #>> '{estilo,fondo}' is distinct from 'ct_tono2' then
    raise exception '(c2) con el color borrado: %', r;
  end if;
end $$;
rollback;

begin;
create or replace function public.validar_plantilla(p_plantilla jsonb, p_def jsonb, p_diseno jsonb, p_visibilidad jsonb, p_tonos text[]) returns void
  language plpgsql set search_path = '' as $f$ begin raise exception 'roto a propósito' using errcode = 'XX000'; end $f$;
do $$
declare r jsonb;
begin
  r := pg_temp.ct_tarjeta('00000000-0000-0000-0000-000000000001', (select f.id from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave = 'subasta_usa' and f.version = 1));
  if r ->> 'error' is distinct from 'XX000' then raise exception '(d) un error que no es un rechazo se volvió otra cosa: %', r; end if;
end $$;
rollback;

-- @test tarjeta K4: por cada nivel (costos y uno creado con nivel_crear), un nodo del nivel no sale ni por su id, ni por su etiqueta, ni por su descripción, ni por el texto de la plantilla: en la forma 1 (miembro de la N+1, nombrado por una plantilla metida directo o suelto) y en la cuadrícula (un dato de etiqueta, de monto y de descripción, el nodo de una fila, el pct de un porcentaje, el tipo de cambio de un bucket, las condiciones: una lista de respaldo, una condición sobre el nodo o sobre un dato, una rama, el «si no» y la condición de una fila; y un texto con datos que lo nombra por etiqueta, monto, descripción o el pct de un porcentaje)
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; v_nuevo uuid := gen_random_uuid(); v_nivel text; v_i int := 0; v_tag text;
  o_a uuid; o_b uuid; o_c uuid; o_d uuid; f_i uuid; f_ii uuid; f_iii uuid; f_iv uuid; asesora uuid; v_quien uuid; r jsonb; v_caso text; v_esperado text; v_cuad jsonb;
  v_cuadriculas jsonb;
begin
  perform pg_temp.ct_como(duena);
  set local role authenticated;
  perform public.nivel_crear(v_nuevo, 'Gerencia CT');
  reset role;
  -- Las cuadrículas que nombran al centinela (cada una da `sin_plantilla`) y una que no (lista, sin él).
  v_cuadriculas := jsonb_build_object(
    'etiqueta', pg_temp.ct_cuadricula('[{"tipo": "dato", "nodo": "cent", "mostrar": "etiqueta"}]'),
    'monto', pg_temp.ct_cuadricula('[{"tipo": "dato", "nodo": "cent", "mostrar": "monto"}]'),
    'descripcion', pg_temp.ct_cuadricula('[{"tipo": "dato", "nodo": "cent", "mostrar": "descripcion"}]'),
    'fila', pg_temp.ct_cuadricula('[{"tipo": "texto", "texto": "Fila"}]', '{"ocultar_si": "no_aplica", "nodo": "cent"}'),
    'pct', pg_temp.ct_cuadricula('[{"tipo": "dato", "nodo": "pp", "mostrar": "porcentaje"}]'),
    'tipo_de_cambio', pg_temp.ct_cuadricula('[{"tipo": "dato", "nodo": "pub2", "mostrar": "tc_nombre"}]'),
    'abierta', pg_temp.ct_cuadricula('[{"tipo": "dato", "nodo": "pub", "mostrar": "tc_valor"}, {"tipo": "dato", "nodo": "pp", "mostrar": "monto"}, {"tipo": "dato", "nodo": "pub2", "mostrar": "plazo"}]'),
    -- Las condiciones de la tarjeta: en una lista de respaldo, en una condición sobre el nodo o sobre un dato, en el contenido de una rama, en el «si no» y en la
    -- condición de una fila.
    'respaldo', pg_temp.ct_cuadricula('[{"tipo": "respaldo", "datos": [{"tipo": "dato", "variable": "titulo"}, {"tipo": "dato", "nodo": "cent", "mostrar": "etiqueta"}]}]'),
    'condicion', pg_temp.ct_cuadricula('[{"tipo": "condiciones", "ramas": [{"si": [{"es": "cero", "nodo": "cent"}], "contenido": {"tipo": "texto", "texto": "Sí"}}], "si_no": {"tipo": "vacio"}}]'),
    'condicion_de_dato', pg_temp.ct_cuadricula('[{"tipo": "condiciones", "ramas": [{"si": [{"es": "vacio", "dato": {"tipo": "dato", "nodo": "cent", "mostrar": "descripcion"}}],
                                                                                    "contenido": {"tipo": "texto", "texto": "Sí"}}], "si_no": {"tipo": "vacio"}}]'),
    'rama', pg_temp.ct_cuadricula('[{"tipo": "condiciones", "ramas": [{"si": [{"es": "cero", "nodo": "pub"}], "contenido": {"tipo": "dato", "nodo": "cent", "mostrar": "monto"}}],
                                     "si_no": {"tipo": "vacio"}}]'),
    'si_no', pg_temp.ct_cuadricula('[{"tipo": "condiciones", "ramas": [{"si": [{"es": "cero", "nodo": "pub"}], "contenido": {"tipo": "vacio"}}],
                                      "si_no": {"tipo": "dato", "nodo": "cent", "mostrar": "etiqueta"}}]'),
    'fila_condicion', pg_temp.ct_cuadricula('[{"tipo": "texto", "texto": "Fila"}]', '{"ocultar_si": "condiciones", "si": [{"es": "no_cero", "nodo": "cent"}]}'),
    -- Un texto con datos: cada dato de sus partes es un dato nombrado (el centinela por etiqueta, monto o descripción, y el porcentaje de `pp`, cuyo pct es del nivel).
    'partes_etiqueta', pg_temp.ct_cuadricula('[{"tipo": "texto", "partes": ["Valor ", {"tipo": "dato", "nodo": "pub", "mostrar": "monto"}, " y ", {"tipo": "dato", "nodo": "cent", "mostrar": "etiqueta"}]}]'),
    'partes_monto', pg_temp.ct_cuadricula('[{"tipo": "texto", "partes": ["Valor ", {"tipo": "dato", "nodo": "cent", "mostrar": "monto"}]}]'),
    'partes_descripcion', pg_temp.ct_cuadricula('[{"tipo": "texto", "partes": [{"tipo": "dato", "variable": "titulo"}, " · ", {"tipo": "dato", "nodo": "cent", "mostrar": "descripcion"}]}]'),
    'partes_pct', pg_temp.ct_cuadricula('[{"tipo": "texto", "partes": ["Par ", {"tipo": "dato", "nodo": "pp", "mostrar": "porcentaje"}]}]'));
  foreach v_nivel in array array['costos', (select clave from public.cotizaciones_niveles where nombre = 'Gerencia CT')] loop
    v_i := v_i + 1; v_tag := 'k4n' || v_i;
    insert into public.origenes (clave, nombre) values ('ct_k4a_' || v_i, 'CT K4 A ' || v_i) returning id into o_a;
    insert into public.origenes (clave, nombre) values ('ct_k4b_' || v_i, 'CT K4 B ' || v_i) returning id into o_b;
    insert into public.origenes (clave, nombre) values ('ct_k4c_' || v_i, 'CT K4 C ' || v_i) returning id into o_c;
    insert into public.origenes (clave, nombre) values ('ct_k4d_' || v_i, 'CT K4 D ' || v_i) returning id into o_d;
    -- (i) la plantilla vale para la N (el centinela abierto) y la N+1 lo pone en el nivel.
    perform pg_temp.pv_formula(o_a, 1, v_nivel, v_tag || 'i', 'abierto');
    perform pg_temp.ct_publicar(o_a, pg_temp.pv_plantilla_g1());
    f_i := pg_temp.pv_formula(o_a, 2, v_nivel, v_tag || 'i', 'miembro');
    -- (ii) miembro del nivel y nombrado por una plantilla publicada sin pasar por plantilla_publicar.
    f_ii := pg_temp.pv_formula(o_b, 1, v_nivel, v_tag || 'ii', 'miembro');
    perform pg_temp.ct_publicar(o_b, pg_temp.pv_plantilla_g1() || jsonb_build_object('etiquetas', jsonb_build_object('cent', 'PLAETQ-' || v_tag),
                                                                                   'leyendas', jsonb_build_object('cent', 'PLALEY-' || v_tag)));
    -- (iii) suelto: del nivel, ni miembro ni nombrado.
    f_iii := pg_temp.pv_formula(o_c, 1, v_nivel, v_tag || 'iii', 'suelto');
    perform pg_temp.ct_publicar(o_c, pg_temp.pv_plantilla_g1());
    -- (iv) la cuadrícula: cada forma de nombrar un nodo del nivel.
    f_iv := pg_temp.ct_formula_k4(o_d, v_nivel, v_tag || 'iv');
    asesora := pg_temp.ct_persona(jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.ver'),
                                                    jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.editar')));
    foreach v_quien in array array[duena, asesora] loop
      foreach v_caso in array array['i', 'ii', 'iii', 'etiqueta', 'monto', 'descripcion', 'fila', 'pct', 'tipo_de_cambio', 'abierta', 'respaldo', 'condicion',
                                     'condicion_de_dato', 'rama', 'si_no', 'fila_condicion', 'partes_etiqueta', 'partes_monto', 'partes_descripcion', 'partes_pct'] loop
        if v_cuadriculas ? v_caso then perform pg_temp.ct_publicar(o_d, v_cuadriculas -> v_caso); end if;
        r := pg_temp.ct_tarjeta(v_quien, case v_caso when 'i' then f_i when 'ii' then f_ii when 'iii' then f_iii else f_iv end);
        if r ? 'error' then raise exception 'nivel %, caso %: %', v_nivel, v_caso, r; end if;
        -- «centro» (una alineación) no es el centinela; cualquier otro `cent` sí (su id, `n_cent`, `tccent`, `centpct`).
        if position('cent' in replace(r::text, 'centro', '')) > 0 or position('CENT-' in r::text) > 0 or position('CDESC-' in r::text) > 0 or position('PLAETQ-' in r::text) > 0
           or position('PLALEY-' in r::text) > 0 or position('TCCENT-' in r::text) > 0 or position('CENTPCT-' in r::text) > 0 then
          raise exception 'nivel %, caso %: sale el nodo del nivel: %', v_nivel, v_caso, r;
        end if;
        v_esperado := case when v_caso in ('iii', 'abierta') then 'lista' else 'sin_plantilla' end;
        if r ->> 'estado' is distinct from v_esperado then raise exception 'nivel %, caso %: el estado: %', v_nivel, v_caso, r; end if;
      end loop;
    end loop;
  end loop;
end $$;
rollback;

-- @test tarjeta K5: los tipos de cambio por su nombre y su nodo (del nivel «todos»: lo valida la plantilla), por bucket y por modo (uno inactivo, nombre nulo); sin la columna, vacíos
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o uuid := (select id from public.origenes where clave = 'subasta_usa'); f uuid; r jsonb;
begin
  select id into f from public.formulas where origen_id = o and version = 1;
  r := pg_temp.ct_tarjeta(duena, f);
  if r ->> 'estado' is distinct from 'lista' then raise exception 'no está lista: %', r; end if;
  if r -> 'tipos_de_cambio' is distinct from jsonb_build_object(
       'buckets', jsonb_build_object('exterior', jsonb_build_object('nombre', pg_temp.ct_nombre_tc('paralelo'), 'nodo', 'tc_paralelo'),
                                     'aduana', jsonb_build_object('nombre', pg_temp.ct_nombre_tc('oficial'), 'nodo', 'tc_oficial')),
       'modos', jsonb_build_object(
         'paralelo', jsonb_build_object('exterior', jsonb_build_object('nombre', pg_temp.ct_nombre_tc('paralelo'), 'nodo', 'tc_paralelo'),
                                        'aduana', jsonb_build_object('nombre', pg_temp.ct_nombre_tc('oficial'), 'nodo', 'tc_oficial')),
         'unificado', jsonb_build_object('exterior', jsonb_build_object('nombre', pg_temp.ct_nombre_tc('unificado'), 'nodo', 'tc_unificado'),
                                         'aduana', jsonb_build_object('nombre', pg_temp.ct_nombre_tc('oficial'), 'nodo', 'tc_oficial')))) then
    raise exception 'los tipos de cambio: %', r -> 'tipos_de_cambio';
  end if;
  update public.tipos_cambio set activo = false where clave = 'unificado';
  r := pg_temp.ct_tarjeta(duena, f);
  if r ->> 'estado' is distinct from 'lista' then raise exception 'con uno inactivo no está lista: %', r; end if;
  if r #> '{tipos_de_cambio,modos,unificado,exterior,nombre}' is distinct from 'null'::jsonb
     or r #>> '{tipos_de_cambio,modos,unificado,aduana,nombre}' is distinct from pg_temp.ct_nombre_tc('oficial') then
    raise exception 'uno inactivo: %', r -> 'tipos_de_cambio';
  end if;
  perform pg_temp.ct_publicar(o, jsonb_set(pg_temp.ct_v1('subasta_usa'), '{columnas,tipo_cambio}', 'false'));
  r := pg_temp.ct_tarjeta(duena, f);
  if r ->> 'estado' is distinct from 'lista' or r -> 'tipos_de_cambio' is distinct from '{"buckets": {}, "modos": {}}' then raise exception 'sin la columna: %', r; end if;
end $$;
rollback;

-- @test tarjeta K6: la moneda del total en Bs es la del tipo de cambio que nombra el total_en de ESA versión (no la de un bucket), la misma que da la hoja
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o uuid := (select id from public.origenes where clave = 'subasta_usa'); f uuid; r jsonb; h jsonb; v_def jsonb;
begin
  -- Una versión cuyo total_en es un tipo de cambio a otra moneda (los de la semilla son todos a BOB): el del modo unificado, que ningún bucket usa por omisión.
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor) values ('ct_eur', 'CT a euros', 'USD', 'EUR', 0.92);
  select jsonb_set(jsonb_set(x.definicion, '{total_en}', '"tc_unificado"'), '{nodos}',
                   (select jsonb_agg(case when n ->> 'id' = 'tc_unificado' then n || '{"clave": "ct_eur"}' else n end order by t.pos)
                      from jsonb_array_elements(x.definicion -> 'nodos') with ordinality t (n, pos)))
    into v_def from public.formulas x where x.origen_id = o and x.version = 1;
  update public.formulas set estado = 'archivada' where origen_id = o and estado = 'publicada';
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  select origen_id, (select max(version) + 1 from public.formulas where origen_id = o), 'publicada', v_def, params, diseno, visibilidad, now()
    from public.formulas where origen_id = o and version = 1 returning id into f;
  r := pg_temp.ct_tarjeta(duena, f);
  if r ->> 'estado' is distinct from 'lista' or r -> 'moneda_bs' is distinct from '"EUR"' then raise exception 'moneda_bs de la versión: %', r; end if;
  h := (pg_temp.pv_corre(duena, format('select public.cotizacion_hoja(%L)', o)) ->> 'ok')::jsonb;
  if h #> '{cabecera,moneda_bs}' is distinct from r -> 'moneda_bs' then raise exception 'la hoja dice % y la tarjeta %', h #> '{cabecera,moneda_bs}', r -> 'moneda_bs'; end if;
  -- La v1 (total_en = el paralelo, a BOB) sigue con la suya: la moneda es de la versión.
  r := pg_temp.ct_tarjeta(duena, (select id from public.formulas where origen_id = o and version = 1));
  if r -> 'moneda_bs' is distinct from '"BOB"' then raise exception 'moneda_bs de la v1: %', r -> 'moneda_bs'; end if;
end $$;
rollback;

-- @test tarjeta K7: cotizacion_tarjeta es de authenticated y service_role (no de anon ni PUBLIC), corre con los derechos de su dueña y search_path vacío; sus ayudantes de antes ya no existen
do $$
declare v_quien text[];
begin
  v_quien := array(select r from unnest(array['authenticated', 'service_role', 'anon', 'public']) r where has_function_privilege(r, 'public.cotizacion_tarjeta(uuid)', 'execute'));
  if v_quien is distinct from array['authenticated', 'service_role'] then raise exception 'privilegios de cotizacion_tarjeta: %', v_quien; end if;
  if not (select prosecdef and proconfig = array['search_path=""'] from pg_proc where oid = 'public.cotizacion_tarjeta(uuid)'::regprocedure) then raise exception 'cotizacion_tarjeta no tiene los derechos de su dueña y search_path vacío'; end if;
  if to_regprocedure('public._tarjeta_grupos(jsonb, jsonb, jsonb)') is not null or to_regprocedure('public._tarjeta_tipos_de_cambio(jsonb, jsonb, text[])') is not null then
    raise exception 'quedan los ayudantes de la tarjeta de grupos';
  end if;
end $$;

-- @test tarjeta K8: sólo viaja lo que la cuadrícula nombra: los nodos de sus celdas y filas (el pct sólo con `porcentaje`), los grupos de un `tc_*` o `plazo`, los modos con `modo_tc` y la variante con `titulo_opcion`
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o uuid := (select id from public.origenes where clave = 'subasta_usa'); f uuid; r jsonb;
begin
  select id into f from public.formulas where origen_id = o and version = 1;
  perform pg_temp.ct_publicar(o, pg_temp.ct_cuadricula('[{"tipo": "dato", "nodo": "remate", "mostrar": "monto"}, {"tipo": "dato", "nodo": "fees", "mostrar": "etiqueta"}]',
                                                        '{"ocultar_si": "no_aplica_o_cero", "nodo": "grua"}'));
  r := pg_temp.ct_tarjeta(duena, f);
  if r ->> 'estado' is distinct from 'lista' then raise exception 'no está lista: %', r; end if;
  if (select array_agg(x ->> 'id' order by x ->> 'id') from jsonb_array_elements(r -> 'nodos') x) is distinct from array['fees', 'grua', 'remate']
     or r -> 'grupos' <> '[]' or r -> 'tipos_de_cambio' <> '{"buckets": {}, "modos": {}}' or r -> 'modos' <> '[]' or r -> 'variante' <> 'null' or r -> 'colores' <> '[]' then
    raise exception 'viaja de más: %', r;
  end if;
  -- El porcentaje de un par, el plazo, `modo_tc` y `titulo_opcion`.
  perform pg_temp.ct_publicar(o, pg_temp.ct_cuadricula('[{"tipo": "dato", "nodo": "fees", "mostrar": "porcentaje"}, {"tipo": "dato", "nodo": "grua", "mostrar": "plazo"},
                                                          {"tipo": "dato", "variable": "modo_tc"}, {"tipo": "dato", "variable": "titulo_opcion"}]'));
  r := pg_temp.ct_tarjeta(duena, f);
  if (select x ->> 'pct' from jsonb_array_elements(r -> 'nodos') x where x ->> 'id' = 'fees') is distinct from 'fees_pct'
     or (select array_agg(x ->> 'id' order by x ->> 'id') from jsonb_array_elements(r -> 'nodos') x) is distinct from array['fees', 'fees_pct', 'grua']
     or (select array_agg(x ->> 'id') from jsonb_array_elements(r -> 'grupos') x) is distinct from array['logistica']
     -- Un grupo que sólo nombra un `plazo` no lleva su bucket: ninguna celda `tc_*` validó su tipo de cambio.
     or r #> '{grupos,0,bucket}' is distinct from 'null'::jsonb
     or r -> 'tipos_de_cambio' <> '{"buckets": {}, "modos": {}}'
     or r -> 'modos' <> '[{"clave": "paralelo", "nombre": "Paralelo"}, {"clave": "unificado", "nombre": "Unificado"}]'
     or r #>> '{variante,nodo}' is distinct from 'variante' then
    raise exception 'el porcentaje, el plazo, los modos o la variante: %', r;
  end if;
end $$;
rollback;

-- @test tarjeta K9: un texto con datos (el porcentaje de transferencia y el nombre del cliente) sale tal cual; `nodos` trae `transferencia` con su `pct` y nada de más
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o uuid := (select id from public.origenes where clave = 'subasta_usa'); f uuid; r jsonb; v_def jsonb;
begin
  select id into f from public.formulas where origen_id = o and version = 1;
  v_def := pg_temp.ct_cuadricula('[{"tipo": "texto", "partes": ["Comisión giro ", {"tipo": "dato", "nodo": "transferencia", "mostrar": "porcentaje"},
                                                                 " para ", {"tipo": "dato", "variable": "cliente_nombre"}]}]');
  perform pg_temp.ct_publicar(o, v_def);
  r := pg_temp.ct_tarjeta(duena, f);
  if r ->> 'estado' is distinct from 'lista' then raise exception 'no está lista: %', r; end if;
  if r -> 'definicion' is distinct from v_def then raise exception 'la definición no sale tal cual: %', r -> 'definicion'; end if;
  if (select array_agg(x ->> 'id' order by x ->> 'id') from jsonb_array_elements(r -> 'nodos') x) is distinct from array['transferencia', 'transferencia_pct']
     or (select x ->> 'pct' from jsonb_array_elements(r -> 'nodos') x where x ->> 'id' = 'transferencia') is distinct from 'transferencia_pct'
     or r -> 'grupos' <> '[]' or r -> 'tipos_de_cambio' <> '{"buckets": {}, "modos": {}}' or r -> 'modos' <> '[]' or r -> 'variante' <> 'null' then
    raise exception 'viaja de más o de menos: %', r;
  end if;
end $$;
rollback;

-- @test tarjeta K10: cada nodo trae los decimales de su celda (`decimales`) y los del `pct` de su porcentaje (`decimales_del_pct`) sólo si la versión los tiene; sin ellos, ninguna de las dos claves
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o uuid := (select id from public.origenes where clave = 'subasta_usa'); f uuid; r jsonb;
begin
  select id into f from public.formulas where origen_id = o and version = 1;
  r := pg_temp.ct_tarjeta(duena, f);
  if r ->> 'estado' is distinct from 'lista' or exists (select 1 from jsonb_array_elements(r -> 'nodos') x where x ? 'decimales' or x ? 'decimales_del_pct') then
    raise exception 'sin decimales en la versión, la tarjeta los trae: %', r -> 'nodos';
  end if;
  update public.formulas
     set definicion = jsonb_set(definicion, '{nodos}', (select jsonb_agg(case n ->> 'id' when 'transferencia' then n || '{"decimales": 0}' when 'transferencia_pct' then n || '{"decimales": 1}'
                                                                                         when 'total' then n || '{"decimales": 2}' else n end order by i)
                                                          from jsonb_array_elements(definicion -> 'nodos') with ordinality t (n, i)))
   where id = f;
  r := pg_temp.ct_tarjeta(duena, f);
  if r ->> 'estado' is distinct from 'lista' then raise exception 'con decimales no está lista: %', r; end if;
  if (select jsonb_object_agg(x ->> 'id', jsonb_build_object('d', x -> 'decimales', 'p', x -> 'decimales_del_pct'))
        from jsonb_array_elements(r -> 'nodos') x where x ? 'decimales' or x ? 'decimales_del_pct')
     is distinct from '{"transferencia": {"d": 0, "p": 1}, "transferencia_pct": {"d": 1, "p": null}, "total": {"d": 2, "p": null}}'::jsonb
     or exists (select 1 from jsonb_array_elements(r -> 'nodos') x where x ->> 'id' in ('transferencia_pct', 'total') and x ? 'decimales_del_pct') then
    raise exception 'los decimales de los nodos: %', r -> 'nodos';
  end if;
end $$;
rollback;
