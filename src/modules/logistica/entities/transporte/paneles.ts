// Las claves de URL de `/logistica/embarques` (6.08-3): la vista (`?grupo=embarques|contenedores`) y el resumen abierto (`?booking=<clave>` en embarques, `?contenedor=<clave>` en
// contenedores: las mismas claves que ya usa el lote de `mover`) y el panel de «Editar grupo» (6.08-4).
export const CLAVE_DE_GRUPO = 'grupo'
export const CLAVE_DE_BOOKING = 'booking'
export const CLAVE_DE_CONTENEDOR = 'contenedor'
// El valor de `?panel=` que abre el formulario de «Editar grupo»; tapa al resumen, no convive con él.
export const PANEL_EDITAR_GRUPO = 'editar-grupo'

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

/** La clave de URL del resumen de esa vista. */
export function claveDelResumenDe(vista: VistaDeGrupos): string {
  return vista === 'contenedores' ? CLAVE_DE_CONTENEDOR : CLAVE_DE_BOOKING
}

/** El `p_tipo` de `transporte_grupos()` y `transporte_grupo()`. */
export function tipoDeLaBaseDe(vista: VistaDeGrupos): 'booking' | 'contenedor' {
  return vista === 'contenedores' ? 'contenedor' : 'booking'
}

/** El `tipo` del grupo para los huecos del resumen (`GrupoDeLogistica`). */
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
