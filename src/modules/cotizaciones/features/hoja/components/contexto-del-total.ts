'use client'

import { createContext, type ReactNode } from 'react'
import type { HojaLista } from '../../../entities/hoja'
import type { EstadoDeRecalculo } from '../../../entities/recalculo'

// Lo que la región del total (`RegionDelTotal`) dice además de la cifra: lo proveen `HojaDeCotizar` y `HojaEnPar`, porque la tarjeta del total vive dentro de una sección
// (la pieza `{ tipo: 'total' }`, por `SeccionDeHoja` → `ItemDeHoja`) y pasarlo por props atravesaría el núcleo de la hoja. Sin él (el lienzo del editor, la hoja de prueba),
// la tarjeta sola.
export type DelTotal = {
  estado: EstadoDeRecalculo
  alReintentar: () => void
  alRecargar: () => void
  // La moneda local del total con «Ver total en moneda local» encendido; nula, no se dibuja.
  monedaDelTotalBs: string | null
  secundarios: HojaLista['tarjetaTotal']['secundarios']
  // El total con que se guardó (`<TotalGuardado>`, C11), lo pisado (`ListaDePisadasDiferida`) y lo que se dice del vehículo de la URL que no se pudo usar.
  totalGuardado: ReactNode
  pisadas: ReactNode
  avisoDelVehiculo: string | null
}

export const ContextoDelTotal = createContext<DelTotal | null>(null)
