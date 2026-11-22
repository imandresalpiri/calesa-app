-- El texto con datos de la tarjeta (glosario: «Texto con datos»): una celda `{tipo: 'texto', partes}` que mezcla texto literal y datos. Cambian la forma
-- (`_plantilla_cuadricula_forma()`, con la nueva `_plantilla_cuadricula_partes()`) y el aplanado de lo que la cuadrícula nombra
-- (`_plantilla_cuadricula_datos()`), que suma cada dato de las partes: así las reglas de nodos y variables y la lectura de `cotizacion_tarjeta()` los ven sin
-- cambiar. Sin tablas, columnas, permisos ni datos que migrar: las plantillas guardadas siguen valiendo.

-- La forma de las partes de un texto con datos, en orden: un arreglo de 1 a 20; por parte, un texto no vacío, sin `{{` y nunca pegado a otro texto, o un dato
-- (`_plantilla_cuadricula_dato()`); al final, al menos un dato y hasta 300 caracteres (code points) sumando los textos.
create function public._plantilla_cuadricula_partes(p_partes jsonb, p_donde text)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_n int; v_parte jsonb; v_dk text; v_largo int := 0; v_datos int := 0; v_anterior_es_texto boolean := false;
begin
  -- Espejo de `MAXIMO_DE_PARTES_DE_UN_TEXTO` y `MAXIMO_DE_CARACTERES_DE_UN_TEXTO` (`entities/cuadricula-de-la-tarjeta.ts`).
  if jsonb_typeof(p_partes) is distinct from 'array' then perform public._plantilla_cuadricula_rechazar('forma', p_donde); end if;
  v_n := jsonb_array_length(p_partes);
  if v_n not between 1 and 20 then perform public._plantilla_cuadricula_rechazar('forma', p_donde); end if;
  for k in 0 .. v_n - 1 loop
    v_parte := p_partes -> k;
    v_dk := format('%s[%s]', p_donde, k);
    if jsonb_typeof(v_parte) = 'string' then
      if v_parte #>> '{}' = '' or strpos(v_parte #>> '{}', '{{') > 0 or v_anterior_es_texto then
        perform public._plantilla_cuadricula_rechazar('forma', v_dk);
      end if;
      v_largo := v_largo + char_length(v_parte #>> '{}');
      v_anterior_es_texto := true;
    else
      perform public._plantilla_cuadricula_dato(v_parte, v_dk);
      v_datos := v_datos + 1;
      v_anterior_es_texto := false;
    end if;
  end loop;
  if v_datos = 0 or v_largo > 300 then perform public._plantilla_cuadricula_rechazar('forma', p_donde); end if;
end;
$$;

comment on function public._plantilla_cuadricula_partes(jsonb, text) is
  'Interna: la forma de las partes de un texto con datos de la cuadrícula de la tarjeta, espejo de revisarPartes() en entities/plantilla/texto-con-datos-de-cuadricula.ts. docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';

revoke all on function public._plantilla_cuadricula_partes(jsonb, text) from public, anon;
grant execute on function public._plantilla_cuadricula_partes(jsonb, text) to authenticated, service_role;

-- La forma 2: la rama `texto` admite `partes` en lugar de `texto`.
create or replace function public._plantilla_cuadricula_forma(p_plantilla jsonb, p_con_tope boolean) returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_cols jsonb; v_filas jsonb; v_celdas jsonb; v_c jsonb; v_x jsonb; v_e jsonb; v_b jsonb;
  v_k text; v_t text; v_d text; v_dc text; v_dr text; v_lado text; v_r jsonb;
  v_icol jsonb; v_ifila jsonb; v_ncols int; v_ocupadas boolean[]; v_f0 int; v_c0 int; v_n int; v_ok boolean;
begin
  if jsonb_typeof(p_plantilla) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', 'definicion'); end if;
  if p_con_tope and octet_length(p_plantilla::text) > 24576 then perform public._plantilla_cuadricula_rechazar('forma', 'definicion'); end if;
  select k into v_k from jsonb_object_keys(p_plantilla) k where k not in ('forma', 'columnas', 'filas', 'celdas') order by k collate "C" limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('forma', v_k); end if;
  if jsonb_typeof(p_plantilla -> 'forma') is distinct from 'number' then perform public._plantilla_cuadricula_rechazar('forma', 'forma'); end if;
  if (p_plantilla ->> 'forma')::numeric <> 2 then perform public._plantilla_cuadricula_rechazar('forma', 'forma'); end if;

  -- Las columnas: al menos una, cada una {id, ancho} con el ancho entero de 24 a 640.
  v_cols := p_plantilla -> 'columnas';
  if jsonb_typeof(v_cols) is distinct from 'array' then perform public._plantilla_cuadricula_rechazar('forma', 'columnas'); end if;
  if jsonb_array_length(v_cols) = 0 then perform public._plantilla_cuadricula_rechazar('forma', 'columnas'); end if;
  for i in 0 .. jsonb_array_length(v_cols) - 1 loop
    v_c := v_cols -> i;
    v_d := format('columnas[%s]', i);
    if jsonb_typeof(v_c) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
    if exists (select 1 from jsonb_object_keys(v_c) k where k not in ('id', 'ancho')) then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
    if not public._plantilla_es_id(v_c -> 'id') then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.id'); end if;
    if not public._plantilla_entero_entre(v_c -> 'ancho', 24, 640) then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.ancho'); end if;
  end loop;

  -- Las filas: al menos una, cada una {id, alto, ocultar_si, nodo?, si?}; el nodo va con `no_aplica` y `no_aplica_o_cero`, y con `nunca` o `condiciones` no va (aunque sea
  -- nulo: mira `?`); el `si` (de 1 a 3 condiciones) va sólo con `condiciones`.
  v_filas := p_plantilla -> 'filas';
  if jsonb_typeof(v_filas) is distinct from 'array' then perform public._plantilla_cuadricula_rechazar('forma', 'filas'); end if;
  if jsonb_array_length(v_filas) = 0 then perform public._plantilla_cuadricula_rechazar('forma', 'filas'); end if;
  for i in 0 .. jsonb_array_length(v_filas) - 1 loop
    v_c := v_filas -> i;
    v_d := format('filas[%s]', i);
    if jsonb_typeof(v_c) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
    if exists (select 1 from jsonb_object_keys(v_c) k where k not in ('id', 'alto', 'ocultar_si', 'nodo', 'si')) then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
    if not public._plantilla_es_id(v_c -> 'id') then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.id'); end if;
    if not public._plantilla_entero_entre(v_c -> 'alto', 16, 240) then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.alto'); end if;
    v_t := case when jsonb_typeof(v_c -> 'ocultar_si') = 'string' then v_c ->> 'ocultar_si' end;
    if v_t is null or v_t not in ('nunca', 'no_aplica', 'no_aplica_o_cero', 'condiciones') then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.ocultar_si'); end if;
    if v_t = 'condiciones' then
      if v_c ? 'nodo' then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.nodo'); end if;
      perform public._plantilla_cuadricula_condiciones(v_c -> 'si', v_d || '.si');
    else
      if v_t = 'nunca' then
        if v_c ? 'nodo' then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.nodo'); end if;
      elsif not public._plantilla_es_id(v_c -> 'nodo') then
        perform public._plantilla_cuadricula_rechazar('forma', v_d || '.nodo');
      end if;
      if v_c ? 'si' then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.si'); end if;
    end if;
  end loop;

  -- Las celdas (puede no haber): por celda la clave de más, `id`, `fila`, `columna`, las combinaciones, el contenido según su tipo y el estilo.
  v_celdas := p_plantilla -> 'celdas';
  if jsonb_typeof(v_celdas) is distinct from 'array' then perform public._plantilla_cuadricula_rechazar('forma', 'celdas'); end if;
  for i in 0 .. jsonb_array_length(v_celdas) - 1 loop
    v_c := v_celdas -> i;
    v_d := format('celdas[%s]', i);
    if jsonb_typeof(v_c) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_d); end if;
    if exists (select 1 from jsonb_object_keys(v_c) k where k not in ('id', 'fila', 'columna', 'abarca_columnas', 'abarca_filas', 'contenido', 'estilo')) then
      perform public._plantilla_cuadricula_rechazar('forma', v_d);
    end if;
    foreach v_k in array array['id', 'fila', 'columna'] loop
      if not public._plantilla_es_id(v_c -> v_k) then perform public._plantilla_cuadricula_rechazar('forma', v_d || '.' || v_k); end if;
    end loop;
    if v_c ? 'abarca_columnas' and not public._plantilla_entero_entre(v_c -> 'abarca_columnas', 1, 16) then
      perform public._plantilla_cuadricula_rechazar('forma', v_d || '.abarca_columnas');
    end if;
    if v_c ? 'abarca_filas' and not public._plantilla_entero_entre(v_c -> 'abarca_filas', 1, 120) then
      perform public._plantilla_cuadricula_rechazar('forma', v_d || '.abarca_filas');
    end if;

    -- El contenido: texto (0 a 300 caracteres, sin `{{`), texto con datos (`partes`: textos y datos, `_plantilla_cuadricula_partes()`), dato (una variable o
    -- un nodo con qué mostrar), la lista de respaldo (hasta 5 datos), las condiciones (de 1 a 4 ramas {si, contenido} y el «si no»), logo, foto del asesor o vacío.
    v_x := v_c -> 'contenido';
    v_dc := v_d || '.contenido';
    if jsonb_typeof(v_x) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
    v_t := case when jsonb_typeof(v_x -> 'tipo') = 'string' then v_x ->> 'tipo' end;
    if v_t is null or v_t not in ('texto', 'dato', 'respaldo', 'condiciones', 'logo', 'vacio', 'foto_del_asesor') then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.tipo'); end if;
    if v_t = 'texto' and v_x ? 'partes' then
      -- `texto` y `partes` son excluyentes: con los dos, `texto` es una clave de más.
      if exists (select 1 from jsonb_object_keys(v_x) k where k not in ('tipo', 'partes')) then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
      perform public._plantilla_cuadricula_partes(v_x -> 'partes', v_dc || '.partes');
    elsif v_t = 'texto' then
      if exists (select 1 from jsonb_object_keys(v_x) k where k not in ('tipo', 'texto')) then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
      if jsonb_typeof(v_x -> 'texto') is distinct from 'string' then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.texto'); end if;
      if char_length(v_x ->> 'texto') > 300 or strpos(v_x ->> 'texto', '{{') > 0 then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.texto'); end if;
    elsif v_t = 'dato' then
      perform public._plantilla_cuadricula_dato(v_x, v_dc);
    elsif v_t = 'respaldo' then
      if exists (select 1 from jsonb_object_keys(v_x) k where k not in ('tipo', 'datos')) then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
      if jsonb_typeof(v_x -> 'datos') is distinct from 'array' then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.datos'); end if;
      if jsonb_array_length(v_x -> 'datos') > 5 then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.datos'); end if;
      for j in 0 .. jsonb_array_length(v_x -> 'datos') - 1 loop
        perform public._plantilla_cuadricula_dato(v_x -> 'datos' -> j, format('%s.datos[%s]', v_dc, j));
      end loop;
    elsif v_t = 'condiciones' then
      if exists (select 1 from jsonb_object_keys(v_x) k where k not in ('tipo', 'ramas', 'si_no')) then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
      if jsonb_typeof(v_x -> 'ramas') is distinct from 'array' then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.ramas'); end if;
      if jsonb_array_length(v_x -> 'ramas') not between 1 and 4 then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.ramas'); end if;
      for j in 0 .. jsonb_array_length(v_x -> 'ramas') - 1 loop
        v_r := v_x -> 'ramas' -> j;
        v_dr := format('%s.ramas[%s]', v_dc, j);
        if jsonb_typeof(v_r) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_dr); end if;
        if exists (select 1 from jsonb_object_keys(v_r) k where k not in ('si', 'contenido')) then perform public._plantilla_cuadricula_rechazar('forma', v_dr); end if;
        perform public._plantilla_cuadricula_condiciones(v_r -> 'si', v_dr || '.si');
        perform public._plantilla_cuadricula_simple(v_r -> 'contenido', v_dr || '.contenido');
      end loop;
      perform public._plantilla_cuadricula_simple(v_x -> 'si_no', v_dc || '.si_no');
    elsif exists (select 1 from jsonb_object_keys(v_x) k where k <> 'tipo') then
      perform public._plantilla_cuadricula_rechazar('forma', v_dc);
    end if;

    -- El estilo: cada clave opcional; una presente, aunque sea nula, tiene que valer.
    continue when not v_c ? 'estilo';
    v_e := v_c -> 'estilo';
    v_dc := v_d || '.estilo';
    if jsonb_typeof(v_e) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_dc); end if;
    if exists (select 1 from jsonb_object_keys(v_e) k where k not in ('fondo', 'texto', 'negrita', 'cursiva', 'tamano', 'alinear', 'alinear_vertical', 'bordes')) then
      perform public._plantilla_cuadricula_rechazar('forma', v_dc);
    end if;
    if v_e ? 'fondo' and not public._plantilla_es_id(v_e -> 'fondo') then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.fondo'); end if;
    if v_e ? 'texto' and not public._plantilla_es_id(v_e -> 'texto') then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.texto'); end if;
    if v_e ? 'negrita' and jsonb_typeof(v_e -> 'negrita') is distinct from 'boolean' then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.negrita'); end if;
    if v_e ? 'cursiva' and jsonb_typeof(v_e -> 'cursiva') is distinct from 'boolean' then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.cursiva'); end if;
    -- El `case` va en una variable: un `if` de plpgsql termina en el primer `then`.
    v_ok := case when jsonb_typeof(v_e -> 'tamano') = 'number' then (v_e ->> 'tamano')::numeric in (10, 11, 12, 14, 16, 18, 22, 28) else false end;
    if v_e ? 'tamano' and not v_ok then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.tamano'); end if;
    if v_e ? 'alinear' and coalesce(jsonb_typeof(v_e -> 'alinear') <> 'string' or (v_e ->> 'alinear') not in ('izquierda', 'centro', 'derecha'), true) then
      perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.alinear');
    end if;
    if v_e ? 'alinear_vertical' and coalesce(jsonb_typeof(v_e -> 'alinear_vertical') <> 'string' or (v_e ->> 'alinear_vertical') not in ('arriba', 'centro', 'abajo'), true) then
      perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.alinear_vertical');
    end if;
    continue when not v_e ? 'bordes';
    v_b := v_e -> 'bordes';
    if jsonb_typeof(v_b) is distinct from 'object' then perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.bordes'); end if;
    if exists (select 1 from jsonb_object_keys(v_b) k where k not in ('todos', 'arriba', 'derecha', 'abajo', 'izquierda')) then
      perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.bordes');
    end if;
    foreach v_lado in array array['todos', 'arriba', 'derecha', 'abajo', 'izquierda'] loop
      if v_b ? v_lado and coalesce(jsonb_typeof(v_b -> v_lado) <> 'string' or (v_b ->> v_lado) not in ('ninguno', 'fino', 'grueso'), true) then
        perform public._plantilla_cuadricula_rechazar('forma', v_dc || '.bordes.' || v_lado);
      end if;
    end loop;
  end loop;

  -- Los topes de la grilla.
  if jsonb_array_length(v_cols) > 16 then perform public._plantilla_cuadricula_rechazar('demasiadas_columnas', 'columnas'); end if;
  if jsonb_array_length(v_filas) > 120 then perform public._plantilla_cuadricula_rechazar('demasiadas_filas', 'filas'); end if;
  if jsonb_array_length(v_celdas) > 1000 then perform public._plantilla_cuadricula_rechazar('demasiadas_celdas', 'celdas'); end if;

  -- Los repetidos: la segunda aparición, en el orden del arreglo.
  select x.id into v_k from (select v ->> 'id' as id, o, row_number() over (partition by v ->> 'id' order by o) as n
                               from jsonb_array_elements(v_cols) with ordinality t (v, o)) x where x.n = 2 order by x.o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('columna_repetida', 'columnas.' || v_k); end if;
  select x.id into v_k from (select v ->> 'id' as id, o, row_number() over (partition by v ->> 'id' order by o) as n
                               from jsonb_array_elements(v_filas) with ordinality t (v, o)) x where x.n = 2 order by x.o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('fila_repetida', 'filas.' || v_k); end if;
  select x.id into v_k from (select v ->> 'id' as id, o, row_number() over (partition by v ->> 'id' order by o) as n
                               from jsonb_array_elements(v_celdas) with ordinality t (v, o)) x where x.n = 2 order by x.o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('celda_repetida', 'celdas.' || v_k); end if;

  if (select sum((c ->> 'ancho')::numeric) from jsonb_array_elements(v_cols) c) > 1600 then
    perform public._plantilla_cuadricula_rechazar('ancho_total', 'columnas');
  end if;

  -- Fuera: una fila o columna que no existe, o una combinación que pasa del borde. Los índices van por id (ya únicos).
  v_ncols := jsonb_array_length(v_cols);
  v_icol := (select jsonb_object_agg(v ->> 'id', o - 1) from jsonb_array_elements(v_cols) with ordinality t (v, o));
  v_ifila := (select jsonb_object_agg(v ->> 'id', o - 1) from jsonb_array_elements(v_filas) with ordinality t (v, o));
  select c ->> 'id' into v_k from jsonb_array_elements(v_celdas) with ordinality t (c, o)
   where not v_icol ? (c ->> 'columna') or not v_ifila ? (c ->> 'fila')
      or (v_icol ->> (c ->> 'columna'))::numeric + coalesce((c ->> 'abarca_columnas')::numeric, 1) > v_ncols
      or (v_ifila ->> (c ->> 'fila'))::numeric + coalesce((c ->> 'abarca_filas')::numeric, 1) > jsonb_array_length(v_filas)
   order by o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('celda_fuera_de_la_grilla', 'celdas.' || v_k); end if;

  -- Se pisan: la primera celda, en orden, que ocupa una casilla ya ocupada (a lo sumo 16 × 120 casillas).
  v_ocupadas := array_fill(false, array[greatest(1, v_ncols * jsonb_array_length(v_filas))]);
  for v_c in select c from jsonb_array_elements(v_celdas) with ordinality t (c, o) order by o loop
    v_f0 := (v_ifila ->> (v_c ->> 'fila'))::int;
    v_c0 := (v_icol ->> (v_c ->> 'columna'))::int;
    for f in v_f0 .. v_f0 + coalesce((v_c ->> 'abarca_filas')::numeric::int, 1) - 1 loop
      for k in v_c0 .. v_c0 + coalesce((v_c ->> 'abarca_columnas')::numeric::int, 1) - 1 loop
        v_n := f * v_ncols + k + 1;
        if v_ocupadas[v_n] then perform public._plantilla_cuadricula_rechazar('celdas_se_pisan', 'celdas.' || (v_c ->> 'id')); end if;
        v_ocupadas[v_n] := true;
      end loop;
    end loop;
  end loop;

  -- El primer dato con una variable que no existe, en el orden de `_plantilla_cuadricula_datos()` (las filas, por sus condiciones, antes que las celdas).
  select d.lugar || '.' || d.id into v_k from public._plantilla_cuadricula_datos(p_plantilla) d
   where d.variable is not null
     and d.variable not in ('empresa_nombre', 'fecha_larga', 'numero', 'titulo', 'titulo_opcion', 'asesor_nombre', 'asesor_iniciales', 'cliente_nombre',
                            'vehiculo_titulo', 'vehiculo_lote', 'vehiculo_vin', 'vence_el', 'modo_tc', 'asesor_telefono', 'asesor_cargo')
   order by d.o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('variable_inexistente', v_k); end if;

  -- La primera lista de respaldo con menos de dos datos.
  select c ->> 'id' into v_k from jsonb_array_elements(v_celdas) with ordinality t (c, o)
   where c -> 'contenido' ->> 'tipo' = 'respaldo' and jsonb_array_length(c -> 'contenido' -> 'datos') < 2
   order by o limit 1;
  if v_k is not null then perform public._plantilla_cuadricula_rechazar('respaldo_vacio', 'celdas.' || v_k); end if;
