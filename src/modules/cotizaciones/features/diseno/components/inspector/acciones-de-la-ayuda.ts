import type { AyudaDeCelda } from '../../../../entities/diseno/edicion-de-items'
import type { EdicionesDelDiseno } from '../../hooks/use-ediciones-del-diseno'
import type { AccionesDeLosEnlaces } from '../campos-de-los-enlaces'

// La ayuda de la celda `nodo` y sus enlaces, atados a las ediciones del diseño.
export function accionesDeLaAyuda(
  ediciones: EdicionesDelDiseno,
  seccion: string,
  nodo: string,
): { alPonerAyuda: (ayuda: AyudaDeCelda | null) => void; enlaces: AccionesDeLosEnlaces } {
  return {
    alPonerAyuda: (ayuda) => {
      ediciones.ponerAyuda(seccion, nodo, ayuda)
    },
    enlaces: {
      sumar: () => {
        ediciones.sumarEnlace(seccion, nodo)
      },
      poner: (posicion, cambios) => {
        ediciones.ponerEnlace({ seccion, nodo, posicion }, cambios)
      },
      quitar: (posicion) => {
        ediciones.quitarEnlace({ seccion, nodo, posicion })
      },
    },
  }
}
