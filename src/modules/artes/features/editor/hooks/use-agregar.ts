'use client'

import { useCallback } from 'react'
import { avisar } from '@/shared/ui/toasts'
import { hayLugar, MENSAJE_DEL_TOPE_DE_CAPAS } from '../../../entities/editor/acciones-de-capas'
import { alDocumento } from '../../../entities/editor/camara'
import { nuevaCapa, type QueSeAgrega } from '../../../entities/editor/capas-nuevas'
import type { Medidas } from '../../../entities/formatos'
import type { CamaraDelEditor, EditorDeArte } from '../tipos'

type Args = {
  editor: EditorDeArte
  camara: CamaraDelEditor
  tamano: Medidas | null
  alAgregar: () => void
}

// «Agregar»: la capa nueva va al centro de lo que se ve del lienzo (o del documento, si todavía no se midió), queda elegida y la herramienta
// vuelve a «mover». En el tope de capas lo dice y no agrega nada.
export function useAgregar({ editor, camara, tamano, alAgregar }: Args) {
  const { despachar, medidas, pagina, soloLectura } = editor
  return useCallback(
    (que: QueSeAgrega) => {
      if (soloLectura) {
        return
      }
      if (!hayLugar(pagina)) {
        avisar(MENSAJE_DEL_TOPE_DE_CAPAS)
        return
      }
      const centro = tamano
        ? alDocumento(camara.camara, { x: tamano.ancho / 2, y: tamano.alto / 2 })
        : { x: medidas.ancho / 2, y: medidas.alto / 2 }
      const capa = nuevaCapa(que, { id: crypto.randomUUID(), medidas, centro })
      despachar({ tipo: 'agregar', capas: [capa] })
      alAgregar()
    },
    [soloLectura, pagina, tamano, camara.camara, medidas, despachar, alAgregar],
  )
}
