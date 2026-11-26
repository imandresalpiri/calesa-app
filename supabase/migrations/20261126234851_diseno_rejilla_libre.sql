-- La hoja en una rejilla libre (docs/COTIZADOR.md › «El diseño de la hoja (D7)»; docs/DECISIONES.md › «La hoja en una rejilla libre»): cada sección y
-- cada ítem del diseño guardan su posición (columna y fila) además del ancho y el alto, y la raíz, la fila del bloque «Avanzado». Un hueco queda donde
-- se deja y nada se corre solo. Un diseño de flujo (sin ninguna posición) se lee en la rejilla con el acomodo que hoy le da CSS
-- (`_diseno_en_rejilla()`): ninguna versión se reescribe. §2 suma dos reglas (`pieza_fuera_de_la_rejilla`, `piezas_se_pisan`) y la forma, la de la
-- posición y la del bloque (D100–D109).

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 1. La conversión, espejo de `disenoEnRejilla()` (`entities/diseno-en-rejilla.ts`) con el juego `casos-de-rejilla.json`.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

-- Un diseño es de flujo si ni su raíz trae `avanzado` ni ninguna sección o ítem trae `posicion`: cada pieza recibe la posición que hoy le toca en el
-- flujo a lo ancho de escritorio (la regla del «mismo dibujo») y se quita el `alto` que no hace nada (a 12 columnas). Un diseño de rejilla vuelve igual:
-- la conversión es idempotente. Tolerante: nunca lanza, y lo que no tiene forma queda como está para que la forma lo rechace con su error de siempre.
-- STABLE como las demás `_diseno_*` (supabase/tests/validar-diseno.sql), aunque no lea tablas.
create or replace function public._diseno_en_rejilla(p_diseno jsonb) returns jsonb
  language plpgsql stable
  set search_path = ''
as $$
declare
  v_d jsonb;
  v_secs jsonb;
  v_s jsonb;
  v_its jsonb;
  v_o jsonb;
  v_x jsonb;
  v_num numeric;
  v_f float8;
  v_max int;
  v_med int[];
  v_a int;
  v_h int;
  v_n int;
  -- Las piezas por acomodar, en el orden en que se acomodan: las principales (con el bloque «Avanzado», `v_ref` -1, donde aparece la primera
  -- avanzada), las avanzadas y los ítems de cada sección. `v_grupo` dice de qué rejilla es cada una (0 las principales, 1 las avanzadas, 2 + i los
  -- ítems de la sección i); `v_ancho` y `v_alto`, lo que ocupa al acomodarla (una avanzada, las 12 columnas), y `v_quita`, si se le quita el alto.
  v_grupo int[] := '{}'::int[];
  v_ref int[] := '{}'::int[];
  v_ancho int[] := '{}'::int[];
  v_alto int[] := '{}'::int[];
  v_quita boolean[] := '{}'::boolean[];
  v_av_ref int[] := '{}'::int[];
  v_av_alto int[] := '{}'::int[];
  v_av_quita boolean[] := '{}'::boolean[];
  -- Dónde quedó cada pieza.
  v_col int[] := '{}'::int[];
  v_fila int[] := '{}'::int[];
  v_ocupadas boolean[];
  v_cf int;
  v_cc int;
  v_libre boolean;
  v_puesta boolean;
  v_lugar int[];
  v_bloque int;
  v_q int;
  v_p int;
  v_nuevas jsonb[] := '{}'::jsonb[];
  v_items jsonb[];
