'use client'

import { useMemo, type ReactNode } from 'react'
import type { HojaLista } from '../../../entities/hoja'
import type { DelTotal } from '../components/contexto-del-total'
import type { useHoja } from './use-hoja'

// Lo que la región del total dice además de la cifra (`ContextoDelTotal`), memorizado: cambia con el estado del recálculo, «Ver total en moneda local» y lo pisado.
export function useDelTotal({
  hoja,
  h,
  recargar,
  vehiculoSoltado,
  totalGuardado,
  pisadas,
}: {
  hoja: HojaLista
  h: Pick<ReturnType<typeof useHoja>, 'estado' | 'reintentar' | 'verTotalBs'>
  recargar: () => void
  vehiculoSoltado: boolean
  totalGuardado: ReactNode
  pisadas: ReactNode
}): DelTotal {
  const { estado, reintentar, verTotalBs } = h
  const monedaDelTotalBs = verTotalBs ? hoja.cabecera.monedaBs : null
  const { secundarios } = hoja.tarjetaTotal
  return useMemo(
    () => ({
      estado,
      alReintentar: reintentar,
      alRecargar: recargar,
      monedaDelTotalBs,
      secundarios,
      totalGuardado,
      pisadas,
      avisoDelVehiculo: vehiculoSoltado ? 'No se puede usar ese vehículo.' : null,
    }),
    [
      estado,
      reintentar,
      recargar,
      monedaDelTotalBs,
      secundarios,
      totalGuardado,
      pisadas,
      vehiculoSoltado,
    ],
  )
}
