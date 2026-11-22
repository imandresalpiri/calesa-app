-- La tarjeta del total como pieza del diseño (glosario: «Tarjeta del total»): un ítem `{tipo: 'total'}` sin `nodo` (el nodo sigue en
-- `tarjeta_total.nodo`) con el aspecto de todo ítem (ancho, alto, letra y énfasis) dice en qué sección y en qué lugar se dibuja la tarjeta. La forma
-- la admite; el validador la pide una sola (`total_repetido`), en una sección principal (`total_en_avanzado`) y sin nivel de ver
-- (`total_con_nivel`), antes de buscar un nodo, y cuenta para `demasiados_items`; la hoja la manda a todos en su sección, salvo en par. Sin la pieza
-- todo queda como estaba. Sin tablas, permisos ni datos que migrar.

-- La forma de un ítem: `total` lleva sólo `tipo` y el aspecto; D43 (el `nodo`) no le corresponde.
create or replace function public._diseno_forma_item(p_i jsonb) returns boolean
language plpgsql
stable
set search_path = ''
as $_$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  v_tipo text;
  v_permitidas text[];
  v_a jsonb;
  v_es jsonb;
  v_e jsonb;
  v_num numeric;
  v_f float8;
  v_clave text;
  v_max int;
begin
  if jsonb_typeof(p_i) is distinct from 'object' then /*D40*/ return false; end if;
  v_tipo := case when jsonb_typeof(p_i -> 'tipo') = 'string' then p_i ->> 'tipo' end;
  v_permitidas := case v_tipo
    when 'celda' then array['tipo', 'nodo', 'ancho', 'secundario', 'ayuda', 'nivel_ver', 'nivel_editar', 'alto', 'letra', 'enfasis']
    when 'atajos' then array['tipo', 'nodo', 'columna', 'filas', 'ancho', 'alto', 'letra', 'enfasis']
    when 'variante' then array['tipo', 'nodo', 'ancho', 'alto', 'letra', 'enfasis']
    when 'interruptor' then array['tipo', 'nodo', 'efecto', 'ancho', 'alto', 'letra', 'enfasis']
    when 'subtotal' then array['tipo', 'nodo', 'ancho', 'alto', 'letra', 'enfasis']
    when 'total' then array['tipo', 'ancho', 'alto', 'letra', 'enfasis']
  end;
  if v_permitidas is null then /*D41*/ return false; end if;
  -- Una clave que el tipo no lleva (también «__proto__», «clase» o «color») es un error, no se ignora.
  if (p_i - v_permitidas) <> '{}'::jsonb then /*D42*/ return false; end if;
  -- La tarjeta del total no nombra un nodo (el suyo es el de `tarjeta_total`): un `nodo` en ella ya cayó en D42.
  if v_tipo <> 'total' and (jsonb_typeof(p_i -> 'nodo') = 'string' and (p_i ->> 'nodo') ~ c_id) is not true then /*D43*/ return false; end if;

  if v_tipo = 'celda' then
    -- El ancho de una celda es obligatorio: uno con nombre de los diseños guardados (12, 6 y 4 columnas) o un número de columnas (abajo).
    if not (p_i ? 'ancho') then /*D70*/ return false; end if;
    if jsonb_typeof(p_i -> 'ancho') = 'string' and (p_i ->> 'ancho') not in ('completo', 'mitad', 'tercio') then
      /*D44*/ return false;
    end if;
    if p_i ? 'secundario'
       and (jsonb_typeof(p_i -> 'secundario') = 'string' and (p_i ->> 'secundario') in ('porcentaje', 'monto')) is not true then
      /*D45*/ return false;
    end if;
    if p_i ? 'nivel_ver' and (jsonb_typeof(p_i -> 'nivel_ver') = 'string' and (p_i ->> 'nivel_ver') ~ c_id) is not true then
      /*D46*/ return false;
    end if;
    if p_i ? 'nivel_editar' and (jsonb_typeof(p_i -> 'nivel_editar') = 'string' and (p_i ->> 'nivel_editar') ~ c_id) is not true then
      /*D47*/ return false;
    end if;
    -- La ayuda es la tabla que se abre o un texto (con hasta 5 enlaces, cada uno con su título y su URL), no las dos. Que la URL sea `https://` es la
    -- regla `ayuda_enlace_no_https` (`_diseno_enlaces()`), no la forma.
    if p_i ? 'ayuda' then
      v_a := p_i -> 'ayuda';
      if jsonb_typeof(v_a) is distinct from 'object' then /*D48*/ return false; end if;
      if v_a ? 'tabla' then
        if (v_a - 'tabla') <> '{}'::jsonb then /*D49*/ return false; end if;
        if (jsonb_typeof(v_a -> 'tabla') = 'string' and (v_a ->> 'tabla') ~ c_id) is not true then /*D50*/ return false; end if;
      elsif v_a ? 'texto' then
        if (v_a - array['texto', 'enlaces']) <> '{}'::jsonb then /*D51*/ return false; end if;
        if (jsonb_typeof(v_a -> 'texto') = 'string' and char_length(v_a ->> 'texto') between 1 and 300) is not true then
          /*D52*/ return false;
        end if;
        if v_a ? 'enlaces' then
          v_es := v_a -> 'enlaces';
          if jsonb_typeof(v_es) is distinct from 'array' then /*D81*/ return false; end if;
          if jsonb_array_length(v_es) not between 1 and 5 then /*D82*/ return false; end if;
          for j in 0 .. jsonb_array_length(v_es) - 1 loop
            v_e := v_es -> j;
            if jsonb_typeof(v_e) is distinct from 'object' or (v_e - array['titulo', 'url']) <> '{}'::jsonb then /*D83*/ return false; end if;
            if (jsonb_typeof(v_e -> 'titulo') = 'string' and char_length(v_e ->> 'titulo') between 1 and 60) is not true then /*D84*/ return false; end if;
            if (jsonb_typeof(v_e -> 'url') = 'string' and char_length(v_e ->> 'url') between 1 and 2000) is not true then /*D85*/ return false; end if;
          end loop;
        end if;
      else
        /*D53*/ return false;
      end if;
    end if;
  elsif v_tipo = 'atajos' then
    if (jsonb_typeof(p_i -> 'columna') = 'string' and (p_i ->> 'columna') ~ c_id) is not true then /*D54*/ return false; end if;
    -- `z.int().min(1).max(12)` sobre el número como lo lee JS: 1.0 y 0.99999999999999999 valen 1; lo que JS redondea a 0, no. Lo que JS
    -- lee como 0 lo corta D56 y lo de 13 o más, D57; queda lo que no es entero, lo negativo y lo que el doble redondea a 13.
    if jsonb_typeof(p_i -> 'filas') is distinct from 'number' then /*D55*/ return false; end if;
    v_num := (p_i -> 'filas')::numeric;
    if abs(v_num) < 1e-300 then
      /*D56*/ return false;
    elsif abs(v_num) >= 13 then
      /*D57*/ return false;
    else
      v_f := v_num::float8;
      if v_f <> trunc(v_f) or v_f < 1 or v_f > 12 then /*D58*/ return false; end if;
    end if;
  elsif v_tipo = 'interruptor' then
    if (jsonb_typeof(p_i -> 'efecto') = 'string' and (p_i ->> 'efecto') in ('habilita', 'muestra')) is not true then
      /*D59*/ return false;
    end if;
  end if;

  -- El aspecto, en todo tipo: columnas y filas de la rejilla de su sección como enteros de JS (la plantilla de D55–D58; el ancho con nombre
  -- de una celda ya pasó arriba), la letra y el énfasis.
  foreach v_clave in array array['ancho', 'alto'] loop
    continue when not (p_i ? v_clave) or (v_clave = 'ancho' and v_tipo = 'celda' and jsonb_typeof(p_i -> 'ancho') = 'string');
    v_max := case v_clave when 'ancho' then 12 else 4 end;
    if jsonb_typeof(p_i -> v_clave) is distinct from 'number' then /*D71*/ return false; end if;
    v_num := (p_i -> v_clave)::numeric;
    if abs(v_num) < 1e-300 then
      /*D72*/ return false;
    elsif abs(v_num) >= v_max + 1 then
      /*D73*/ return false;
    else
      v_f := v_num::float8;
      if v_f <> trunc(v_f) or v_f < 1 or v_f > v_max then /*D74*/ return false; end if;
    end if;
  end loop;
  if p_i ? 'letra' and (jsonb_typeof(p_i -> 'letra') = 'string' and (p_i ->> 'letra') in ('chica', 'normal', 'grande')) is not true then
    /*D75*/ return false;
  end if;
  if p_i ? 'enfasis' and (jsonb_typeof(p_i -> 'enfasis') = 'string' and (p_i ->> 'enfasis') in ('normal', 'fuerte')) is not true then
    /*D76*/ return false;
  end if;
  return true;
