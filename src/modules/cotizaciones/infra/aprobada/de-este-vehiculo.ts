// «De este vehículo» desde el servidor, con la sesión de quien mira: la misma lectura que `de-este-vehiculo.client.ts` para una ruta de `src/app`
// (el vehículo de ejemplo del editor de artes, `GET /artes/ejemplo/vehiculos/<id>/cotizaciones`). `cotizaciones_de_este_vehiculo()` es
// invocadora y la RLS decide qué llega. Una página de `TAMANO_DE_ESTE_VEHICULO` y una de más para saber si hay otra, por
// `cotizaciones_vehiculo_creado_idx`; la primera trae además la aprobada (`fijada`). El cursor es opaco: el `siguiente` que devolvió la página
// anterior, tal cual (uno que no se lee pide la primera).
import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { armarPaginaPor, leerCursor, TAMANO_DE_ESTE_VEHICULO } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import {
  paginaDeEsteVehiculoDesde,
  type PaginaLeidaDeEsteVehiculo,
} from '../../entities/aprobada/de-este-vehiculo'

const NO_PUDIMOS = 'No pudimos cargar las cotizaciones de este vehículo.'

export async function getPaginaDeEsteVehiculo({
  vehiculoId,
  cursor: texto,
}: {
  vehiculoId: string
  cursor: string | null
}): Promise<Resultado<PaginaLeidaDeEsteVehiculo>> {
  if (!z.guid().safeParse(vehiculoId).success) {
    return fallo('validacion', 'Ese vehículo no es válido.')
  }
  const leido = leerCursor(texto)
  const cursor = leido?.sentido === 'siguiente' ? leido : null
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cotizaciones_de_este_vehiculo', {
    p_vehiculo: vehiculoId,
    p_tamano: TAMANO_DE_ESTE_VEHICULO,
    ...(cursor === null ? {} : { p_cursor_en: cursor.instante, p_cursor_id: cursor.id }),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeEsteVehiculoDesde(data)
  if (pagina === null) {
    return fallo('inesperado', NO_PUDIMOS)
  }
  // El cursor sale de la última fila de la página, nunca de la fijada.
  const { filas, siguiente } = armarPaginaPor(
    pagina.filas,
    TAMANO_DE_ESTE_VEHICULO,
    cursor,
    (fila) => fila.creadoEn,
  )
  return ok({ fijada: pagina.fijada, filas, siguiente })
}
