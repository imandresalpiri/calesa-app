'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import type { Planilla } from '../../../hooks/use-planilla'
import { BOTON_DEL_MENU } from './menu-de-la-banda'
import { RENGLON } from './submenus-de-la-fila'

type Panel = 'nueva-banda' | 'total'

// El «⋯» de la planilla (D21): «Nueva banda», «Total y tipos de cambio» y «Unidad de ejemplo: volver a ceros» (apagado si ya está en ceros). «¿Cómo se escribe?»
// está a un toque en la barra de fórmula, junto a las operaciones rápidas. Los paneles se abren cuando el menú terminó de cerrarse.
export function MenuDeLaPlanilla({ planilla }: { planilla: Planilla }) {
  const [panel, setPanel] = useState<Panel | null>(null)
  const { paneles } = planilla
  const abrir: Record<Panel, () => void> = {
    'nueva-banda': () => {
      paneles.nuevaBanda.abrir()
    },
    total: () => {
      paneles.total.abrir()
    },
  }
  return (
    <DropdownMenu
      onOpenChange={(abierto) => {
        if (abierto) setPanel(null)
      }}
      onOpenChangeComplete={(abierto) => {
        if (abierto || panel === null) return
        setPanel(null)
        abrir[panel]()
      }}
    >
      <DropdownMenuTrigger aria-label="Más acciones de la planilla" className={BOTON_DEL_MENU}>
        <MoreHorizontalIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-w-(--available-width)">
        <DropdownMenuItem
          className={RENGLON}
          onClick={() => {
            setPanel('nueva-banda')
          }}
        >
          Nueva banda…
        </DropdownMenuItem>
        <DropdownMenuItem
          className={RENGLON}
          onClick={() => {
            setPanel('total')
          }}
        >
          Total y tipos de cambio…
        </DropdownMenuItem>
        <DropdownMenuItem
          className={RENGLON}
          disabled={planilla.enCeros}
          onClick={planilla.volverACeros}
        >
          Unidad de ejemplo: volver a ceros
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
