'use client'

import { useCallback, useReducer } from 'react'
import type { DocumentoDeArte, PaginaDeArte } from '../../../entities/documento'
import {
  estadoInicial,
  paginaDe,
  reducirEditor,
  type AccionDelEstado,
} from '../../../entities/editor/estado'
import type { Medidas, TipoDeArte } from '../../../entities/formatos'
import type { EditorDeArte } from '../tipos'

// En sólo lectura se elige y se mira (y el lienzo anota el alto que mide de un texto, que no es un cambio): nada más llega al reducer.
const SOLO_MIRAR: ReadonlySet<AccionDelEstado['tipo']> = new Set([
  'elegir',
  'elegirEnRecuadro',
  'medirTexto',
])

const PAGINA_VACIA: PaginaDeArte = {
  id: 'pagina-1',
  fondo: { tipo: 'color', color: '#ffffff' },
  capas: [],
  grupos: [],
}

// El estado del editor de artes: el documento con su historial y lo elegido, en el reducer puro (`reducirEditor`). `despachar` es estable.
export function useEditorDeArte(
  documento: DocumentoDeArte,
  medidas: Medidas,
  soloLectura: boolean,
  tipo: TipoDeArte,
): EditorDeArte {
  const [estado, despacharAlReducer] = useReducer(reducirEditor, documento, estadoInicial)
  const despachar = useCallback(
    (accion: AccionDelEstado) => {
      if (soloLectura && !SOLO_MIRAR.has(accion.tipo)) {
        return
      }
      despacharAlReducer(accion)
    },
    [soloLectura],
  )
  return {
    estado,
    pagina: paginaDe(estado.documento) ?? PAGINA_VACIA,
    despachar,
    medidas,
    tipo,
    soloLectura,
  }
}
