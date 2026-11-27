-- El transporte ya no se lee ni se edita por su clave de texto (booking o número): los embarques y los contenedores se listan, se leen y se
-- editan por su id (`embarques_listar`, `contenedores_listar`, `embarque_leer`, `contenedor_leer`, `transporte_unidades`,
-- `embarque_guardar`, `contenedor_guardar`). Se van la lista por clave, la lectura por clave, el «Editar grupo» por clave y los ayudantes que
-- sólo ellas nombran (`_transporte_de_la_clave`, `_transporte_clave`). `_transporte_grupo_bloquear` se queda: lo usan `_entidad_bloquear_unidades`
-- y `_transporte_lote_bloquear`.

drop function public.transporte_grupos(text, text, integer, jsonb, uuid);
drop function public._transporte_grupos_filtros(jsonb);
drop function public.transporte_grupo(text, text);
drop function public.transporte_grupo_aplicar(text, text, jsonb, jsonb);
drop function public._transporte_de_la_clave(text, text, uuid);
drop function public._transporte_clave(text, text);

-- El permiso de editar el transporte ya no se aplica por un grupo de texto.
update public.permisos
   set aplicado_en = 'transporte_guardar, embarque_crear, embarque_guardar, contenedor_crear, contenedor_guardar, transporte_asignar, transporte_quitar'
 where clave = 'logistica.transporte.editar';
