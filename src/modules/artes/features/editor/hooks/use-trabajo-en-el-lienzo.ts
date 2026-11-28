'use client'

import { useState, type RefObject } from 'react'
import type { Medidas } from '../../../entities/formatos'
import type { EditorDeArte, ManejoDelLienzo } from '../tipos'
import { useAgregar } from './use-agregar'
import { useAtajosDelEditor } from './use-atajos-del-editor'
import { useCamara } from './use-camara'
import { useHerramientaDelEditor } from './use-herramienta-del-editor'
import { useTamanoDelLienzo } from './use-tamano-del-lienzo'

type Args = {
  editor: EditorDeArte
  medidas: Medidas
  soloLectura: boolean
  lienzo: RefObject<ManejoDelLienzo | null>
}

// Lo que se trabaja sobre el lienzo: la herramienta, el tamaño de su celda (`alContenedor` va como `ref` de la celda), la cámara, agregar en
// el centro de lo que se ve y los atajos del teclado.
export function useTrabajoEnElLienzo({ editor, medidas, soloLectura, lienzo }: Args) {
  const h = useHerramientaDelEditor(soloLectura)
  const [contenedor, setContenedor] = useState<HTMLElement | null>(null)
  const tamano = useTamanoDelLienzo(contenedor)
  const camara = useCamara(tamano, medidas)
  const agregar = useAgregar({ editor, camara, tamano, alAgregar: h.volverAMover })
  useAtajosDelEditor({
    editor,
    lienzo,
    camara,
    alElegirHerramienta: h.elegir,
    alManoTransitoria: h.setManoTransitoria,
  })
  return { h, alContenedor: setContenedor, tamano, camara, agregar }
}
