'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import type { Caja } from '../../hooks/use-caja-del-bloque'

const SEPARACION = 4
// Lo que tapa la barra fija de arriba: un menú que subiría hasta ahí no se pone encima.
const ALTO_DE_LA_BARRA = 64

// Pone el menú de «/» bajo el párrafo del cursor. Si debajo no cabe en la pantalla y encima sí, lo sube; si no cabe en ningún lado, la página se
// desplaza lo justo. Mueve el nodo a mano (no es estado): se mide con el menú ya puesto y no hay un cuadro con el menú en el lugar equivocado.
export function MenuFlotante({ caja, children }: { caja: Caja; children: ReactNode }) {
  const nodo = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = nodo.current
    if (!el) {
      return
    }
    el.style.top = `${String(caja.top + caja.height + SEPARACION)}px`
    el.style.transform = ''
    const medida = el.getBoundingClientRect()
    if (medida.bottom <= window.innerHeight) {
      return
    }
    const encima = medida.top - caja.height - 2 * SEPARACION - medida.height
    if (encima >= ALTO_DE_LA_BARRA) {
      el.style.top = `${String(caja.top - SEPARACION)}px`
      el.style.transform = 'translateY(-100%)'
      return
    }
    el.scrollIntoView({ block: 'nearest' })
  }, [caja.top, caja.height])
  return (
    <div
      ref={nodo}
      className="absolute z-20"
      style={{ top: caja.top + caja.height + SEPARACION, left: caja.left }}
    >
      {children}
    </div>
  )
}
