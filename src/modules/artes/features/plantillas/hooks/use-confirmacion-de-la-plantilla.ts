'use client'

import type { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CLAVE_DE_LA_PLANTILLA } from '../../../entities/paneles'
import type { PlantillaDeArte } from '../../../entities/tipos'
import { useFilaPorUrl } from './use-fila-por-url'

export const MENSAJE_DE_PLANTILLA_QUE_NO_ESTA = 'Esa plantilla de arte ya no está en la lista.'

// Una confirmación sobre una plantilla de arte, en la URL (`?panel=eliminar|privada&plantilla=<id>`).
export function useConfirmacionDeLaPlantilla(
  url: ReturnType<typeof usePanelPorUrl>,
  porId: (id: string | null) => PlantillaDeArte | null,
) {
  const { fila, ...resto } = useFilaPorUrl(
    url,
    CLAVE_DE_LA_PLANTILLA,
    porId,
    MENSAJE_DE_PLANTILLA_QUE_NO_ESTA,
  )
  return { ...resto, plantilla: fila }
}

export type ConfirmacionDeLaPlantilla = ReturnType<typeof useConfirmacionDeLaPlantilla>
