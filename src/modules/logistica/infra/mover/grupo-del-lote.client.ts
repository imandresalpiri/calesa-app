// Las unidades de un contenedor o un embarque (por su id) para el lote, desde el navegador con la sesión de quien mira (6.04-3, D30): la lectura del núcleo (`transporte_unidades()`, que lista sólo lo
// que quien mira ve, con la fase de cada una: nunca una lectura por unidad) y, de ella, las del origen del lote.
import { ok, type Resultado } from '@/shared/lib/errores'
import { delOrigen } from '../../entities/nucleo/unidades-del-grupo'
import { unidadesDelLote, type UnidadDelGrupo } from '../../entities/mover/grupo-del-lote'
import {
  leerVehiculosDelGrupo,
  NO_SE_LEYERON_LOS_VEHICULOS_DEL_GRUPO,
} from '../nucleo/unidades-del-grupo.client'

export const NO_SE_LEYO_EL_GRUPO = NO_SE_LEYERON_LOS_VEHICULOS_DEL_GRUPO

export type PedidoDelGrupo = {
  origenId: string
  tipo: 'contenedor' | 'embarque'
  id: string
}

// Un lote mueve hasta 200 (`TOPE_DEL_LOTE` de `flujos`), lo mismo que lista `transporte_unidades()`: si la base cortó, hay más.
export async function leerUnidadesDelGrupo({
  origenId,
  tipo,
  id,
}: PedidoDelGrupo): Promise<Resultado<{ unidades: UnidadDelGrupo[]; hayMas: boolean }>> {
  const leido = await leerVehiculosDelGrupo({ tipo, id })
  if (!leido.ok) {
    return leido
  }
  return ok({
    unidades: unidadesDelLote(delOrigen(leido.data.vehiculos, origenId)),
    hayMas: leido.data.hayMas,
  })
}