end;
$_$;

revoke all on function public._diseno_forma_item(jsonb) from public, anon;
grant execute on function public._diseno_forma_item(jsonb) to authenticated, service_role;

-- §2 del validador: la tarjeta del total se revisa entera antes de buscar un nodo y sigue con el ítem siguiente (no es un dibujo de un nodo:
-- ni `nodo_repetido`, ni atajos, ni cobertura).
create or replace function public._diseno_secciones(p_secs jsonb, p_tarjeta jsonb, p_ids text[], p_tipos text[], p_ops text[], p_salidas text[],
                                                    p_sobres boolean[], p_pcts text[], p_pos jsonb, p_cond jsonb, p_req jsonb, p_niveles jsonb,
                                                    p_retirados jsonb) returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_n int := coalesce(array_length(p_ids, 1), 0);
  v_aver text[] := array_fill(null::text, array[v_n]);     -- con qué nivel de ver se dibuja el nodo (nulo: no se dibuja)
  v_aedit text[] := array_fill(null::text, array[v_n]);    -- con qué nivel de editar
  v_atajo boolean[] := array_fill(false, array[v_n]);      -- ya tiene unos atajos
  v_visto boolean[] := array_fill(false, array[v_n]);      -- ya es un secundario de la tarjeta
  v_a_nodo int[] := '{}'::int[];                           -- los atajos, en el orden del diseño: nodo, niveles de su sección
  v_a_ver text[] := '{}'::text[];
  v_a_edit text[] := '{}'::text[];
  v_dup boolean[];
  v_s jsonb;
  v_its jsonb;
  v_it jsonb;
  v_sid text;
  v_hver text;
  v_hedit text;
  v_ver text;
  v_edit text;
  v_tipo text;
  v_nodo text;
  v_ntipo text;
  v_efecto text;
  v_pct text;
  v_esp boolean;
  v_total_visto boolean := false;                         -- ya hay una tarjeta del total en el diseño
  v_repetido boolean;
  v_avanzada boolean;
  v_con_nivel boolean;
  j int;
  l int;
