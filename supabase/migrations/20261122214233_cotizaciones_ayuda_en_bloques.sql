-- La ayuda de una celda en bloques (docs/GLOSARIO.md › «Ayuda (de una celda)», «Bloque de la ayuda»; docs/COTIZADOR.md › «El diseño de la hoja (D7)»):
-- la forma de los bloques (D86–D99), las reglas de la ayuda (`_diseno_ayudas()`, que reemplaza a `_diseno_enlaces()`), el catálogo de tablas al
-- publicar a mano y la ayuda de antes leída como bloques. Sin tablas, columnas ni datos nuevos: la ayuda de antes sigue valiendo tal cual.

-- La ayuda leída como bloques, el espejo de `ayudaEnBloques()`: la de antes (`{texto, enlaces?}` o `{tabla}`) es un bloque de texto (más uno de
-- enlaces) o uno de tabla con todas sus columnas y sin llenar nada. STABLE como los demás ayudantes de `validar_diseno()` (la guarda de
-- `supabase/tests/validar-diseno.sql`).
create function public._diseno_bloques_de_la_ayuda(p jsonb) returns jsonb
language sql
stable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p) = 'array' then p
    when jsonb_typeof(p) = 'object' and p ? 'tabla' then jsonb_build_array(jsonb_build_object('tipo', 'tabla', 'tabla', p -> 'tabla'))
    when jsonb_typeof(p) = 'object' and p ? 'texto' then
      jsonb_build_array(jsonb_build_object('tipo', 'texto', 'texto', p -> 'texto'))
      || case when p ? 'enlaces' then jsonb_build_array(jsonb_build_object('tipo', 'enlaces', 'enlaces', p -> 'enlaces')) else '[]'::jsonb end
    else '[]'::jsonb
  end
$$;

revoke all on function public._diseno_bloques_de_la_ayuda(jsonb) from public, anon;
grant execute on function public._diseno_bloques_de_la_ayuda(jsonb) to authenticated, service_role;

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

-- §7 de `validar_diseno()`, el espejo de `revisarAyudas()`: celda por celda en el orden del diseño y bloque por bloque, el primero que falla, con
-- `donde` = el nodo de la celda:
-- - la URL de un enlace empieza con `https://` y sigue con ASCII imprimible sin espacios (`ayuda_enlace_no_https`);
-- - con el catálogo (`p_tablas`: `[{clave, columnas: [clave]}]`, null sin él), la tabla de un bloque existe (`ayuda_tabla_inexistente`) y, columna por
--   columna, la columna también (`ayuda_columna_inexistente`). La ayuda de antes (`{tabla}`) no se mira contra el catálogo: la hoja ya la deja caer si
--   su tabla no está, y se mira en cuanto el editor la pasa a bloques;
-- - siempre, una columna que llena nombra un nodo que la hoja deja escribir en una celda del diseño (`ayuda_llena_no_acepta_valor`): el de una celda o
--   el porcentaje de una celda con secundario, si es un dato que se tipea, una constante o un cálculo que se puede pisar (`aceptaValorEnLaHoja`).
create function public._diseno_ayudas(p_def jsonb, p_secs jsonb, p_tablas jsonb) returns void
language plpgsql
stable
set search_path = ''
as $_$
declare
  v_secs jsonb := p_secs;
  v_cat jsonb;
  v_aceptan jsonb;
  v_it jsonb;
  v_cat_de_la_celda jsonb;
  v_nodo text;
  v_b jsonb;
  v_tabla text;
  v_cols jsonb;
  v_c jsonb;
