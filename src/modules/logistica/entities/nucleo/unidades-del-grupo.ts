import { z } from 'zod'

// Los vehículos de un embarque o un contenedor (por su id) tal como los lista `transporte_unidades()` (hasta 200, los que quien mira ve), en la forma mínima que usan el lote de `mover`, la subida a un grupo de `documentos` y el prorrateo de `dinero`. Está en el núcleo porque un área no importa otra.
// Los ítems de repuesto del grupo no entran: ninguno de los tres los usa.

export type VehiculoDelGrupo = {
  vehiculoId: string
  titulo: string
  origenId: string
  faseId: string | null
  fase: string | null
  faseOrden: number | null
}

export type VehiculosDelGrupo = {
  vehiculos: VehiculoDelGrupo[]
  // La base cortó en 200 unidades: hay más de las que llegaron.
  hayMas: boolean
}

const esquema = z.object({
  unidades: z.array(
    z.object({
      vehiculo_id: z.guid().nullable(),
      titulo: z.string().nullable(),
      origen_id: z.guid().nullable(),
      fase_id: z.guid().nullable(),
      fase: z.string().nullable(),
      fase_orden: z.number().nullable(),
    }),
  ),
  hay_mas: z.boolean(),
})

/** Lo que devolvió `transporte_unidades()`, sólo los vehículos (una vez cada uno); nulo si no tiene la forma esperada. */
export function vehiculosDelGrupoDesde(datos: unknown): VehiculosDelGrupo | null {
  const leido = esquema.safeParse(datos)
  if (!leido.success) {
    return null
  }
  const vistos = new Set<string>()
  const vehiculos: VehiculoDelGrupo[] = []
  for (const u of leido.data.unidades) {
    if (u.vehiculo_id === null || u.origen_id === null || vistos.has(u.vehiculo_id)) {
      continue
    }
    vistos.add(u.vehiculo_id)
    vehiculos.push({
      vehiculoId: u.vehiculo_id,
      titulo: u.titulo ?? 'Sin título',
      origenId: u.origen_id,
      faseId: u.fase_id,
      fase: u.fase,
      faseOrden: u.fase_orden,
    })
  }
  return { vehiculos, hayMas: leido.data.hay_mas }
}

/** Por título y luego por id: el mismo orden en cada apertura («a las primeras» de un reparto no cambia). */
export function porTitulo(vehiculos: readonly VehiculoDelGrupo[]): VehiculoDelGrupo[] {
  return [...vehiculos].sort(
    (a, b) => a.titulo.localeCompare(b.titulo, 'es') || a.vehiculoId.localeCompare(b.vehiculoId),
  )
}

/** Sólo los de un origen (el lote no mezcla orígenes), por título. */
export function delOrigen(
  vehiculos: readonly VehiculoDelGrupo[],
  origenId: string,
): VehiculoDelGrupo[] {
  return porTitulo(vehiculos.filter((v) => v.origenId === origenId))
}