begin
  -- §2 las secciones, en orden. Una sección repite el id de una anterior.
  select coalesce(array_agg(d.rn > 1 order by d.ord), '{}')
    into v_dup
    from (select x.ord, row_number() over (partition by x.value ->> 'id' order by x.ord) as rn
            from jsonb_array_elements(p_secs) with ordinality as x(value, ord)) d;
  for i in 1 .. coalesce(array_length(v_dup, 1), 0) loop
    v_s := p_secs -> (i - 1);
    v_sid := v_s ->> 'id';
    if v_dup[i] then
      perform public._formula_rechazar('seccion_duplicada', v_sid, format('Hay dos secciones con el id «%s».', v_sid));
    end if;
    perform public._diseno_nivel(v_s ->> 'nivel_ver', v_sid, p_niveles, p_retirados);
    perform public._diseno_nivel(v_s ->> 'nivel_editar', v_sid, p_niveles, p_retirados);
    v_hver := coalesce(v_s ->> 'nivel_ver', 'todos');
    v_hedit := coalesce(v_s ->> 'nivel_editar', 'todos');
    -- Lo lo que no se ve no se edita: ver restringido con editar abierto se rechaza (ver abierto con editar restringido vale).
    if v_hver <> 'todos' and v_hedit = 'todos' then
      perform public._formula_rechazar('editar_sin_ver', v_sid, format('«%s» se ve sólo con un nivel y se edita sin él: lo que no se ve no se edita. Ponle también un nivel de edición.', v_sid));
    end if;
    v_its := v_s -> 'items';

    for k in 0 .. jsonb_array_length(v_its) - 1 loop
      v_it := v_its -> k;
      v_tipo := v_it ->> 'tipo';
      -- La tarjeta del total como pieza: una sola en el diseño, en una sección principal y sin nivel de ver (el total lo ven todos). `donde` es la
      -- sección; no nombra un nodo (el suyo es el de `tarjeta_total`, que revisa §3) ni cuenta como dibujo de uno.
      if v_tipo = 'total' then
        v_repetido := v_total_visto;
        v_avanzada := (v_s ->> 'presentacion') = 'avanzado';
        v_con_nivel := v_hver <> 'todos';
        if v_repetido then
          perform public._formula_rechazar('total_repetido', v_sid, format('La sección «%s» ya tiene la tarjeta del total.', v_sid));
        end if;
        if v_avanzada then
          perform public._formula_rechazar('total_en_avanzado', v_sid, 'La tarjeta del total no va en una sección avanzada.');
        end if;
        if v_con_nivel then
          perform public._formula_rechazar('total_con_nivel', v_sid, format('La tarjeta del total la ven todos: la sección «%s» tiene un nivel.', v_sid));
        end if;
        v_total_visto := true;
        continue;
      end if;
      v_nodo := v_it ->> 'nodo';
      j := (p_pos ->> v_nodo)::int;
      if j is null then
        perform public._formula_rechazar('nodo_inexistente', v_nodo,
          format('El diseño nombra «%s», que no es un nodo de la fórmula.', v_nodo));
      end if;
      v_ntipo := p_tipos[j];
      v_esp := v_ntipo = 'calculo' and p_ops[j] = 'porcentaje_de';
      v_ver := v_hver;
      v_edit := v_hedit;

      if v_tipo = 'celda' then
        if v_ntipo in ('opcion', 'bandera') then
          perform public._formula_rechazar('celda_no_es_valor', v_nodo,
            format('«%s» no se dibuja como celda: la variante va como chips y una bandera como interruptor.', v_nodo));
        end if;
        if v_it ? 'secundario' and not v_esp then
          perform public._formula_rechazar('secundario_sin_porcentaje', v_nodo,
            format('«%s» lleva un secundario y no es un porcentaje de otro monto.', v_nodo));
        end if;
        if v_esp and p_sobres[j] and not (v_it ? 'secundario') then
          perform public._formula_rechazar('par_sin_secundario', v_nodo,
            format('«%s» es un monto con su porcentaje y se sobrescribe: el par es una sola celda con su secundario.', v_nodo));
        end if;
        perform public._diseno_nivel(v_it ->> 'nivel_ver', v_nodo, p_niveles, p_retirados);
        perform public._diseno_nivel(v_it ->> 'nivel_editar', v_nodo, p_niveles, p_retirados);
        v_ver := coalesce(v_it ->> 'nivel_ver', v_hver);
        v_edit := coalesce(v_it ->> 'nivel_editar', v_hedit);
      elsif v_tipo = 'atajos' then
        if v_ntipo <> 'tabla' then
          perform public._formula_rechazar('atajos_no_es_tabla', v_nodo,
            format('Los atajos de «%s» van sobre un nodo de tabla, y ese nodo no lo es.', v_nodo));
        end if;
        if not p_sobres[j] then
          perform public._formula_rechazar('atajos_no_sobrescribible', v_nodo,
            format('Los atajos de «%s» eligen una fila y dejan su valor como sugerido: la tabla tiene que poder sobrescribirse.', v_nodo));
        end if;
      elsif v_tipo = 'variante' then
        if v_ntipo <> 'opcion' then
          perform public._formula_rechazar('variante_no_es_opcion', v_nodo,
            format('«%s» no es la variante de la fórmula.', v_nodo));
        end if;
      elsif v_tipo = 'interruptor' then
        if v_ntipo <> 'bandera' then
          perform public._formula_rechazar('interruptor_no_es_bandera', v_nodo,
            format('«%s» no es una bandera: un interruptor la enciende.', v_nodo));
        end if;
        -- «Habilita» apaga lo que la bandera condiciona o pide; «muestra», sólo lo que condiciona.
        v_efecto := v_it ->> 'efecto';
        if not (p_cond ? v_nodo) and not (v_efecto = 'habilita' and p_req ? v_nodo) then
          perform public._formula_rechazar('interruptor_sin_efecto', v_nodo,
            format('La bandera «%s» no condiciona ningún nodo: su interruptor no haría nada.', v_nodo));
        end if;
      elsif v_tipo = 'subtotal' then
        if v_ntipo <> 'calculo' then
          perform public._formula_rechazar('subtotal_no_es_calculo', v_nodo,
            format('«%s» no es un cálculo: un subtotal se dibuja desde uno.', v_nodo));
        end if;
      end if;

      -- El total, lo que va aparte y la variante los recibe todo el mundo (D7). «Lo que va aparte» incluye el porcentaje que muestra una celda con
      -- secundario y la bandera de un interruptor (4-9): se dibujan con el nivel de su ítem y la base los manda igual.
      if v_ver <> 'todos'
         and (v_tipo = 'variante' or (v_tipo in ('celda', 'subtotal') and p_salidas[j] in ('total', 'aparte'))) then
        perform public._formula_rechazar('nivel_no_admitido', v_nodo,
          format('«%s» se muestra a todos: el total, lo que va aparte y la variante no se pueden restringir a un nivel.', v_nodo));
      end if;
      if v_ver <> 'todos' and v_tipo = 'celda' and v_it ? 'secundario' and p_salidas[(p_pos ->> p_pcts[j])::int] in ('total', 'aparte') then
        perform public._formula_rechazar('nivel_no_admitido', p_pcts[j],
          format('«%s» se muestra a todos: el total, lo que va aparte y la variante no se pueden restringir a un nivel.', p_pcts[j]));
      end if;
      if v_ver <> 'todos' and v_tipo = 'interruptor' and p_salidas[j] in ('total', 'aparte') then
        perform public._formula_rechazar('nivel_no_admitido', v_nodo,
          format('«%s» se muestra a todos: el total, lo que va aparte y la variante no se pueden restringir a un nivel.', v_nodo));
      end if;
      -- Una celda con su nivel de ver restringido y el de editar abierto (la sección ya revisada no lo tiene: sólo lo rompe el nivel propio de la celda).
      if v_tipo = 'celda' and v_ver <> 'todos' and v_edit = 'todos' then
        perform public._formula_rechazar('editar_sin_ver', v_nodo, format('«%s» se ve sólo con un nivel y se edita sin él: lo que no se ve no se edita. Ponle también un nivel de edición.', v_nodo));
      end if;

      -- Dónde se dibuja el valor del nodo (y el del porcentaje de un par); un segundo dibujo es `nodo_repetido`.
      if v_tipo = 'atajos' then
        if v_atajo[j] then
          perform public._formula_rechazar('nodo_repetido', v_nodo, format('«%s» aparece dos veces en el diseño.', v_nodo));
        end if;
        v_atajo[j] := true;
        v_a_nodo := array_append(v_a_nodo, j);
        v_a_ver := array_append(v_a_ver, v_hver);
        v_a_edit := array_append(v_a_edit, v_hedit);
      else
        if v_aver[j] is not null then
          perform public._formula_rechazar('nodo_repetido', v_nodo, format('«%s» aparece dos veces en el diseño.', v_nodo));
        end if;
        v_aver[j] := v_ver;
        v_aedit[j] := v_edit;
        if v_tipo = 'celda' and v_it ? 'secundario' then
          v_pct := p_pcts[j];
          l := (p_pos ->> v_pct)::int;
          if v_aver[l] is not null then
            perform public._formula_rechazar('nodo_repetido', v_pct, format('«%s» aparece dos veces en el diseño.', v_pct));
          end if;
          v_aver[l] := v_ver;
          v_aedit[l] := v_edit;
        end if;
      end if;
    end loop;
  end loop;

  -- §3 la tarjeta: el total y sus secundarios (la garantía), que repiten lo que la hoja ya dibuja.
  v_nodo := p_tarjeta ->> 'nodo';
  j := (p_pos ->> v_nodo)::int;
  if j is null then
    perform public._formula_rechazar('nodo_inexistente', v_nodo,
      format('El diseño nombra «%s», que no es un nodo de la fórmula.', v_nodo));
  end if;
  if p_salidas[j] is distinct from 'total' then
    perform public._formula_rechazar('tarjeta_no_es_el_total', v_nodo,
      format('La tarjeta nombra «%s», que no es el total de la fórmula.', v_nodo));
  end if;
  v_its := p_tarjeta -> 'secundarios';
  for k in 0 .. jsonb_array_length(v_its) - 1 loop
    v_nodo := v_its ->> k;
    j := (p_pos ->> v_nodo)::int;
    if j is null then
      perform public._formula_rechazar('nodo_inexistente', v_nodo,
        format('El diseño nombra «%s», que no es un nodo de la fórmula.', v_nodo));
    end if;
    if p_salidas[j] is distinct from 'aparte' then
      perform public._formula_rechazar('tarjeta_secundario_no_es_aparte', v_nodo,
        format('«%s» es un secundario de la tarjeta y no es una salida «aparte».', v_nodo));
    end if;
    if v_visto[j] then
      perform public._formula_rechazar('nodo_repetido', v_nodo, format('«%s» aparece dos veces en el diseño.', v_nodo));
    end if;
    v_visto[j] := true;
  end loop;

  -- §4 un atajos va sobre la celda de su nodo (o el porcentaje que ella muestra) y con sus mismos niveles.
  for i in 1 .. coalesce(array_length(v_a_nodo, 1), 0) loop
    j := v_a_nodo[i];
    if v_aver[j] is null then
      perform public._formula_rechazar('atajos_sin_celda', p_ids[j],
        format('Los atajos de «%s» necesitan la celda de ese nodo en el diseño.', p_ids[j]));
    end if;
    if v_aver[j] <> v_a_ver[i] or v_aedit[j] <> v_a_edit[i] then
      perform public._formula_rechazar('nodo_con_dos_niveles', p_ids[j],
        format('Los atajos de «%s» y su celda tienen niveles distintos: tienen que ser los mismos.', p_ids[j]));
    end if;
  end loop;

  -- §5 lo que la hoja tiene que dibujar sí o sí, en el orden de la fórmula: todo input y constante, la variante y las banderas que
  -- condicionan algo o piden un dato.
  for n in 1 .. v_n loop
    if v_aver[n] is null
       and (p_tipos[n] in ('input', 'constante', 'opcion')
            or (p_tipos[n] = 'bandera' and (p_cond ? p_ids[n] or p_req ? p_ids[n]))) then
      perform public._formula_rechazar('nodo_sin_seccion', p_ids[n],
        format('«%s» no está en ninguna sección del diseño.', p_ids[n]));
    end if;
  end loop;
