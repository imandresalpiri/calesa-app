-- Los «Decimales» de una celda en `_formula_forma_nodo()` (el Zod de `nodos.ts`: `decimales: z.int().min(0).max(4).optional()`): un entero de 0 a 4 o
-- ninguna clave. Un texto, un nulo o un booleano es F74; un subnormal, F75; 5 o más (en valor absoluto), F76; un decimal o un negativo, F77. Cada caso
-- devuelve el campo del primer defecto, como la ruta del primer issue de Zod; null si la forma está bien. Los decimales sólo cambian cómo se muestra
-- la celda: que el cálculo no cambia lo prueba `evaluar-formula.sql`.

-- @test fórmula: la forma de los decimales de una celda
do $$
declare
  v_caso record;
  v_visto text;
  v_malos text[] := '{}';
begin
  for v_caso in
    select c.nombre, c.resto, c.esperado
      from (values
        ('sin decimales', '{}'::jsonb, null::text),
        ('0 decimales', '{"decimales": 0}', null),
        ('1 decimal', '{"decimales": 1}', null),
        ('2 decimales', '{"decimales": 2}', null),
        ('3 decimales', '{"decimales": 3}', null),
        ('4 decimales', '{"decimales": 4}', null),
        ('2.0 es un entero, como para Zod', '{"decimales": 2.0}', null),
        ('5 decimales', '{"decimales": 5}', '.decimales'),
        ('mil millones de decimales', '{"decimales": 1e9}', '.decimales'),
        ('-1 decimales', '{"decimales": -1}', '.decimales'),
        ('2,5 decimales', '{"decimales": 2.5}', '.decimales'),
        ('un subnormal', '{"decimales": 1e-310}', '.decimales'),
        ('un texto', '{"decimales": "2"}', '.decimales'),
        ('un nulo', '{"decimales": null}', '.decimales'),
        ('un booleano', '{"decimales": true}', '.decimales'),
        ('una lista', '{"decimales": [2]}', '.decimales')
      ) as c(nombre, resto, esperado)
  loop
    v_visto := public._formula_forma_nodo('{"id": "n", "tipo": "input", "etiqueta": "N", "formato": "usd"}'::jsonb || v_caso.resto);
    if v_visto is distinct from v_caso.esperado then
      v_malos := array_append(v_malos, format('%s: %s en vez de %s', v_caso.nombre, coalesce(v_visto, 'null'), coalesce(v_caso.esperado, 'null')));
    end if;
  end loop;
  if cardinality(v_malos) > 0 then raise exception E'la forma no es la de nodos.ts:\n  %', array_to_string(v_malos, E'\n  '); end if;
end $$;

-- @test fórmula: los decimales valen en cada tipo de nodo y van después de la forma de antes (un formato malo se nombra primero)
do $$
declare
  v_caso record;
  v_visto text;
  v_malos text[] := '{}';
begin
  for v_caso in
    select c.nombre, c.nodo, c.esperado
      from (values
        ('una constante', '{"id": "n", "tipo": "constante", "etiqueta": "N", "decimales": 0}'::jsonb, null::text),
        ('un cálculo', '{"id": "n", "tipo": "calculo", "op": "suma", "de": ["a"], "etiqueta": "N", "formato": "pct", "decimales": 1}', null),
        ('un tipo de cambio', '{"id": "n", "tipo": "tipo_cambio", "clave": "oficial", "etiqueta": "N", "formato": "raw", "decimales": 4}', null),
        ('un formato malo y decimales malos', '{"id": "n", "tipo": "input", "etiqueta": "N", "formato": "eur", "decimales": 9}', '.formato'),
        ('una etiqueta mala y decimales malos', '{"id": "n", "tipo": "input", "etiqueta": "", "decimales": 9}', '.etiqueta')
      ) as c(nombre, nodo, esperado)
  loop
    v_visto := public._formula_forma_nodo(v_caso.nodo);
    if v_visto is distinct from v_caso.esperado then
      v_malos := array_append(v_malos, format('%s: %s en vez de %s', v_caso.nombre, coalesce(v_visto, 'null'), coalesce(v_caso.esperado, 'null')));
    end if;
  end loop;
  if cardinality(v_malos) > 0 then raise exception E'la forma no es la de nodos.ts:\n  %', array_to_string(v_malos, E'\n  '); end if;
end $$;

-- @test fórmula: validar_formula rechaza unos decimales malos con 22023, la ruta en el mensaje y el nodo en el hint; con decimales buenos o sin ellos, acepta
do $$
declare
  v_def jsonb := '{"nodos": [{"id": "tc", "tipo": "tipo_cambio", "clave": "oficial", "etiqueta": "TC", "formato": "raw"},
                             {"id": "a", "tipo": "input", "etiqueta": "A", "formato": "usd", "bucket": "origen"},
                             {"id": "total", "tipo": "calculo", "op": "suma", "de": ["a"], "etiqueta": "Total", "salida": "total", "formato": "usd"}],
                   "buckets": {"origen": "tc"}}';
  v_estado text; v_detalle text; v_mensaje text; v_donde text;
begin
  perform public.validar_formula(v_def, '{}');
  perform public.validar_formula(jsonb_set(v_def, '{nodos,2,decimales}', '0'), '{}');
  perform public.validar_formula(jsonb_set(jsonb_set(v_def, '{nodos,0,decimales}', '4'), '{nodos,2,decimales}', '2'), '{}');
  begin
    perform public.validar_formula(jsonb_set(v_def, '{nodos,2,decimales}', '5'), '{}');
    raise exception 'se aceptaron 5 decimales';
  exception when invalid_parameter_value then
    get stacked diagnostics v_estado = returned_sqlstate, v_detalle = pg_exception_detail, v_mensaje = message_text, v_donde = pg_exception_hint;
  end;
  if v_estado is distinct from '22023' or v_detalle is distinct from 'forma'
     or v_mensaje is distinct from 'La fórmula no tiene la forma esperada en «definicion.nodos.2.decimales».' or v_donde is distinct from 'total' then
    raise exception 'el rechazo es % %, «%» y el donde «%»', v_estado, v_detalle, v_mensaje, v_donde;
  end if;
end $$;
