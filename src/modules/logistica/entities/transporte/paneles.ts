// Las claves de URL de `/logistica/embarques` y de la página de un embarque (`/logistica/embarques/[id]`): la vista (`?grupo=embarques|contenedores`), el drawer de un contenedor
// (`?contenedor=<uuid>`, la misma clave que usa el lote de `mover`), el panel abierto (`?panel=`) y el filtro «algo que falta» de la página (`?falta=1`).
export const CLAVE_DE_GRUPO = 'grupo'
export const CLAVE_DEL_CONTENEDOR_ABIERTO = 'contenedor'
export const CLAVE_DE_FALTA = 'falta'
export const VALOR_DE_FALTA = '1'

// Los valores de `?panel=`: un modal o un drawer a la vez. «Agregar vehículos» lleva el destino en `?contenedor=` (sin él, el embarque de la página).
export const PANEL_NUEVO_EMBARQUE = 'nuevo-embarque'
export const PANEL_EDITAR_EMBARQUE = 'editar-embarque'
export const PANEL_AGREGAR_CONTENEDOR = 'agregar-contenedor'
export const PANEL_EDITAR_CONTENEDOR = 'editar-contenedor'
export const PANEL_AGREGAR_VEHICULOS = 'agregar-vehiculos'
// Un hueco del grupo (documentos, gastos) en su drawer: `?panel=grupo-<clave>`.
export const PREFIJO_DEL_PANEL_DEL_HUECO = 'grupo-'

/** `?panel=grupo-<clave>` → la clave del hueco; nulo si el panel no es uno de ellos. */
export function huecoDelPanel(panel: string | null | undefined): string | null {
  if (!panel?.startsWith(PREFIJO_DEL_PANEL_DEL_HUECO)) return null
  const clave = panel.slice(PREFIJO_DEL_PANEL_DEL_HUECO.length)
  return clave === '' ? null : clave
}

export const panelDelHueco = (clave: string) => `${PREFIJO_DEL_PANEL_DEL_HUECO}${clave}`

export const VISTAS_DE_GRUPOS = ['embarques', 'contenedores'] as const
export type VistaDeGrupos = (typeof VISTAS_DE_GRUPOS)[number]

export const ETIQUETA_DE_VISTA_DE_GRUPOS: Record<VistaDeGrupos, string> = {
  embarques: 'Embarques',
  contenedores: 'Contenedores',
}

/** La vista que dice la URL; cualquier otro valor (o ninguno) es «embarques». */
export function vistaDeGrupos(valor: string | null | undefined): VistaDeGrupos {
  return valor === 'contenedores' ? 'contenedores' : 'embarques'
}

/** La entidad de los huecos del grupo para esa vista. */
export function tipoDeGrupoDeLaVista(vista: VistaDeGrupos): 'embarque' | 'contenedor' {
  return vista === 'contenedores' ? 'contenedor' : 'embarque'
}

// La regla del flujo (`flujos_reglas`) que pide cada vista: los embarques, `transporte`; los contenedores, `contenedor`.
const REGLA_DE_LA_VISTA: Record<VistaDeGrupos, string> = {
  embarques: 'transporte',
  contenedores: 'contenedor',
}

/** Las vistas de `/logistica/embarques` que usa el flujo de un origen, en su orden. Vacío: el origen no usa Embarques. */
export function vistasDeTransporte(reglas: readonly string[]): VistaDeGrupos[] {
  return VISTAS_DE_GRUPOS.filter((vista) => reglas.includes(REGLA_DE_LA_VISTA[vista]))
}

/**
 * La vista que se dibuja entre las del origen: la que pide la URL o, sin pedido, la primera. `no_usa`: la URL pide una que el origen no usa (o el origen no usa
 * ninguna).
 */
export function vistaDelOrigen(
  valor: string | null | undefined,
  vistas: readonly VistaDeGrupos[],
): VistaDeGrupos | 'no_usa' {
  const pedida = valor === undefined || valor === null || valor === '' ? null : vistaDeGrupos(valor)
  const vista = pedida ?? vistas[0]
  return vista !== undefined && vistas.includes(vista) ? vista : 'no_usa'
}

// El modal «Dónde viaja» del hueco «Transporte» (elegir o crear el contenedor o el embarque en que va la unidad): `?transporte=donde-viaja`, en la página de la unidad y en el panel
// de Gastos. Otra clave que `?panel=`: el drawer de la tarjeta y el panel de Gastos ya usan ésa.
export const CLAVE_DE_DONDE_VIAJA = 'transporte'
export const PANEL_DONDE_VIAJA = 'donde-viaja'
