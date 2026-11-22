'use client'

import { useCallback } from 'react'
import {
  leerOpcionesCon,
  type OpcionesDelDato,
  type TablaDelDato,
} from '../../../entities/dato-del-vehiculo'
import type { Resultado } from '@/shared/lib/errores'
import { memoriaDeLaTabla } from './memoria-de-tablas'

export type LectorDeOpciones = (
  tablas: readonly TablaDelDato[],
) => Promise<Resultado<OpcionesDelDato>>

// Las opciones de un dato del vehículo (las filas de sus tablas en `cotizacion_tabla` con la hoja abierta: lo que el nivel de quien mira ve). No lee nada al montarse: lee quien
// llama, al abrir el panel. Lo usa la página de cotizar para armar el grupo del panel del vehículo (`vehiculos` no conoce `cotizaciones`).
export function useLectorDeOpciones({
  origenId,
  abierta,
}: {
  origenId: string
  abierta: string
}): LectorDeOpciones {
  return useCallback(
    (tablas) =>
      leerOpcionesCon(
        (tabla) =>
          memoriaDeLaTabla({ tipo: 'abierta', origenId, abierta, vehiculoId: null }, tabla).leer(),
        tablas,
      ),
    [origenId, abierta],
  )
}
