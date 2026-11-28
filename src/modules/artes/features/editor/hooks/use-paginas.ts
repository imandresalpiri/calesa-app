'use client'

import { useMemo } from 'react'
import { MOTIVO_DE_SOLO_LECTURA } from '../../../entities/editor/agregar-en-el-panel'
import {
  maximoDePaginas,
  motivosDeLaPagina,
  type HaciaDondeLaPagina,
  type MotivosDeLaPagina,
} from '../../../entities/editor/paginas'
import type { EditorDeArte } from '../tipos'

export type PaginasDelEditor = {
  // Por qué no se agrega una página (nulo: se puede): el tope o sólo lectura.
  motivoParaAgregar: string | null
  motivosDe: (indice: number) => MotivosDeLaPagina
  ir: (id: string) => void
  agregar: () => void
  duplicar: (id: string) => void
  mover: (id: string, hacia: HaciaDondeLaPagina) => void
  quitar: (id: string) => void
}

// Lo que hace la tira de páginas: ir a una, agregar una en blanco después de la elegida, duplicar, mover y quitar (cada una es un paso del
// historial; ir no), con los motivos de `motivosDeLaPagina()`. En sólo lectura sólo se va de una a otra.
export function usePaginas(editor: EditorDeArte): PaginasDelEditor {
  const { paginas, indice, despachar, tipo, soloLectura } = editor
  const total = paginas.length
  return useMemo(() => {
    const maximo = maximoDePaginas(tipo)
    const lectura = soloLectura ? MOTIVO_DE_SOLO_LECTURA : null
    const motivosDe = (i: number) => motivosDeLaPagina(total, i, maximo, lectura)
    return {
      motivoParaAgregar: motivosDe(indice).agregar,
      motivosDe,
      ir: (id) => {
        despachar({ tipo: 'irAPagina', id })
      },
      agregar: () => {
        despachar({ tipo: 'agregarPagina', nuevoId: crypto.randomUUID(), maximo })
      },
      duplicar: (id) => {
        despachar({ tipo: 'duplicarPagina', id, nuevoId: crypto.randomUUID(), maximo })
      },
      mover: (id, hacia) => {
        despachar({ tipo: 'moverPagina', id, hacia })
      },
      quitar: (id) => {
        despachar({ tipo: 'quitarPagina', id })
      },
    }
  }, [total, indice, despachar, tipo, soloLectura])
}
