// Las líneas del «⋯» de la barra del editor de artes, en su orden: exportar el PNG (apagado en un formato de PDF, con su nota), duplicar en
// otro formato y la lista de atajos. Puro: la barra le pone a cada línea lo que hace.
import { tipoDelFormato, type ClaveDeFormato } from '../formatos'
import { MENSAJE_SIN_PDF } from './exportar'

export type ClaveDelMenuDelEditor = 'exportar-png' | 'otro-formato' | 'atajos'

export type LineaDelMenuDelEditor =
  | { tipo: 'accion'; clave: ClaveDelMenuDelEditor; etiqueta: string; deshabilitada: boolean }
  | { tipo: 'separador'; clave: string }
  | { tipo: 'nota'; clave: string; texto: string }

export function lineasDelMenuDelEditor(formato: ClaveDeFormato): LineaDelMenuDelEditor[] {
  const esPdf = tipoDelFormato(formato) === 'pdf'
  return [
    { tipo: 'accion', clave: 'exportar-png', etiqueta: 'Exportar PNG', deshabilitada: esPdf },
    ...(esPdf ? [{ tipo: 'nota', clave: 'sin-pdf', texto: MENSAJE_SIN_PDF } as const] : []),
    {
      tipo: 'accion',
      clave: 'otro-formato',
      etiqueta: 'Duplicar en otro formato',
      deshabilitada: false,
    },
    { tipo: 'separador', clave: 'separador-de-la-ayuda' },
    { tipo: 'accion', clave: 'atajos', etiqueta: 'Atajos de teclado', deshabilitada: false },
  ]
}
