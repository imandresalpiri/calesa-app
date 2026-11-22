import 'server-only'
import { repositorioPerfil } from '../../composicion'
import {
  CLAVE_DE_ULTIMA_PESTANA,
  pestanasRecordadasDesde,
  type PestanasRecordadas,
} from '../../entities/ultima-pestana'

// La última pestaña de cada origen que esta persona abrió (`origenes.ultima_pestana`), por la PK. Si no se puede leer, nada: la entrada al
// origen abre la de siempre, sin aviso.
export async function leerLasPestanasRecordadas(usuarioId: string): Promise<PestanasRecordadas> {
  const leida = await repositorioPerfil.leerPreferencia(usuarioId, CLAVE_DE_ULTIMA_PESTANA)
  return leida.ok ? pestanasRecordadasDesde(leida.data) : {}
}