begin
  -- El catálogo como conjuntos: una clave repetida se queda con la última (como el `Map` de TS).
  if jsonb_typeof(p_tablas) = 'array' then
    select coalesce(jsonb_object_agg(t.value ->> 'clave',
                                     (select coalesce(jsonb_object_agg(c.value, true), '{}'::jsonb)
                                        from jsonb_array_elements_text(t.value -> 'columnas') c)
                                     order by t.ord), '{}'::jsonb)
      into v_cat
      from jsonb_array_elements(p_tablas) with ordinality as t(value, ord);
  end if;

  for v_it in
    select it.value
      from jsonb_array_elements(v_secs) with ordinality as s(value, so)
     cross join lateral jsonb_array_elements(s.value -> 'items') with ordinality as it(value, io)
     where it.value ->> 'tipo' = 'celda' and it.value ? 'ayuda'
     order by s.so, it.io
  loop
    v_nodo := v_it ->> 'nodo';
    v_cat_de_la_celda := case when jsonb_typeof(v_it -> 'ayuda') = 'array' then v_cat end;
    for v_b in
      select b.value from jsonb_array_elements(public._diseno_bloques_de_la_ayuda(v_it -> 'ayuda')) with ordinality as b(value, bo) order by b.bo
    loop
      if v_b ->> 'tipo' = 'enlaces' then
        if exists (select 1 from jsonb_array_elements(v_b -> 'enlaces') e where (e.value ->> 'url') !~ '^https://[!-~]+$') then
          perform public._formula_rechazar('ayuda_enlace_no_https', v_nodo,
            format('Un enlace de la ayuda de «%s» tiene que empezar con https:// y no llevar espacios.', v_nodo));
        end if;
      elsif v_b ->> 'tipo' = 'tabla' then
        v_tabla := v_b ->> 'tabla';
        v_cols := null;
        if v_cat_de_la_celda is not null then
          if not (v_cat_de_la_celda ? v_tabla) then
            perform public._formula_rechazar('ayuda_tabla_inexistente', v_nodo,
              format('La ayuda de «%s» usa la tabla «%s», que este origen no tiene o está desactivada.', v_nodo, v_tabla));
          end if;
          v_cols := v_cat_de_la_celda -> v_tabla;
        end if;
        for v_c in
          select c.value from jsonb_array_elements(coalesce(v_b -> 'columnas', '[]'::jsonb)) with ordinality as c(value, co) order by c.co
        loop
          if v_cols is not null and not (v_cols ? (v_c ->> 'columna')) then
            perform public._formula_rechazar('ayuda_columna_inexistente', v_nodo,
              format('La ayuda de «%s» muestra la columna «%s», que la tabla «%s» ya no tiene.', v_nodo, v_c ->> 'columna', v_tabla));
          end if;
          continue when not (v_c ? 'llena');
          -- Las celdas que aceptan un valor, una vez, con la primera columna que llena.
          if v_aceptan is null then
            with nodos as (
              select coalesce(jsonb_object_agg(n.value ->> 'id', n.value), '{}'::jsonb) as m
                from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) n
            ), celdas as (
              select it.value as it, nodos.m -> (it.value ->> 'nodo') as n, nodos.m
                from jsonb_array_elements(v_secs) s
               cross join lateral jsonb_array_elements(s.value -> 'items') it
               cross join nodos
               where it.value ->> 'tipo' = 'celda'
            ), candidatos as (
              select c.n from celdas c
              union all
              select c.m -> (c.n ->> 'pct') from celdas c
               where c.it ? 'secundario' and c.n ->> 'tipo' = 'calculo' and c.n ->> 'op' = 'porcentaje_de'
            )
            select coalesce(jsonb_object_agg(x.n ->> 'id', true), '{}'::jsonb)
              into v_aceptan
              from candidatos x
             where x.n ->> 'id' is not null
               and (x.n ->> 'tipo' in ('input', 'constante')
                    or (x.n ->> 'tipo' in ('tabla', 'tramo', 'calculo') and (x.n ->> 'salida') is distinct from 'total'));
          end if;
          if not (v_aceptan ? (v_c ->> 'llena')) then
            perform public._formula_rechazar('ayuda_llena_no_acepta_valor', v_nodo,
              format('En la ayuda de «%s», la columna «%s» llena una celda que no acepta un valor: elige un dato que se tipea, una constante o un cálculo que se puede pisar.',
                     v_nodo, v_c ->> 'columna'));
          end if;
        end loop;
      end if;
    end loop;
  end loop;
