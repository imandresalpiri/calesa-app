// Las líneas del «⋯» de la barra del editor de artes, en su orden: exportar el PNG (en un formato de PDF, el de la página que se ve), duplicar
// en otro formato y la lista de atajos. Puro: la barra le pone a cada línea lo que hace.
import { tipoDelFormato, type ClaveDeFormato } from '../formatos'

export type ClaveDelMenuDelEditor = 'exportar-png' | 'otro-formato' | 'atajos'

export type LineaDelMenuDelEditor =
  | { tipo: 'accion'; clave: ClaveDelMenuDelEditor; etiqueta: string; deshabilitada: boolean }
  | { tipo: 'separador'; clave: string }

export function lineasDelMenuDelEditor(formato: ClaveDeFormato): LineaDelMenuDelEditor[] {
  const esPdf = tipoDelFormato(formato) === 'pdf'
  return [
    {
      tipo: 'accion',
      clave: 'exportar-png',
      etiqueta: esPdf ? 'Exportar esta página en PNG' : 'Exportar PNG',
      deshabilitada: false,
    },
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
