// Las fuentes que ofrece el editor de artes para un texto y los nombres de sus pesos. `geist` es la letra de la app: next/font le cambia el
// nombre de la familia por uno con hash, así que el lienzo la resuelve en el navegador desde `--font-geist-sans` (por eso su familia es nula).
// Las demás son de sistema, con su respaldo genérico. Puro.
import type { PESOS_DE_TEXTO } from '../documento'

export type FuenteDeArte = { clave: string; nombre: string; familia: string | null }

export const FUENTE_POR_DEFECTO = 'geist'

const GEIST: FuenteDeArte = { clave: FUENTE_POR_DEFECTO, nombre: 'Geist', familia: null }

export const FUENTES_DE_ARTE: readonly FuenteDeArte[] = [
  GEIST,
  { clave: 'arial', nombre: 'Arial', familia: 'Arial, Helvetica, sans-serif' },
  { clave: 'georgia', nombre: 'Georgia', familia: 'Georgia, serif' },
  { clave: 'courier-new', nombre: 'Courier New', familia: "'Courier New', Courier, monospace" },
  { clave: 'verdana', nombre: 'Verdana', familia: 'Verdana, Geneva, sans-serif' },
]

// La fuente de una clave; una que no está (de un documento viejo o de otra versión) cae a la por defecto.
export function fuenteDe(clave: string): FuenteDeArte {
  return FUENTES_DE_ARTE.find((fuente) => fuente.clave === clave) ?? GEIST
}

export type PesoDeTexto = (typeof PESOS_DE_TEXTO)[number]

export const NOMBRES_DE_LOS_PESOS: Readonly<Record<PesoDeTexto, string>> = {
  400: 'Normal',
  500: 'Media',
  600: 'Seminegrita',
  700: 'Negrita',
}
