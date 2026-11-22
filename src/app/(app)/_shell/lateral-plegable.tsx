'use client'

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMenuPlegado } from '@/modules/equipo/shell.client'
import { useAtajo } from '@/shared/ui/atajos'
import { ProveedorPlegadoDelLateral } from './plegado-del-lateral'

type Props = {
  // La <Marca> y la <BarraLateral>, ya armadas en el servidor.
  marca: ReactNode
  navegacion: ReactNode
}

// La barra lateral de escritorio (desde 768 px): desplegada con su nombre y plegada a sólo íconos. El estado es la preferencia `menu.plegado`, que
// el servidor ya leyó: llega dibujada como la dejó la persona. El ancho no se anima: la página de al lado se reacomoda en cada cuadro y el lienzo de la
// tarjeta recalcula su escala. Plegada, cada entrada lleva su nombre en `title` y como texto para el lector (`EnlaceNav`) y los contadores son un punto (`globals.css`).
export function LateralPlegable({ marca, navegacion }: Props) {
  const { plegado, alternar } = useMenuPlegado()
  // `Ctrl/Cmd+B`; en el celular no hay barra que plegar.
  useAtajo('plegarMenu', () => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      alternar()
    }
  })
  const nombre = plegado ? 'Desplegar menú' : 'Plegar menú'
  const Icono = plegado ? PanelLeftOpenIcon : PanelLeftCloseIcon

  return (
    <aside
      data-barra-lateral=""
      data-plegado={plegado ? '' : undefined}
      className="group/lateral sticky top-0 hidden h-dvh w-(--sidebar) shrink-0 flex-col border-r border-(--color-line) bg-(--color-surface) data-plegado:w-(--sidebar-plegado) md:flex"
    >
      <div className="flex h-(--topbar) shrink-0 items-center border-b border-(--color-line) px-4 group-data-plegado/lateral:justify-center group-data-plegado/lateral:px-0">
        {marca}
      </div>
      <ProveedorPlegadoDelLateral value={plegado}>
        <div className="flex-1 overflow-y-auto p-2">{navegacion}</div>
        <div className="shrink-0 border-t border-(--color-line) p-2">
          <button
            type="button"
            aria-keyshortcuts="Control+B Meta+B"
            onClick={alternar}
            title={plegado ? nombre : undefined}
            className="flex h-(--fila) min-h-9 w-full items-center gap-2.5 rounded-(--radius-md) px-2.5 text-(length:--text-sm) text-(--color-ink-soft) outline-none group-data-plegado/lateral:justify-center group-data-plegado/lateral:px-0 hover:bg-(--color-surface-3) hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) [&_svg]:size-4 [&_svg]:shrink-0"
          >
            <Icono aria-hidden />
            <span className="truncate group-data-plegado/lateral:sr-only">{nombre}</span>
          </button>
        </div>
      </ProveedorPlegadoDelLateral>
    </aside>
  )
}
