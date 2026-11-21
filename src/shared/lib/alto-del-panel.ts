// El alto de un panel que se abre desde abajo y se agranda arrastrando su asa (`<Drawer alto="ajustable">`), en % de la ventana. Puro.

export const ALTO_INICIAL = 60
export const ALTO_MINIMO = 30
export const ALTO_MAXIMO = 95
const PASO_DE_TECLA = 5

/** Un alto dentro de lo que el panel permite (también si llega un número roto). */
export function acotarAlto(alto: number): number {
  if (!Number.isFinite(alto)) return ALTO_INICIAL
  return Math.min(ALTO_MAXIMO, Math.max(ALTO_MINIMO, Math.round(alto)))
}

/** El alto tras una tecla del asa: ↑ agranda y ↓ achica de 5 en 5; Inicio al mínimo y Fin al máximo. Otra tecla no lo cambia (nulo). */
export function altoConTecla(actual: number, tecla: string): number | null {
  switch (tecla) {
    case 'ArrowUp':
      return acotarAlto(actual + PASO_DE_TECLA)
    case 'ArrowDown':
      return acotarAlto(actual - PASO_DE_TECLA)
    case 'Home':
      return ALTO_MINIMO
    case 'End':
      return ALTO_MAXIMO
    default:
      return null
  }
}

/** El alto cuando el puntero está a `clientY` píxeles del borde de arriba: lo que queda de la ventana hacia abajo. */
export function altoDesdePuntero(clientY: number, altoDeVentana: number): number {
  if (altoDeVentana <= 0) return ALTO_INICIAL
  return acotarAlto(((altoDeVentana - clientY) / altoDeVentana) * 100)
}