end;
$_$;

revoke all on function public._diseno_ayudas(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public._diseno_ayudas(jsonb, jsonb, jsonb) to authenticated, service_role;

drop function public.validar_diseno(jsonb, jsonb, text[], text[], text[]);
drop function public._diseno_enlaces(jsonb);

create function public.validar_diseno(p_def jsonb, p_diseno jsonb, p_niveles text[], p_retirados text[], p_tonos text[], p_tablas jsonb default null)
returns void
language plpgsql
stable
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
  -- §0 la forma.
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
                                   v_pos, v_cond, v_req, v_niv, v_ret);

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

revoke all on function public.validar_diseno(jsonb, jsonb, text[], text[], text[], jsonb) from public, anon;
grant execute on function public.validar_diseno(jsonb, jsonb, text[], text[], text[], jsonb) to authenticated, service_role;

-- El catálogo de tablas de un origen para `validar_diseno()`: la clave y las claves de las columnas de cada tabla activa del origen o compartida, la
-- del origen antes que la compartida de la misma clave (como `leerCatalogoDeTablasSobre()`). De nadie: la llama `_publicar_formula()`, definer.
create function public._tablas_del_catalogo(p_origen uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('clave', t.clave,
                                               'columnas', (select coalesce(jsonb_agg(c.value ->> 'clave' order by c.ord), '[]'::jsonb)
                                                              from jsonb_array_elements(t.columnas) with ordinality as c(value, ord)))
                            order by t.clave), '[]'::jsonb)
    from (select distinct on (r.clave) r.clave, r.columnas
            from public.tablas_referencia r                                                      -- tablas_referencia_origen_id_clave_key
           where r.activa and (r.origen_id = p_origen or r.origen_id is null)
           order by r.clave, r.origen_id nulls last) t
$$;

revoke all on function public._tablas_del_catalogo(uuid) from public, anon, authenticated;
grant execute on function public._tablas_del_catalogo(uuid) to service_role;

drop function public._preparar_publicacion(jsonb, jsonb, jsonb, boolean);

