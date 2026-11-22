// Dónde se editan las tablas de referencia (4.23-3): la pestaña «Tablas» de un origen (las suyas y las compartidas que usa) o Catálogos › Tablas
// compartidas (sólo las de origen nulo), y sus URL.
import type { Route } from 'next'
import { RUTAS, rutaDeConfiguracionDeCotizacion } from '@/shared/lib/rutas'

export type OrigenDeLasTablas = { id: string; nombre: string; activo: boolean }

// El origen abierto (la página ya comprobó `cotizaciones.configurar` en él) o las compartidas, sin origen.
export type DestinoDeLasTablas = { origen: OrigenDeLasTablas } | 'compartidas'

export function origenIdDelDestino(destino: DestinoDeLasTablas): string | null {
  return destino === 'compartidas' ? null : destino.origen.id
}

// Los paneles de la pestaña (`?panel=`): «Nueva tabla», «Columnas» y «Desactivar» (los dos últimos con `?tabla=<id>`).
export const PANEL_NUEVA_TABLA = 'nueva-tabla'
export const PANEL_COLUMNAS_DE_TABLA = 'columnas-de-tabla'
export const PANEL_DESACTIVAR_TABLA = 'desactivar-tabla'
export type PanelDeLasTablas =
  typeof PANEL_NUEVA_TABLA | typeof PANEL_COLUMNAS_DE_TABLA | typeof PANEL_DESACTIVAR_TABLA

// `/configuracion/origenes/<origen>/tablas` o, sin origen, `/configuracion/catalogos/tablas`; con `tablaId`, `?tabla=<id>` (abre su editor); con `panel`,
// `&panel=` (o `?panel=` sin tabla).
export function rutaDeLasTablas(
  origenId: string | null,
  tablaId?: string,
  panel?: PanelDeLasTablas,
): Route {
  const consulta = { ...(tablaId ? { tabla: tablaId } : {}), ...(panel ? { panel } : {}) }
  const conConsulta = Object.keys(consulta).length > 0 ? consulta : undefined
  if (origenId === null) {
    const parametros = new URLSearchParams(conConsulta).toString()
    return (
      parametros === '' ? RUTAS.tablasCompartidas : `${RUTAS.tablasCompartidas}?${parametros}`
    ) as Route
  }
  return rutaDeConfiguracionDeCotizacion(origenId, 'tablas', conConsulta)
}
