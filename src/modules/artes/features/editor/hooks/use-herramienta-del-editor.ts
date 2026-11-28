'use client'

import { useCallback, useState } from 'react'
import type { HerramientaDelEditor } from '../../../entities/editor/atajos'
import type { PestanaIzquierda } from '../../../entities/editor/paneles'

const DE_SOLO_LECTURA: ReadonlySet<HerramientaDelEditor> = new Set(['mover', 'mano'])

// La herramienta del riel, la mano transitoria (Espacio) y la pestaña del panel izquierdo. «Imagen» no queda elegida: lleva al panel
// «Agregar» y a la biblioteca (`pedidoDeLaBiblioteca` cambia y el panel la trae a la vista). En sólo lectura, sólo mover y la mano.
export function useHerramientaDelEditor(soloLectura: boolean) {
  const [herramienta, setHerramienta] = useState<HerramientaDelEditor>('mover')
  const [manoTransitoria, setManoTransitoria] = useState(false)
  const [pestana, setPestana] = useState<PestanaIzquierda>('agregar')
  const [pedidoDeLaBiblioteca, setPedidoDeLaBiblioteca] = useState(0)
  const elegir = useCallback(
    (otra: HerramientaDelEditor) => {
      if (soloLectura && !DE_SOLO_LECTURA.has(otra)) {
        return
      }
      if (otra === 'imagen') {
        setPestana('agregar')
        setPedidoDeLaBiblioteca((n) => n + 1)
        return
      }
      setHerramienta(otra)
    },
    [soloLectura],
  )
  const volverAMover = useCallback(() => {
    setHerramienta('mover')
  }, [])
  return {
    herramienta,
    elegir,
    volverAMover,
    manoTransitoria,
    setManoTransitoria,
    pestana,
    setPestana,
    pedidoDeLaBiblioteca,
  }
}
