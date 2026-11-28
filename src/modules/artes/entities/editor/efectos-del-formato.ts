// Lo que un formato de PDF no dibuja igual y por eso no se ofrece (docs/DECISIONES.md › Artes): la sombra de cualquier capa (react-pdf no tiene
// desenfoque) y el contorno de un texto (react-pdf no dibuja texto con trazo). Una capa vieja que los traiga se dibuja sin ellos en el lienzo y en
// el PDF: el lienzo nunca muestra lo que el PDF no tendrá. En un formato de imagen, todo. Puro.
import type { CapaDe, CapaDeArte, SombraDeCapa } from '../documento'
import type { TipoDeArte } from '../formatos'

export type EfectosDelFormato = { sombra: boolean; contornoDelTexto: boolean }

export function efectosDelFormato(tipo: TipoDeArte): EfectosDelFormato {
  const todos = tipo !== 'pdf'
  return { sombra: todos, contornoDelTexto: todos }
}

// La sombra que se dibuja de la capa en este formato (nula: ninguna).
export function sombraQueSeDibuja(capa: CapaDeArte, tipo: TipoDeArte): SombraDeCapa | null {
  return efectosDelFormato(tipo).sombra ? capa.sombra : null
}

// El contorno que se dibuja de un texto en este formato (nulo: ninguno).
export function contornoQueSeDibuja(
  capa: CapaDe<'texto'>,
  tipo: TipoDeArte,
): { color: string; grosor: number } | null {
  if (!efectosDelFormato(tipo).contornoDelTexto || capa.borde === null || capa.grosor <= 0) {
    return null
  }
  return { color: capa.borde, grosor: capa.grosor }
}
