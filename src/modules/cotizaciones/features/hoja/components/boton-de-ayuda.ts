import type { CeldaDeHoja } from '../../../entities/hoja'

// El botón «Ayuda de X» de esa celda, para devolverle el foco al cerrar su panel (la `XCell` no lo mueve: emite `onHelp` y nada más). Si no está, el foco que dé el diálogo.
export const botonDeAyuda = (celda: CeldaDeHoja) =>
  [
    ...document.querySelectorAll<HTMLElement>(`[data-nodo="${CSS.escape(celda.nodo)}"] button`),
  ].find((boton) => boton.getAttribute('aria-label') === `Ayuda de ${celda.etiqueta}`) ?? true

// El botón del valor de un lado de una celda (`data-lado` de la XCell), para dejarle el foco tras llenarla desde la ayuda. Si no está (la celda se dejó de dibujar), nulo.
export const botonDelValor = (celda: string, lado: 'principal' | 'secundario') =>
  document.querySelector<HTMLElement>(
    `[data-nodo="${CSS.escape(celda)}"] button[data-lado="${lado}"]`,
  )
