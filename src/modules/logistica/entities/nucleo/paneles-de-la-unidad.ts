// Las claves de la URL y las marcas del DOM que comparten las áreas de la unidad: un área no importa otra (`scripts/guardas/areas-de-logistica.test.ts`), así que
// lo que «Qué falta» usa para abrir la subida, el formulario de un pago o un campo de otra área vive aquí. Sin I/O.

/** El drawer de subir documentos (`?subir=documentos`): aparte de `?panel=`, que cerraría el drawer del ítem de repuesto. */
export const CLAVE_DE_SUBIR = 'subir'

/** El tipo de documento con que se abre la subida (`?subir=documentos&tipo_documento=<id>` o, en bloques, sólo `&tipo_documento=`). */
export const CLAVE_DEL_TIPO_A_SUBIR = 'tipo_documento'

/** El formulario de un pago del hueco «Pagos»: `?panel=pago&pago=<id|nuevo>`. */
export const PANEL_PAGO = 'pago'
export const CLAVE_DE_PAGO = 'pago'
export const PAGO_NUEVO = 'nuevo'

/** Cada grupo de un tipo en «Documentos» lleva el id del tipo: «Revisar» lo trae a la vista. */
/** Cada hueco dibuja su bloque con este atributo: el atajo lo busca para saber si existe y a dónde ir. Vive en `entities` porque también lo usa un Server Component (un valor de un archivo `'use client'` no llega ahí como texto). */
export const ATRIBUTO_DEL_BLOQUE = 'data-bloque-del-hueco'
export const ATRIBUTO_DE_TIPO_DE_DOCUMENTO = 'data-tipo-de-documento-id'

/** El campo que cumple una clave de dato de un requisito (`transporte.contenedor`…): «Completar» le lleva el foco. Puede llevar varias, separadas por un espacio (el enlace «Editar el embarque»). */
export const ATRIBUTO_DE_CLAVE_DE_DATO = 'data-clave-de-dato'