create function public._preparar_publicacion(p_def jsonb, p_params jsonb, p_diseno jsonb, p_ignorar_retirados boolean, p_tablas jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_niv text[]; v_ret text[]; v_tonos text[];
begin
  if p_diseno is null then
    perform public._formula_rechazar('diseno_faltante', 'diseno', 'Publicar pide el diseño de la hoja.');
  end if;
  -- Los tonos de los grupos y del diseño (cabecera y secciones) y los niveles del diseño, `for key share`: o se publica y no se eliminan, o se
  -- eliminan y publicar da `tono_inexistente` o `nivel_inexistente`. Sólo los que se nombran, no toda la lista.
  perform 1 from public.tonos t
   where t.clave in (select jsonb_array_elements_text(public._tonos_de_grupos(p_def) || public._tonos_del_diseno(p_diseno))) for key share;
  perform 1 from public.cotizaciones_niveles n where n.clave in (select jsonb_array_elements_text(public._niveles_del_diseno(p_diseno))) for key share;
  select coalesce(array_agg(t.clave), '{}') into v_tonos from public.tonos t;
  select n.niveles, case when p_ignorar_retirados then '{}'::text[] else n.retirados end into v_niv, v_ret from public._niveles_de_cotizacion() n;
  perform public.validar_formula(p_def, p_params);
  -- El catálogo de tablas lo trae sólo publicar a mano (`_publicar_formula`): la N+1 de una tabla publica aunque la ayuda nombre una columna que
  -- ya no está (el bloque lo avisa y el editor marca la regla).
  perform public.validar_diseno(p_def, p_diseno, v_niv, v_ret, v_tonos, p_tablas);
  return public._compilar_visibilidad(p_def, p_diseno);
end; $$;

revoke all on function public._preparar_publicacion(jsonb, jsonb, jsonb, boolean, jsonb) from public, anon, authenticated;
grant execute on function public._preparar_publicacion(jsonb, jsonb, jsonb, boolean, jsonb) to service_role;

create or replace function public._publicar_formula(p_origen uuid, p_nota text, p_publicada_esperada uuid, p_ignorar_retirados boolean,
                                                    p_actualizado_en_esperado timestamptz, p_formula_del_origen uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.formulas; v_pub uuid; v_ver int; v_vis jsonb; v_f text; v_fdo public.formulas_del_origen;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if coalesce(trim(p_nota), '') = '' then raise exception 'Publicar pide una nota.' using errcode = '22023'; end if;
  -- Guardar, publicar, el ⚙ y revertir de un origen, en serie: el segundo relee la publicada y el borrador y los compara con sus esperadas.
  perform pg_advisory_xact_lock(hashtextextended('formulas:' || p_origen::text, 0));
  v_fdo := public._fdo_resolver(p_origen, p_formula_del_origen, false);
  select * into v_b from public.formulas where formula_del_origen_id = v_fdo.id and estado = 'borrador' for update;   -- formulas_borrador_unico
  select id into v_pub from public.formulas where formula_del_origen_id = v_fdo.id and estado = 'publicada';           -- formulas_publicada_unica
  if p_publicada_esperada is not null and v_pub is distinct from p_publicada_esperada then
    if v_pub is null then
      raise exception 'La versión que tenías ya no es la publicada, y el origen no tiene otra.' using errcode = 'PT409';
    end if;
    v_f := public._version_publicada_por(v_pub);
    raise exception '%.', upper(left(v_f, 1)) || substr(v_f, 2) using errcode = 'PT409';
  end if;
  perform public._exigir_borrador_formula(v_b, p_actualizado_en_esperado);
  if v_b.id is null then raise exception 'No hay borrador para publicar.' using errcode = '22023'; end if;
  if v_b.version_origen_id is not null and v_b.version_origen_id is distinct from v_pub then
    raise exception 'Después de que empezaste este borrador, %.', coalesce(public._version_publicada_por(v_pub), 'la versión publicada cambió')
      using errcode = 'PT409';
  end if;
  -- Una copia de otro origen no publica un dato del vehículo que este origen no tiene.
  if v_fdo.copiada_de_otro_origen then
    perform public._fdo_exigir_campos(v_b.definicion, p_origen);
  end if;

  -- Con el catálogo de tablas del origen: la ayuda de una celda no publica una tabla o una columna que el origen no tiene.
  v_vis := public._preparar_publicacion(v_b.definicion, v_b.params, v_b.diseno, p_ignorar_retirados, public._tablas_del_catalogo(p_origen));

  select coalesce(max(version), 0) + 1 into v_ver from public.formulas where formula_del_origen_id = v_fdo.id;   -- formulas_formula_del_origen_id_version_key
  update public.formulas set estado = 'archivada' where id = v_pub;
  update public.formulas set estado = 'publicada', version = v_ver, nota = p_nota, visibilidad = v_vis, publicado_por = (select auth.uid()),
         publicado_en = now(), version_origen_id = v_pub where id = v_b.id;
  perform public.registrar_actividad('formula.publicada', 'formulas', v_b.id::text, jsonb_build_object('anterior', v_pub), jsonb_build_object('version', v_ver, 'nota', p_nota),
                                     jsonb_build_object('formula_del_origen_id', v_fdo.id, 'nombre', v_fdo.nombre));
  return v_b.id;
end;
$$;

revoke all on function public._publicar_formula(uuid, text, uuid, boolean, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public._publicar_formula(uuid, text, uuid, boolean, timestamptz, uuid) to service_role;
