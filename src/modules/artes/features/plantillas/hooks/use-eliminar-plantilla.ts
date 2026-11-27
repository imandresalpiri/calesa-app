'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { PlantillaDeArte } from '../../../entities/tipos'
import { eliminarPlantillaDeArte } from '../actions/eliminar-plantilla-de-arte'
import { MENSAJE_DE_VALIDACION_DE_LA_PLANTILLA } from './mensajes'

// «Eliminar» (desde su confirmación): con la versión que se tenía en pantalla; la que ya no estaba no es un error.
export function useEliminarPlantilla() {
  const eliminar = useAction(eliminarPlantillaDeArte)
  return {
    enCurso: eliminar.isPending,
    eliminar: async (plantilla: PlantillaDeArte) => {
      const hecho = await enviarAccion(
        eliminar.executeAsync({ id: plantilla.id, actualizadoEnEsperado: plantilla.actualizadoEn }),
        MENSAJE_DE_VALIDACION_DE_LA_PLANTILLA,
      )
      if (!hecho.ok) {
        avisarError(hecho.error)
        return
      }
      avisarExito(`Plantilla de arte «${plantilla.nombre}» eliminada.`)
    },
  }
}
