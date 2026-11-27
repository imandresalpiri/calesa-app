// Los paneles del editor de la tarjeta en la URL (`?panel=`): lo que no cabe en la barra se abre aparte, sin quitarle lugar al lienzo. Puro.
import type { Seleccion } from './edicion/seleccion'

// El panel de lo elegido: la celda o rango (o columnas) o la fila, según la selección.
export const PANEL_DE_LA_CELDA = 'celda'
// El resumen de las columnas: anchos, paleta y tamaño.
export const PANEL_DE_LAS_COLUMNAS = 'columnas'
// «Información de la tarjeta»: de dónde nace lo que se edita y la publicada.
export const PANEL_INFORMACION_DE_LA_TARJETA = 'info-tarjeta'

export type ContenidoDelPanelDeLaCelda = 'nada' | 'fila' | 'celda'

// Qué dibuja el panel de la celda con esta selección y cómo se llama su botón y su panel: «Fila» con filas, «Celda» con celdas o columnas, y sin nada elegido
// «Celda» apagado (no hay qué mostrar).
export function panelDeLaSeleccion(sel: Seleccion | null): {
  contenido: ContenidoDelPanelDeLaCelda
  nombre: 'Celda' | 'Fila'
  motivo: string | null
} {
  if (sel === null)
    return { contenido: 'nada', nombre: 'Celda', motivo: 'Elige una celda o una fila.' }
  if (sel.tipo === 'filas') return { contenido: 'fila', nombre: 'Fila', motivo: null }
  return { contenido: 'celda', nombre: 'Celda', motivo: null }
}

// Por qué no se le puede poner contenido (un texto, un dato, el logo) a lo elegido: nada elegido o una fila; nulo si se puede.
export function motivoDelContenido(sel: Seleccion | null): string | null {
  if (sel === null) return 'Elige una celda.'
  if (sel.tipo === 'filas') return 'Elige una celda, no una fila.'
  return null
}