end;
$$;

revoke all on function public._diseno_secciones(jsonb, jsonb, text[], text[], text[], text[], boolean[], text[], jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public._diseno_secciones(jsonb, jsonb, text[], text[], text[], text[], boolean[], text[], jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated, service_role;

-- La hoja manda la tarjeta del total donde el diseño la ubica, a todos (no la recorta ningún nivel) y nunca en par.
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
  v_exclusivos text[]; v_total jsonb;
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
  -- Las tablas que lee algún nodo que quien llama ve (la regla de `cotizacion_tabla()`) y las que existen vivas para este origen.
  v_lee := coalesce((select jsonb_object_agg(t.nombre, true)
                       from (select distinct n ->> 'tabla' as nombre from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n
                              where (n ->> 'tabla') is not null and n ->> 'id' = any (v_arr)) t), '{}'::jsonb);
  v_vivas := coalesce((select jsonb_object_agg(r.clave, true) from public.tablas_referencia r where r.activa and (r.origen_id = p_origen or r.origen_id is null)), '{}'::jsonb);
  -- El dato del vehículo de cada nodo `tabla` (4.14-2c2), armado una vez; viaja sólo en la celda de un nodo que se ve.
  v_datos := public._hoja_datos_del_vehiculo(v_nodos, p_origen, fo.params -> 'tablas', v_vivas);
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
                 'ayuda', case
                            when (vis.item -> 'ayuda') ? 'texto' then jsonb_build_object('texto', vis.item -> 'ayuda' ->> 'texto')
                                                                      || jsonb_strip_nulls(jsonb_build_object('enlaces', vis.item -> 'ayuda' -> 'enlaces'))
                            when (vis.item -> 'ayuda') ? 'tabla'
                                 and (v_cfg or v_lee ? (vis.item -> 'ayuda' ->> 'tabla'))
                                 and ((jsonb_typeof(fo.params -> 'tablas') = 'object' and (fo.params -> 'tablas') ? (vis.item -> 'ayuda' ->> 'tabla'))
                                      or v_vivas ? (vis.item -> 'ayuda' ->> 'tabla'))
                              then jsonb_build_object('tabla', vis.item -> 'ayuda' ->> 'tabla') end,
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
  'El diseño de una versión de la fórmula recortado al nivel de quien llama: ítems cuyo nodo se ve, con su candado y su motivo, ayudas (el texto con sus enlaces, o la tabla), el dato del vehículo de una celda de tabla (dato_del_vehiculo), atajos, modos (clave y nombre), la moneda del total en Bs (moneda_bs), si quien llama tiene el ⚙ de la cabecera (ajustes), tarjeta y tonos (los de los grupos de sus celdas, de las secciones que dibuja y de la cabecera). La tarjeta del total como pieza viaja a todo el que abre en su sección y su lugar ({tipo: total, nodo, etiqueta, formato}: el nodo de tarjeta_total, con su aspecto), salvo con una variante en par; sin la pieza, la respuesta es la de siempre. El secundario de un par dice si su pct sigue al monto escrito (sigue_al_monto). Con una variante en par, par (nodo, etiqueta y las dos opciones con su clave y etiqueta, para todo el que abre) y en_par en cada celda y subtotal que cambia según la opción (_nodos_en_par); el ítem de la variante no viaja. Copia el aspecto (ancho, alto, letra y énfasis de cada ítem; ancho, alto, relleno, separación, densidad, letra, énfasis y tono de cada sección; tono, relleno, letra y énfasis de la cabecera) y lo que la cabecera trae por defecto (modo_por_defecto, ver_total_bs_por_defecto, modos_visibles) sólo si el diseño lo trae; nunca los niveles. Con p_edita falso (quien no puede guardar esa cotización) nada es editable y el motivo no es un nivel. De nadie; la llaman cotizacion_hoja y cotizacion_hoja_guardada. docs/COTIZADOR.md › «La lectura que abre la hoja (4.13-1)».';

revoke all on function public._cotizacion_hoja(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public._cotizacion_hoja(uuid, uuid, boolean) to service_role;
