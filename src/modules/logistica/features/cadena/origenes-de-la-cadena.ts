import 'server-only'
import { getOrigenes } from '@/modules/origenes'
import { leerFlujoDeOrigen, reglaActiva } from '@/modules/flujos'
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { OrigenDeLaCadena } from '../../entities/cadena/origenes'

// Los orígenes de Logística (6.03-1): los activos donde la persona tiene `logistica.ver` y cuyo flujo de vehículos tiene la regla `logistica` encendida, con las
// reglas activas de ese flujo (deciden las pestañas del origen). Los flujos se leen en paralelo (son decenas). Un origen cuyo flujo no se pudo leer queda en la
// lista con `reglas: null`: mostrar de más se arregla solo al reintentar y la base vuelve a exigir regla y permiso; esconderlo dejaría a la persona sin su origen.
// Lee `getOrigenes(true)` (con los inactivos), la misma lectura en caché que usa la página para nombrar un origen pedido que no está.
export const REGLA_DE_LOGISTICA = 'logistica'

export async function origenesDeLaCadena(permisos: Permisos): Promise<OrigenDeLaCadena[] | null> {
  const origenes = await getOrigenes(true)
  if (!origenes.ok) return null
  const visibles = origenes.data.filter(
    (origen) => origen.activo && puede(permisos, 'logistica.ver', origen.id),
  )
  const flujos = await Promise.all(visibles.map((origen) => leerFlujoDeOrigen(origen.id)))
  return visibles.flatMap((origen, i): OrigenDeLaCadena[] => {
    const flujo = flujos[i]
    const base = { id: origen.id, nombre: origen.nombre, color: origen.color }
    if (flujo === undefined || !flujo.ok) return [{ ...base, reglas: null }]
    if (flujo.data === null || !reglaActiva(flujo.data, REGLA_DE_LOGISTICA)) return []
    return [{ ...base, reglas: flujo.data.reglasActivas }]
  })
}
