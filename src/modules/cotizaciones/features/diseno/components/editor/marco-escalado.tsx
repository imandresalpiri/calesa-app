'use client'

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  escalaDelLienzo,
  MEDIDAS_DE_LAS_VISTAS,
  type AnchoDeLaVistaPrevia,
} from '../../../../entities/diseno/anchos-de-la-vista-previa'

type Props = { vista: AnchoDeLaVistaPrevia; etiqueta: string; children: ReactNode }

// Los controles del lienzo (el «⋯», el «+» entre piezas) se ven a tamaño real aunque el lienzo esté achicado: deshacen su `zoom`.
export const A_TAMANO_REAL = '[zoom:calc(1/var(--zoom-del-lienzo,1))]'

// El marco del lienzo: un hijo de ancho propio en px (412, 1.280 o 1.920; «Texto al 200 %» es 206 con `zoom: 2`), de modo que lo de adentro es la hoja a ese
// ancho (los cortes `@4xl/hoja` y `@5xl` miran al hijo, no a la pantalla), achicado con CSS `zoom` para entrar en lo disponible (nunca agranda). Con `zoom`,
// las medidas del navegador y el puntero coinciden con lo dibujado: el borde de ancho y el arrastre miden en la pantalla.
export function MarcoEscalado({ vista, etiqueta, children }: Props) {
  const caja = useRef<HTMLDivElement>(null)
  const [disponible, setDisponible] = useState(0)
  useLayoutEffect(() => {
    const nodo = caja.current
    if (nodo === null) return undefined
    const medir = () => {
      setDisponible(nodo.clientWidth)
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(nodo)
    return () => {
      observador.disconnect()
    }
  }, [])
  const { ancho, zoom } = MEDIDAS_DE_LAS_VISTAS[vista]
  const escala = escalaDelLienzo(vista, disponible)
  return (
    <div
      ref={caja}
      role="region"
      aria-label={etiqueta}
      data-lienzo-de-la-hoja=""
      data-vista={vista}
      className="max-w-full min-w-0 overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-paper)"
    >
      <div
        style={
          {
            width: ancho,
            zoom: zoom * escala,
            '--zoom-del-lienzo': String(zoom * escala),
          } as CSSProperties
        }
        data-escala={String(escala)}
      >
        {children}
      </div>
    </div>
  )
}
