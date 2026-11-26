import 'server-only'
import { cache } from 'react'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_PROYECTO_DE_VEHICULO,
  proyectoDeVehiculoDesde,
  type ProyectoDeVehiculo,
} from '../../entities/proyectos/resumen'

const NO_SE_LEYO = 'No se pudo leer el proyecto de repuestos del vehículo.'

// El proyecto vivo de un vehículo (8.09-4, C1), por `repuestos_proyecto_por_vehiculo` (uno por vehículo, vivo) y con la sesión de quien mira: la RLS (`repuestos.ver`) decide.
// Nulo = no hay proyecto o no se ve: no se distingue (D49). Un id que ni es guid no se consulta. `cache()`: en la ficha del vehículo lo piden el enlace
// corto de la cabecera y los avisos («Ver el proyecto de repuestos»), en el mismo pedido.
export const proyectoDe = cache(async function proyectoDe(
  vehiculoId: string,
): Promise<Resultado<ProyectoDeVehiculo | null>> {
  if (!z.guid().safeParse(vehiculoId).success) {
    return ok(null)
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repuestos_proyectos')
    .select(COLUMNAS_DE_PROYECTO_DE_VEHICULO)
    .eq('vehiculo_id', vehiculoId)
    .is('eliminado_en', null)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const fila = data[0]
  if (fila === undefined) {
    return ok(null)
  }
  const proyecto = proyectoDeVehiculoDesde(fila)
  return proyecto === null ? fallo('inesperado', NO_SE_LEYO) : ok(proyecto)
})