begin
  if jsonb_typeof(p_diseno) is distinct from 'object' then
    return p_diseno;
  end if;
  -- Una copia en memoria: el argumento puede llegar sin desarmar (TOAST) y cada operador lo volvería a leer entero.
  v_d := p_diseno || '{}'::jsonb;
  v_secs := v_d -> 'secciones';
  if jsonb_typeof(v_secs) is distinct from 'array' or v_d ? 'avanzado' then
    return v_d;
  end if;
  v_n := jsonb_array_length(v_secs);
  for i in 0 .. v_n - 1 loop
    v_s := v_secs -> i;
    continue when jsonb_typeof(v_s) is distinct from 'object';
    if v_s ? 'posicion' then
      return v_d;
    end if;
    v_its := v_s -> 'items';
    continue when jsonb_typeof(v_its) is distinct from 'array';
    for k in 0 .. jsonb_array_length(v_its) - 1 loop
      if jsonb_typeof(v_its -> k) = 'object' and (v_its -> k) ? 'posicion' then
        return v_d;
      end if;
    end loop;
  end loop;

  -- Las secciones: sin ancho, «Automática» (6 columnas); con uno que no es una medida, 12. El alto cuenta si no ocupan la fila entera; a 12 columnas,
  -- uno válido se quita (uno inválido queda para la forma). Las medidas son enteros como los lee JS (`z.int().min(1).max(n)`).
  for i in 0 .. v_n - 1 loop
    v_s := v_secs -> i;
    continue when jsonb_typeof(v_s) is distinct from 'object';
    v_med := array[null, null]::int[];
    for m in 1 .. 2 loop
      v_x := v_s -> (array['ancho', 'alto'])[m];
      v_max := (array[12, 4])[m];
      continue when jsonb_typeof(v_x) is distinct from 'number';
      v_num := v_x::numeric;
      continue when abs(v_num) < 1e-300 or abs(v_num) >= v_max + 1;
      v_f := v_num::float8;
      if v_f = trunc(v_f) and v_f >= 1 and v_f <= v_max then
        v_med[m] := v_f::int;
      end if;
    end loop;
    v_a := case when v_s ? 'ancho' then coalesce(v_med[1], 12) else 6 end;
    v_h := case when v_a < 12 then coalesce(v_med[2], 1) else 1 end;
    if v_s -> 'presentacion' = '"avanzado"'::jsonb then
      if cardinality(v_av_ref) = 0 then
        v_grupo := array_append(v_grupo, 0);
        v_ref := array_append(v_ref, -1);
        v_ancho := array_append(v_ancho, 12);
        v_alto := array_append(v_alto, 1);
        v_quita := array_append(v_quita, false);
      end if;
      v_av_ref := array_append(v_av_ref, i);
      v_av_alto := array_append(v_av_alto, v_h);
      v_av_quita := array_append(v_av_quita, v_a >= 12 and v_med[2] is not null);
    else
      v_grupo := array_append(v_grupo, 0);
      v_ref := array_append(v_ref, i);
      v_ancho := array_append(v_ancho, v_a);
      v_alto := array_append(v_alto, v_h);
      v_quita := array_append(v_quita, v_a >= 12 and v_med[2] is not null);
    end if;
  end loop;
  -- Las avanzadas se apilan a todo el ancho, como en su bloque y en su modal: cada una en sus filas, columna 1.
  for k in 1 .. cardinality(v_av_ref) loop
    v_grupo := array_append(v_grupo, 1);
    v_ref := array_append(v_ref, v_av_ref[k]);
    v_ancho := array_append(v_ancho, 12);
    v_alto := array_append(v_alto, v_av_alto[k]);
    v_quita := array_append(v_quita, v_av_quita[k]);
  end loop;
  -- Los ítems de cada sección, en su orden: una celda con nombre son 12, 6 o 4 columnas; sin ancho, toda la fila; con uno que no es una medida, 12.
  for i in 0 .. v_n - 1 loop
    v_s := v_secs -> i;
    continue when jsonb_typeof(v_s) is distinct from 'object' or jsonb_typeof(v_s -> 'items') is distinct from 'array';
    v_its := v_s -> 'items';
    for k in 0 .. jsonb_array_length(v_its) - 1 loop
      v_o := v_its -> k;
      continue when jsonb_typeof(v_o) is distinct from 'object';
      v_med := array[null, null]::int[];
      for m in 1 .. 2 loop
        v_x := v_o -> (array['ancho', 'alto'])[m];
        v_max := (array[12, 4])[m];
        continue when jsonb_typeof(v_x) is distinct from 'number';
        v_num := v_x::numeric;
        continue when abs(v_num) < 1e-300 or abs(v_num) >= v_max + 1;
        v_f := v_num::float8;
        if v_f = trunc(v_f) and v_f >= 1 and v_f <= v_max then
          v_med[m] := v_f::int;
        end if;
      end loop;
      v_a := case when v_o -> 'tipo' <> '"celda"'::jsonb or v_o -> 'tipo' is null then coalesce(v_med[1], 12)
                  when v_o -> 'ancho' = '"completo"'::jsonb then 12
                  when v_o -> 'ancho' = '"mitad"'::jsonb then 6
                  when v_o -> 'ancho' = '"tercio"'::jsonb then 4
                  else coalesce(v_med[1], 12) end;
      v_h := case when v_a < 12 then coalesce(v_med[2], 1) else 1 end;
      v_grupo := array_append(v_grupo, 2 + i);
      v_ref := array_append(v_ref, k);
      v_ancho := array_append(v_ancho, v_a);
      v_alto := array_append(v_alto, v_h);
      v_quita := array_append(v_quita, v_a >= 12 and v_med[2] is not null);
    end loop;
  end loop;

  -- El acomodo de CSS sin `dense` (`colocarEnFlujo()`): en cada rejilla el cursor empieza en la fila 1, columna 1; cada pieza avanza la columna hasta
  -- caber sin pisar nada y, si no hay lugar en esa fila, pasa a la siguiente desde la columna 1. Tras ponerla, el cursor queda donde termina. La
  -- ocupación es de 12 × filas, una celda por posición.
  for p in 1 .. cardinality(v_grupo) loop
    if p = 1 or v_grupo[p] <> v_grupo[p - 1] then
      v_ocupadas := '{}';
      v_cf := 1;
      v_cc := 1;
    end if;
    v_puesta := false;
    while not v_puesta loop
      while not v_puesta and v_cc + v_ancho[p] - 1 <= 12 loop
        v_libre := true;
        <<area>>
        for f in v_cf .. v_cf + v_alto[p] - 1 loop
          for c in v_cc .. v_cc + v_ancho[p] - 1 loop
            if v_ocupadas[(f - 1) * 12 + c] then
              v_libre := false;
              exit area;
            end if;
          end loop;
        end loop;
        if v_libre then
          for f in v_cf .. v_cf + v_alto[p] - 1 loop
            for c in v_cc .. v_cc + v_ancho[p] - 1 loop
              v_ocupadas[(f - 1) * 12 + c] := true;
            end loop;
          end loop;
          v_col := array_append(v_col, v_cc);
          v_fila := array_append(v_fila, v_cf);
          v_cc := v_cc + v_ancho[p];
          v_puesta := true;
        else
          v_cc := v_cc + 1;
        end if;
      end loop;
      if not v_puesta then
        v_cf := v_cf + 1;
        v_cc := 1;
      end if;
    end loop;
  end loop;

  -- Cada sección con su lugar (la pieza que la acomodó) y la fila del bloque; los ítems van después, en el mismo orden en que se acomodaron.
  v_lugar := array_fill(null::int, array[v_n]);
  v_p := 1;
  while v_p <= cardinality(v_grupo) and v_grupo[v_p] < 2 loop
    if v_ref[v_p] = -1 then
      v_bloque := v_fila[v_p];
    else
      v_lugar[v_ref[v_p] + 1] := v_p;
    end if;
    v_p := v_p + 1;
  end loop;
  for i in 0 .. v_n - 1 loop
    v_s := v_secs -> i;
    if jsonb_typeof(v_s) is distinct from 'object' then
      v_nuevas := array_append(v_nuevas, v_s);
      continue;
    end if;
    v_q := v_lugar[i + 1];
    v_s := case when v_quita[v_q] then v_s - 'alto' else v_s end
           || jsonb_build_object('posicion', jsonb_build_object('columna', v_col[v_q], 'fila', v_fila[v_q]));
    if jsonb_typeof(v_s -> 'items') = 'array' then
      v_its := v_s -> 'items';
      v_items := '{}';
      for k in 0 .. jsonb_array_length(v_its) - 1 loop
        v_o := v_its -> k;
        if jsonb_typeof(v_o) = 'object' then
          v_o := case when v_quita[v_p] then v_o - 'alto' else v_o end
                 || jsonb_build_object('posicion', jsonb_build_object('columna', v_col[v_p], 'fila', v_fila[v_p]));
          v_p := v_p + 1;
        end if;
        v_items := array_append(v_items, v_o);
      end loop;
      v_s := v_s || jsonb_build_object('items', to_jsonb(v_items));
    end if;
    v_nuevas := array_append(v_nuevas, v_s);
  end loop;
  return v_d || jsonb_build_object('secciones', to_jsonb(v_nuevas))
         || case when v_bloque is null then '{}'::jsonb else jsonb_build_object('avanzado', jsonb_build_object('fila', v_bloque)) end;
end;
$$;

