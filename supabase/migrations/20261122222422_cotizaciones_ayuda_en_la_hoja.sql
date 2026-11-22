-- La ayuda de una celda en bloques, en la hoja (docs/COTIZADOR.md › «La lectura que abre la hoja», «El diseño de la hoja (D7)»): `_cotizacion_hoja()` manda
-- la ayuda como bloques, cada tabla con sus columnas, lo que llenan, `resaltar` con cómo casa una fila con la hoja y el id de la viva a quien configura; y
-- `cotizacion_tabla()` deja leer las columnas que muestra la ayuda de una celda que se ve. Sin tablas, columnas ni datos nuevos.

create or replace function public._cotizacion_hoja(p_formula uuid, p_origen uuid, p_edita boolean default true) returns jsonb
language plpgsql
stable
security definer
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
                                  'formato', coalesce(v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'formato', 'usd'));
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
                 'formato', coalesce(vis.n ->> 'formato', 'usd'),
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
                                                                                              'formato', coalesce(v_nodos -> x.s ->> 'formato', 'usd')) order by x.o)
                                                             from jsonb_array_elements_text(coalesce(fo.diseno -> 'tarjeta_total' -> 'secundarios', '[]'::jsonb)) with ordinality x (s, o)
                                                            where v_ok ? x.s), '[]'::jsonb));

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

comment on function public._cotizacion_hoja(uuid, uuid, boolean) is
  'El diseño de una versión de la fórmula recortado al nivel de quien llama: ítems cuyo nodo se ve, con su candado y su motivo, la ayuda como bloques (título, texto con su negrita, enlaces y tablas; la de antes también: _diseno_bloques_de_la_ayuda), cada tabla con sus columnas (llena, sólo hacia un nodo que se ve), resaltar con casa (cómo casa una fila con la hoja: el match del primer nodo tabla que se ve, sólo con nodos que se ven y datos del vehículo; un campo_vehiculo, por su dato) y el id de la viva a quien configura, el dato del vehículo de una celda de tabla (dato_del_vehiculo), atajos, modos (clave y nombre), la moneda del total en Bs (moneda_bs), si quien llama tiene el ⚙ de la cabecera (ajustes), tarjeta y tonos (los de los grupos de sus celdas, de las secciones que dibuja y de la cabecera). El secundario de un par dice si su pct sigue al monto escrito (sigue_al_monto). Con una variante en par, par (nodo, etiqueta y las dos opciones con su clave y etiqueta, para todo el que abre) y en_par en cada celda y subtotal que cambia según la opción (_nodos_en_par); el ítem de la variante no viaja. Copia el aspecto (ancho, alto, letra y énfasis de cada ítem; ancho, alto, relleno, separación, densidad, letra, énfasis y tono de cada sección; tono, relleno, letra y énfasis de la cabecera) y lo que la cabecera trae por defecto (modo_por_defecto, ver_total_bs_por_defecto, modos_visibles) sólo si el diseño lo trae; nunca los niveles. Con p_edita falso (quien no puede guardar esa cotización) nada es editable y el motivo no es un nivel. De nadie; la llaman cotizacion_hoja y cotizacion_hoja_guardada. docs/COTIZADOR.md › «La lectura que abre la hoja (4.13-1)».';