end;
$$;

comment on function public._plantilla_cuadricula_forma(jsonb, boolean) is
  'Interna: la forma 2 de la plantilla de la tarjeta (la cuadrícula, con sus textos con datos) y las reglas de la grilla, espejo de entities/plantilla/forma-de-cuadricula.ts. docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';

revoke all on function public._plantilla_cuadricula_forma(jsonb, boolean) from public, anon;
grant execute on function public._plantilla_cuadricula_forma(jsonb, boolean) to authenticated, service_role;

-- Lo que nombra la cuadrícula suma los datos de un texto con datos.
create or replace function public._plantilla_cuadricula_datos(p_plantilla jsonb) returns table (o bigint, lugar text, id text, variable text, nodo text, mostrar text, es text, opcion text)
language sql
immutable
set search_path = ''
as $$
  with filas as (
    select f.v, f.n from jsonb_array_elements(p_plantilla -> 'filas') with ordinality f (v, n)
  ), celdas as (
    select c.v ->> 'id' as cual, c.v -> 'contenido' as x, 1000000 + c.n * 100 as base
      from jsonb_array_elements(p_plantilla -> 'celdas') with ordinality c (v, n)
  ), ramas as (
    select c.cual, c.base, r.x as rama, r.j
      from celdas c cross join lateral jsonb_array_elements(c.x -> 'ramas') with ordinality r (x, j)
     where c.x ->> 'tipo' = 'condiciones'
  ), piezas (orden, en, cual, dato, cond) as (
    select f.n * 100, 'filas'::text, f.v ->> 'id', f.v, null::jsonb from filas f where f.v ? 'nodo'
    union all
    select f.n * 100 + s.m, 'filas', f.v ->> 'id', null, s.x
      from filas f cross join lateral jsonb_array_elements(f.v -> 'si') with ordinality s (x, m)
     where jsonb_typeof(f.v -> 'si') = 'array'
    union all
    select c.base, 'celdas', c.cual, c.x, null from celdas c where c.x ->> 'tipo' = 'dato'
    union all
    select c.base + d.j, 'celdas', c.cual, d.x, null
      from celdas c cross join lateral jsonb_array_elements(c.x -> 'datos') with ordinality d (x, j)
     where c.x ->> 'tipo' = 'respaldo'
    union all
    -- Los datos de un texto con datos, en su orden (k de 1 a 20: cabe en los 100 de la celda). El `case`, porque `jsonb_array_elements` lanza sobre lo que no
    -- es un arreglo; los textos de las partes no nombran nada.
    select c.base + p.k, 'celdas', c.cual, p.x, null
      from celdas c cross join lateral jsonb_array_elements(
             case when jsonb_typeof(c.x -> 'partes') = 'array' then c.x -> 'partes' else '[]'::jsonb end) with ordinality p (x, k)
     where c.x ->> 'tipo' = 'texto' and jsonb_typeof(p.x) = 'object'
    union all
    select r.base + (r.j - 1) * 4 + s.m, 'celdas', r.cual, null, s.x
      from ramas r cross join lateral jsonb_array_elements(r.rama -> 'si') with ordinality s (x, m)
    union all
    select r.base + r.j * 4, 'celdas', r.cual, r.rama -> 'contenido', null from ramas r where r.rama -> 'contenido' ->> 'tipo' = 'dato'
    union all
    select c.base + 17, 'celdas', c.cual, c.x -> 'si_no', null from celdas c where c.x ->> 'tipo' = 'condiciones' and c.x -> 'si_no' ->> 'tipo' = 'dato'
  )
  select p.orden, p.en, p.cual,
         coalesce(p.cond -> 'dato', p.dato) ->> 'variable',
         coalesce(p.cond -> 'dato', p.cond, p.dato) ->> 'nodo',
         coalesce(p.cond -> 'dato', p.dato) ->> 'mostrar',
         p.cond ->> 'es',
         p.cond ->> 'opcion'
    from piezas p
$$;

comment on function public._plantilla_cuadricula_datos(jsonb) is
  'Interna: todo dato que nombra la cuadrícula de la tarjeta (filas y celdas, con sus listas de respaldo, sus condiciones y los datos de un texto con datos), aplanado y en orden; espejo de entities/plantilla/datos-de-la-cuadricula.ts. docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)».';

revoke all on function public._plantilla_cuadricula_datos(jsonb) from public, anon;
grant execute on function public._plantilla_cuadricula_datos(jsonb) to authenticated, service_role;
