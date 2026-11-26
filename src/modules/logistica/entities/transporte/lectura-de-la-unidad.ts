import { z } from 'zod'
import type { ConteoAcotado } from '@/shared/lib/conteo'
import { ESTADOS_DEL_CONTENEDOR, type EstadoDelContenedor, type EstadoDelEmbarque } from './estado'
import { transporteDesde, type Transporte } from './transporte'

// Lo que lee el hueco «Transporte» de un vehículo (`transporte_leer`): la fila con lo de su embarque ya puesto (naviera, puertos y fechas del embarque, si va en uno) y, aparte, el embarque y
// el contenedor en que va, con su versión (la que se manda al guardar), su estado y cuántos vehículos visibles llevan (hasta 100, y si hay otros que quien mira no ve).

/** Los vehículos de un embarque o contenedor que ve quien mira (hasta 100: `hayMas` es «100+») y si hay más que no ve. */
export type VehiculosDeLaEntidad = ConteoAcotado & { hayOcultas: boolean }

export type EmbarqueDeLaUnidad = {
  id: string
  booking: string
  actualizadoEn: string
  estado: EstadoDelEmbarque
  vehiculos: VehiculosDeLaEntidad
}

export type ContenedorDeLaUnidad = {
  id: string
  numero: string
  actualizadoEn: string
  estado: EstadoDelContenedor
  vehiculos: VehiculosDeLaEntidad
}

/** En qué embarque y en qué contenedor va la unidad (nulos si va suelta). */
export type EntidadesDeLaUnidad = {
  embarque: EmbarqueDeLaUnidad | null
  contenedorDeLaUnidad: ContenedorDeLaUnidad | null
}

export type LecturaDelTransporte = EntidadesDeLaUnidad & { transporte: Transporte }

const esquemaDeVehiculos = z
  .object({ n: z.number().int().nonnegative(), hay_mas: z.boolean(), hay_ocultas: z.boolean() })
  .transform((v) => ({ n: v.n, hayMas: v.hay_mas, hayOcultas: v.hay_ocultas }))

const esquemaDeEntidades = z.object({
  embarque: z
    .object({
      id: z.guid(),
      booking: z.string(),
      actualizado_en: z.string(),
      estado: z.enum(['armandose', 'en_transito', 'llego', 'entregado']),
      vehiculos: esquemaDeVehiculos,
    })
    .nullable(),
  contenedor: z
    .object({
      id: z.guid(),
      numero: z.string(),
      actualizado_en: z.string(),
      estado: z.enum(ESTADOS_DEL_CONTENEDOR),
      vehiculos: esquemaDeVehiculos,
    })
    .nullable(),
})

/**
 * Lo que devolvió `transporte_leer`: nulo (la unidad todavía no tiene transporte) o la lectura; `undefined` si no tiene la forma esperada (la base cambió sin la interfaz: se dice
 * «No se pudo cargar», nunca se muestra a medias).
 */
export function lecturaDelTransporteDesde(datos: unknown): LecturaDelTransporte | null | undefined {
  if (datos === null) {
    return null
  }
  const transporte = transporteDesde(datos)
  const entidades = z.object({ entidades: esquemaDeEntidades }).safeParse(datos)
  if (transporte === null || !entidades.success) {
    return undefined
  }
  const { embarque, contenedor } = entidades.data.entidades
  return {
    transporte,
    embarque: embarque && {
      id: embarque.id,
      booking: embarque.booking,
      actualizadoEn: embarque.actualizado_en,
      estado: embarque.estado,
      vehiculos: embarque.vehiculos,
    },
    contenedorDeLaUnidad: contenedor && {
      id: contenedor.id,
      numero: contenedor.numero,
      actualizadoEn: contenedor.actualizado_en,
      estado: contenedor.estado,
      vehiculos: contenedor.vehiculos,
    },
  }
}

/** Las versiones que el guardado manda de vuelta: la base rechaza con `PT409` si el embarque o el contenedor cambiaron desde esta lectura. */
export function versionesDeLasEntidades(lectura: EntidadesDeLaUnidad | null): {
  embarqueEsperado: string | null
  contenedorEsperado: string | null
} {
  return {
    embarqueEsperado: lectura?.embarque?.actualizadoEn ?? null,
    contenedorEsperado: lectura?.contenedorDeLaUnidad?.actualizadoEn ?? null,
  }
}
