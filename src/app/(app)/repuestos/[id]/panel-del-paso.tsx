'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { ID_DEL_PANEL_DEL_PASO } from '@/modules/repuestos/pantallas/flujo-pasos'

type Props = {
  titulo: string
  // Lo abrió el botón de un ítem o de un hito: el foco va al título de la pestaña (si no, se quedaría en una fila que ya no se ve).
  enfocar: boolean
  alEnfocar: () => void
  children: ReactNode
}

// El contenido de una pestaña del proyecto que no es la hoja (Cotizaciones, Pagos o Compras): bajo la barra de pestañas y en su mismo lugar. Reserva su alto
// (`min-h-80`) mientras llega, así la página no salta; el título (`h2`) es sólo para quien lee con ayudas y recibe el foco al abrirla desde un ítem.
export function PanelDelPaso({ titulo, enfocar, alEnfocar, children }: Props) {
  const encabezado = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (!enfocar) return
    encabezado.current?.focus()
    encabezado.current?.scrollIntoView({ block: 'nearest' })
    alEnfocar()
  }, [enfocar, alEnfocar])
  return (
    <section
      id={ID_DEL_PANEL_DEL_PASO}
      role="tabpanel"
      aria-labelledby={`${ID_DEL_PANEL_DEL_PASO}-titulo`}
      className="grid min-h-80 min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-3"
    >
      <h2
        id={`${ID_DEL_PANEL_DEL_PASO}-titulo`}
        ref={encabezado}
        tabIndex={-1}
        className="sr-only focus-visible:not-sr-only focus-visible:shadow-(--shadow-focus) focus-visible:outline-none"
      >
        {titulo}
      </h2>
      {children}
    </section>
  )
}
