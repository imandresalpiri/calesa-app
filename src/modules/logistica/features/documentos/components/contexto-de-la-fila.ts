import type { ClavesDeDocumentos } from '../../../entities/documentos/revision'
import type { TipoDeDocumento } from '../../../entities/documentos/documento'
import type { Miniaturas } from '../hooks/use-miniaturas'

// Lo que el hueco le pasa a cada fila de documento y a su vista previa: la unidad (para avisar que cambió algo), los permisos de quien mira, los tipos (el portal depende del tipo), cómo volver a leer
// la lista, las miniaturas de la lista y cómo abrir lo que el «⋯» ofrece (la vista previa, rechazar con su motivo, editar, eliminar).
export type ContextoDeLaFila = {
  unidadId: string
  claves: ClavesDeDocumentos
  tipos: readonly TipoDeDocumento[]
  releer: () => void
  miniaturas: Miniaturas
  // Abre la vista previa de ese documento (`?documento=<id>`).
  alVer: (documentoId: string) => void
  // Abre la vista previa con el campo del motivo a mano: no se rechaza sin mirar el archivo.
  alRechazar: (documentoId: string) => void
  // Abre el modal de editar sus fechas y su nota (`?panel=editar-documento&documento=<id>`).
  alEditar: (documentoId: string) => void
  // Abre el diálogo de eliminar ese documento (por la URL).
  alEliminar: (documentoId: string) => void
}
