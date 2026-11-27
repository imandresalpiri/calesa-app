'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'

// Un `AAAA-MM-DD` de un embarque como lo lee la persona («12 nov 2026»), en la zona de la empresa (un día del calendario no se corre).
export function useDia() {
  const { zonaHoraria } = useRegional()
  return (fecha: string) => formatearFecha(fecha, { zona: zonaHoraria })
}
