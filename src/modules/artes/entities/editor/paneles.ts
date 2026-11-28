// Las pestañas de los paneles del editor de artes (no las de la lista de `/artes`). La derecha tiene hoy sólo «Diseño»: el panel «Textos» de
// la plantilla llega con el editor con datos, en su misma fila de 40 px. Puro.

export const PESTANAS_DEL_PANEL_IZQUIERDO = ['agregar', 'capas'] as const
export type PestanaIzquierda = (typeof PESTANAS_DEL_PANEL_IZQUIERDO)[number]

export const TITULOS_DEL_PANEL_IZQUIERDO: Readonly<Record<PestanaIzquierda, string>> = {
  agregar: 'Agregar',
  capas: 'Capas',
}

export const PESTANAS_DEL_PANEL_DERECHO = ['diseno'] as const
export type PestanaDerecha = (typeof PESTANAS_DEL_PANEL_DERECHO)[number]

export const TITULOS_DEL_PANEL_DERECHO: Readonly<Record<PestanaDerecha, string>> = {
  diseno: 'Diseño',
}
