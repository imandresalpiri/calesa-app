'use client'

import type Konva from 'konva'
import { useEffect } from 'react'
import { factorDeLaRueda } from '../../../entities/editor/camara'
import type { CamaraDelEditor } from '../tipos'
import { enElArea } from './nodos-del-lienzo'

// Una rueda que cuenta en líneas (Firefox) en vez de en px.
const PX_POR_LINEA = 16

// La rueda sobre el lienzo: con Ctrl o ⌘ (y el pellizco del trackpad, que llega así) hace zoom hacia el puntero; si no, desplaza (con Mayús,
// de costado). Escucha sin `passive` para que la página no se desplace ni haga zoom.
export function useRuedaDelLienzo(stage: Konva.Stage | null, camara: CamaraDelEditor): void {
  const { zoomAlPuntero, desplazar } = camara

  useEffect(() => {
    if (!stage) {
      return
    }
    const contenedor = stage.container()
    const alGirar = (evento: WheelEvent) => {
      evento.preventDefault()
      const k = evento.deltaMode === 1 ? PX_POR_LINEA : 1
      if (evento.ctrlKey || evento.metaKey) {
        zoomAlPuntero(enElArea(stage, evento), factorDeLaRueda(evento.deltaY * k))
        return
      }
      const deCostado = evento.shiftKey && evento.deltaX === 0
      desplazar(
        -(deCostado ? evento.deltaY : evento.deltaX) * k,
        -(deCostado ? 0 : evento.deltaY) * k,
      )
    }
    contenedor.addEventListener('wheel', alGirar, { passive: false })
    return () => {
      contenedor.removeEventListener('wheel', alGirar)
    }
  }, [stage, zoomAlPuntero, desplazar])
}
