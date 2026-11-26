-- Los «Decimales» de una celda (glosario: «Decimales (de una celda)»; docs/COTIZADOR.md › «Los nodos»): una clave opcional `decimales` (un entero
-- de 0 a 4) en cada nodo de la definición. Sin ella, «Automático» (lo de siempre). Sólo cambia cómo se muestra la celda: el motor, `valores` y los
-- casos compartidos no cambian.
--   1. La forma la valida (`_formula_forma_nodo`, F74–F77, como la `n` de `redondear`), con el mismo rango y la misma ruta que el Zod.
--   2. Las lecturas que dibujan una celda la llevan sólo cuando el nodo la trae, así una versión sin ella da el mismo JSON de siempre: la hoja
--      (`_cotizacion_hoja`, y con ella `cotizacion_hoja` y `cotizacion_hoja_guardada`, que dibuja la versión de la guardada), la tarjeta
--      (`cotizacion_tarjeta`, también los del `pct` de un porcentaje) y las etiquetas de las revisiones (`_revision_etiquetas`).
-- Ninguna migración de datos: una versión publicada sin la clave sigue siendo «Automático».

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 1. La forma.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create or replace function public._formula_forma_nodo(p_n jsonb) returns text
  language plpgsql stable
  set search_path = ''
as $_$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  c_campo constant text := '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$';
  c_base constant text[] := array['id', 'etiqueta', 'formato', 'decimales', 'descripcion', 'seccion', 'color', 'salida', 'bucket', 'grupo', 'tipo'];
  v_tipo text;
  v_op text;
  v_permitidas text[];
  v_cmps text[];          -- los comparadores que admite `comparar` o `es_opcion`
  v_x jsonb;
  v_o jsonb;
  v_min int;
  v_max int;
  v_num numeric;
  v_f float8;
  k int;
