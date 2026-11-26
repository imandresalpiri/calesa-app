'use client'

import { useReactFlow } from '@xyflow/react'
import type { RefObject } from 'react'
import type { Punto } from '../../../../entities/disposicion-del-diagrama'
import { vistaQueMuestra } from '../../../../entities/vista-del-diagrama'
import type { useDiagrama } from './use-diagrama'

type Pedido = {
  diagrama: ReturnType<typeof useDiagrama>
  contenedor: RefObject<HTMLElement | null>
  rem: number
}

// Mover una caja con las flechas del teclado, con la vista detrás: si la caja sale del lienzo, la vista se corre lo justo (`vistaQueMuestra`). Fuera de la
// vista React Flow no la dibuja (`onlyRenderVisibleElements`) y el foco se perdería.
export function useMoverConTeclado({ diagrama: d, contenedor, rem }: Pedido) {
  const { getViewport, setViewport } = useReactFlow()
  const { moverConTeclado, efectivas } = d.posiciones
  const { medidas } = d
  return (faseId: string, paso: Punto) => {
    moverConTeclado(faseId, paso)
    const donde = efectivas.get(faseId)
    const lienzo = contenedor.current?.getBoundingClientRect()
    if (!donde || !lienzo) return
    const caja = {
      x: (donde.x + paso.x) * rem,
      y: (donde.y + paso.y) * rem,
      ancho: medidas.ancho,
      alto: medidas.alto,
    }
    const vista = vistaQueMuestra(
      caja,
      getViewport(),
      { ancho: lienzo.width, alto: lienzo.height },
      2 * rem,
    )
    if (vista) void setViewport(vista)
  }
}
