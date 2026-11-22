-- Pisar un cálculo al cotizar (glosario: «Pisar un cálculo»; docs/COTIZADOR.md › «Pisar un cálculo»), el espejo del motor de TS. La entrada de
-- `evaluar_formula()` suma `pisables`: los ids que la hoja dibuja en una celda. Un `tabla`, `tramo` o `calculo` de esa lista que no es el total acepta
-- override aunque no sea `sobrescribible`; un `porcentaje_de` de la lista cuyo pct es una constante o un input que sólo él nombra se vuelve par
-- (`_motor_pcts_exclusivos()`); y la salida suma `calculados`: lo que daría cada cálculo pisado con celda (y el pct de su par pisado) sin lo escrito,
-- sólo si hay alguno. Sin `pisables`, todo da lo de siempre. Sin tablas, columnas, permisos ni datos que migrar.

-- La forma de la entrada suma `pisables` (como `esquemaEntrada`: opcional, después de `overrides`).
create or replace function public._motor_forma_entrada(p_e jsonb) returns text
language plpgsql
stable
set search_path = ''
as $_$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  c_campo constant text := '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$';
  -- Donde JS lee un número como Infinity (y Zod lo rechaza): 2^1024 − 2^970, con el empate hacia Infinity.
  c_infinito constant numeric := power(2::numeric, 1024) - power(2::numeric, 970);
  v jsonb;