revoke all on function public._cotizacion_hoja(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public._cotizacion_hoja(uuid, uuid, boolean) to service_role;

create or replace function public.cotizacion_tabla(p_tabla text, p_cotizacion uuid default null, p_origen uuid default null, p_abierta text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_formula uuid; v_origen uuid; v_def jsonb; v_par jsonb; v_diseno jsonb; v_cfg boolean; v_visibles text[]; v_vis jsonb;
  v_tabla public.tablas_referencia; v_congelada jsonb; v_permitidas jsonb; v_filas jsonb; v_cols jsonb; v_hay boolean := false; v_nodos jsonb;
begin
  -- La versión (la de la cotización, la de la hoja abierta o la publicada) y la puerta. Sin publicada, el origen sigue siendo el pedido (no se cae a la compartida).
  v_formula := public._cotizacion_tabla_version(p_cotizacion, p_origen, p_abierta);
  v_origen := coalesce(p_origen, (select c.origen_id from public.cotizaciones c where c.id = p_cotizacion));
  select f.definicion, f.params, f.diseno into v_def, v_par, v_diseno from public.formulas f where f.id = v_formula;
  v_nodos := coalesce(v_def -> 'nodos', '[]'::jsonb);
  v_cfg := public.tiene_permiso('cotizaciones.configurar', v_origen);

  -- Las columnas que leen los nodos que quien llama ve (sin configurar) y las que muestra la ayuda en bloques de una celda que ve. Si ninguno la lee, la
  -- tabla es como si no existiera.
  if not v_cfg then
    v_visibles := coalesce(array(select n.nodo from public._nodos_visibles(v_formula) n), '{}');
    v_vis := coalesce((select jsonb_object_agg(x, true) from unnest(v_visibles) x), '{}'::jsonb);
    select jsonb_object_agg(c, true) into v_permitidas from (
      select jsonb_object_keys(case when jsonb_typeof(n -> 'match') = 'object' then n -> 'match' else '{}'::jsonb end) as c
        from jsonb_array_elements(v_nodos) n where n ->> 'tipo' = 'tabla' and n ->> 'tabla' = p_tabla and v_vis ? (n ->> 'id')
      union select n ->> 'columna' from jsonb_array_elements(v_nodos) n where n ->> 'tabla' = p_tabla and v_vis ? (n ->> 'id') and (n ->> 'columna') is not null
      union select 'desde' from jsonb_array_elements(v_nodos) n where n ->> 'tabla' = p_tabla and v_vis ? (n ->> 'id') and (n ->> 'tipo' = 'tramo' or n ->> 'op' = 'depreciar')
      union select 'hasta' from jsonb_array_elements(v_nodos) n where n ->> 'tabla' = p_tabla and v_vis ? (n ->> 'id') and (n ->> 'tipo' = 'tramo' or n ->> 'op' = 'depreciar')
      -- La columna que etiqueta unos atajos que se ven.
      union select it ->> 'columna'
        from jsonb_array_elements(coalesce(v_diseno -> 'secciones', '[]'::jsonb)) s, jsonb_array_elements(coalesce(s -> 'items', '[]'::jsonb)) it,
             jsonb_array_elements(v_nodos) n
       where it ->> 'tipo' = 'atajos' and n ->> 'id' = it ->> 'nodo' and n ->> 'tabla' = p_tabla and v_vis ? (n ->> 'id') and (it ->> 'columna') is not null
      -- Las columnas que nombra un bloque de tabla de la ayuda de una celda que se ve, en el diseño de esa versión. Un bloque sin lista (la ayuda de antes)
      -- no suma nada: muestra lo que ya se lee.
      union select c ->> 'columna'
        from jsonb_array_elements(coalesce(v_diseno -> 'secciones', '[]'::jsonb)) s, jsonb_array_elements(coalesce(s -> 'items', '[]'::jsonb)) it,
             jsonb_array_elements(case when jsonb_typeof(it -> 'ayuda') = 'array' then it -> 'ayuda' else '[]'::jsonb end) b,
             jsonb_array_elements(case when jsonb_typeof(b -> 'columnas') = 'array' then b -> 'columnas' else '[]'::jsonb end) c
       where it ->> 'tipo' = 'celda' and v_vis ? (it ->> 'nodo') and b ->> 'tipo' = 'tabla' and b ->> 'tabla' = p_tabla
    ) x where c is not null;
    if v_permitidas is null then
      raise exception 'No tienes acceso a esa tabla.' using errcode = '42501';
    end if;
  end if;

  -- La congelada de esa versión manda, aunque esté vacía; si no, la viva del origen y, si no hay una activa, la compartida.
  v_congelada := case when jsonb_typeof(v_par -> 'tablas') = 'object' and v_par -> 'tablas' ? p_tabla then v_par -> 'tablas' -> p_tabla end;
  select r.* into v_tabla from public.tablas_referencia r where r.origen_id = v_origen and r.clave = p_tabla and r.activa;
  if v_tabla.id is null then
    select r.* into v_tabla from public.tablas_referencia r where r.origen_id is null and r.clave = p_tabla and r.activa;
  end if;
  if v_congelada is null and v_tabla.id is null then
    raise exception 'No tienes acceso a esa tabla.' using errcode = '42501';
  end if;
  if v_congelada is not null and jsonb_typeof(v_congelada) = 'array' then
    v_filas := coalesce((select jsonb_agg(f.value order by f.ord) from jsonb_array_elements(v_congelada) with ordinality f (value, ord) where f.ord <= 1000), '[]'::jsonb);
    v_hay := jsonb_array_length(v_congelada) > 1000;
  else
    select coalesce(jsonb_agg(x.valores order by x.orden, x.id), '[]'::jsonb), coalesce(count(*) > 1000, false) into v_filas, v_hay
      from (select f.valores, f.orden, f.id from public.tablas_referencia_filas f where f.tabla_id = v_tabla.id and f.activa order by f.orden, f.id limit 1001) x;
    if v_hay then v_filas := v_filas - 1000; end if;
  end if;
  v_cols := coalesce(v_tabla.columnas, '[]'::jsonb);
  if not v_cfg then
    v_filas := coalesce((select jsonb_agg((select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) from jsonb_each(case when jsonb_typeof(f.value) = 'object' then f.value else '{}'::jsonb end) e where v_permitidas ? e.key) order by f.ord)
                           from jsonb_array_elements(v_filas) with ordinality f (value, ord)), '[]'::jsonb);
    v_cols := coalesce((select jsonb_agg(c order by o) from jsonb_array_elements(v_cols) with ordinality t (c, o) where v_permitidas ? (c ->> 'clave')), '[]'::jsonb);
  end if;
  return jsonb_build_object('clave', p_tabla, 'nombre', coalesce(v_tabla.nombre, p_tabla), 'columnas', v_cols, 'filas', v_filas, 'hay_mas', v_hay, 'congelada', v_congelada is not null);
end $$;

comment on function public.cotizacion_tabla(text, uuid, uuid, text) is
  'Una tabla de referencia con sólo las columnas que leen los nodos que quien llama ve y las que muestra la ayuda en bloques de una celda que ve (la entera, a quien configura el origen); la copia congelada de la versión manda. La versión es la de la cotización, la de la hoja abierta (p_abierta, por origen) o la publicada; por origen pide cotizaciones.crear y cotizaciones.ver. Sin acceso, el error de una tabla que no existe. docs/COTIZADOR.md › «En la base (4.10-1)», «La hoja abierta (4.13-3a)» y «El diseño de la hoja (D7)».';
