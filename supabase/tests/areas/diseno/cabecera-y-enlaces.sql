-- Lo que la cabecera trae por defecto y los enlaces de la ayuda (docs/COTIZADOR.md › «El diseño de la hoja (D7)»): cada regla nueva rechaza con 22023,
-- la regla en DETAIL, `donde` en HINT y el mismo texto que `motivos-de-diseno.ts`. Qué diseño da cada regla, su orden y su `donde` los cubre el juego
-- compartido (`validar-diseno.sql` y `validar-diseno.test.ts`); acá, los textos.
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno dentro de su transacción y la revierte.

-- El rechazo de validar_diseno sobre el diseño de prueba con `p_cabecera` mezclado en su cabecera y `p_ayuda` como la ayuda de la celda «a»; nulo si vale.
create or replace function pg_temp.cye_rechazo(p_cabecera jsonb, p_ayuda jsonb default null) returns jsonb language plpgsql as $f$
declare
  v_def jsonb := '{"nodos": [{"id": "a", "tipo": "input", "etiqueta": "A", "salida": "total", "bucket": "exterior"},
                             {"id": "tc_p", "tipo": "tipo_cambio", "clave": "paralelo", "etiqueta": "P", "formato": "raw"},
                             {"id": "tc_u", "tipo": "tipo_cambio", "clave": "unificado", "etiqueta": "U", "formato": "raw"}],
                   "buckets": {"exterior": "tc_p"}, "total_en": "tc_p"}';
  v_diseno jsonb := '{"cabecera": {"modos": [{"clave": "paralelo", "nombre": "Paralelo", "buckets": [{"bucket": "exterior", "nodo": "tc_p"}], "total_en": "tc_p"},
                                             {"clave": "unificado", "nombre": "Unificado", "buckets": [{"bucket": "exterior", "nodo": "tc_u"}], "total_en": "tc_u"}],
                                   "ver_total_bs": true},
                      "secciones": [{"id": "s", "presentacion": "principal",
                                     "items": [{"tipo": "celda", "nodo": "a", "ancho": "completo"}, {"tipo": "celda", "nodo": "tc_p", "ancho": "mitad"},
                                               {"tipo": "celda", "nodo": "tc_u", "ancho": "mitad"}]}],
                      "tarjeta_total": {"nodo": "a", "secundarios": []}}';
  v_d text; v_h text; v_m text;
begin
  v_diseno := jsonb_set(v_diseno, '{cabecera}', (v_diseno -> 'cabecera') || p_cabecera);
  if p_ayuda is not null then v_diseno := jsonb_set(v_diseno, '{secciones,0,items,0,ayuda}', p_ayuda); end if;
  perform public.validar_diseno(v_def, v_diseno, '{}', '{}', '{}');
  return null;
exception when invalid_parameter_value then
  get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
  return jsonb_build_object('regla', v_d, 'donde', v_h, 'mensaje', v_m);
end $f$;

-- @test diseño por defecto: el diseño de prueba vale con y sin lo que la cabecera trae por defecto, y con enlaces https
do $$
begin
  if pg_temp.cye_rechazo('{}') is not null then raise exception 'el diseño de prueba no vale: %', pg_temp.cye_rechazo('{}'); end if;
  if pg_temp.cye_rechazo('{"modo_por_defecto": "unificado", "modos_visibles": ["unificado"], "ver_total_bs_por_defecto": true}',
                         '{"texto": "Mira la subasta.", "enlaces": [{"titulo": "Copart", "url": "https://www.copart.com/lote?id=1"}]}') is not null then
    raise exception 'no vale con lo de por defecto: %', pg_temp.cye_rechazo('{"modo_por_defecto": "unificado", "modos_visibles": ["unificado"]}');
  end if;
end $$;

-- @test diseño por defecto: cada regla nueva da su código, `donde` y el texto de motivos-de-diseno.ts
do $$
declare
  r record;
  v jsonb;
begin
  for r in select * from (values
    ('{"modo_por_defecto": "aduana"}'::jsonb, null::jsonb, 'modo_por_defecto_inexistente', 'cabecera',
     'El modo por defecto «aduana» no es un modo de la cabecera.'),
    ('{"modos_visibles": ["paralelo", "aduana"]}', null, 'modo_visible_inexistente', 'cabecera',
     'Las opciones visibles nombran «aduana», que no es un modo de la cabecera.'),
    ('{"modos_visibles": ["paralelo", "paralelo"]}', null, 'modo_visible_repetido', 'cabecera',
     'Las opciones visibles nombran dos veces «paralelo».'),
    ('{"modos_visibles": []}', null, 'modo_por_defecto_oculto', 'cabecera',
     'El modo por defecto «paralelo» tiene que quedar entre las opciones visibles.'),
    ('{"modo_por_defecto": "unificado", "modos_visibles": ["paralelo"]}', null, 'modo_por_defecto_oculto', 'cabecera',
     'El modo por defecto «unificado» tiene que quedar entre las opciones visibles.'),
    ('{"ver_total_bs": false, "ver_total_bs_por_defecto": true}', null, 'ver_total_bs_por_defecto_no_ofrecido', 'cabecera',
     '«Ver total» no puede salir encendido por defecto si la cabecera no lo ofrece.'),
    ('{}', '{"texto": "Mira.", "enlaces": [{"titulo": "Copart", "url": "http://www.copart.com/"}]}', 'ayuda_enlace_no_https', 'a',
     'Un enlace de la ayuda de «a» tiene que empezar con https:// y no llevar espacios.'),
    ('{}', '[{"tipo": "texto", "texto": "Mira."}, {"tipo": "enlaces", "enlaces": [{"titulo": "Copart", "url": "https://www.copart.com/"},
            {"titulo": "IAAI", "url": "https://www.iaai.com/ lote"}]}]', 'ayuda_enlace_no_https', 'a',
     'Un enlace de la ayuda de «a» tiene que empezar con https:// y no llevar espacios.')
  ) as t(cab, ayuda, regla, donde, mensaje) loop
    v := pg_temp.cye_rechazo(r.cab, r.ayuda);
    if v is distinct from jsonb_build_object('regla', r.regla, 'donde', r.donde, 'mensaje', r.mensaje) then
      raise exception '% da %', r.regla, v;
    end if;
  end loop;
end $$;
