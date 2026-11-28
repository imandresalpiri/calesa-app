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

// En sólo lectura se elige, se mira y se va de una página a otra (y el lienzo anota el alto que mide de un texto, que no es un cambio): nada
// más llega al reducer.
const SOLO_MIRAR: ReadonlySet<AccionDelEstado['tipo']> = new Set([
  'elegir',
  'elegirEnRecuadro',
  'medirTexto',
  'irAPagina',
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
  const pagina = paginaDe(estado) ?? PAGINA_VACIA
  return {
    estado,
    pagina,
    paginas: estado.documento.paginas,
    indice: Math.max(estado.documento.paginas.indexOf(pagina), 0),
    despachar,
    medidas,
    tipo,
    soloLectura,
  }
}
