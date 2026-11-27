'use client'

import { recordarQuienAbre } from '@/shared/ui/foco-de-quien-abre'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { DocumentoDeLaUnidad } from '../../../entities/documentos/documento'
import {
  CLAVE_DE_DOCUMENTO,
  documentoDeLaUrl,
  motivoParaNoAbrirDocumento,
  PANEL_EDITAR_DOCUMENTO,
  PANEL_ELIMINAR_DOCUMENTO,
} from '../../../entities/documentos/paneles-de-documento'
import type { ClavesDeDocumentos } from '../../../entities/documentos/revision'

// Un diálogo de un documento en la URL (`?panel=eliminar-documento|editar-documento&documento=<id>`): se puede recargar y «atrás» lo cierra. Un documento que no está o sin el permiso (aprobar o subir)
// no abre: se avisa y la URL se limpia, una vez, con la lista ya leída. Mientras se va, el diálogo conserva el último documento que vio.
function useDocumentoPorUrl(
  panel: string,
  documentos: readonly DocumentoDeLaUnidad[] | null,
  claves: ClavesDeDocumentos,
) {
  const url = usePanelPorUrl(panel, [CLAVE_DE_DOCUMENTO])
  const id = url.valor(CLAVE_DE_DOCUMENTO)
  const apertura = useApertura(url.abierto)
  const encontrado = documentoDeLaUrl(documentos, id)
  const leidos = claves.aprobar !== null && claves.subir !== null
  const revisar = url.abierto && documentos !== null && leidos
  const rechazada = useRevisionAlAbrir(
    revisar ? `${String(apertura)}:${id ?? ''}` : null,
    revisar
      ? motivoParaNoAbrirDocumento({
          valor: id,
          encontrado,
          puede: claves.aprobar === true || claves.subir === true,
        })
      : null,
    url.cerrar,
  )
  const documento = useUltimo(revisar && !rechazada ? encontrado : null)
  return {
    abierto: revisar && !rechazada,
    apertura,
    documento,
    abrir: (documentoId: string) => {
      recordarQuienAbre()
      url.abrir({ [CLAVE_DE_DOCUMENTO]: documentoId })
    },
    cerrar: url.cerrar,
  }
}

type Documentos = readonly DocumentoDeLaUnidad[] | null

/** `?panel=eliminar-documento&documento=<id>`: la confirmación de eliminar. */
export const useEliminarDocumentoPorUrl = (documentos: Documentos, claves: ClavesDeDocumentos) =>
  useDocumentoPorUrl(PANEL_ELIMINAR_DOCUMENTO, documentos, claves)

/** `?panel=editar-documento&documento=<id>`: el modal de editar las fechas y la nota. */
export const useEditarDocumentoPorUrl = (documentos: Documentos, claves: ClavesDeDocumentos) =>
  useDocumentoPorUrl(PANEL_EDITAR_DOCUMENTO, documentos, claves)

export type DocumentoPorUrl = ReturnType<typeof useDocumentoPorUrl>
