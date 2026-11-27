'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import type { PlantillaDeArte, VisibilidadDeArte } from '../../../entities/tipos'
import { cambiarVisibilidadDeLaPlantilla } from '../actions/cambiar-visibilidad-de-la-plantilla'
import { MENSAJE_DE_VALIDACION_DE_LA_PLANTILLA } from './mensajes'

function textoDelCambio(plantilla: PlantillaDeArte, a: VisibilidadDeArte): string {
  return a === 'empresa'
    ? `${plantilla.nombre} ahora es de la empresa: la ve quien ve cotizaciones de su origen.`
    : `${plantilla.nombre} ahora es privada.`
}

// «Hacerla de la empresa» y «Hacerla privada», con la versión que se tenía en pantalla. Con `deshacer`, el aviso ofrece volver atrás con la
// versión que dejó el cambio (no la de otra persona que la privada sobre otra la pierde de vista: esa pasa por su confirmación).
export function useVisibilidadDeLaPlantilla() {
  const visibilidad = useAction(cambiarVisibilidadDeLaPlantilla)
  async function cambiar(
    plantilla: PlantillaDeArte,
    a: VisibilidadDeArte,
    deshacer: boolean,
  ): Promise<boolean> {
    const hecho = await enviarAccion(
      visibilidad.executeAsync({
        id: plantilla.id,
        actualizadoEnEsperado: plantilla.actualizadoEn,
        visibilidad: a,
      }),
      MENSAJE_DE_VALIDACION_DE_LA_PLANTILLA,
    )
    if (!hecho.ok) {
      avisarError(hecho.error)
      return false
    }
    if (!deshacer) {
      avisarExito(textoDelCambio(plantilla, a))
      return true
    }
    const cambiada = { ...plantilla, actualizadoEn: hecho.data.actualizado_en }
    avisarConDeshacer(textoDelCambio(plantilla, a), () => {
      void cambiar(cambiada, a === 'empresa' ? 'privada' : 'empresa', false)
    })
    return true
  }
  return { cambiar, enCurso: visibilidad.isPending }
}
