// Dónde se editan las tablas de referencia: el drawer «Tablas» de la barra de la fórmula en la página de un origen (las suyas y las compartidas que recibe), y sus URL.
import type { Route } from 'next'
import { CLAVE_DE_LA_ACCION_DE_LA_TABLA, PANEL_DE_LAS_TABLAS } from '@/shared/lib/rutas'

export type OrigenDeLasTablas = { id: string; nombre: string; activo: boolean }

// El origen abierto (la página ya comprobó `cotizaciones.configurar` en él) con `en`, la pestaña donde se abre el drawer (su ruta con su consulta, sin las claves
// del drawer: `…/planilla?formula=<id>`).
export type DestinoDeLasTablas = { origen: OrigenDeLasTablas; en: string }

// Dónde se dibujan las tablas, para armar sus URL: la ruta de la pestaña que abre el drawer.
export type LugarDeLasTablas = string

// Los paneles de las tablas: «Nueva tabla», «Columnas», «Desactivar» (los dos últimos con `tabla=<id>`) y «Publicar».
export const PANEL_NUEVA_TABLA = 'nueva-tabla'
export const PANEL_COLUMNAS_DE_TABLA = 'columnas-de-tabla'
export const PANEL_DESACTIVAR_TABLA = 'desactivar-tabla'
export type PanelDeLasTablas =
  typeof PANEL_NUEVA_TABLA | typeof PANEL_COLUMNAS_DE_TABLA | typeof PANEL_DESACTIVAR_TABLA

// La lista de las tablas o, con `tablaId`, esa tabla abierta (`tabla=<id>`); con `accion`, su panel. Es la pestaña donde se abre el drawer con
// `panel=tablas&tabla=&accion=`, que conserva lo demás de su consulta (la fórmula elegida).
export function rutaDeLasTablas(
  lugar: LugarDeLasTablas,
  tablaId?: string,
  accion?: PanelDeLasTablas,
): Route {
  const consulta = new URLSearchParams({ panel: PANEL_DE_LAS_TABLAS })
  if (tablaId) consulta.set('tabla', tablaId)
  if (accion) consulta.set(CLAVE_DE_LA_ACCION_DE_LA_TABLA, accion)
  return `${lugar}${lugar.includes('?') ? '&' : '?'}${consulta.toString()}` as Route
}