begin
  if jsonb_typeof(p_e) is distinct from 'object' then return ''; end if;

  v := p_e -> 'inputs';
  if jsonb_typeof(v) is distinct from 'object' then return 'inputs'; end if;
  if exists (select 1 from jsonb_each(v) e
              where (e.key ~ c_id and case jsonb_typeof(e.value) when 'number' then abs(e.value::numeric) < c_infinito else false end) is not true) then
    return 'inputs';
  end if;

  v := p_e -> 'banderas';
  if jsonb_typeof(v) is distinct from 'object' then return 'banderas'; end if;
  if exists (select 1 from jsonb_each(v) e where (e.key ~ c_id and jsonb_typeof(e.value) = 'boolean') is not true) then
    return 'banderas';
  end if;

  -- Mayores que 0 como los lee JS: un decimal por debajo de 2^-1075 es 0.
  v := p_e -> 'tipos_cambio';
  if jsonb_typeof(v) is distinct from 'object' then return 'tipos_cambio'; end if;
  if exists (select 1 from jsonb_each(v) e
              where (e.key ~ c_id and case jsonb_typeof(e.value)
                       when 'number' then case when abs(e.value::numeric) < c_infinito then public._motor_numero(e.value) > 0 else false end
                       else false end) is not true) then
    return 'tipos_cambio';
  end if;

  v := p_e -> 'vehiculo';
  if jsonb_typeof(v) is distinct from 'object' then return 'vehiculo'; end if;
  if exists (select 1 from jsonb_each(v) e
              where (char_length(e.key) <= 80 and e.key ~ c_campo
                     and case jsonb_typeof(e.value) when 'null' then true
                                                    when 'string' then char_length(e.value #>> '{}') <= 200
                                                    when 'number' then abs(e.value::numeric) < c_infinito
                                                    else false end) is not true) then
    return 'vehiculo';
  end if;

  -- Las tablas vivas: {clave: [fila]}, y una fila es {columna: número | texto de hasta 200 | null}.
  v := p_e -> 'tablas';
  if jsonb_typeof(v) is distinct from 'object' then return 'tablas'; end if;
  if exists (select 1 from jsonb_each(v) t where (t.key ~ c_id and jsonb_typeof(t.value) = 'array') is not true) then
    return 'tablas';
  end if;
  if exists (select 1 from jsonb_each(v) t cross join lateral jsonb_array_elements(t.value) f(fila)
              where jsonb_typeof(f.fila) is distinct from 'object') then
    return 'tablas';
  end if;
  if exists (select 1 from jsonb_each(v) t cross join lateral jsonb_array_elements(t.value) f(fila)
                    cross join lateral jsonb_each(f.fila) c
              where (c.key ~ c_id
                     and case jsonb_typeof(c.value) when 'null' then true
                                                    when 'string' then char_length(c.value #>> '{}') <= 200
                                                    when 'number' then abs(c.value::numeric) < c_infinito
                                                    else false end) is not true) then
    return 'tablas';
  end if;

  if p_e ? 'variante' and (jsonb_typeof(p_e -> 'variante') = 'string' and (p_e ->> 'variante') ~ c_id) is not true then
    return 'variante';
  end if;

  v := p_e -> 'overrides';
  if jsonb_typeof(v) is distinct from 'object' then return 'overrides'; end if;
  if exists (select 1 from jsonb_each(v) e
              where (e.key ~ c_id and case jsonb_typeof(e.value) when 'number' then abs(e.value::numeric) < c_infinito else false end) is not true) then
    return 'overrides';
  end if;

  -- Los cálculos con celda en la hoja: un arreglo de ids.
  if p_e ? 'pisables' and (jsonb_typeof(p_e -> 'pisables') = 'array'
                           and not exists (select 1 from jsonb_array_elements(p_e -> 'pisables') x
                                            where (jsonb_typeof(x) = 'string' and (x #>> '{}') ~ c_id) is not true)) is not true then
    return 'pisables';
  end if;

  if (p_e - array['inputs', 'banderas', 'tipos_cambio', 'vehiculo', 'tablas', 'variante', 'overrides', 'pisables']) <> '{}'::jsonb then return ''; end if;
  return null;
end;
$_$;

revoke all on function public._motor_forma_entrada(jsonb) from public, anon;
grant execute on function public._motor_forma_entrada(jsonb) to authenticated, service_role;

-- Las constantes y los inputs que nombra un solo nodo, con cualquier papel (como `referenciasDe()`: de, pct, sobre, prueba, condicion, requerido_si,
-- sugerido_de y los valores del match). Un `porcentaje_de` con celda cuyo pct está acá es par (`pctsExclusivos()` de entities/motor-pares.ts). Con
-- un id repetido manda el último nodo, como el índice del motor. Lo llama `evaluar_formula()`, que corre como quien la llama.
create function public._motor_pcts_exclusivos(p_nodos jsonb) returns text[]
language sql
stable
set search_path = ''
as $$
  with n as (
    select x.value as v, x.pos from jsonb_array_elements(p_nodos) with ordinality as x(value, pos)
  ), tipos as (
    select distinct on (n.v ->> 'id') n.v ->> 'id' as id, n.v ->> 'tipo' as tipo from n order by n.v ->> 'id', n.pos desc
  ), exclusivos as (
    -- Un solo lector: el primero y el último que lo nombran son el mismo nodo.
    select r.id
      from n
     cross join lateral (
       select e.id from jsonb_array_elements_text(case when jsonb_typeof(n.v -> 'de') = 'array' then n.v -> 'de' else '[]'::jsonb end) as e(id)
       union all
       select e.id from unnest(array[n.v ->> 'pct', n.v ->> 'sobre', n.v ->> 'prueba', n.v ->> 'condicion', n.v ->> 'requerido_si',
                                     n.v ->> 'sugerido_de']) as e(id)
       union all
       select e.value from jsonb_each_text(case when jsonb_typeof(n.v -> 'match') = 'object' then n.v -> 'match' else '{}'::jsonb end) as e
     ) as r(id)
     where r.id is not null
     group by r.id
    having min(n.pos) = max(n.pos)
  )
  select coalesce(array_agg(t.id order by t.id collate "C"), '{}'::text[])
    from tipos t
    join exclusivos x on x.id = t.id
   where t.tipo in ('constante', 'input');
$$;

comment on function public._motor_pcts_exclusivos(jsonb) is
  'Interna: las constantes y los inputs que nombra un solo nodo de la lista (un pct exclusivo de su par). Espejo de pctsExclusivos() (entities/motor-pares.ts). docs/COTIZADOR.md › «Pisar un cálculo».';

revoke all on function public._motor_pcts_exclusivos(jsonb) from public, anon;
grant execute on function public._motor_pcts_exclusivos(jsonb) to authenticated, service_role;

-- El motor: `pisables`, el par por la hoja y `calculados` (espejo de motor-sobrescribir.ts, motor-estados.ts, motor-pares.ts y motor-nodos.ts).
create or replace function public.evaluar_formula(p_def jsonb, p_params jsonb, p_entrada jsonb, p_modo jsonb default null) returns jsonb
language plpgsql
stable
set search_path = ''
set extra_float_digits = '3'
as $$
declare
  v_hint text;
  -- La fórmula y la entrada, desarmadas una vez.
  v_nodos jsonb;
  v_n int;
  v_grupos jsonb;
  v_ng int;
  v_constantes jsonb;
  v_congeladas jsonb;
  v_vivas jsonb;
  v_inputs jsonb;
  v_banderas jsonb;
  v_tc jsonb;
  v_veh jsonb;
  v_ov jsonb;
  v_pis text[] := '{}'::text[];       -- los ids con celda en la hoja (`pisables`)
  v_pares text[] := '{}'::text[];     -- los `porcentaje_de` que la hoja vuelve par (motor-pares.ts)
  v_ids text[];
  v_tipos text[];
  v_pos jsonb;                -- id → posición (1..n); con un id repetido, la última, como el `nodos.set` de TS
  v_opc int;                  -- el nodo `opcion`
  v_segunda text;
  v_total int;                -- el nodo `salida: total`
  v_variante text;
  -- El cambio que se usa (cambioDe).
  v_cb jsonb;
  v_total_en text;
  v_cod text;
  v_rep_id text[] := '{}';
  v_rep_bucket text[] := '{}';
  -- El estado de cada nodo y de cada grupo.
  v_estado text[];
  v_enc boolean[];
  v_pisado boolean[];
  v_pct_celda boolean[];      -- el pct pisado de un par con celda: su calculado hace falta para el del par
  v_calc_pct float8[];        -- lo que daría ese pct sin el pisado
  v_calc jsonb := '{}'::jsonb;       -- `calculados`: id → lo que daría sin lo escrito
  v_lugar jsonb;              -- id de grupo → su lugar (1..g)
  v_grupo_ids text[];
  v_dib boolean[];
  v_sub float8[];             -- el USD de cada grupo mientras se suma
  v_sub_set boolean[];
  v_g_usd float8[];
  v_g_bs float8[];
  -- Lo ya evaluado, en el orden de la lista.
  v_val float8[];
  v_hecho boolean[];          -- está en `valores` (el `opcion` también)
  v_leible boolean[];         -- está en `valores` y es un número (no la variante)
  v_fuente text[];
  v_falt text[] := '{}';      -- 'codigo|donde|ref', en el orden en que nacen
  v_desc text[] := '{}';      -- 'id|motivo'
  -- Por nodo.
  v_nodo jsonb;
  v_id text;
  v_tipo text;
  v_op text;
  v_est text;
  v_x float8;
  v_y float8;
  v_z float8;
  v_xov float8;
  v_t float8;
  v_tiene_ov boolean;
  v_acepta boolean;
  v_con_celda boolean;
  v_aparte boolean;           -- con override aplicado sobre un cálculo con celda: se calcula aparte, sin dejar rastro
  v_falt_n int;
  v_fuente_antes text;
  v_x_antes float8;
  v_resuelto boolean;
  v_leer_de boolean;
  v_de jsonb;
  v_base float8;
  v_nulo boolean;
  v_sug text;
  v_req text;
  v_tabla text;
  v_columna text;
  v_campo text;
  v_filas jsonb;
  v_cols text[];
  v_kinds text[];
  v_nums float8[];
  v_txts text[];
  v_col text;
  v_falta text;
  v_f jsonb;
  v_celda jsonb;
  v_hay boolean;
  v_todos boolean;
  v_alguno boolean;
  v_sobre float8;
  v_bs float8;
  v_suma_usd float8;
  v_usd float8;
  v_tcv float8;
  v_b text;
  v_k text;
  v_r text;
  v_s text;
  r text;
  g int;
  j int;
  jp int;
begin
  -- §0 la forma de lo que llega: la entrada y el modo, como los Zod de TS.
  v_hint := public._motor_forma_entrada(p_entrada);
  if v_hint is not null then
    perform public._motor_fallar('entrada_invalida', nullif(v_hint, ''),
      case when v_hint = '' then 'La entrada no tiene la forma esperada.' else format('La entrada no tiene la forma esperada en «%s».', v_hint) end);
  end if;
  if p_modo is not null then
    v_hint := public._motor_forma_modo(p_modo);
    if v_hint is not null then
      perform public._motor_fallar('modo_invalido', nullif(v_hint, ''),
        case when v_hint = '' then 'El modo no tiene la forma esperada.' else format('El modo no tiene la forma esperada en «%s».', v_hint) end);
    end if;
  end if;
  if jsonb_typeof(p_def -> 'nodos') is distinct from 'array' then
    perform public._motor_sin_validar(null, 'la definición no tiene la lista de nodos');
  end if;

  -- Los argumentos, una sola vez.
  v_nodos := p_def -> 'nodos';
  v_n := jsonb_array_length(v_nodos);
  v_grupos := coalesce(p_def -> 'grupos', '[]'::jsonb);
  v_ng := jsonb_array_length(v_grupos);
  v_constantes := coalesce(p_params, '{}'::jsonb) - 'tablas';
  v_congeladas := coalesce(p_params -> 'tablas', '{}'::jsonb);
  v_vivas := p_entrada -> 'tablas';
  v_inputs := p_entrada -> 'inputs';
  v_banderas := p_entrada -> 'banderas';
  v_tc := p_entrada -> 'tipos_cambio';
  v_veh := p_entrada -> 'vehiculo';
  v_ov := p_entrada -> 'overrides';
  v_pis := array(select jsonb_array_elements_text(coalesce(p_entrada -> 'pisables', '[]'::jsonb)));
  if cardinality(v_pis) > 0 then
    -- paresDeLaHoja: un `porcentaje_de` con celda, no `sobrescribible` y que no es el total, cuyo pct es exclusivo (primero, los exclusivos).
    v_pares := public._motor_pcts_exclusivos(v_nodos);
    v_pares := array(select x.value ->> 'id'
                       from jsonb_array_elements(v_nodos) x
                      where x.value ->> 'tipo' = 'calculo' and x.value ->> 'op' = 'porcentaje_de'
                        and (x.value -> 'sobrescribible') is distinct from 'true'::jsonb
                        and (x.value ->> 'salida') is distinct from 'total'
                        and (x.value ->> 'id') = any (v_pis)
                        and (x.value ->> 'pct') = any (v_pares));
  end if;

  -- prepararEvaluacion: el índice de nodos, a lo sumo un `opcion` y exactamente un total (el primero con `salida: total`).
  select coalesce(array_agg(x.value ->> 'id' order by x.pos), '{}'::text[]),
         coalesce(array_agg(x.value ->> 'tipo' order by x.pos), '{}'::text[]),
         coalesce(jsonb_object_agg(x.value ->> 'id', x.pos order by x.pos), '{}'::jsonb),
         min(x.pos) filter (where x.value ->> 'tipo' = 'opcion'),
         (array_agg(x.value ->> 'id' order by x.pos) filter (where x.value ->> 'tipo' = 'opcion'))[2],
         min(x.pos) filter (where x.value ->> 'salida' = 'total')
    into v_ids, v_tipos, v_pos, v_opc, v_segunda, v_total
    from jsonb_array_elements(v_nodos) with ordinality as x(value, pos);
  if v_segunda is not null then
    perform public._motor_sin_validar(v_segunda, 'tiene dos variantes');
  end if;
  if v_total is null then
    perform public._motor_sin_validar(null, 'no tiene un nodo con salida «total»');
  end if;

  -- revisarEntrada: lo tipeado sólo nombra inputs, y las banderas sólo banderas.
  for v_k in select jsonb_object_keys(v_inputs) loop
    if v_tipos[(v_pos ->> v_k)::int] is distinct from 'input' then
      perform public._motor_fallar('entrada_invalida', v_k, format('La entrada nombra «%s», que no es un input de la fórmula.', v_k));
    end if;
  end loop;
  for v_k in select jsonb_object_keys(v_banderas) loop
    if v_tipos[(v_pos ->> v_k)::int] is distinct from 'bandera' then
      perform public._motor_fallar('entrada_invalida', v_k, format('La entrada nombra «%s», que no es un bandera de la fórmula.', v_k));
    end if;
  end loop;

  -- P6 resolverVariante: la de la entrada o, sin clave, la `por_defecto`; elegir otra cosa es un error de llamada.
  if v_opc is null then
    if p_entrada ? 'variante' then
      perform public._motor_fallar('entrada_invalida', null,
        format('La entrada elige la variante «%s», y la fórmula no tiene variante.', p_entrada ->> 'variante'));
    end if;
  else
    v_nodo := v_nodos -> (v_opc - 1);
    v_variante := coalesce(p_entrada ->> 'variante', v_nodo ->> 'por_defecto');
    if v_variante is null then
      perform public._motor_fallar('entrada_invalida', v_ids[v_opc],
        format('La variante «%s» no tiene opción por defecto, y la entrada no elige una.', v_ids[v_opc]));
    end if;
    if not exists (select 1 from jsonb_array_elements(v_nodo -> 'opciones') o where o ->> 'clave' = v_variante) then
      perform public._motor_fallar('entrada_invalida', v_ids[v_opc],
        format('«%s» no es una opción de la variante «%s».', v_variante, v_ids[v_opc]));
    end if;
  end if;

  -- P6 decidirEstados: una pasada previa y lineal. Primero la variante, después la condición (la bandera de otra variante está
  -- apagada); de paso, los grupos que se dibujan y el pct de cada par cuyo monto trae override.
  select coalesce(jsonb_object_agg(u.id, u.lugar), '{}'::jsonb), coalesce(array_agg(u.id order by u.lugar), '{}'::text[])
    into v_lugar, v_grupo_ids
    from (select f.id, row_number() over (order by f.primera) as lugar
            from (select x.value ->> 'id' as id, min(x.pos) as primera
                    from jsonb_array_elements(v_grupos) with ordinality as x(value, pos)
                   group by x.value ->> 'id') f) u;
  v_estado := array_fill(null::text, array[v_n]);
  v_enc := array_fill(false, array[v_n]);
  v_pisado := array_fill(false, array[v_n]);
  v_pct_celda := array_fill(false, array[v_n]);
  v_calc_pct := array_fill(null::float8, array[v_n]);
  v_dib := array_fill(false, array[v_ng]);
  for i in 1 .. v_n loop
    v_nodo := v_nodos -> (i - 1);
    v_tipo := v_tipos[i];
    v_est := 'activo';
    if v_tipo not in ('tipo_cambio', 'opcion') and v_nodo ? 'solo_en' then
      if v_variante is null then
        perform public._motor_sin_validar(v_ids[i], 'un nodo dice en qué variantes vale y no hay variante');
      end if;
      if not (v_nodo -> 'solo_en') ? v_variante then
        /*P6a*/ v_est := 'fuera_de_variante';
      end if;
    end if;
    if v_est = 'activo' and v_tipo in ('input', 'constante', 'tabla', 'tramo', 'calculo') and v_nodo ? 'condicion' then
      if v_enc[(v_pos ->> (v_nodo ->> 'condicion'))::int] is not true then
        /*P6b*/ v_est := 'condicion_apagada';
      end if;
    end if;
    v_estado[i] := v_est;
    if v_tipo = 'bandera' and v_est = 'activo' and (v_banderas -> v_ids[i]) = 'true'::jsonb then
      v_enc[i] := true;
    end if;
    if v_nodo ? 'grupo' and v_est <> 'fuera_de_variante' then
      g := (v_lugar ->> (v_nodo ->> 'grupo'))::int;
      if g is not null then /*P6c*/ v_dib[g] := true; end if;
    end if;
    -- Es par el `sobrescribible` o el que la hoja vuelve par; si el par tiene celda, su pct pisado se calcula aparte.
    if v_est = 'activo' and v_tipo = 'calculo' and v_nodo ->> 'op' = 'porcentaje_de'
       and ((v_nodo -> 'sobrescribible') = 'true'::jsonb or v_ids[i] = any (v_pares)) and v_ov ? v_ids[i] then
      j := (v_pos ->> (v_nodo ->> 'pct'))::int;
      if v_estado[j] = 'activo' then
        /*P6d*/ v_pisado[j] := true;
        v_pct_celda[j] := v_pct_celda[j] or ((v_nodo ->> 'salida') is distinct from 'total' and v_ids[i] = any (v_pis));
      end if;
    end if;
  end loop;

  -- cambioDe: el modo, si llega, reemplaza `buckets` y `total_en` completos. Tiene que nombrar tipos de cambio de la fórmula y
  -- cubrir cada bucket que se usa. Sin modo, un fallo es de la fórmula.
  if p_modo is null then
    v_cb := coalesce(p_def -> 'buckets', '{}'::jsonb);
    v_total_en := p_def ->> 'total_en';
    v_cod := 'formula_sin_validar';
  else
    v_cb := p_modo -> 'buckets';
    v_total_en := p_modo ->> 'total_en';
    v_cod := 'modo_invalido';
  end if;
  for v_b, v_r in select b.key, b.value #>> '{}' from jsonb_each(v_cb) b loop
    if v_tipos[(v_pos ->> v_r)::int] is distinct from 'tipo_cambio' then
      perform public._motor_fallar(v_cod, 'buckets.' || v_b,
        format('%s nombra «%s», que no es un tipo de cambio de la fórmula.', 'buckets.' || v_b, v_r));
    end if;
  end loop;
  if v_total_en is not null and v_tipos[(v_pos ->> v_total_en)::int] is distinct from 'tipo_cambio' then
    perform public._motor_fallar(v_cod, 'total_en', format('%s nombra «%s», que no es un tipo de cambio de la fórmula.', 'total_en', v_total_en));
  end if;
  v_nodo := v_nodos -> (v_total - 1);
  if v_ng = 0 then
    -- Sin grupos, el total se reparte: tiene bucket o es una suma de nodos que lo tienen (`ninguno` es «sin bucket»).
    v_b := v_nodo ->> 'bucket';
    if v_b is not null and v_b <> 'ninguno' then
      v_rep_id := array[v_ids[v_total]];
      v_rep_bucket := array[v_b];
    else
      if v_tipos[v_total] <> 'calculo' or v_nodo ->> 'op' <> 'suma' then
        perform public._motor_sin_validar(v_ids[v_total], 'sin grupos, el total no tiene bucket ni es una suma');
      end if;
      v_de := v_nodo -> 'de';
      for k in 0 .. jsonb_array_length(v_de) - 1 loop
        r := v_de ->> k;
        j := (v_pos ->> r)::int;
        v_b := case when j is not null then v_nodos -> (j - 1) ->> 'bucket' end;
        if v_b is null or v_b = 'ninguno' then
          perform public._motor_sin_validar(v_ids[v_total], format('sin grupos, «%s» suma al total sin bucket', r));
        end if;
        v_rep_id := array_append(v_rep_id, r);
        v_rep_bucket := array_append(v_rep_bucket, v_b);
      end loop;
    end if;
    for k in 1 .. cardinality(v_rep_bucket) loop
      if not v_cb ? v_rep_bucket[k] then
        perform public._motor_fallar(v_cod, v_rep_bucket[k], format('no dice qué tipo de cambio usa el bucket «%s»', v_rep_bucket[k]));
      end if;
    end loop;
  else
    for g in 1 .. v_ng loop
      v_b := v_grupos -> (g - 1) ->> 'bucket';
      if not v_cb ? v_b then
        perform public._motor_fallar(v_cod, v_b, format('no dice qué tipo de cambio usa el bucket «%s»', v_b));
      end if;
    end loop;
  end if;

  -- La pasada: un nodo por vez, en el orden de la lista, sólo mirando hacia atrás.
  v_val := array_fill(null::float8, array[v_n]);
  v_hecho := array_fill(false, array[v_n]);
  v_leible := array_fill(false, array[v_n]);
  v_fuente := array_fill(null::text, array[v_n]);
  v_sub := array_fill(null::float8, array[v_ng]);
  v_sub_set := array_fill(false, array[v_ng]);
  for i in 1 .. v_n loop
    v_nodo := v_nodos -> (i - 1);
    v_id := v_ids[i];
    v_tipo := v_tipos[i];
    v_tiene_ov := v_ov ? v_id;
    if v_tipo = 'opcion' then
      -- La variante vale su clave, no se sobrescribe, no tiene fuente y no suma a ningún grupo.
      if v_tiene_ov then v_desc := array_append(v_desc, v_id || '|no_sobrescribible'); end if;
      v_hecho[i] := true;
      continue;
    end if;
    v_est := v_estado[i];
    v_op := case when v_tipo = 'calculo' then v_nodo ->> 'op' end;
    v_x := null;
    v_resuelto := false;
    v_leer_de := false;
    v_aparte := false;
    v_xov := null;
    if v_est <> 'activo' then
      -- P7: un nodo inactivo vale 0 sin leer nada, y su override se descarta con su estado.
      v_x := 0;
      v_resuelto := true;
      if v_tiene_ov then v_desc := array_append(v_desc, v_id || '|' || v_est); end if;
    else
      -- P8 sobrescrito: el override antes del cálculo, por tipo. P10: la fuente, sólo de los activos que aceptan un valor.
      v_acepta := v_tipo in ('input', 'constante', 'tipo_cambio')
                  or (v_tipo in ('tabla', 'tramo', 'calculo') and coalesce((v_nodo -> 'sobrescribible') = 'true'::jsonb, false));
      -- Un cálculo con celda en la hoja (que no es el total) acepta override aunque no sea `sobrescribible`.
      v_con_celda := v_tipo in ('tabla', 'tramo', 'calculo') and (v_nodo ->> 'salida') is distinct from 'total' and v_id = any (v_pis);
      if v_pisado[i] then
        -- El pct de un par cuyo monto manda no se calcula: vale null hasta que llega el par. Si el par tiene celda, lo que daría va aparte.
        /*P8a*/ v_fuente[i] := 'override';
        v_x := null;
        v_resuelto := true;
        v_aparte := v_pct_celda[i];
      elsif v_tipo = 'input' or not (v_acepta or v_con_celda) then
        if v_tiene_ov then v_desc := array_append(v_desc, v_id || '|no_sobrescribible'); end if;
      else
        -- Un cálculo que se pisa sólo por su celda no lleva fuente sin override: no gana el punto de «sugerido».
        if v_tiene_ov then /*P10*/ v_fuente[i] := 'override';
        elsif v_acepta then v_fuente[i] := case when v_tipo in ('constante', 'tipo_cambio') then 'default' else 'sugerido' end;
        end if;
        if v_tiene_ov then
          v_xov := public._motor_numero(v_ov -> v_id);
          v_resuelto := true;
          v_aparte := v_con_celda;
          if v_op = 'porcentaje_de' then
            -- Si manda el monto y el pct está pisado, el par lo reescribe más abajo (monto ÷ base).
            v_leer_de := v_pisado[(v_pos ->> (v_nodo ->> 'pct'))::int] is true;
          end if;
          if v_tipo = 'tipo_cambio' and not (v_xov > 0) then
            -- Un tipo de cambio de la persona pasa la misma revisión que el de la empresa.
            v_falt := array_append(v_falt, 'tipo_de_cambio_sin_valor|' || v_id || '|' || (v_nodo ->> 'clave'));
          else
            v_x := v_xov;
          end if;
        end if;
      end if;
    end if;

    -- P1 sumar: ((d0 + d1) + d2)… en el orden de `de`; se leen todos los términos aunque uno sea null. Lo piden `suma`,
    -- `porcentaje_de` y el par cuyo monto manda (que lee su base sólo si su pct está pisado).
    if v_leer_de or ((not v_resuelto or v_aparte) and v_op in ('suma', 'porcentaje_de')) then
      v_de := v_nodo -> 'de';
      v_base := 0;
      v_nulo := false;
      for k in 0 .. jsonb_array_length(v_de) - 1 loop
        r := v_de ->> k;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_t := v_val[j];
        if v_t is null then v_nulo := true;
        else /*P1*/ v_base := public._motor_mas(v_base, v_t); end if;
      end loop;
    end if;

    -- calcularAparte: con un override aplicado sobre un cálculo con celda (o en el pct pisado de un par con celda), lo que daría sin él. Se
    -- reponen los faltantes, la fuente y el valor; el par lee su pct con lo que daría sin el pisado. No cambia valores, fuentes ni faltantes.
    if v_aparte then
      v_falt_n := cardinality(v_falt);
      v_fuente_antes := v_fuente[i];
      v_x_antes := v_x;
      v_x := null;
      if v_leer_de then
        jp := (v_pos ->> (v_nodo ->> 'pct'))::int;
        v_val[jp] := v_calc_pct[jp];
      end if;
    end if;

    if not v_resuelto or v_aparte then
      -- valorCalculado: el default, lo tipeado o el sugerido.
      if v_tipo = 'input' then
        v_sug := v_nodo ->> 'sugerido_de';
        v_req := v_nodo ->> 'requerido_si';
        if v_inputs ? v_id then
          -- «Tipeado» es que la clave está, aunque valga 0: había un sugerido si el nodo lo nombra, y ↺ vuelve a él.
          v_fuente[i] := case when v_sug is null then 'input' else 'override' end;
          v_x := public._motor_numero(v_inputs -> v_id);
        else
          v_nulo := false;
          if v_req is not null then
            j := (v_pos ->> v_req)::int;
            if v_leible[j] is not true then perform public._motor_sin_leer(v_id, v_req); end if;
            v_nulo := v_val[j] = 1;
          end if;
          v_fuente[i] := case when v_sug is null or v_nulo then 'input' else 'sugerido' end;
          if v_nulo then
            -- «Requerido» es que la persona lo escriba: un sugerido no lo cumple.
            v_falt := array_append(v_falt, 'requerido_sin_valor|' || v_id || '|' || v_req);
          elsif v_sug is null then
            v_x := 0;
          else
            j := (v_pos ->> v_sug)::int;
            if v_leible[j] is not true then perform public._motor_sin_leer(v_id, v_sug); end if;
            v_x := v_val[j];
          end if;
        end if;

      elsif v_tipo = 'constante' then
        v_f := v_constantes -> v_id;
        if v_f is null then
          perform public._motor_sin_validar(v_id, format('la constante «%s» no tiene valor en params', v_id));
        end if;
        v_x := public._motor_numero(v_f);

      elsif v_tipo = 'tipo_cambio' then
        -- Un tipo de cambio que no llega, o que no es mayor que 0, no tiene valor.
        v_campo := v_nodo ->> 'clave';
        v_f := v_tc -> v_campo;
        if v_f is not null then v_t := public._motor_numero(v_f); end if;
        if v_f is not null and v_t > 0 then
          v_x := v_t;
        else
          v_falt := array_append(v_falt, 'tipo_de_cambio_sin_valor|' || v_id || '|' || v_campo);
        end if;

      elsif v_tipo = 'campo_vehiculo' then
        v_campo := v_nodo ->> 'campo';
        v_f := v_veh -> v_campo;
        if jsonb_typeof(v_f) = 'number' then
          v_x := public._motor_numero(v_f);
        else
          v_falt := array_append(v_falt, 'campo_sin_valor|' || v_id || '|' || v_campo);
        end if;

      elsif v_tipo = 'bandera' then
        v_x := case when (v_banderas -> v_id) = 'true'::jsonb then 1 else 0 end;

      elsif v_tipo = 'tabla' then
        -- Cada nodo anota a lo sumo un faltante, el primero: tabla sin filas, campo sin valor, fila sin coincidencia, celda sin
        -- valor. P3: gana la PRIMERA fila (en el orden de la tabla) cuyo `match` coincide; la congelada manda, aunque esté vacía.
        v_tabla := v_nodo ->> 'tabla';
        v_columna := v_nodo ->> 'columna';
        v_filas := v_congeladas -> v_tabla;
        if v_filas is null then v_filas := v_vivas -> v_tabla; end if;
        if v_filas is null or jsonb_array_length(v_filas) = 0 then
          v_falt := array_append(v_falt, 'tabla_sin_filas|' || v_id || '|' || v_tabla);
        else
          v_cols := '{}'; v_kinds := '{}'; v_nums := '{}'; v_txts := '{}';
          v_nulo := false;
          v_falta := null;
          for v_col, v_r in select m.key, m.value #>> '{}' from jsonb_each(v_nodo -> 'match') m loop
            j := (v_pos ->> v_r)::int;
            if j is not null then
              -- Un nodo anterior (la variante, su clave; un null no coincide con nada).
              if v_hecho[j] is not true then perform public._motor_sin_leer(v_id, v_r); end if;
              if v_tipos[j] = 'opcion' then
                v_cols := array_append(v_cols, v_col); v_kinds := array_append(v_kinds, 's');
                v_nums := array_append(v_nums, null::float8); v_txts := array_append(v_txts, v_variante);
              elsif v_val[j] is null then
                v_nulo := true;
              else
                v_cols := array_append(v_cols, v_col); v_kinds := array_append(v_kinds, 'n');
                v_nums := array_append(v_nums, v_val[j]); v_txts := array_append(v_txts, null::text);
              end if;
            else
              -- Un campo del vehículo. Si faltan varios, el faltante nombra el menor en orden de código: no depende del orden de
              -- las claves, que jsonb no guarda.
              v_f := v_veh -> v_r;
              if v_f is null or jsonb_typeof(v_f) = 'null' then
                v_nulo := true;
                /*P4*/ if v_falta is null or (v_r collate "C") < (v_falta collate "C") then v_falta := v_r; end if;
              elsif jsonb_typeof(v_f) = 'number' then
                v_cols := array_append(v_cols, v_col); v_kinds := array_append(v_kinds, 'n');
                v_nums := array_append(v_nums, public._motor_numero(v_f)); v_txts := array_append(v_txts, null::text);
              else
                v_cols := array_append(v_cols, v_col); v_kinds := array_append(v_kinds, 's');
                v_nums := array_append(v_nums, null::float8); v_txts := array_append(v_txts, v_f #>> '{}');
              end if;
            end if;
          end loop;
          if v_falta is not null then
            v_falt := array_append(v_falt, 'campo_sin_valor|' || v_id || '|' || v_falta);
          end if;
          if not v_nulo then
            -- La igualdad es estricta y sin conversión: un número con un número (como dobles), un texto con un texto.
            v_hay := null;
            select true, f.fila -> v_columna into v_hay, v_celda
              from jsonb_array_elements(v_filas) with ordinality as f(fila, orden)
             where not exists (
                     select 1 from unnest(v_cols, v_kinds, v_nums, v_txts) as m(col, kind, num, txt)
                      where case when m.kind = 'n'
                                 then case when jsonb_typeof(f.fila -> m.col) = 'number' then public._motor_numero(f.fila -> m.col) <> m.num else true end
                                 else case when jsonb_typeof(f.fila -> m.col) = 'string' then (f.fila ->> m.col) <> m.txt else true end
                            end)
             order by f.orden
             limit 1;
            if v_hay is not true then
              v_falt := array_append(v_falt, 'fila_sin_coincidencia|' || v_id || '|' || v_tabla);
            elsif jsonb_typeof(v_celda) = 'number' then
              v_x := public._motor_numero(v_celda);
            else
              v_falt := array_append(v_falt, 'celda_sin_valor|' || v_id || '|' || v_tabla);
            end if;
          end if;
        end if;

      elsif v_tipo = 'tramo' or v_op = 'depreciar' then
        -- La primera fila con desde ≤ sobre ≤ hasta, los dos extremos incluidos. Una fila sin `desde` o sin `hasta` numérico no
        -- coincide nunca. `depreciar` es d0 × el tramo de esa tabla, y lo busca aunque d0 sea null.
        v_tabla := v_nodo ->> 'tabla';
        v_columna := v_nodo ->> 'columna';
        r := v_nodo ->> 'sobre';
        j := (v_pos ->> r)::int;
        if v_op = 'depreciar' then
          v_s := (v_nodo -> 'de') ->> 0;
          jp := (v_pos ->> v_s)::int;
          if v_leible[jp] is not true then perform public._motor_sin_leer(v_id, v_s); end if;
        end if;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_sobre := v_val[j];
        v_t := null;
        v_filas := v_congeladas -> v_tabla;
        if v_filas is null then v_filas := v_vivas -> v_tabla; end if;
        if v_filas is null or jsonb_array_length(v_filas) = 0 then
          v_falt := array_append(v_falt, 'tabla_sin_filas|' || v_id || '|' || v_tabla);
        elsif v_sobre is not null then
          v_hay := null;
          select true, f.fila -> v_columna into v_hay, v_celda
            from jsonb_array_elements(v_filas) with ordinality as f(fila, orden)
           where jsonb_typeof(f.fila -> 'desde') = 'number' and jsonb_typeof(f.fila -> 'hasta') = 'number'
             and public._motor_numero(f.fila -> 'desde') <= v_sobre and v_sobre <= public._motor_numero(f.fila -> 'hasta')
           order by f.orden
           limit 1;
          if v_hay is not true then
            v_falt := array_append(v_falt, 'fila_sin_coincidencia|' || v_id || '|' || v_tabla);
          elsif jsonb_typeof(v_celda) = 'number' then
            v_t := public._motor_numero(v_celda);
          else
            v_falt := array_append(v_falt, 'celda_sin_valor|' || v_id || '|' || v_tabla);
          end if;
        end if;
        if v_op = 'depreciar' then
          v_x := case when v_val[jp] is null or v_t is null then null else public._motor_por(v_val[jp], v_t) end;
        else
          v_x := v_t;
        end if;

      elsif v_op = 'suma' then
        v_x := case when v_nulo then null else v_base end;

      elsif v_op = 'porcentaje_de' then
        r := v_nodo ->> 'pct';
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_t := v_val[j];
        v_x := case when v_nulo or v_t is null then null else public._motor_por(v_base, v_t) end;

      elsif v_op in ('multiplicar', 'restar') then
        -- ((d0 × d1) × d2)… y ((d0 − d1) − d2)…, nunca d0 − (d1 + d2): en dobles no es lo mismo. Se leen todos los términos.
        v_de := v_nodo -> 'de';
        v_base := case v_op when 'multiplicar' then 1 else 0 end;
        v_nulo := false;
        for k in 0 .. jsonb_array_length(v_de) - 1 loop
          r := v_de ->> k;
          j := (v_pos ->> r)::int;
          if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
          v_t := v_val[j];
          if v_t is null then v_nulo := true;
          elsif v_op = 'multiplicar' then v_base := public._motor_por(v_base, v_t);
          elsif k = 0 then v_base := v_t;
          else v_base := public._motor_menos(v_base, v_t); end if;
        end loop;
        v_x := case when v_nulo then null else v_base end;

      elsif v_op = 'dividir' then
        v_de := v_nodo -> 'de';
        r := v_de ->> 0;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_y := v_val[j];
        r := v_de ->> 1;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_z := v_val[j];
        if v_y is null or v_z is null then
          v_x := null;
        elsif v_z = 0 then
          v_falt := array_append(v_falt, 'division_por_cero|' || v_id || '|');
        else
          v_x := public._motor_entre(v_y, v_z);
        end if;

      elsif v_op = 'si' or v_op = 'redondear' then
        -- La condición apagada ya la resolvió el estado: acá llega encendida.
        r := (v_nodo -> 'de') ->> 0;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_t := v_val[j];
        if v_op = 'si' then v_x := v_t;
        elsif v_t is not null then v_x := public._motor_redondear(v_t, ((v_nodo -> 'n')::numeric)::int); end if;

      elsif v_op = 'comparar' then
        -- 1 o 0; un operando null da null. La igualdad es exacta, como `===` de JS entre dobles.
        v_de := v_nodo -> 'de';
        r := v_de ->> 0;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_y := v_val[j];
        r := v_de ->> 1;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_z := v_val[j];
        if v_y is not null and v_z is not null then
          v_hay := case v_nodo ->> 'cmp'
                     when '>' then v_y > v_z when '<' then v_y < v_z when '>=' then v_y >= v_z
                     when '<=' then v_y <= v_z when '=' then v_y = v_z else v_y <> v_z end;
          v_x := case when v_hay then 1 else 0 end;
        end if;

      elsif v_op = 'es_opcion' then
        -- La variante vale su clave (un texto): se compara como texto, sin conversión.
        r := (v_nodo -> 'de') ->> 0;
        j := (v_pos ->> r)::int;
        if v_hecho[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        if v_tipos[j] <> 'opcion' then
          perform public._motor_sin_validar(v_id, format('«%s» compara «%s», que no es la variante', v_id, r));
        end if;
        v_hay := (v_variante = (v_nodo ->> 'clave')) = ((v_nodo ->> 'cmp') = '=');
        v_x := case when v_hay then 1 else 0 end;

      elsif v_op in ('y', 'o') then
        -- Se leen todos los términos; null si alguno lo es. `y`: todos distintos de 0; `o`: alguno distinto de 0.
        v_de := v_nodo -> 'de';
        v_nulo := false;
        v_todos := true;
        v_alguno := false;
        for k in 0 .. jsonb_array_length(v_de) - 1 loop
          r := v_de ->> k;
          j := (v_pos ->> r)::int;
          if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
          v_t := v_val[j];
          if v_t is null then v_nulo := true;
          elsif v_t = 0 then v_todos := false;
          else v_alguno := true; end if;
        end loop;
        v_hay := (v_op = 'y' and v_todos) or (v_op = 'o' and v_alguno);
        v_x := case when v_nulo then null when v_hay then 1 else 0 end;

      elsif v_op = 'elegir' then
        -- Se leen la prueba y las dos ramas (la que falta vale 0); vale la rama que elige la prueba, y sólo su null pasa.
        r := v_nodo ->> 'prueba';
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_t := v_val[j];
        v_de := v_nodo -> 'de';
        r := v_de ->> 0;
        j := (v_pos ->> r)::int;
        if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
        v_y := v_val[j];
        v_z := 0;
        if jsonb_array_length(v_de) > 1 then
          r := v_de ->> 1;
          j := (v_pos ->> r)::int;
          if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
          v_z := v_val[j];
        end if;
        v_x := case when v_t is null then null when v_t <> 0 then v_y else v_z end;

      elsif v_op in ('max', 'min') then
        -- De izquierda a derecha: el primero y cada término que lo supera estrictamente; null si alguno lo es. Nunca `greatest` ni
        -- `least`: ignoran los null.
        v_de := v_nodo -> 'de';
        v_nulo := false;
        v_base := null;
        for k in 0 .. jsonb_array_length(v_de) - 1 loop
          r := v_de ->> k;
          j := (v_pos ->> r)::int;
          if v_leible[j] is not true then perform public._motor_sin_leer(v_id, r); end if;
          v_t := v_val[j];
          if v_t is null then v_nulo := true;
          elsif v_base is null or (v_op = 'max' and v_t > v_base) or (v_op = 'min' and v_t < v_base) then v_base := v_t; end if;
        end loop;
        v_x := case when v_nulo then null else v_base end;
      end if;
    end if;

    if v_aparte then
      if v_x is not null and not (abs(v_x) < 'Infinity'::float8) then v_x := null; end if;
      v_x := case when v_x = 0 then 0::float8 else v_x end;
      if v_pisado[i] then v_calc_pct[i] := v_x; end if;
      v_calc := v_calc || jsonb_build_object(v_id, coalesce(to_jsonb(v_x), 'null'::jsonb));
      v_falt := v_falt[1:v_falt_n];
      v_fuente[i] := v_fuente_antes;
      v_x := v_x_antes;
      if v_leer_de then v_val[jp] := null; end if;
    end if;

    -- El par: si manda el monto, el pct vale monto ÷ base (null si la base es 0, con su faltante en el pct, o si es null).
    if v_leer_de then
      jp := (v_pos ->> (v_nodo ->> 'pct'))::int;
      v_y := null;
      if not v_nulo then
        if v_base = 0 then
          /*P8b*/ v_falt := array_append(v_falt, 'division_por_cero|' || v_ids[jp] || '|');
        else
          v_y := public._motor_entre(v_xov, v_base);
        end if;
      end if;
      if v_y is not null and not (abs(v_y) < 'Infinity'::float8) then
        v_falt := array_append(v_falt, 'fuera_de_rango|' || v_ids[jp] || '|');
        v_y := null;
      end if;
      v_val[jp] := case when v_y = 0 then 0::float8 else v_y end;
      v_hecho[jp] := true;
      v_leible[jp] := true;
    end if;

    -- asentar: lo que no es finito queda null con `fuera_de_rango`, y −0 vale 0 (JSON y jsonb no lo distinguen).
    if v_x is not null and not (abs(v_x) < 'Infinity'::float8) then
      v_falt := array_append(v_falt, 'fuera_de_rango|' || v_id || '|');
      v_x := null;
    end if;
    /*P5*/ v_val[i] := case when v_x = 0 then 0::float8 else v_x end;
    v_hecho[i] := true;
    v_leible[i] := true;
    -- acumular: el USD de un grupo es la suma de sus miembros en el orden de la lista; un miembro null lo deja null.
    if v_nodo ? 'grupo' then
      g := (v_lugar ->> (v_nodo ->> 'grupo'))::int;
      if g is not null then
        if not v_sub_set[g] then
          v_sub[g] := v_val[i];
          v_sub_set[g] := true;
        elsif v_sub[g] is not null and v_val[i] is not null then
          /*P1b*/ v_sub[g] := public._motor_mas(v_sub[g], v_val[i]);
        else
          v_sub[g] := null;
        end if;
      end if;
    end if;
  end loop;

  -- P9 descartarInexistentes: al final, los overrides de ids que no son nodos, ordenados por id (bytes, como `collate "C"`).
  for v_k in select o.id from (select jsonb_object_keys(v_ov) as id) o where not v_pos ? o.id order by o.id collate "C" loop
    v_desc := array_append(v_desc, v_k || '|nodo_inexistente');
  end loop;

  -- totalesDe.
  if v_leible[v_total] is not true then perform public._motor_sin_leer(v_ids[v_total], v_ids[v_total]); end if;
  v_suma_usd := v_val[v_total];
  v_g_usd := array_fill(null::float8, array[v_ng]);
  v_g_bs := array_fill(null::float8, array[v_ng]);
  v_bs := 0;
  if v_ng > 0 then
    for g in 1 .. v_ng loop
      -- P11: el USD de un grupo es null si lo es un miembro; uno sin miembros vale 0.
      v_y := case when v_sub_set[g] then v_sub[g] else 0 end;
      if v_y is not null and not (abs(v_y) < 'Infinity'::float8) then
        v_falt := array_append(v_falt, 'fuera_de_rango|' || v_grupo_ids[g] || '|');
        v_y := null;
      end if;
      v_g_usd[g] := case when v_y = 0 then 0::float8 else v_y end;
      -- P7: un grupo que no se dibuja vale 0 y no lee su tipo de cambio.
      if v_dib[g] then
        v_t := v_val[(v_pos ->> (v_cb ->> (v_grupos -> (g - 1) ->> 'bucket')))::int];
        v_z := case when v_y is null or v_t is null then null else public._motor_por(v_y, v_t) end;
        if v_z is not null and not (abs(v_z) < 'Infinity'::float8) then
          v_falt := array_append(v_falt, 'fuera_de_rango|' || v_grupo_ids[g] || '|');
          v_z := null;
        end if;
      else
        v_z := 0;
      end if;
      v_g_bs[g] := case when v_z = 0 then 0::float8 else v_z end;
      v_bs := case when v_bs is null or v_z is null then null else public._motor_mas(v_bs, v_z) end;
    end loop;
  else
    -- Sin grupos: Bs = Σ término × tc(su bucket), en el orden de `total.de` (o el total por el tc de su bucket).
    for k in 1 .. cardinality(v_rep_id) loop
      j := (v_pos ->> v_rep_id[k])::int;
      -- Un término fuera de la variante aporta 0 sin leer su tipo de cambio; uno apagado aporta 0 × tc. No hay un `leer` que pueda
      -- fallar acá: el total ya se leyó arriba, y los demás términos son los `de` del total, que su suma ya leyó.
      continue when v_estado[j] = 'fuera_de_variante';
      v_t := v_val[j];
      v_tcv := v_val[(v_pos ->> (v_cb ->> v_rep_bucket[k]))::int];
      v_z := case when v_t is null or v_tcv is null then null else public._motor_por(v_t, v_tcv) end;
      v_bs := case when v_bs is null or v_z is null then null else public._motor_mas(v_bs, v_z) end;
    end loop;
  end if;
  if v_bs is not null and not (abs(v_bs) < 'Infinity'::float8) then
    v_falt := array_append(v_falt, 'fuera_de_rango|total|');
    v_bs := null;
  end if;
  v_bs := case when v_bs = 0 then 0::float8 else v_bs end;
  -- El «TOTAL DÓLARES»: Bs ÷ tc(`total_en`). Sin `total_en` (y sin modo), la suma de los dólares.
  if v_total_en is null then
    v_usd := v_suma_usd;
  else
    v_tcv := v_val[(v_pos ->> v_total_en)::int];
    if v_bs is null or v_tcv is null then
      v_usd := null;
    else
      v_usd := public._motor_entre(v_bs, v_tcv);
      if not (abs(v_usd) < 'Infinity'::float8) then
        v_falt := array_append(v_falt, 'fuera_de_rango|total|');
        v_usd := null;
      end if;
      v_usd := case when v_usd = 0 then 0::float8 else v_usd end;
    end if;
  end if;

  return jsonb_build_object(
    'valores', (select coalesce(jsonb_object_agg(u.id, case when u.tipo = 'opcion' then to_jsonb(v_variante) else coalesce(to_jsonb(u.val), 'null'::jsonb) end), '{}'::jsonb)
                  from unnest(v_ids, v_tipos, v_val) as u(id, tipo, val)),
    'estados', (select coalesce(jsonb_object_agg(u.id, coalesce(u.estado, 'activo')), '{}'::jsonb)
                  from unnest(v_ids, v_estado) as u(id, estado)),
    'fuentes', (select coalesce(jsonb_object_agg(u.id, u.fuente), '{}'::jsonb)
                  from unnest(v_ids, v_fuente) as u(id, fuente) where u.fuente is not null),
    'totales', jsonb_build_object(
      'grupos', (select coalesce(jsonb_object_agg(u.id, jsonb_build_object('usd', coalesce(to_jsonb(u.usd), 'null'::jsonb),
                                                                           'bs', coalesce(to_jsonb(u.bs), 'null'::jsonb),
                                                                           'se_dibuja', u.dib)), '{}'::jsonb)
                   from unnest(v_grupo_ids, v_g_usd, v_g_bs, v_dib) as u(id, usd, bs, dib)),
      'bs', coalesce(to_jsonb(v_bs), 'null'::jsonb),
      'usd', coalesce(to_jsonb(v_usd), 'null'::jsonb),
      'suma_usd', coalesce(to_jsonb(v_suma_usd), 'null'::jsonb)),
    'faltantes', (select coalesce(jsonb_agg(case when split_part(f.dato, '|', 3) = ''
                                                 then jsonb_build_object('codigo', split_part(f.dato, '|', 1), 'donde', split_part(f.dato, '|', 2))
                                                 else jsonb_build_object('codigo', split_part(f.dato, '|', 1), 'donde', split_part(f.dato, '|', 2),
                                                                         'ref', split_part(f.dato, '|', 3)) end
                                                 order by f.orden), '[]'::jsonb)
                    from unnest(v_falt) with ordinality as f(dato, orden)),
    'overrides_descartados', (select coalesce(jsonb_agg(jsonb_build_object('id', split_part(d.dato, '|', 1), 'motivo', split_part(d.dato, '|', 2))
                                                        order by d.orden), '[]'::jsonb)
                                from unnest(v_desc) with ordinality as d(dato, orden)))
    -- Lo calculado de los pisados con celda, sólo si hay alguno: sin él la salida es la de siempre.
    || case when v_calc = '{}'::jsonb then '{}'::jsonb else jsonb_build_object('calculados', v_calc) end;
end;
$$;

comment on function public.evaluar_formula(jsonb, jsonb, jsonb, jsonb) is
  'El motor del cotizador, espejo de evaluar() de TS: valores, estados, fuentes, totales, faltantes, overrides descartados y, si se pisó un cálculo con celda (pisables), calculados. Pura: recibe las tablas vivas en la entrada. docs/COTIZADOR.md › «El motor» y «Pisar un cálculo».';

revoke all on function public.evaluar_formula(jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.evaluar_formula(jsonb, jsonb, jsonb, jsonb) to authenticated, service_role;
