-- Los «Decimales» de una celda en las etiquetas de una página de revisiones (`_revision_etiquetas()`): junto a `calculos` (los cálculos que la página nombra,
-- con su formato) va `decimales`, sólo con los de esos cálculos que los traen; sin ninguno, la clave no viaja y lo demás es lo de siempre. No depende de otro
-- archivo (`SOLO=areas/cotizaciones/decimales-en-la-revision.sql`).

-- @test revisiones: los decimales de los cálculos pisados viajan con las etiquetas, sólo los que la versión tiene
do $$
declare
  v_def jsonb := '{"nodos": [{"id": "a", "tipo": "calculo", "op": "suma", "de": ["c"], "etiqueta": "A", "decimales": 0},
                             {"id": "b", "tipo": "tabla", "tabla": "t", "match": {}, "columna": "m", "etiqueta": "B", "formato": "pct"},
                             {"id": "c", "tipo": "input", "etiqueta": "C", "decimales": 2},
                             {"id": "d", "tipo": "calculo", "op": "suma", "de": ["c"], "etiqueta": "D", "decimales": 3}]}';
  v_filas jsonb := '[{"diff": {"valores": {"de": {"a": 1, "b": 0.1, "c": 3}, "a": {"a": 2, "b": 0.2, "c": 4}}}}]';
  r jsonb; r0 jsonb;
begin
  r := public._revision_etiquetas(v_def, v_filas);
  -- `d` no está en la página y `c` no es un cálculo: ninguno de los dos viaja.
  if r -> 'decimales' is distinct from '{"a": 0}'::jsonb then raise exception 'los decimales: %', r; end if;
  if r -> 'calculos' is distinct from '{"a": "usd", "b": "pct"}'::jsonb then raise exception 'los cálculos: %', r; end if;
  -- Sin decimales en la versión, la clave no está y lo demás es igual.
  r0 := public._revision_etiquetas(jsonb_set(v_def, '{nodos}', (select jsonb_agg(n - 'decimales' order by i) from jsonb_array_elements(v_def -> 'nodos') with ordinality t (n, i))), v_filas);
  if r0 ? 'decimales' or r0 is distinct from r - 'decimales' then raise exception 'sin decimales: % contra %', r0, r; end if;
end $$;
