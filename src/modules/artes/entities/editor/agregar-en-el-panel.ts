// Lo que decide la pestaña «Agregar» del editor de artes: por qué no se puede agregar (sólo lectura o el tope de capas de la página), el texto
// de una variable (`{marca}`) y la proporción de un logo o una imagen de la biblioteca. Puro.
import type { PaginaDeArte } from '../documento'
import { hayLugar, MENSAJE_DEL_TOPE_DE_CAPAS } from './acciones-de-capas'

export const MOTIVO_DE_SOLO_LECTURA = 'Sólo puedes mirar esta plantilla de arte.'

// La proporción de lo que no trae medidas (las variantes fijas del logo): cuadrada.
export const PROPORCION_SIN_MEDIDAS = 1

// Nulo si se puede agregar una capa más.
export function motivoParaAgregar(pagina: PaginaDeArte, soloLectura: boolean): string | null {
  if (soloLectura) {
    return MOTIVO_DE_SOLO_LECTURA
  }
  return hayLugar(pagina) ? null : MENSAJE_DEL_TOPE_DE_CAPAS
}

export function textoDeLaVariable(clave: string): string {
  return `{${clave}}`
}

// Ancho / alto; sin medidas (o con una que no sirve), `PROPORCION_SIN_MEDIDAS`.
export function proporcionDe(medidas: { ancho: number | null; alto: number | null }): number {
  const { ancho, alto } = medidas
  if (ancho === null || alto === null || !(ancho > 0) || !(alto > 0)) {
    return PROPORCION_SIN_MEDIDAS
  }
  return ancho / alto
}
