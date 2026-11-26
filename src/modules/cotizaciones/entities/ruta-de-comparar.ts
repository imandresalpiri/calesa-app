import { z } from 'zod'
import { RUTAS } from '@/shared/lib/rutas'

// «Comparar cotizaciones» (`docs/GLOSARIO.md`): `/cotizaciones/comparar?ids=a,b[,c]&returnTo=`. Va en el núcleo porque la escriben dos áreas («De este vehículo» del área
// `aprobada` y el modal de un grupo de la lista agrupada del área `listado`). El orden de `ids` es el de las columnas: la primera es la referencia.
export const MINIMO_PARA_COMPARAR = 2
export const MAXIMO_PARA_COMPARAR = 3

export const RUTA_DE_COMPARAR = `${RUTAS.cotizaciones}/comparar`
export const CLAVE_DE_IDS = 'ids'

// El único lugar que escribe esa ruta. Los ids son guids (no llevan nada que escapar); `volverA` sí.
export function rutaDeComparar(ids: readonly string[], volverA?: string): string {
  const base = `${RUTA_DE_COMPARAR}?${CLAVE_DE_IDS}=${ids.join(',')}`
  return volverA === undefined ? base : `${base}&returnTo=${encodeURIComponent(volverA)}`
}

const esquemaDeIds = z
  .array(z.guid())
  .min(MINIMO_PARA_COMPARAR)
  .max(MAXIMO_PARA_COMPARAR)
  .refine((ids) => new Set(ids).size === ids.length)

// `?ids=` leído: 2 o 3 guids distintos, en minúsculas y en el orden de la URL; cualquier otra cosa es nulo (la página dice lo mismo para todo).
export function idsParaComparar(valor: string | undefined): string[] | null {
  if (valor === undefined) {
    return null
  }
  const ids = valor.split(',').map((id) => id.trim().toLowerCase())
  const leidos = esquemaDeIds.safeParse(ids)
  return leidos.success ? leidos.data : null
}
