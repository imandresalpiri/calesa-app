import { RUTAS } from '@/shared/lib/rutas'

// El diálogo de eliminar un ítem de la hoja (8.09-2, C11): `?panel=eliminar-item&item=<id>`. Uno solo por hoja, que se monta una vez.
export const PANEL_ELIMINAR_ITEM = 'eliminar-item'
export const CLAVE_DE_ITEM = 'item'
export const MENSAJE_ITEM_YA_NO_ESTA = 'Ese ítem ya no está.'

// El panel de imágenes de un ítem (8.09-3, C11): `?panel=imagenes&item=<id>`. Uno solo por hoja, que se monta la primera vez que se abre.
export const PANEL_IMAGENES = 'imagenes'

/** El ítem en la hoja de su proyecto, con su panel de imágenes abierto: lo que abre la tarjeta «Imágenes» del panel del ítem (sirve también desde la Cadena). */
export function rutaDeLasImagenesDelItem(proyectoId: string, itemId: string): string {
  const parametros = new URLSearchParams({ panel: PANEL_IMAGENES, [CLAVE_DE_ITEM]: itemId })
  return `${RUTAS.repuestos}/${proyectoId}?${parametros.toString()}`
}

// «Agregar ítem»: un drawer de abajo con su propia clave (`?panel=nuevo-item`): una fila editable por cada ítem agregado en esa apertura y, al pie, la fila nueva (8.09-2, C10).
export { PANEL_NUEVO_ITEM } from '../nucleo/paneles'
export const MENSAJE_NO_SE_PUEDEN_AGREGAR =
  'No se pueden agregar ítems: el proyecto está cerrado o no tienes permiso para editarlo.'
