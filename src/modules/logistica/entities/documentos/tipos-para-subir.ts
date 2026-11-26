import { claveDeCatalogo } from '@/shared/lib/catalogos/propios'
import type { TipoDeDocumento } from './documento'
import type { RequisitoDeDocumento } from './requisito'

/**
 * Los tipos que se ofrecen al subir: los que lee `leerTiposDeLaUnidad` (los compartidos y los propios del flujo de la unidad) sin los compartidos que tapa un propio de su nombre
 * (mayúsculas, tildes y espacios aparte), salvo los que pide un requisito de las fases siguientes: siguen, rotulados «(tapado)», para que «Qué falta» no se trabe mientras quien
 * configura el flujo lo resuelve. Los tipos leídos son todos activos: todo propio tapa.
 */
export function tiposParaSubir(
  tipos: readonly TipoDeDocumento[],
  requisitos: readonly Pick<RequisitoDeDocumento, 'tipoId'>[],
): TipoDeDocumento[] {
  const tapadas = new Set(
    tipos.filter((t) => t.flujoId !== null).map((t) => claveDeCatalogo(t.nombre)),
  )
  const pedidos = new Set(requisitos.map((r) => r.tipoId))
  return tipos.flatMap((t) => {
    if (t.flujoId !== null || !tapadas.has(claveDeCatalogo(t.nombre))) {
      return [t]
    }
    return pedidos.has(t.id) ? [{ ...t, nombre: `${t.nombre} (tapado)` }] : []
  })
}
