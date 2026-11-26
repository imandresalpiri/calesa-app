'use client'

import { useRef, type ReactNode } from 'react'
import { cn } from 'cn'
import { useAltoDelLienzo } from '../hooks/use-alto-del-lienzo'
import { ALTO_DEL_LIENZO } from './esqueleto-del-diagrama'

// El marco del diagrama: el esqueleto y el lienzo lo llenan, así miden lo mismo y nada salta al llegar el código. Llega hasta el pie de la ventana
// (`useAltoDelLienzo`); en el servidor, la clase de siempre.
export function MarcoDelLienzo({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const alto = useAltoDelLienzo(ref)
  return (
    <div
      ref={ref}
      data-marco-del-lienzo=""
      style={alto === null ? undefined : { height: alto }}
      className={cn('min-w-0', alto === null && ALTO_DEL_LIENZO)}
    >
      {children}
    </div>
  )
}
