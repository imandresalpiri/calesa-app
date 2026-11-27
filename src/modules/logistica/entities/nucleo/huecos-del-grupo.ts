import { puede, type Permisos } from '@/shared/lib/permisos'
import type { EntidadDelHueco, HuecoDelGrupo } from './grupo'

/**
 * Los huecos que van en un embarque o en un contenedor, en el orden de la lista: los de esa entidad que piden algún permiso que la persona tenga **en algún origen** (o ninguno). La regla de
 * flujo no se mira: la base vuelve a exigir el permiso por cada unidad al escribir, y el hueco lo dice si alguna no se puede.
 */
export function huecosPara(
  tipo: EntidadDelHueco,
  lista: readonly HuecoDelGrupo[],
  permisos: Permisos,
): HuecoDelGrupo[] {
  return lista.filter(
    (hueco) =>
      hueco.en.includes(tipo) &&
      (hueco.permisos.length === 0 || hueco.permisos.some((clave) => puede(permisos, clave))),
  )
}
