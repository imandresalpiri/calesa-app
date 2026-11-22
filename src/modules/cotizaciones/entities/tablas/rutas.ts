// Dónde se editan las tablas de referencia: el drawer «Tablas» de la barra de la fórmula en la página de un origen (las suyas y las compartidas que usa) o
// Catálogos › Tablas compartidas (sólo las de origen nulo), y sus URL.
import type { Route } from 'next'
import { CLAVE_DE_LA_ACCION_DE_LA_TABLA, PANEL_DE_LAS_TABLAS, RUTAS } from '@/shared/lib/rutas'

export type OrigenDeLasTablas = { id: string; nombre: string; activo: boolean }

// El origen abierto (la página ya comprobó `cotizaciones.configurar` en él) con `en`, la pestaña donde se abre el drawer (su ruta con su consulta, sin las claves
// del drawer: `…/planilla?formula=<id>`), o las compartidas, sin origen.
export type DestinoDeLasTablas = { origen: OrigenDeLasTablas; en: string } | 'compartidas'

export function origenIdDelDestino(destino: DestinoDeLasTablas): string | null {
  return destino === 'compartidas' ? null : destino.origen.id
}

// Dónde se dibujan las tablas, para armar sus URL: la ruta de la pestaña que abre el drawer, o nulo en Catálogos (una página propia).
export type LugarDeLasTablas = string | null

export function lugarDelDestino(destino: DestinoDeLasTablas): LugarDeLasTablas {
  return destino === 'compartidas' ? null : destino.en
}

// Los paneles de las tablas: «Nueva tabla», «Columnas», «Desactivar» (los dos últimos con `tabla=<id>`) y «Publicar».
export const PANEL_NUEVA_TABLA = 'nueva-tabla'
export const PANEL_COLUMNAS_DE_TABLA = 'columnas-de-tabla'
export const PANEL_DESACTIVAR_TABLA = 'desactivar-tabla'
export type PanelDeLasTablas =
  typeof PANEL_NUEVA_TABLA | typeof PANEL_COLUMNAS_DE_TABLA | typeof PANEL_DESACTIVAR_TABLA

// En qué clave de la URL va el panel de una tabla: en Catálogos, `?panel=`; en el drawer, que ya ocupa `?panel=tablas`, `?accion=`.
export function claveDeLaAccion(lugar: LugarDeLasTablas): string {
  return lugar === null ? 'panel' : CLAVE_DE_LA_ACCION_DE_LA_TABLA
}

// La lista de las tablas o, con `tablaId`, esa tabla abierta (`tabla=<id>`); con `accion`, su panel. En Catálogos, `/configuracion/catalogos/tablas?tabla=&panel=`;
// en el drawer, la pestaña donde se abre con `panel=tablas&tabla=&accion=`, que conserva lo demás de su consulta (la fórmula elegida).
export function rutaDeLasTablas(
  lugar: LugarDeLasTablas,
  tablaId?: string,
  accion?: PanelDeLasTablas,
): Route {
  const consulta = new URLSearchParams()
  if (lugar !== null) consulta.set('panel', PANEL_DE_LAS_TABLAS)
  if (tablaId) consulta.set('tabla', tablaId)
  if (accion) consulta.set(claveDeLaAccion(lugar), accion)
  const texto = consulta.toString()
  if (lugar === null) {
    return (texto === '' ? RUTAS.tablasCompartidas : `${RUTAS.tablasCompartidas}?${texto}`) as Route
  }
  return `${lugar}${lugar.includes('?') ? '&' : '?'}${texto}` as Route
}