begin
  if jsonb_typeof(p_n) is distinct from 'object' then /*F01*/ return ''; end if;
  v_tipo := case when jsonb_typeof(p_n -> 'tipo') = 'string' then p_n ->> 'tipo' end;
  v_permitidas := case v_tipo
    when 'input' then c_base || array['solo_en', 'condicion', 'sugerido_de', 'requerido_si']
    when 'constante' then c_base || array['solo_en', 'condicion', 'texto']
    when 'tipo_cambio' then c_base || array['clave']
    when 'campo_vehiculo' then c_base || array['solo_en', 'campo']
    when 'bandera' then c_base || array['solo_en']
    when 'opcion' then c_base || array['opciones', 'por_defecto', 'en_par']
    when 'tabla' then c_base || array['solo_en', 'condicion', 'sobrescribible', 'tabla', 'match', 'columna']
    when 'tramo' then c_base || array['solo_en', 'condicion', 'sobrescribible', 'tabla', 'sobre', 'columna']
    when 'calculo' then c_base || array['solo_en', 'condicion', 'sobrescribible', 'texto', 'op', 'de']
  end;
  if v_permitidas is null then /*F02*/ return '.tipo'; end if;
  if v_tipo = 'calculo' then
    v_op := case when jsonb_typeof(p_n -> 'op') = 'string' then p_n ->> 'op' end;
    if (v_op in ('suma', 'porcentaje_de', 'multiplicar', 'restar', 'dividir', 'si', 'depreciar', 'redondear',
                 'comparar', 'es_opcion', 'y', 'o', 'elegir', 'max', 'min')) is not true then
      /*F03*/ return '.op';
    end if;
    v_permitidas := v_permitidas || case v_op
      when 'porcentaje_de' then array['pct']
      when 'depreciar' then array['tabla', 'sobre', 'columna']
      when 'redondear' then array['n']
      when 'comparar' then array['cmp']
      when 'es_opcion' then array['cmp', 'clave']
      when 'elegir' then array['prueba']
      else '{}'::text[]
    end;
  end if;
  -- Una clave que el tipo no lleva (también una mal escrita) es un error, no se ignora.
  if (p_n - v_permitidas) <> '{}'::jsonb then /*F04*/ return ''; end if;

  -- Lo común a todo nodo.
  if (jsonb_typeof(p_n -> 'id') = 'string' and (p_n ->> 'id') ~ c_id) is not true then /*F05*/ return '.id'; end if;
  -- `tablas` es la clave de params donde van las filas congeladas (D5): ninguna constante se llama así.
  if v_tipo = 'constante' and p_n ->> 'id' = 'tablas' then /*F06*/ return '.id'; end if;
  if (jsonb_typeof(p_n -> 'etiqueta') = 'string' and char_length(p_n ->> 'etiqueta') between 1 and 80) is not true then
    /*F07*/ return '.etiqueta';
  end if;
  if p_n ? 'formato' and (jsonb_typeof(p_n -> 'formato') = 'string' and (p_n ->> 'formato') in ('usd', 'pct', 'raw', 'moneda')) is not true then
    /*F08*/ return '.formato';
  end if;
  -- Los decimales con que se muestra la celda (glosario: «Decimales (de una celda)»): `z.int().min(0).max(4)` sobre el número como lo lee JS,
  -- con la misma lectura que la `n` de `redondear` (F39–F42). Sin la clave, «Automático».
  if p_n ? 'decimales' then
    if jsonb_typeof(p_n -> 'decimales') is distinct from 'number' then /*F74*/ return '.decimales'; end if;
    v_num := (p_n -> 'decimales')::numeric;
    if abs(v_num) < 1e-300 then
      if abs(v_num) > 2.4703282292062327e-324 then /*F75*/ return '.decimales'; end if;
    elsif abs(v_num) >= 5 then
      /*F76*/ return '.decimales';
    else
      v_f := v_num::float8;
      if v_f <> trunc(v_f) or v_f < 0 or v_f > 4 then /*F77*/ return '.decimales'; end if;
    end if;
  end if;
  if p_n ? 'descripcion' and (jsonb_typeof(p_n -> 'descripcion') = 'string' and char_length(p_n ->> 'descripcion') <= 300) is not true then
    /*F09*/ return '.descripcion';
  end if;
  if p_n ? 'seccion' and (jsonb_typeof(p_n -> 'seccion') = 'string' and char_length(p_n ->> 'seccion') between 1 and 60) is not true then
    /*F10*/ return '.seccion';
  end if;
  if p_n ? 'color' and (jsonb_typeof(p_n -> 'color') = 'string' and (p_n ->> 'color') in ('amarillo', 'verde', 'naranja')) is not true then
    /*F11*/ return '.color';
  end if;
  if p_n ? 'salida' and (jsonb_typeof(p_n -> 'salida') = 'string' and (p_n ->> 'salida') in ('total', 'base_imponible', 'aparte')) is not true then
    /*F12*/ return '.salida';
  end if;
  if p_n ? 'bucket' and (jsonb_typeof(p_n -> 'bucket') = 'string' and (p_n ->> 'bucket') ~ c_id) is not true then /*F13*/ return '.bucket'; end if;
  if p_n ? 'grupo' and (jsonb_typeof(p_n -> 'grupo') = 'string' and (p_n ->> 'grupo') ~ c_id) is not true then /*F14*/ return '.grupo'; end if;
  -- Lo que un nodo de valor suma (el tipo ya dijo si lo admite).
  if p_n ? 'solo_en' then
    v_x := p_n -> 'solo_en';
    if (jsonb_typeof(v_x) = 'array' and jsonb_array_length(v_x) >= 1) is not true then /*F15*/ return '.solo_en'; end if;
    for k in 0 .. jsonb_array_length(v_x) - 1 loop
      if (jsonb_typeof(v_x -> k) = 'string' and (v_x ->> k) ~ c_id) is not true then /*F16*/ return '.solo_en.' || k; end if;
    end loop;
  end if;
  if (p_n ? 'condicion' or v_op = 'si')
     and (jsonb_typeof(p_n -> 'condicion') = 'string' and (p_n ->> 'condicion') ~ c_id) is not true then
    /*F17*/ return '.condicion';
  end if;
  if p_n ? 'sobrescribible' and jsonb_typeof(p_n -> 'sobrescribible') is distinct from 'boolean' then /*F18*/ return '.sobrescribible'; end if;
  -- El texto con que se escribió la fila (la raíz de `compilarExpresion()`): una `constante` o un `calculo`, de 1 a 2.000 caracteres.
  if p_n ? 'texto' and (jsonb_typeof(p_n -> 'texto') = 'string' and char_length(p_n ->> 'texto') between 1 and 2000) is not true then
    /*F70*/ return '.texto';
  end if;

  -- Lo propio de cada tipo.
  if v_tipo = 'input' then
    if p_n ? 'sugerido_de' and (jsonb_typeof(p_n -> 'sugerido_de') = 'string' and (p_n ->> 'sugerido_de') ~ c_id) is not true then
      /*F19*/ return '.sugerido_de';
    end if;
    if p_n ? 'requerido_si' and (jsonb_typeof(p_n -> 'requerido_si') = 'string' and (p_n ->> 'requerido_si') ~ c_id) is not true then
      /*F20*/ return '.requerido_si';
    end if;
  elsif v_tipo = 'tipo_cambio' then
    if (jsonb_typeof(p_n -> 'clave') = 'string' and (p_n ->> 'clave') ~ c_id) is not true then /*F21*/ return '.clave'; end if;
  elsif v_tipo = 'campo_vehiculo' then
    if (jsonb_typeof(p_n -> 'campo') = 'string' and char_length(p_n ->> 'campo') <= 80 and (p_n ->> 'campo') ~ c_campo) is not true then
      /*F22*/ return '.campo';
    end if;
  elsif v_tipo = 'opcion' then
    v_x := p_n -> 'opciones';
    if (jsonb_typeof(v_x) = 'array' and jsonb_array_length(v_x) >= 2) is not true then /*F23*/ return '.opciones'; end if;
    for k in 0 .. jsonb_array_length(v_x) - 1 loop
      v_o := v_x -> k;
      if (jsonb_typeof(v_o) = 'object' and (v_o - array['clave', 'etiqueta', 'titulo']) = '{}'::jsonb
          and jsonb_typeof(v_o -> 'clave') = 'string' and (v_o ->> 'clave') ~ c_id
          and jsonb_typeof(v_o -> 'etiqueta') = 'string' and char_length(v_o ->> 'etiqueta') between 1 and 60
          and jsonb_typeof(v_o -> 'titulo') = 'string' and char_length(v_o ->> 'titulo') between 1 and 120) is not true then
        /*F24*/ return '.opciones.' || k;
      end if;
    end loop;
    if p_n ? 'por_defecto' and (jsonb_typeof(p_n -> 'por_defecto') = 'string' and (p_n ->> 'por_defecto') ~ c_id) is not true then
      /*F25*/ return '.por_defecto';
    end if;
    if p_n ? 'en_par' and jsonb_typeof(p_n -> 'en_par') is distinct from 'boolean' then /*F43*/ return '.en_par'; end if;
  elsif v_tipo = 'tabla' then
    if (jsonb_typeof(p_n -> 'tabla') = 'string' and (p_n ->> 'tabla') ~ c_id) is not true then /*F26*/ return '.tabla'; end if;
    if jsonb_typeof(p_n -> 'match') is distinct from 'object' then /*F27*/ return '.match'; end if;
    -- columna de la tabla → un nodo anterior o un campo del vehículo.
    if exists (
      select 1 from jsonb_each(p_n -> 'match') m
       where (m.key ~ c_id and jsonb_typeof(m.value) = 'string' and char_length(m.value #>> '{}') <= 80
              and (m.value #>> '{}') ~ c_campo) is not true
    ) then
      /*F28*/ return '.match';
    end if;
    if (jsonb_typeof(p_n -> 'columna') = 'string' and (p_n ->> 'columna') ~ c_id) is not true then /*F29*/ return '.columna'; end if;
  elsif v_tipo = 'tramo' then
    if (jsonb_typeof(p_n -> 'tabla') = 'string' and (p_n ->> 'tabla') ~ c_id) is not true then /*F30*/ return '.tabla'; end if;
    if (jsonb_typeof(p_n -> 'sobre') = 'string' and (p_n ->> 'sobre') ~ c_id) is not true then /*F31*/ return '.sobre'; end if;
    if (jsonb_typeof(p_n -> 'columna') = 'string' and (p_n ->> 'columna') ~ c_id) is not true then /*F32*/ return '.columna'; end if;
  elsif v_tipo = 'calculo' then
    -- La aridad de cada operación, cerrada.
    v_min := case v_op when 'multiplicar' then 2 when 'restar' then 2 when 'dividir' then 2
                       when 'si' then 1 when 'depreciar' then 1 when 'redondear' then 1
                       when 'comparar' then 2 when 'es_opcion' then 1 when 'y' then 2 when 'o' then 2
                       when 'elegir' then 1 else 1 end;
    v_max := case v_op when 'dividir' then 2 when 'si' then 1 when 'depreciar' then 1 when 'redondear' then 1
                       when 'comparar' then 2 when 'es_opcion' then 1 when 'elegir' then 2 end;
    v_x := p_n -> 'de';
    if (jsonb_typeof(v_x) = 'array' and jsonb_array_length(v_x) >= v_min
        and (v_max is null or jsonb_array_length(v_x) <= v_max)) is not true then
      /*F33*/ return '.de';
    end if;
    for k in 0 .. jsonb_array_length(v_x) - 1 loop
      if (jsonb_typeof(v_x -> k) = 'string' and (v_x ->> k) ~ c_id) is not true then /*F34*/ return '.de.' || k; end if;
    end loop;
    if v_op = 'porcentaje_de' and (jsonb_typeof(p_n -> 'pct') = 'string' and (p_n ->> 'pct') ~ c_id) is not true then
      /*F35*/ return '.pct';
    end if;
    if v_op = 'depreciar' then
      if (jsonb_typeof(p_n -> 'tabla') = 'string' and (p_n ->> 'tabla') ~ c_id) is not true then /*F36*/ return '.tabla'; end if;
      if (jsonb_typeof(p_n -> 'sobre') = 'string' and (p_n ->> 'sobre') ~ c_id) is not true then /*F37*/ return '.sobre'; end if;
      if (jsonb_typeof(p_n -> 'columna') = 'string' and (p_n ->> 'columna') ~ c_id) is not true then /*F38*/ return '.columna'; end if;
    end if;
    if v_op = 'redondear' then
      -- `z.int().min(0).max(6)` sobre el número como lo lee JS: 2.0 y 6.0000000000000001 valen; lo que JS redondea a 0, también.
      if jsonb_typeof(p_n -> 'n') is distinct from 'number' then /*F39*/ return '.n'; end if;
      v_num := (p_n -> 'n')::numeric;
      if abs(v_num) < 1e-300 then
        if abs(v_num) > 2.4703282292062327e-324 then /*F40*/ return '.n'; end if;
      elsif abs(v_num) >= 7 then
        /*F41*/ return '.n';
      else
        v_f := v_num::float8;
        if v_f <> trunc(v_f) or v_f < 0 or v_f > 6 then /*F42*/ return '.n'; end if;
      end if;
    end if;
    -- Las claves propias de las operaciones de condición, después de `de` (como en el Zod): el comparador, la opción y la prueba.
    if v_op in ('comparar', 'es_opcion') then
      v_cmps := case v_op when 'comparar' then array['>', '<', '>=', '<=', '=', '<>'] else array['=', '<>'] end;
      if (jsonb_typeof(p_n -> 'cmp') = 'string' and (p_n ->> 'cmp') = any (v_cmps)) is not true then /*F71*/ return '.cmp'; end if;
    end if;
    if v_op = 'es_opcion' and (jsonb_typeof(p_n -> 'clave') = 'string' and (p_n ->> 'clave') ~ c_id) is not true then
      /*F72*/ return '.clave';
    end if;
    if v_op = 'elegir' and (jsonb_typeof(p_n -> 'prueba') = 'string' and (p_n ->> 'prueba') ~ c_id) is not true then
      /*F73*/ return '.prueba';
    end if;
  end if;
  return null;
end;
$_$;

revoke all on function public._formula_forma_nodo(jsonb) from public, anon;
grant execute on function public._formula_forma_nodo(jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 2. Las lecturas.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

-- `{decimales: n}` si el nodo los trae y `{}` si no: lo que se suma a un objeto que no pasa por `jsonb_strip_nulls`.
create or replace function public._hoja_decimales(p_nodo jsonb) returns jsonb
  language sql immutable
  set search_path = ''
as $$
  select case when p_nodo ? 'decimales' then jsonb_build_object('decimales', p_nodo -> 'decimales') else '{}'::jsonb end;
$$;

revoke all on function public._hoja_decimales(jsonb) from public, anon, authenticated;
grant execute on function public._hoja_decimales(jsonb) to service_role;

create or replace function public._cotizacion_hoja(p_formula uuid, p_origen uuid, p_edita boolean default true) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  fo public.formulas;
  v_cfg boolean; v_tc boolean; v_arr text[]; v_editables jsonb; v_ctx jsonb; v_ok jsonb;
  v_nodos jsonb; v_grupos jsonb; v_niveles jsonb; v_visib jsonb; v_lee jsonb; v_vivas jsonb; v_opcion text; v_opcion_ok boolean;
  v_secciones jsonb; v_claves text[]; v_tarjeta jsonb; v_tonos jsonb; v_moneda_bs text; v_datos jsonb; v_cab jsonb;
  v_par_nodo text; v_en_par text[] := '{}'::text[]; v_par jsonb;
  v_exclusivos text[]; v_total jsonb; v_casa jsonb;
begin
  select * into fo from public.formulas x where x.id = p_formula;
  v_cfg := public.tiene_permiso('cotizaciones.configurar', p_origen);
  v_tc := public.tiene_permiso('empresa.tipos_cambio.gestionar');
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb) into v_arr, v_editables from public._nodos_visibles(p_formula) n;
  v_ctx := public._cotizacion_contexto(v_arr, fo.definicion, fo.visibilidad);
  v_ok := v_ctx -> 'ok';
  v_exclusivos := public._motor_pcts_exclusivos(fo.definicion -> 'nodos');
  -- Copias en memoria de lo que se busca por nodo (un jsonb que viene de la tabla se vuelve a leer entero en cada operador).
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  -- La moneda en que se escribe el total en Bs: la `moneda_a` del tipo de cambio ACTIVO que nombra el `total_en` de esta versión (una fila: tipos_cambio_clave_key).
  -- Nula sin `total_en` o sin ese tipo de cambio; no dice si `totales.bs` tiene valor (el Bs sale del tipo de cambio de cada bucket).
  select t.moneda_a::text into v_moneda_bs from public.tipos_cambio t
   where t.activo and t.clave = ((v_nodos -> (fo.definicion ->> 'total_en')) ->> 'clave');
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', g ->> 'tono') from jsonb_array_elements(coalesce(fo.definicion -> 'grupos', '[]'::jsonb)) g where (g ->> 'tono') is not null), '{}'::jsonb);
  v_niveles := coalesce((select jsonb_object_agg(l.clave, l.nombre) from public.cotizaciones_niveles l), '{}'::jsonb);
  v_visib := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(coalesce(fo.visibilidad, '{}'::jsonb)) e), '{}'::jsonb);
  -- Quien no puede guardar esa cotización (4.15-2, `p_edita` falso): ninguna celda se edita y el motivo no es un nivel (`no_se_edita`, o `se_calcula`/`del_vehiculo`).
  if p_edita is not true then
    v_editables := '{}'::jsonb;
    v_visib := '{}'::jsonb;
  end if;
  -- Las tablas que lee algún nodo que quien llama ve (la regla de `cotizacion_tabla()`) y las que existen vivas para este origen, con el id de la viva (la del
  -- origen antes que la compartida de la misma clave, como `cotizacion_tabla()`; tablas_referencia_origen_id_clave_key).
  v_lee := coalesce((select jsonb_object_agg(t.nombre, true)
                       from (select distinct n ->> 'tabla' as nombre from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n
                              where (n ->> 'tabla') is not null and n ->> 'id' = any (v_arr)) t), '{}'::jsonb);
  v_vivas := coalesce((select jsonb_object_agg(t.clave, t.id)
                         from (select distinct on (r.clave) r.clave, r.id from public.tablas_referencia r
                                where r.activa and (r.origen_id = p_origen or r.origen_id is null)
                                order by r.clave, r.origen_id nulls last) t), '{}'::jsonb);
  -- El dato del vehículo de cada nodo `tabla` (4.14-2c2), armado una vez; viaja sólo en la celda de un nodo que se ve.
  v_datos := public._hoja_datos_del_vehiculo(v_nodos, p_origen, fo.params -> 'tablas', v_vivas);
  -- «Tu vehículo» de la ayuda en bloques (`resaltar`): por cada tabla, cómo casa una fila con esta hoja, del `match` del primer nodo `tabla` que se ve y la lee
  -- (en el orden de la definición). Cada entrada nombra un nodo que se ve o un dato del vehículo (la regla de `_hoja_datos_del_vehiculo()`); un nodo
  -- `campo_vehiculo` casa por su dato, que no es de ningún nivel. Si alguna entrada no se resuelve, la tabla no casa: con una parte del `match` se marcaría
  -- una fila que no es la del vehículo.
  v_casa := coalesce((
    select jsonb_object_agg(t.tabla, p.casa)
      from (select distinct on (n.value ->> 'tabla') n.value ->> 'tabla' as tabla, n.value -> 'match' as m
              from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) with ordinality n (value, ord)
             where n.value ->> 'tipo' = 'tabla' and n.value ->> 'id' = any (v_arr) and jsonb_typeof(n.value -> 'match') = 'object'
             order by n.value ->> 'tabla', n.ord) t
     cross join lateral (
       select jsonb_agg(case when x.campo is null then jsonb_build_object('columna', x.columna, 'nodo', x.nodo)
                             else jsonb_build_object('columna', x.columna, 'campo', x.campo) end order by x.columna collate "C") as casa,
              bool_and(case when x.campo is null then x.nodo = any (v_arr)
                            else x.campo in ('anio', 'marca', 'modelo', 'kilometraje', 'precio')
                                 or exists (select 1 from public.origenes_campos oc where oc.origen_id = p_origen and oc.clave = x.campo and oc.activo) end) as ok
         from jsonb_each_text(t.m) e
        cross join lateral (select e.key as columna, e.value as nodo,
                                   case when not v_nodos ? e.value then e.value
                                        when v_nodos -> e.value ->> 'tipo' = 'campo_vehiculo' then v_nodos -> e.value ->> 'campo' end as campo) x) p
     where p.ok and p.casa is not null), '{}'::jsonb);
  select n ->> 'id' into v_opcion from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'tipo' = 'opcion' limit 1;
  v_opcion_ok := v_opcion is not null and v_ok ? v_opcion;
  -- La variante en par (glosario: «Variante en par»): viaja a todo el que abre la hoja, aunque su nivel esconda el nodo (las etiquetas de sus dos opciones
  -- son configuración, no dinero), con los nodos que cambian según la opción; su ítem `variante` no se dibuja (la opción no la elige la persona).
  v_par_nodo := public._variante_en_par(fo.definicion);
  if v_par_nodo is not null then
    v_en_par := public._nodos_en_par(fo.definicion);
    v_par := jsonb_build_object('nodo', v_par_nodo, 'etiqueta', v_nodos -> v_par_nodo ->> 'etiqueta',
               'opciones', (select jsonb_agg(jsonb_build_object('clave', x.o ->> 'clave', 'etiqueta', x.o ->> 'etiqueta') order by x.k)
                              from jsonb_array_elements(v_nodos -> v_par_nodo -> 'opciones') with ordinality x (o, k)));
  end if;

  -- La tarjeta del total como pieza (glosario: «Tarjeta del total»): su nodo es el de `tarjeta_total` y viaja a todo el que abre, como la tarjeta (el
  -- total lo ven todos); con una variante en par no viaja (el par dibuja un total por opción).
  if v_par_nodo is null and v_nodos ? (fo.diseno -> 'tarjeta_total' ->> 'nodo') then
    v_total := jsonb_build_object('tipo', 'total', 'nodo', fo.diseno -> 'tarjeta_total' ->> 'nodo',
                                  'etiqueta', v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'etiqueta',
                                  'formato', coalesce(v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'formato', 'usd'))
               || public._hoja_decimales(v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo'));
  end if;

  -- El aspecto de cada ítem y de cada sección se copia del diseño ya leído (con `->`: un número de columnas sigue siendo un número); sin él,
  -- la clave no viaja. Los niveles de una sección (`nivel_*`) nunca viajan.
  with it as (
    select s.ord as so, i.ord as io, s.value - 'items' as cab, i.value as item, i.value ->> 'tipo' as t, i.value ->> 'nodo' as nid
      from jsonb_array_elements(fo.diseno -> 'secciones') with ordinality s (value, ord)
     cross join lateral jsonb_array_elements(s.value -> 'items') with ordinality i (value, ord)
  ), vis as (
    -- Sólo viaja lo que su nodo (y, en un par, su porcentaje) permite; la tarjeta del total, si hay `v_total`.
    select it.*, v_nodos -> it.nid as n,
           jsonb_strip_nulls(jsonb_build_object('ancho', it.item -> 'ancho', 'alto', it.item -> 'alto', 'letra', it.item -> 'letra',
                                                'enfasis', it.item -> 'enfasis')) as asp
      from it
     where (v_ok ? it.nid and v_nodos ? it.nid
            and not (it.t = 'variante' and v_par_nodo is not null)
            and (it.t <> 'celda' or not (it.item ? 'secundario') or v_ok ? (v_nodos -> it.nid ->> 'pct')))
        or (it.t = 'total' and v_total is not null)
  ), obj as (
    select vis.so, vis.io, vis.cab,
           case when vis.t in ('celda', 'subtotal') then v_grupos ->> (vis.n ->> 'grupo') end as tono,
           case vis.t
             when 'celda' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'celda', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'tipo_nodo', vis.n ->> 'tipo',
                 'formato', coalesce(vis.n ->> 'formato', 'usd'), 'decimales', vis.n -> 'decimales',
                 'tono', v_grupos ->> (vis.n ->> 'grupo'),
                 -- La ayuda leída como bloques (la de antes también), nula si no queda ninguno. Título, texto y enlaces tal cual; una tabla, si existe
                 -- (congelada en la versión o viva) y quien llama puede leerla: configura, algún nodo que ve la lee o el bloque nombra sus columnas (las suma
                 -- `cotizacion_tabla()`). Una columna que llena un nodo que no se ve no llena nada; `casa`, sólo con `resaltar`; el id de la viva, sólo a quien
                 -- configura.
                 'ayuda', (select jsonb_agg(case when b.value ->> 'tipo' = 'tabla' then
                                                   jsonb_build_object('tipo', 'tabla', 'tabla', b.value ->> 'tabla')
                                                   || case when jsonb_typeof(b.value -> 'columnas') = 'array' then jsonb_build_object('columnas',
                                                        (select jsonb_agg(jsonb_build_object('columna', c.value ->> 'columna',
                                                                                             'llena', case when (c.value ->> 'llena') = any (v_arr) then c.value ->> 'llena' end)
                                                                          order by c.ord)
                                                           from jsonb_array_elements(b.value -> 'columnas') with ordinality c (value, ord))) else '{}'::jsonb end
                                                   || case when (b.value -> 'resaltar') = 'true'::jsonb
                                                             then jsonb_build_object('resaltar', true, 'casa', v_casa -> (b.value ->> 'tabla')) else '{}'::jsonb end
                                                   || case when v_cfg then jsonb_build_object('id', v_vivas -> (b.value ->> 'tabla')) else '{}'::jsonb end
                                                 else b.value end order by b.ord)
                             from jsonb_array_elements(public._diseno_bloques_de_la_ayuda(vis.item -> 'ayuda')) with ordinality b (value, ord)
                            where b.value ->> 'tipo' <> 'tabla'
                               or (((jsonb_typeof(fo.params -> 'tablas') = 'object' and (fo.params -> 'tablas') ? (b.value ->> 'tabla'))
                                    or v_vivas ? (b.value ->> 'tabla'))
                                   and (v_cfg or v_lee ? (b.value ->> 'tabla') or jsonb_typeof(b.value -> 'columnas') = 'array'))),
                 'dato_del_vehiculo', v_datos -> vis.nid,
                 'en_par', case when vis.nid = any (v_en_par) then true end,
                 'solo_en', case when v_opcion_ok then vis.n -> 'solo_en' end,
                 'condicion', case when v_ok ? (vis.n ->> 'condicion') then vis.n ->> 'condicion' end,
                 'requerido_si', case when v_ok ? (vis.n ->> 'requerido_si') then vis.n ->> 'requerido_si' end,
                 'secundario', case when vis.item ? 'secundario' then
                     jsonb_build_object('nodo', vis.n ->> 'pct', 'como', vis.item ->> 'secundario', 'tipo_nodo', v_nodos -> (vis.n ->> 'pct') ->> 'tipo',
                                        'formato', coalesce(v_nodos -> (vis.n ->> 'pct') ->> 'formato', 'usd'),
                                        'decimales', v_nodos -> (vis.n ->> 'pct') -> 'decimales',
                                        -- Con el monto escrito, el pct lo calcula el par (`sobrescribible`, o por la hoja con su pct exclusivo): no es lo tipeado.
                                        'sigue_al_monto', case when (vis.n -> 'sobrescribible') = 'true'::jsonb
                                                                 or ((vis.n ->> 'salida') is distinct from 'total' and (vis.n ->> 'pct') = any (v_exclusivos))
                                                               then true end)
                     || public._hoja_estado(v_nodos -> (vis.n ->> 'pct'), true, v_editables ? (vis.n ->> 'pct'),
                                            v_visib -> (vis.n ->> 'pct') ->> 'editar', v_niveles ->> (v_visib -> (vis.n ->> 'pct') ->> 'editar'), v_cfg, v_tc) end))
               || public._hoja_estado(vis.n, true, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
               || vis.asp
             when 'atajos' then jsonb_build_object('tipo', 'atajos', 'nodo', vis.nid,
                 'chips', public._hoja_chips(p_origen, fo.params, vis.n, vis.item ->> 'columna', ((vis.item -> 'filas')::numeric)::int))
               || vis.asp
             when 'variante' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'variante', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta',
                 'opciones', coalesce((select jsonb_agg(jsonb_build_object('clave', o ->> 'clave', 'etiqueta', o ->> 'etiqueta', 'titulo', o ->> 'titulo'))
                                         from jsonb_array_elements(vis.n -> 'opciones') o), '[]'::jsonb),
                 'por_defecto', vis.n ->> 'por_defecto'))
               || public._hoja_estado(vis.n, false, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
               || vis.asp
             when 'interruptor' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'interruptor', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'efecto', vis.item ->> 'efecto',
                 'solo_en', case when v_opcion_ok then vis.n -> 'solo_en' end))
               || public._hoja_estado(vis.n, false, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
               || vis.asp
             when 'subtotal' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'subtotal', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'formato', coalesce(vis.n ->> 'formato', 'usd'),
                 'decimales', vis.n -> 'decimales',
                 'tono', v_grupos ->> (vis.n ->> 'grupo'), 'en_par', case when vis.nid = any (v_en_par) then true end))
               || vis.asp
             when 'total' then v_total || vis.asp
           end as o
      from vis
  ), secs as (
    select o.so, jsonb_strip_nulls(jsonb_build_object(
                   'id', o.cab ->> 'id', 'titulo', o.cab ->> 'titulo', 'presentacion', o.cab ->> 'presentacion',
                   'ancho', o.cab -> 'ancho', 'alto', o.cab -> 'alto', 'relleno', o.cab -> 'relleno', 'separacion', o.cab -> 'separacion',
                   'densidad', o.cab -> 'densidad', 'letra', o.cab -> 'letra', 'enfasis', o.cab -> 'enfasis', 'tono', o.cab -> 'tono'))
                 || jsonb_build_object('items', jsonb_agg(o.o order by o.io)) as sec
      from obj o
     where o.o is not null
     group by o.so, o.cab
  )
  -- Los tonos que la hoja pinta: los de los grupos de sus celdas y franjas, los de las secciones que dibuja y el de la cabecera.
  select coalesce((select jsonb_agg(s.sec order by s.so) from secs s), '[]'::jsonb),
         coalesce((select array_agg(distinct x.tono) from (select o.tono from obj o where o.tono is not null
                                                           union all
                                                           select s.sec ->> 'tono' from secs s where s.sec ? 'tono') x), '{}'::text[])
    into v_secciones, v_claves;
  v_cab := fo.diseno -> 'cabecera';
  if jsonb_typeof(v_cab -> 'tono') = 'string' then
    v_claves := v_claves || (v_cab ->> 'tono');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('clave', t.clave,
                                               'claro', jsonb_build_object('fondo', t.claro_fondo, 'borde', t.claro_borde, 'tinta', t.claro_tinta),
                                               'oscuro', jsonb_build_object('fondo', t.oscuro_fondo, 'borde', t.oscuro_borde, 'tinta', t.oscuro_tinta)) order by t.clave), '[]'::jsonb)
    into v_tonos from public.tonos t where t.clave = any (v_claves);

  v_tarjeta := jsonb_build_object('nodo', fo.diseno -> 'tarjeta_total' ->> 'nodo',
                                  'etiqueta', v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'etiqueta',
                                  'formato', coalesce(v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'formato', 'usd'),
                                  'secundarios', coalesce((select jsonb_agg(jsonb_build_object('nodo', x.s, 'etiqueta', v_nodos -> x.s ->> 'etiqueta',
                                                                                              'formato', coalesce(v_nodos -> x.s ->> 'formato', 'usd'))
                                                                            || public._hoja_decimales(v_nodos -> x.s) order by x.o)
                                                             from jsonb_array_elements_text(coalesce(fo.diseno -> 'tarjeta_total' -> 'secundarios', '[]'::jsonb)) with ordinality x (s, o)
                                                            where v_ok ? x.s), '[]'::jsonb))
               || public._hoja_decimales(v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo'));

  -- La cabecera: los modos (clave y nombre), «Ver total», su moneda, si quien mira tiene el ⚙ de la cabecera (`ajustes`: configura el origen y hay al
  -- menos un modo), su aspecto y lo que trae por defecto (sólo las claves que el diseño trae).
  return jsonb_build_object(
    'formula', jsonb_build_object('id', fo.id, 'version', fo.version),
    'cabecera', jsonb_build_object(
      'modos', coalesce((select jsonb_agg(jsonb_build_object('clave', m ->> 'clave', 'nombre', m ->> 'nombre'))
                           from jsonb_array_elements(coalesce(v_cab -> 'modos', '[]'::jsonb)) m), '[]'::jsonb),
      'ver_total_bs', coalesce((v_cab ->> 'ver_total_bs')::boolean, false),
      'moneda_bs', v_moneda_bs,
      'ajustes', coalesce(v_cfg, false) and jsonb_array_length(coalesce(v_cab -> 'modos', '[]'::jsonb)) > 0)
      || jsonb_strip_nulls(jsonb_build_object('tono', v_cab -> 'tono', 'relleno', v_cab -> 'relleno', 'letra', v_cab -> 'letra',
                                              'enfasis', v_cab -> 'enfasis', 'modo_por_defecto', v_cab -> 'modo_por_defecto',
                                              'ver_total_bs_por_defecto', v_cab -> 'ver_total_bs_por_defecto',
                                              'modos_visibles', v_cab -> 'modos_visibles')),
    'secciones', v_secciones,
    'tarjeta_total', v_tarjeta,
    'tonos', v_tonos,
    'par', v_par);
end
$$;

revoke all on function public._cotizacion_hoja(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public._cotizacion_hoja(uuid, uuid, boolean) to service_role;

create or replace function public.cotizacion_tarjeta(p_formula uuid) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  fo public.formulas; v_pla public.plantillas_tarjeta; v_p jsonb; v_celdas jsonb; v_nodos jsonb; v_grupos jsonb; v_total text; v_opcion jsonb;
  v_datos jsonb; v_ids text[]; v_pcts jsonb; v_de_grupo text[]; v_buckets text[]; v_tc jsonb; v_variables text[];
begin
  perform public.assert_activo();
  select * into fo from public.formulas f where f.id = p_formula;
  -- La inexistencia y el borrador se deciden antes del permiso (`tiene_permiso` con un origen nulo da verdadero) y dan lo mismo que no tenerlo.
  if not found or fo.estado = 'borrador' then raise exception 'No tienes acceso a esa versión de la fórmula.' using errcode = '42501'; end if;
  if not public.tiene_permiso('cotizaciones.ver', fo.origen_id) then raise exception 'No tienes acceso a esa versión de la fórmula.' using errcode = '42501'; end if;

  -- La publicada de la fórmula del origen de esta versión (plantillas_publicada_unica), validada contra ESTA versión sin el catálogo: un color borrado se dibuja `auto`. La de la forma 1 se
  -- convierte con el catálogo de hoy (un color borrado cae al del grupo) y lo convertido se valida sin el tope de 24 KiB.
  select * into v_pla from public.plantillas_tarjeta p where p.formula_del_origen_id = fo.formula_del_origen_id and p.estado = 'publicada';
  if not found then return jsonb_build_object('estado', 'sin_plantilla'); end if;
  begin
    perform public.validar_plantilla(v_pla.definicion, fo.definicion, fo.diseno, fo.visibilidad, null);
    if v_pla.definicion ? 'forma' then
      v_p := v_pla.definicion;
    else
      v_p := public._plantilla_convertir(v_pla.definicion, fo.definicion, fo.diseno, fo.visibilidad, array(select t.clave from public.tonos t));
      perform public._plantilla_cuadricula_forma(v_p, false);
      perform public._plantilla_cuadricula_nodos(v_p, fo.definicion, fo.diseno, fo.visibilidad, null);
    end if;
  exception when sqlstate '22023' then
    return jsonb_build_object('estado', 'sin_plantilla');
  end;

  v_celdas := v_p -> 'celdas';
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', g) from jsonb_array_elements(coalesce(fo.definicion -> 'grupos', '[]'::jsonb)) g), '{}'::jsonb);
  select n ->> 'id' into v_total from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'salida' = 'total' limit 1;
  select n into v_opcion from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'tipo' = 'opcion' limit 1;

  -- Lo que la cuadrícula muestra de un nodo ({nodo, mostrar}: en una celda, su lista de respaldo, sus ramas y el dato de una condición, `_plantilla_cuadricula_datos()`) y
  -- el `pct` del par de cada porcentaje: el suyo si es el `porcentaje_de`, él mismo si es el `pct`.
  v_datos := coalesce((select jsonb_agg(jsonb_build_object('nodo', d.nodo, 'mostrar', d.mostrar))
                         from public._plantilla_cuadricula_datos(v_p) d where d.nodo is not null and d.mostrar is not null), '[]'::jsonb);
  v_pcts := coalesce((select jsonb_object_agg(d ->> 'nodo',
                                              case when v_nodos -> (d ->> 'nodo') ->> 'tipo' = 'calculo' and v_nodos -> (d ->> 'nodo') ->> 'op' = 'porcentaje_de'
                                                        and v_nodos -> (d ->> 'nodo') ->> 'pct' is not null
                                                   then v_nodos -> (d ->> 'nodo') ->> 'pct' else d ->> 'nodo' end)
                        from jsonb_array_elements(v_datos) d where d ->> 'mostrar' = 'porcentaje'), '{}'::jsonb);
  -- Los nodos que nombra la cuadrícula (el de cada fila, los de cada dato y los de cada condición) y el `pct` de cada porcentaje.
  v_ids := array(select distinct x from (select d.nodo as x from public._plantilla_cuadricula_datos(v_p) d
                                         union all select value #>> '{}' from jsonb_each(v_pcts)) t where x is not null);
  v_de_grupo := array(select distinct v_nodos -> (d ->> 'nodo') ->> 'grupo' from jsonb_array_elements(v_datos) d
                       where d ->> 'mostrar' in ('tc_nombre', 'tc_valor', 'plazo') and v_nodos -> (d ->> 'nodo') ->> 'grupo' is not null);
  v_buckets := array(select distinct v_grupos -> (v_nodos -> (d ->> 'nodo') ->> 'grupo') ->> 'bucket' from jsonb_array_elements(v_datos) d
                      where d ->> 'mostrar' in ('tc_nombre', 'tc_valor') and v_grupos -> (v_nodos -> (d ->> 'nodo') ->> 'grupo') ->> 'bucket' is not null);
  v_variables := array(select distinct d.variable from public._plantilla_cuadricula_datos(v_p) d where d.variable is not null);
  -- El nombre de cada tipo de cambio por su nodo: el de `tipos_cambio` activo con la clave del nodo (nulo si no hay uno activo), nunca la clave ni el id.
  v_tc := coalesce((select jsonb_object_agg(n ->> 'id', t.nombre) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n
                      left join public.tipos_cambio t on t.activo and t.clave = n ->> 'clave' where n ->> 'tipo' = 'tipo_cambio'), '{}'::jsonb);

  return jsonb_build_object(
    'estado', 'lista',
    'plantilla', jsonb_build_object('version', v_pla.version),
    'definicion', v_p,
    -- Los decimales del nodo y los del `pct` de su porcentaje, sólo si la versión los trae (sin ellos, «Automático»).
    'nodos', coalesce((select jsonb_agg(jsonb_build_object('id', x, 'etiqueta', v_nodos -> x ->> 'etiqueta', 'descripcion', v_nodos -> x ->> 'descripcion',
                                                           'grupo', v_nodos -> x ->> 'grupo', 'pct', v_pcts ->> x)
                                        || public._hoja_decimales(v_nodos -> x)
                                        || case when v_nodos -> (v_pcts ->> x) ? 'decimales'
                                                then jsonb_build_object('decimales_del_pct', v_nodos -> (v_pcts ->> x) -> 'decimales') else '{}'::jsonb end
                                        order by x collate "C")
                         from unnest(v_ids) x), '[]'::jsonb),
    'grupos', coalesce((select jsonb_agg(jsonb_build_object('id', g, 'etiqueta', v_grupos -> g ->> 'etiqueta',
                                                            'plazo', case when jsonb_typeof(v_grupos -> g -> 'plazo') = 'string' then v_grupos -> g -> 'plazo' end,
                                                            -- El bucket sólo si una celda `tc_*` lo nombra (y la plantilla validó su tipo de cambio): un grupo de un `plazo` no lo lleva.
                                                            'bucket', case when v_grupos -> g ->> 'bucket' = any (v_buckets) then v_grupos -> g ->> 'bucket' end)
                                            order by g collate "C")
                          from unnest(v_de_grupo) g), '[]'::jsonb),
    'tipos_de_cambio', jsonb_build_object(
      'buckets', coalesce((select jsonb_object_agg(b, jsonb_build_object('nombre', v_tc ->> (fo.definicion -> 'buckets' ->> b), 'nodo', fo.definicion -> 'buckets' ->> b))
                             from unnest(v_buckets) b), '{}'::jsonb),
      'modos', coalesce((select jsonb_object_agg(md ->> 'clave',
                                  coalesce((select jsonb_object_agg(mb ->> 'bucket', jsonb_build_object('nombre', v_tc ->> (mb ->> 'nodo'), 'nodo', mb ->> 'nodo'))
                                              from jsonb_array_elements(coalesce(md -> 'buckets', '[]'::jsonb)) mb where mb ->> 'bucket' = any (v_buckets)), '{}'::jsonb))
                           from jsonb_array_elements(coalesce(fo.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) md
                          where exists (select 1 from jsonb_array_elements(coalesce(md -> 'buckets', '[]'::jsonb)) mb where mb ->> 'bucket' = any (v_buckets))), '{}'::jsonb)),
    'modos', case when 'modo_tc' = any (v_variables)
                  then coalesce((select jsonb_agg(jsonb_build_object('clave', md ->> 'clave', 'nombre', md ->> 'nombre') order by o)
                                   from jsonb_array_elements(coalesce(fo.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) with ordinality t (md, o)), '[]'::jsonb)
                  else '[]'::jsonb end,
    'variante', case when 'titulo_opcion' = any (v_variables) and (fo.visibilidad -> (v_opcion ->> 'id') ->> 'ver') = 'todos'
                     then jsonb_build_object('nodo', v_opcion ->> 'id', 'opciones', coalesce((select jsonb_agg(jsonb_build_object('clave', x.v ->> 'clave', 'titulo', x.v ->> 'titulo') order by x.o)
                                                                                               from jsonb_array_elements(v_opcion -> 'opciones') with ordinality x (v, o)), '[]'::jsonb)) end,
    'colores', coalesce((select jsonb_agg(jsonb_build_object('clave', t.clave, 'hex', t.hex) order by t.clave collate "C")
                           from public.tonos t
                          where exists (select 1 from jsonb_array_elements(v_celdas) c where c -> 'estilo' ->> 'fondo' = t.clave or c -> 'estilo' ->> 'texto' = t.clave)), '[]'::jsonb),
    'total', jsonb_build_object('nodo', v_total),
    -- La moneda del total en Bs: la `moneda_a` del tipo de cambio activo que nombra el `total_en` de esta versión (la regla de la hoja).
    'moneda_bs', (select to_jsonb(t.moneda_a::text) from public.tipos_cambio t where t.activo and t.clave = (v_nodos -> (fo.definicion ->> 'total_en')) ->> 'clave'));
end;
$$;

revoke all on function public.cotizacion_tarjeta(uuid) from public, anon;
grant execute on function public.cotizacion_tarjeta(uuid) to authenticated, service_role;

create or replace function public._revision_etiquetas(p_def jsonb, p_filas jsonb) returns jsonb
  language sql immutable
  set search_path = ''
as $$
  with d as (select f -> 'diff' as diff from jsonb_array_elements(coalesce(p_filas, '[]'::jsonb)) f),
  nodos as (
    select distinct k.key as id
      from d cross join lateral (values ('valores'), ('fuentes')) c (col) cross join lateral (values ('de'), ('a')) l (lado)
     cross join lateral jsonb_each(case when jsonb_typeof(d.diff -> c.col -> l.lado) = 'object' then d.diff -> c.col -> l.lado else '{}'::jsonb end) k
  ),
  grupos as (
    select distinct k.key as id
      from d cross join lateral (values ('de'), ('a')) l (lado)
     cross join lateral jsonb_each(case when jsonb_typeof(d.diff -> 'totales' -> l.lado -> 'grupos') = 'object' then d.diff -> 'totales' -> l.lado -> 'grupos' else '{}'::jsonb end) k
  )
  select jsonb_build_object(
    'nodos', coalesce((select jsonb_object_agg(n.id, coalesce((select x ->> 'etiqueta' from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) x where x ->> 'id' = n.id limit 1), n.id))
                         from nodos n), '{}'::jsonb),
    'grupos', coalesce((select jsonb_object_agg(g.id, coalesce((select x ->> 'etiqueta' from jsonb_array_elements(coalesce(p_def -> 'grupos', '[]'::jsonb)) x where x ->> 'id' = g.id limit 1), g.id))
                          from grupos g), '{}'::jsonb),
    -- Los cálculos (tabla, tramo o calculo) que la página nombra, con su formato: la revisión dice cuál se pisó y de cuánto a cuánto.
    'calculos', coalesce((select jsonb_object_agg(n.id, coalesce(x.n ->> 'formato', 'usd'))
                            from nodos n
                            cross join lateral (select y as n from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) y where y ->> 'id' = n.id limit 1) x
                           where x.n ->> 'tipo' in ('tabla', 'tramo', 'calculo')), '{}'::jsonb))
  -- Los decimales de esos cálculos, sólo de los que los traen; sin ninguno, la clave no viaja.
  || coalesce((select jsonb_build_object('decimales', jsonb_object_agg(n.id, x.n -> 'decimales'))
                 from nodos n
                 cross join lateral (select y as n from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) y where y ->> 'id' = n.id limit 1) x
                where x.n ->> 'tipo' in ('tabla', 'tramo', 'calculo') and x.n ? 'decimales'
               having count(*) > 0), '{}'::jsonb);
$$;

revoke all on function public._revision_etiquetas(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public._revision_etiquetas(jsonb, jsonb) to service_role;