revoke all on function public._diseno_en_rejilla(jsonb) from public, anon;
grant execute on function public._diseno_en_rejilla(jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 2. La forma: la posición de cada sección (D100–D103) y de cada ítem (D106–D109), y el bloque «Avanzado» de la raíz (D104–D105). En Zod,
--    `posicion` va tras `alto` en la sección y `avanzado` al final de la raíz: el primer error es el mismo de los dos lados.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create or replace function public._diseno_forma(p_diseno jsonb) returns void
  language plpgsql stable
  set search_path = ''
as $_$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  c_forma constant text := 'El diseño no tiene la forma esperada en «%s».';
  v_cab jsonb;
  v_modos jsonb;
  v_m jsonb;
  v_bs jsonb;
  v_vis jsonb;
  v_b jsonb;
  v_secs jsonb;
  v_s jsonb;
  v_its jsonb;
  v_t jsonb;
  v_donde text;
  v_clave text;
  v_max int;
  v_num numeric;
  v_f float8;
  v_pos jsonb;
begin
  -- Un diseño de flujo se lee en la rejilla (`_diseno_en_rejilla()`): desde acá toda pieza trae su posición.
  p_diseno := public._diseno_en_rejilla(p_diseno);
  if jsonb_typeof(p_diseno) is distinct from 'object' then
    /*D01*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno'));
  end if;

  -- La cabecera: los modos, si se ofrece «Ver total Bs», su aspecto (sin ancho ni alto: va sola en su fila) y lo que trae por defecto.
  v_cab := p_diseno -> 'cabecera';
  if jsonb_typeof(v_cab) is distinct from 'object' then
    /*D02*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera'));
  end if;
  if (v_cab - array['modos', 'ver_total_bs', 'tono', 'relleno', 'letra', 'enfasis', 'modo_por_defecto',
                   'ver_total_bs_por_defecto', 'modos_visibles']) <> '{}'::jsonb then
    /*D03*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera'));
  end if;
  if jsonb_typeof(v_cab -> 'ver_total_bs') is distinct from 'boolean' then
    /*D04*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.ver_total_bs'));
  end if;
  v_modos := v_cab -> 'modos';
  if jsonb_typeof(v_modos) is distinct from 'array' then
    /*D05*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos'));
  end if;
  for i in 0 .. jsonb_array_length(v_modos) - 1 loop
    v_m := v_modos -> i;
    if jsonb_typeof(v_m) is distinct from 'object' then
      /*D06*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i));
    end if;
    if (v_m - array['clave', 'nombre', 'buckets', 'total_en']) <> '{}'::jsonb then
      /*D07*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i));
    end if;
    if (jsonb_typeof(v_m -> 'clave') = 'string' and (v_m ->> 'clave') ~ c_id) is not true then
      /*D08*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.clave'));
    end if;
    if (jsonb_typeof(v_m -> 'nombre') = 'string' and char_length(v_m ->> 'nombre') between 1 and 40) is not true then
      /*D09*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.nombre'));
    end if;
    if (jsonb_typeof(v_m -> 'total_en') = 'string' and (v_m ->> 'total_en') ~ c_id) is not true then
      /*D10*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.total_en'));
    end if;
    v_bs := v_m -> 'buckets';
    if jsonb_typeof(v_bs) is distinct from 'array' then
      /*D11*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets'));
    end if;
    if jsonb_array_length(v_bs) < 1 then
      /*D32*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets'));
    end if;
    for k in 0 .. jsonb_array_length(v_bs) - 1 loop
      v_b := v_bs -> k;
      if jsonb_typeof(v_b) is distinct from 'object' then
        /*D12*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets.' || k));
      end if;
      if (v_b - array['bucket', 'nodo']) <> '{}'::jsonb then
        /*D13*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets.' || k));
      end if;
      if (jsonb_typeof(v_b -> 'bucket') = 'string' and (v_b ->> 'bucket') ~ c_id) is not true then
        /*D14*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets.' || k || '.bucket'));
      end if;
      if (jsonb_typeof(v_b -> 'nodo') = 'string' and (v_b ->> 'nodo') ~ c_id) is not true then
        /*D15*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos.' || i || '.buckets.' || k || '.nodo'));
      end if;
    end loop;
  end loop;
  if v_cab ? 'tono' and (jsonb_typeof(v_cab -> 'tono') = 'string' and (v_cab ->> 'tono') ~ c_id) is not true then
    /*D35*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.tono'));
  end if;
  if v_cab ? 'relleno' and (jsonb_typeof(v_cab -> 'relleno') = 'string' and (v_cab ->> 'relleno') in ('chico', 'medio', 'grande')) is not true then
    /*D36*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.relleno'));
  end if;
  if v_cab ? 'letra' and (jsonb_typeof(v_cab -> 'letra') = 'string' and (v_cab ->> 'letra') in ('chica', 'normal', 'grande')) is not true then
    /*D37*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.letra'));
  end if;
  if v_cab ? 'enfasis' and (jsonb_typeof(v_cab -> 'enfasis') = 'string' and (v_cab ->> 'enfasis') in ('normal', 'fuerte')) is not true then
    /*D38*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.enfasis'));
  end if;
  -- Lo que trae la cabecera por defecto (docs/GLOSARIO.md › «Modo por defecto», «Modos visibles»): cada clave es opcional; las reglas que la cruzan con
  -- los modos van en `_diseno_cabecera()`.
  if v_cab ? 'modo_por_defecto' and (jsonb_typeof(v_cab -> 'modo_por_defecto') = 'string' and (v_cab ->> 'modo_por_defecto') ~ c_id) is not true then
    /*D77*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modo_por_defecto'));
  end if;
  if v_cab ? 'ver_total_bs_por_defecto' and jsonb_typeof(v_cab -> 'ver_total_bs_por_defecto') is distinct from 'boolean' then
    /*D78*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.ver_total_bs_por_defecto'));
  end if;
  if v_cab ? 'modos_visibles' then
    v_vis := v_cab -> 'modos_visibles';
    if jsonb_typeof(v_vis) is distinct from 'array' then
      /*D79*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos_visibles'));
    end if;
    for i in 0 .. jsonb_array_length(v_vis) - 1 loop
      if (jsonb_typeof(v_vis -> i) = 'string' and (v_vis ->> i) ~ c_id) is not true then
        /*D80*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.cabecera.modos_visibles.' || i));
      end if;
    end loop;
  end if;

  -- Las secciones, en orden. Cualquier problema bajo una sección se nombra con su id.
  v_secs := p_diseno -> 'secciones';
  if jsonb_typeof(v_secs) is distinct from 'array' then
    /*D16*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.secciones'));
  end if;
  if jsonb_array_length(v_secs) < 1 then
    /*D33*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.secciones'));
  end if;
  for i in 0 .. jsonb_array_length(v_secs) - 1 loop
    v_s := v_secs -> i;
    v_donde := case when jsonb_typeof(v_s -> 'id') = 'string' then v_s ->> 'id' end;
    if jsonb_typeof(v_s) is distinct from 'object' then
      /*D17*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i));
    end if;
    if (v_s - array['id', 'titulo', 'presentacion', 'nivel_ver', 'nivel_editar', 'ancho', 'alto', 'relleno', 'separacion', 'densidad',
                    'letra', 'enfasis', 'tono', 'posicion', 'items']) <> '{}'::jsonb then
      /*D18*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i));
    end if;
    if (jsonb_typeof(v_s -> 'id') = 'string' and (v_s ->> 'id') ~ c_id) is not true then
      /*D19*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.id'));
    end if;
    if v_s ? 'titulo' and (jsonb_typeof(v_s -> 'titulo') = 'string' and char_length(v_s ->> 'titulo') between 1 and 80) is not true then
      /*D20*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.titulo'));
    end if;
    if (jsonb_typeof(v_s -> 'presentacion') = 'string' and (v_s ->> 'presentacion') in ('principal', 'avanzado')) is not true then
      /*D21*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.presentacion'));
    end if;
    if v_s ? 'nivel_ver' and (jsonb_typeof(v_s -> 'nivel_ver') = 'string' and (v_s ->> 'nivel_ver') ~ c_id) is not true then
      /*D22*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.nivel_ver'));
    end if;
    if v_s ? 'nivel_editar' and (jsonb_typeof(v_s -> 'nivel_editar') = 'string' and (v_s ->> 'nivel_editar') ~ c_id) is not true then
      /*D23*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.nivel_editar'));
    end if;
    -- Las columnas y las filas de la rejilla de las secciones: enteros como los lee JS (`z.int().min(1).max(n)`, la plantilla de D55–D58), en
    -- línea y sin llamar a otra función.
    foreach v_clave in array array['ancho', 'alto'] loop
      continue when not (v_s ? v_clave);
      v_max := case v_clave when 'ancho' then 12 else 4 end;
      if jsonb_typeof(v_s -> v_clave) is distinct from 'number' then
        /*D60*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.' || v_clave));
      end if;
      v_num := (v_s -> v_clave)::numeric;
      if abs(v_num) < 1e-300 then
        /*D61*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.' || v_clave));
      elsif abs(v_num) >= v_max + 1 then
        /*D62*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.' || v_clave));
      else
        v_f := v_num::float8;
        if v_f <> trunc(v_f) or v_f < 1 or v_f > v_max then
          /*D63*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.' || v_clave));
        end if;
      end if;
    end loop;
    -- La posición en su espacio (la rejilla de las secciones o la lista de las avanzadas): un objeto estricto con la columna (1 a 12) y la fila (1 a
    -- 200), enteros como los lee JS (la plantilla de D60–D63).
    v_pos := v_s -> 'posicion';
    if jsonb_typeof(v_pos) is distinct from 'object' then
      /*D100*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.posicion'));
    end if;
    if (v_pos - array['columna', 'fila']) <> '{}'::jsonb then
      /*D101*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.posicion'));
    end if;
    foreach v_clave in array array['columna', 'fila'] loop
      v_max := case v_clave when 'columna' then 12 else 200 end;
      v_f := null;
      if jsonb_typeof(v_pos -> v_clave) = 'number' then
        v_num := (v_pos -> v_clave)::numeric;
        v_f := case when abs(v_num) >= 1e-300 and abs(v_num) < v_max + 1 then v_num::float8 end;
      end if;
      if v_f is null or v_f <> trunc(v_f) or v_f < 1 or v_f > v_max then
        if v_clave = 'columna' then
          /*D102*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.posicion.columna'));
        else
          /*D103*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.posicion.fila'));
        end if;
      end if;
    end loop;
    if v_s ? 'relleno' and (jsonb_typeof(v_s -> 'relleno') = 'string' and (v_s ->> 'relleno') in ('chico', 'medio', 'grande')) is not true then
      /*D64*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.relleno'));
    end if;
    if v_s ? 'separacion' and (jsonb_typeof(v_s -> 'separacion') = 'string' and (v_s ->> 'separacion') in ('chica', 'media', 'grande')) is not true then
      /*D65*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.separacion'));
    end if;
    if v_s ? 'densidad' and (jsonb_typeof(v_s -> 'densidad') = 'string' and (v_s ->> 'densidad') in ('compacta', 'comoda')) is not true then
      /*D66*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.densidad'));
    end if;
    if v_s ? 'letra' and (jsonb_typeof(v_s -> 'letra') = 'string' and (v_s ->> 'letra') in ('chica', 'normal', 'grande')) is not true then
      /*D67*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.letra'));
    end if;
    if v_s ? 'enfasis' and (jsonb_typeof(v_s -> 'enfasis') = 'string' and (v_s ->> 'enfasis') in ('normal', 'fuerte')) is not true then
      /*D68*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.enfasis'));
    end if;
    if v_s ? 'tono' and (jsonb_typeof(v_s -> 'tono') = 'string' and (v_s ->> 'tono') ~ c_id) is not true then
      /*D69*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.tono'));
    end if;
    v_its := v_s -> 'items';
    if jsonb_typeof(v_its) is distinct from 'array' then
      /*D24*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.items'));
    end if;
    if jsonb_array_length(v_its) < 1 then
      /*D34*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.items'));
    end if;
    for k in 0 .. jsonb_array_length(v_its) - 1 loop
      if not public._diseno_forma_item(v_its -> k) then
        /*D25*/ perform public._formula_rechazar('forma', v_donde, format(c_forma, 'diseno.secciones.' || i || '.items.' || k));
      end if;
    end loop;
  end loop;

  -- La tarjeta del total: el nodo y sus secundarios.
  v_t := p_diseno -> 'tarjeta_total';
  if jsonb_typeof(v_t) is distinct from 'object' then
    /*D26*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total'));
  end if;
  if (v_t - array['nodo', 'secundarios']) <> '{}'::jsonb then
    /*D27*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total'));
  end if;
  if (jsonb_typeof(v_t -> 'nodo') = 'string' and (v_t ->> 'nodo') ~ c_id) is not true then
    /*D28*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total.nodo'));
  end if;
  v_its := v_t -> 'secundarios';
  if jsonb_typeof(v_its) is distinct from 'array' then
    /*D29*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total.secundarios'));
  end if;
  for k in 0 .. jsonb_array_length(v_its) - 1 loop
    if (jsonb_typeof(v_its -> k) = 'string' and (v_its ->> k) ~ c_id) is not true then
      /*D30*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.tarjeta_total.secundarios.' || k));
    end if;
  end loop;

  -- El bloque «Avanzado» (el total suelto, el botón y el cierre): una fila entera de la rejilla de las secciones, de 1 a 200.
  if p_diseno ? 'avanzado' then
    v_pos := p_diseno -> 'avanzado';
    if jsonb_typeof(v_pos) is distinct from 'object' then
      /*D104*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.avanzado'));
    end if;
    if (v_pos - 'fila') <> '{}'::jsonb then
      /*D104*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.avanzado'));
    end if;
    v_f := null;
    if jsonb_typeof(v_pos -> 'fila') = 'number' then
      v_num := (v_pos -> 'fila')::numeric;
      v_f := case when abs(v_num) >= 1e-300 and abs(v_num) < 201 then v_num::float8 end;
    end if;
    if v_f is null or v_f <> trunc(v_f) or v_f < 1 or v_f > 200 then
      /*D105*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno.avanzado.fila'));
    end if;
  end if;

  if (p_diseno - array['cabecera', 'secciones', 'tarjeta_total', 'avanzado']) <> '{}'::jsonb then
    /*D31*/ perform public._formula_rechazar('forma', null, format(c_forma, 'diseno'));
  end if;
end;
$_$;

create or replace function public._diseno_forma_item(p_i jsonb) returns boolean
  language plpgsql stable
  set search_path = ''
as $_$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  v_tipo text;
  v_permitidas text[];
  v_a jsonb;
  v_es jsonb;
  v_e jsonb;
  v_b jsonb;
  v_bt text;
  v_cs jsonb;
  v_c jsonb;
  v_vistas jsonb;
  v_tablas int;
  v_num numeric;
  v_f float8;
  v_clave text;
  v_max int;
begin
  if jsonb_typeof(p_i) is distinct from 'object' then /*D40*/ return false; end if;
  v_tipo := case when jsonb_typeof(p_i -> 'tipo') = 'string' then p_i ->> 'tipo' end;
  v_permitidas := case v_tipo
    when 'celda' then array['tipo', 'nodo', 'ancho', 'secundario', 'ayuda', 'nivel_ver', 'nivel_editar', 'alto', 'letra', 'enfasis', 'posicion']
    when 'atajos' then array['tipo', 'nodo', 'columna', 'filas', 'ancho', 'alto', 'letra', 'enfasis', 'posicion']
    when 'variante' then array['tipo', 'nodo', 'ancho', 'alto', 'letra', 'enfasis', 'posicion']
    when 'interruptor' then array['tipo', 'nodo', 'efecto', 'ancho', 'alto', 'letra', 'enfasis', 'posicion']
    when 'subtotal' then array['tipo', 'nodo', 'ancho', 'alto', 'letra', 'enfasis', 'posicion']
    when 'total' then array['tipo', 'ancho', 'alto', 'letra', 'enfasis', 'posicion']
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
    -- La ayuda son sus bloques (docs/GLOSARIO.md › «Bloque de la ayuda»), o la de antes: la tabla que se abre o un texto (con hasta 5 enlaces, cada
    -- uno con su título y su URL), no las dos. Que la URL sea `https://`, que la tabla y sus columnas existan y que una columna llene una celda que
    -- acepta un valor son reglas de `_diseno_ayudas()`, no la forma.
    if p_i ? 'ayuda' then
      v_a := p_i -> 'ayuda';
      if jsonb_typeof(v_a) = 'array' then
        if jsonb_array_length(v_a) not between 1 and 8 then /*D86*/ return false; end if;
        v_tablas := 0;
        for j in 0 .. jsonb_array_length(v_a) - 1 loop
          v_b := v_a -> j;
          v_bt := case when jsonb_typeof(v_b) = 'object' and jsonb_typeof(v_b -> 'tipo') = 'string' then v_b ->> 'tipo' end;
          if v_bt is null or v_bt not in ('titulo', 'texto', 'enlaces', 'tabla') then /*D87*/ return false; end if;
          if v_bt = 'titulo' then
            if (v_b - array['tipo', 'texto']) <> '{}'::jsonb
               or (jsonb_typeof(v_b -> 'texto') = 'string' and char_length(v_b ->> 'texto') between 1 and 80) is not true then
              /*D88*/ return false;
            end if;
          elsif v_bt = 'texto' then
            if (v_b - array['tipo', 'texto']) <> '{}'::jsonb
               or (jsonb_typeof(v_b -> 'texto') = 'string' and char_length(v_b ->> 'texto') between 1 and 1000) is not true then
              /*D89*/ return false;
            end if;
          elsif v_bt = 'enlaces' then
            v_es := v_b -> 'enlaces';
            if (v_b - array['tipo', 'enlaces']) <> '{}'::jsonb or jsonb_typeof(v_es) is distinct from 'array' then /*D90*/ return false; end if;
            if jsonb_array_length(v_es) not between 1 and 5 then /*D90*/ return false; end if;
            for k in 0 .. jsonb_array_length(v_es) - 1 loop
              v_e := v_es -> k;
              if jsonb_typeof(v_e) is distinct from 'object' or (v_e - array['titulo', 'url']) <> '{}'::jsonb then /*D91*/ return false; end if;
              if (jsonb_typeof(v_e -> 'titulo') = 'string' and char_length(v_e ->> 'titulo') between 1 and 60) is not true then /*D92*/ return false; end if;
              if (jsonb_typeof(v_e -> 'url') = 'string' and char_length(v_e ->> 'url') between 1 and 2000) is not true then /*D93*/ return false; end if;
            end loop;
          else
            if (v_b - array['tipo', 'tabla', 'columnas', 'resaltar']) <> '{}'::jsonb
               or (jsonb_typeof(v_b -> 'tabla') = 'string' and (v_b ->> 'tabla') ~ c_id) is not true then
              /*D94*/ return false;
            end if;
            if v_b ? 'columnas' then
              v_cs := v_b -> 'columnas';
              if jsonb_typeof(v_cs) is distinct from 'array' then /*D95*/ return false; end if;
              -- Hasta las columnas que admite una tabla de referencia (`MAXIMO_DE_COLUMNAS_EN_LA_AYUDA`), sin repetir ninguna.
              if jsonb_array_length(v_cs) not between 1 and 20 then /*D95*/ return false; end if;
              v_vistas := '{}'::jsonb;
              for k in 0 .. jsonb_array_length(v_cs) - 1 loop
                v_c := v_cs -> k;
                if jsonb_typeof(v_c) is distinct from 'object' then /*D96*/ return false; end if;
                if (v_c - array['columna', 'llena']) <> '{}'::jsonb
                   or (jsonb_typeof(v_c -> 'columna') = 'string' and (v_c ->> 'columna') ~ c_id) is not true
                   or (v_c ? 'llena' and (jsonb_typeof(v_c -> 'llena') = 'string' and (v_c ->> 'llena') ~ c_id) is not true) then
                  /*D96*/ return false;
                end if;
                if v_vistas ? (v_c ->> 'columna') then /*D97*/ return false; end if;
                v_vistas := v_vistas || jsonb_build_object(v_c ->> 'columna', true);
              end loop;
            end if;
            if v_b ? 'resaltar' and jsonb_typeof(v_b -> 'resaltar') is distinct from 'boolean' then /*D98*/ return false; end if;
            v_tablas := v_tablas + 1;
          end if;
        end loop;
        -- Hasta 3 tablas en una ayuda (`MAXIMO_DE_TABLAS_EN_LA_AYUDA`): cada una se lee al abrirla.
        if v_tablas > 3 then /*D99*/ return false; end if;
      elsif jsonb_typeof(v_a) is distinct from 'object' then /*D48*/ return false;
      elsif v_a ? 'tabla' then
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
  -- La posición en la rejilla de su sección, en todo tipo: un objeto estricto con la columna (1 a 12) y la fila (1 a 200), enteros como los lee JS.
  if jsonb_typeof(p_i -> 'posicion') is distinct from 'object' then /*D106*/ return false; end if;
  if ((p_i -> 'posicion') - array['columna', 'fila']) <> '{}'::jsonb then /*D107*/ return false; end if;
  foreach v_clave in array array['columna', 'fila'] loop
    v_max := case v_clave when 'columna' then 12 else 200 end;
    v_f := null;
    if jsonb_typeof(p_i -> 'posicion' -> v_clave) = 'number' then
      v_num := (p_i -> 'posicion' -> v_clave)::numeric;
      v_f := case when abs(v_num) >= 1e-300 and abs(v_num) < v_max + 1 then v_num::float8 end;
    end if;
    if v_f is null or v_f <> trunc(v_f) or v_f < 1 or v_f > v_max then
      if v_clave = 'columna' then /*D108*/ return false; else /*D109*/ return false; end if;
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

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 3. §2 con la geometría de la rejilla (`pieza_fuera_de_la_rejilla`, `piezas_se_pisan`): la sección tras sus reglas propias y cada ítem tras las suyas
--    (`nodo_repetido` incluido), con los textos de `motivos-de-diseno.ts`. Recibe la fila del bloque «Avanzado» (nula sin él).
-- ---------------------------------------------------------------------------------------------------------------------------------------------

drop function public._diseno_secciones(jsonb, jsonb, text[], text[], text[], text[], boolean[], text[], jsonb, jsonb, jsonb, jsonb, jsonb);

create function public._diseno_secciones(p_secs jsonb, p_tarjeta jsonb, p_ids text[], p_tipos text[], p_ops text[], p_salidas text[],
                                         p_sobres boolean[], p_pcts text[], p_pos jsonb, p_cond jsonb, p_req jsonb, p_niveles jsonb,
                                         p_retirados jsonb, p_fila_del_bloque integer) returns void
  language plpgsql stable
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
  -- La geometría de la rejilla (`validar-diseno-rejilla.ts`): las celdas ocupadas de cada fila como una máscara de 12 bits. En `v_filas`, las de las
  -- secciones (las principales en las filas 1 a 200, con la del bloque «Avanzado» ya marcada; las avanzadas, 200 más); en `v_celdas`, las de los ítems
  -- de la sección. Cada pieza mira a lo sumo 4 filas: una constante.
  v_filas int[] := '{}'::int[];
  v_celdas int[];
  v_col int;
  v_fila int;
  v_w int;
  v_h int;
  v_mask int;
  v_base int;
  v_rejilla text;
  v_rej_donde text;
  v_rej_texto text;
begin
  if p_fila_del_bloque is not null then
    v_filas[p_fila_del_bloque] := 4095;
  end if;
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
    -- La sección en su espacio: dentro de las 12 columnas y las 200 filas, y sin pisar otra.
    v_col := (v_s -> 'posicion' -> 'columna')::numeric::float8::int;
    v_fila := (v_s -> 'posicion' -> 'fila')::numeric::float8::int;
    v_w := coalesce((v_s -> 'ancho')::numeric::float8::int, 6);
    v_h := coalesce((v_s -> 'alto')::numeric::float8::int, 1);
    v_base := case when (v_s ->> 'presentacion') = 'avanzado' then 200 else 0 end;
    if v_col + v_w - 1 > 12 or v_fila + v_h - 1 > 200 then
      perform public._formula_rechazar('pieza_fuera_de_la_rejilla', v_sid,
        format('La sección «%s» se sale de la rejilla: 12 columnas y 200 filas.', v_sid));
    end if;
    v_mask := ((1 << v_w) - 1) << (v_col - 1);
    for f in v_base + v_fila .. v_base + v_fila + v_h - 1 loop
      if (coalesce(v_filas[f], 0) & v_mask) <> 0 then
        perform public._formula_rechazar('piezas_se_pisan', v_sid, format('La sección «%s» se pisa con otra en la rejilla.', v_sid));
      end if;
      v_filas[f] := coalesce(v_filas[f], 0) | v_mask;
    end loop;
    v_celdas := '{}'::int[];
    v_its := v_s -> 'items';

    for k in 0 .. jsonb_array_length(v_its) - 1 loop
      v_it := v_its -> k;
      v_tipo := v_it ->> 'tipo';
      -- El ítem en la rejilla de su sección; el rechazo se dice tras las reglas del ítem (abajo). `donde` es su nodo: la tarjeta del total nombra la sección.
      v_col := (v_it -> 'posicion' -> 'columna')::numeric::float8::int;
      v_fila := (v_it -> 'posicion' -> 'fila')::numeric::float8::int;
      v_w := case when v_tipo <> 'celda' then coalesce((v_it -> 'ancho')::numeric::float8::int, 12)
                  when (v_it ->> 'ancho') = 'completo' then 12
                  when (v_it ->> 'ancho') = 'mitad' then 6
                  when (v_it ->> 'ancho') = 'tercio' then 4
                  else (v_it -> 'ancho')::numeric::float8::int end;
      v_h := coalesce((v_it -> 'alto')::numeric::float8::int, 1);
      v_rejilla := null;
      if v_col + v_w - 1 > 12 or v_fila + v_h - 1 > 200 then
        v_rejilla := 'pieza_fuera_de_la_rejilla';
      else
        v_mask := ((1 << v_w) - 1) << (v_col - 1);
        for f in v_fila .. v_fila + v_h - 1 loop
          if (coalesce(v_celdas[f], 0) & v_mask) <> 0 then
            v_rejilla := 'piezas_se_pisan';
          end if;
          v_celdas[f] := coalesce(v_celdas[f], 0) | v_mask;
        end loop;
      end if;
      v_rej_donde := case when v_tipo = 'total' then v_sid else v_it ->> 'nodo' end;
      v_rej_texto := case when v_tipo = 'total' then 'La tarjeta del total' else format('La pieza «%s»', v_it ->> 'nodo') end
                     || case when v_rejilla = 'pieza_fuera_de_la_rejilla' then ' se sale de la rejilla: 12 columnas y 200 filas.'
                             else ' se pisa con otra en la rejilla.' end;
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
        if v_rejilla is not null then
          perform public._formula_rechazar(v_rejilla, v_rej_donde, v_rej_texto);
        end if;
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
      if v_rejilla is not null then
        perform public._formula_rechazar(v_rejilla, v_rej_donde, v_rej_texto);
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

revoke all on function public._diseno_secciones(jsonb, jsonb, text[], text[], text[], text[], boolean[], text[], jsonb, jsonb, jsonb, jsonb, jsonb, integer) from public, anon;
grant execute on function public._diseno_secciones(jsonb, jsonb, text[], text[], text[], text[], boolean[], text[], jsonb, jsonb, jsonb, jsonb, jsonb, integer) to authenticated, service_role;

create or replace function public.validar_diseno(p_def jsonb, p_diseno jsonb, p_niveles text[], p_retirados text[], p_tonos text[],
                                                 p_tablas jsonb default null) returns void
  language plpgsql stable
  set search_path = ''
as $$
declare
  v_nodos jsonb;
  v_buckets jsonb;
  v_total_en text;
  v_grupos jsonb;
  v_pos jsonb;
  v_ids text[];
  v_tipos text[];
  v_ops text[];
  v_salidas text[];
  v_sobres boolean[];
  v_pcts text[];
  v_cond jsonb;
  v_req jsonb;
  v_niv jsonb;
  v_ret jsonb;
  v_ton jsonb;
  v_g jsonb;
  v_s jsonb;
  v_secs jsonb;
  v_cab jsonb;
  v_modos jsonb;
  v_max integer;
  v_items integer := 0;
  v_aux jsonb;
  v_tipos_hoja text[];
begin
  -- §0 la forma, sobre el diseño en la rejilla: uno de flujo se convierte al leerlo (`_diseno_en_rejilla()`) y las pasadas leen el convertido.
  p_diseno := public._diseno_en_rejilla(p_diseno);
  perform public._diseno_forma(p_diseno);
  -- `p_diseno` puede llegar sin desarmar (TOAST) y cada `->` sobre él lo vuelve a leer entero: la cabecera y las secciones van a una variable una vez.
  v_cab := p_diseno -> 'cabecera';
  v_secs := p_diseno -> 'secciones';

  -- §0b el tamaño (4-30): sólo contar, antes que todo lo demás. `donde` es la sección en la que la suma pasa del tope.
  v_max := public._diseno_maximo_de_items();
  for i in 0 .. jsonb_array_length(v_secs) - 1 loop
    v_items := v_items + jsonb_array_length(v_secs -> i -> 'items');
    if v_items > v_max then
      perform public._formula_rechazar('demasiados_items', v_secs -> i ->> 'id',
        format('La hoja admite hasta %s ítems y el diseño pasa de ese tope en «%s»: quita alguno.', v_max,
               v_secs -> i ->> 'id'));
    end if;
  end loop;

  -- La fórmula, desarmada una vez: un id, una posición.
  v_nodos := p_def -> 'nodos';
  v_buckets := p_def -> 'buckets';
  v_total_en := p_def ->> 'total_en';
  v_grupos := coalesce(p_def -> 'grupos', '[]'::jsonb);
  select coalesce(jsonb_object_agg(x.value ->> 'id', x.pos), '{}'::jsonb),
         array_agg(x.value ->> 'id' order by x.pos),
         array_agg(x.value ->> 'tipo' order by x.pos),
         array_agg(x.value ->> 'op' order by x.pos),
         array_agg(x.value ->> 'salida' order by x.pos),
         array_agg(coalesce(x.value -> 'sobrescribible' = 'true'::jsonb, false) order by x.pos),
         array_agg(x.value ->> 'pct' order by x.pos),
         coalesce(jsonb_object_agg(x.value ->> 'condicion', true) filter (where x.value ->> 'condicion' is not null), '{}'::jsonb),
         coalesce(jsonb_object_agg(x.value ->> 'requerido_si', true) filter (where x.value ->> 'requerido_si' is not null), '{}'::jsonb)
    into v_pos, v_ids, v_tipos, v_ops, v_salidas, v_sobres, v_pcts, v_cond, v_req
    from jsonb_array_elements(v_nodos) with ordinality as x(value, pos);

  -- Las auxiliares de los textos (4.21-3b-2): una constante auxiliar no pide celda en §5.
  v_aux := public._diseno_auxiliares(p_def);
  v_tipos_hoja := array(select case when t.tipo = 'constante' and v_aux ? t.id then 'constante_auxiliar' else t.tipo end
                          from unnest(v_ids, v_tipos) with ordinality as t(id, tipo, ord)
                         order by t.ord);

  -- El contexto, como conjuntos.
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_niv from unnest(p_niveles) x where x is not null;
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_ret from unnest(p_retirados) x where x is not null;
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_ton from unnest(p_tonos) x where x is not null;

  -- §1 los modos.
  v_modos := v_cab -> 'modos';
  perform public._diseno_modos(v_modos, v_buckets, coalesce(cardinality(array(select jsonb_object_keys(v_buckets))), 0),
                               v_total_en, v_pos, v_tipos);

  -- §1b lo que la cabecera trae por defecto: el modo por defecto, los modos visibles y «Ver total» por defecto.
  perform public._diseno_cabecera(v_cab);

  -- §2 a §5 las secciones, la tarjeta, los atajos y la cobertura.
  perform public._diseno_secciones(v_secs, p_diseno -> 'tarjeta_total', v_ids, v_tipos_hoja, v_ops, v_salidas, v_sobres, v_pcts,
                                   v_pos, v_cond, v_req, v_niv, v_ret, (p_diseno -> 'avanzado' -> 'fila')::numeric::float8::int);

  -- §6 los tonos están en el catálogo de la empresa: el de cada grupo de la fórmula, el de la cabecera y el de cada sección, en ese orden.
  for i in 0 .. jsonb_array_length(v_grupos) - 1 loop
    v_g := v_grupos -> i;
    if not coalesce(v_ton ? (v_g ->> 'tono'), false) then
      perform public._formula_rechazar('tono_inexistente', v_g ->> 'id',
        format('El grupo «%s» usa un tono que no está en el catálogo.', v_g ->> 'id'));
    end if;
  end loop;
  if v_cab ? 'tono' and not coalesce(v_ton ? (v_cab ->> 'tono'), false) then
    perform public._formula_rechazar('tono_inexistente', 'cabecera', 'La cabecera usa un tono que no está en el catálogo.');
  end if;
  for i in 0 .. jsonb_array_length(v_secs) - 1 loop
    v_s := v_secs -> i;
    if v_s ? 'tono' and not coalesce(v_ton ? (v_s ->> 'tono'), false) then
      perform public._formula_rechazar('tono_inexistente', v_s ->> 'id',
        format('La sección «%s» usa un tono que no está en el catálogo.', v_s ->> 'id'));
    end if;
  end loop;

  -- §7 la ayuda de cada celda: sus enlaces son `https://`; con el catálogo de tablas (`p_tablas`, null sin él), sus tablas y columnas existen; y
  -- una columna que llena nombra una celda que acepta un valor.
  perform public._diseno_ayudas(p_def, v_secs, p_tablas);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 4. La hoja de cotizar: la posición de cada pieza y la fila del bloque viajan con su aspecto.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

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
  v_exclusivos text[]; v_total jsonb; v_casa jsonb; v_diseno jsonb;
begin
  select * into fo from public.formulas x where x.id = p_formula;
  -- El diseño en la rejilla: uno de flujo se convierte al leerlo (`_diseno_en_rejilla()`).
  v_diseno := public._diseno_en_rejilla(fo.diseno);
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
  if v_par_nodo is null and v_nodos ? (v_diseno -> 'tarjeta_total' ->> 'nodo') then
    v_total := jsonb_build_object('tipo', 'total', 'nodo', v_diseno -> 'tarjeta_total' ->> 'nodo',
                                  'etiqueta', v_nodos -> (v_diseno -> 'tarjeta_total' ->> 'nodo') ->> 'etiqueta',
                                  'formato', coalesce(v_nodos -> (v_diseno -> 'tarjeta_total' ->> 'nodo') ->> 'formato', 'usd'))
               || public._hoja_decimales(v_nodos -> (v_diseno -> 'tarjeta_total' ->> 'nodo'));
  end if;

  -- El aspecto y la posición de cada ítem y de cada sección se copian del diseño ya leído (con `->`: un número de columnas sigue siendo un
  -- número); sin ellos, la clave no viaja. Los niveles de una sección (`nivel_*`) nunca viajan.
  with it as (
    select s.ord as so, i.ord as io, s.value - 'items' as cab, i.value as item, i.value ->> 'tipo' as t, i.value ->> 'nodo' as nid
      from jsonb_array_elements(v_diseno -> 'secciones') with ordinality s (value, ord)
     cross join lateral jsonb_array_elements(s.value -> 'items') with ordinality i (value, ord)
  ), vis as (
    -- Sólo viaja lo que su nodo (y, en un par, su porcentaje) permite; la tarjeta del total, si hay `v_total`.
    select it.*, v_nodos -> it.nid as n,
           jsonb_strip_nulls(jsonb_build_object('ancho', it.item -> 'ancho', 'alto', it.item -> 'alto', 'letra', it.item -> 'letra',
                                                'enfasis', it.item -> 'enfasis', 'posicion', it.item -> 'posicion')) as asp
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
                   'densidad', o.cab -> 'densidad', 'letra', o.cab -> 'letra', 'enfasis', o.cab -> 'enfasis', 'tono', o.cab -> 'tono',
                   'posicion', o.cab -> 'posicion'))
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
  v_cab := v_diseno -> 'cabecera';
  if jsonb_typeof(v_cab -> 'tono') = 'string' then
    v_claves := v_claves || (v_cab ->> 'tono');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('clave', t.clave,
                                               'claro', jsonb_build_object('fondo', t.claro_fondo, 'borde', t.claro_borde, 'tinta', t.claro_tinta),
                                               'oscuro', jsonb_build_object('fondo', t.oscuro_fondo, 'borde', t.oscuro_borde, 'tinta', t.oscuro_tinta)) order by t.clave), '[]'::jsonb)
    into v_tonos from public.tonos t where t.clave = any (v_claves);

  v_tarjeta := jsonb_build_object('nodo', v_diseno -> 'tarjeta_total' ->> 'nodo',
                                  'etiqueta', v_nodos -> (v_diseno -> 'tarjeta_total' ->> 'nodo') ->> 'etiqueta',
                                  'formato', coalesce(v_nodos -> (v_diseno -> 'tarjeta_total' ->> 'nodo') ->> 'formato', 'usd'),
                                  'secundarios', coalesce((select jsonb_agg(jsonb_build_object('nodo', x.s, 'etiqueta', v_nodos -> x.s ->> 'etiqueta',
                                                                                              'formato', coalesce(v_nodos -> x.s ->> 'formato', 'usd'))
                                                                            || public._hoja_decimales(v_nodos -> x.s) order by x.o)
                                                             from jsonb_array_elements_text(coalesce(v_diseno -> 'tarjeta_total' -> 'secundarios', '[]'::jsonb)) with ordinality x (s, o)
                                                            where v_ok ? x.s), '[]'::jsonb))
               || public._hoja_decimales(v_nodos -> (v_diseno -> 'tarjeta_total' ->> 'nodo'));

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
    'par', v_par)
    -- La fila del bloque «Avanzado» en la rejilla de las secciones, si el diseño tiene avanzadas.
    || case when v_diseno ? 'avanzado' then jsonb_build_object('avanzado', v_diseno -> 'avanzado') else '{}'::jsonb end;
end
$$;
