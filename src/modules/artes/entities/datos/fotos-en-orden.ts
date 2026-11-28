// Las fotos del vehículo como las numera un arte («la foto 1», «la foto 2»…): la portada primero y luego el orden de la galería, hasta
// `MAXIMO_DE_FOTOS_DEL_VEHICULO` (20; el vehículo admite 24 y la 21.ª a la 24.ª no se ofrecen). Puro.
import { MAXIMO_DE_FOTOS_DEL_VEHICULO } from '../capas-del-documento'

export type FotoParaOrdenar = { orden: number; esPortada: boolean }

export function fotosEnOrden<F extends FotoParaOrdenar>(fotos: readonly F[]): F[] {
  return [...fotos]
    .sort((a, b) => Number(b.esPortada) - Number(a.esPortada) || a.orden - b.orden)
    .slice(0, MAXIMO_DE_FOTOS_DEL_VEHICULO)
}
