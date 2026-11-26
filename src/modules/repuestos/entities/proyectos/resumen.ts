import { z } from 'zod'

// El proyecto vivo de un vehículo (8.09-4, C1): lo lee `infra/proyectos/resumen.ts` (`proyectoDe`) para el enlace corto de la ficha del vehículo y para
// «Ver el proyecto de repuestos» de sus avisos.

export type ProyectoDeVehiculo = {
  id: string
  numero: number
  // ISO; nulo = abierto.
  cerradoEn: string | null
  actualizadoEn: string
}

export const COLUMNAS_DE_PROYECTO_DE_VEHICULO = 'id, numero, cerrado_en, actualizado_en'

const esquemaDeProyecto = z.object({
  id: z.guid(),
  numero: z.number().int().positive(),
  cerrado_en: z.string().nullable(),
  actualizado_en: z.string(),
})

/** La fila de `repuestos_proyectos`; nulo si no tiene la forma esperada. */
export function proyectoDeVehiculoDesde(dato: unknown): ProyectoDeVehiculo | null {
  const leido = esquemaDeProyecto.safeParse(dato)
  return leido.success
    ? {
        id: leido.data.id,
        numero: leido.data.numero,
        cerradoEn: leido.data.cerrado_en,
        actualizadoEn: leido.data.actualizado_en,
      }
    : null
}
