'use client'

import { useCallback, useState } from 'react'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { MENSAJE_NO_SE_PUEDEN_AGREGAR, PANEL_NUEVO_ITEM } from '../../../entities/items/paneles'
import { TEXTO_DEL_TOPE_DE_LA_HOJA } from '../../../entities/items/hoja'

// «Agregar ítems» en la URL (`?panel=nuevo-item`): se puede recargar y «atrás» lo cierra. Sin permiso para editar, con el proyecto cerrado o con la hoja llena no abre: se avisa y la URL se
// limpia, una vez; ya abierto, que la hoja se llene no lo cierra. `agregados` son los ítems que se agregaron en esta apertura (cada apertura empieza vacía): el drawer los muestra como filas
// editables sobre la fila nueva.
export function useNuevoItemPorUrl({ editable, llena }: { editable: boolean; llena: boolean }) {
  const url = usePanelPorUrl(PANEL_NUEVO_ITEM)
  const apertura = useApertura(url.abierto)
  const motivo = url.abierto
    ? !editable
      ? MENSAJE_NO_SE_PUEDEN_AGREGAR
      : llena
        ? TEXTO_DEL_TOPE_DE_LA_HOJA
        : null
    : null
  const rechazado = useRevisionAlAbrir(url.abierto ? String(apertura) : null, motivo, url.cerrar)
  const [agregados, setAgregados] = useState<{ apertura: number; ids: readonly string[] }>({
    apertura,
    ids: [],
  })
  const ids = agregados.apertura === apertura ? agregados.ids : []
  const agregado = useCallback(
    (id: string) => {
      setAgregados((previo) => ({
        apertura,
        ids: previo.apertura === apertura ? [...previo.ids, id] : [id],
      }))
    },
    [apertura],
  )
  return {
    abierto: url.abierto && !rechazado,
    apertura,
    ids,
    agregado,
    abrir: () => {
      url.abrir()
    },
    cerrar: url.cerrar,
  }
}
