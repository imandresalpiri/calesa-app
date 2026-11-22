'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { LeyendaDeTipos } from './leyenda-de-tipos'

// «?» junto a la barra de fórmula: los ocho tipos de celda con el fondo que les da la columna C, en un popover (no a la vista: la planilla lleva sólo la guía de
// la barra).
export function TiposDeCelda({ className }: { className: string }) {
  return (
    <Popover>
      <PopoverTrigger aria-label="Tipos de celda" title="Tipos de celda" className={className}>
        ?
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 max-w-(--available-width)">
        <p className="font-semibold">Tipos de celda</p>
        <LeyendaDeTipos />
      </PopoverContent>
    </Popover>
  )
}
