'use client'

import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { rutaDeLaPlantillaDeArte } from '@/shared/lib/rutas'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { nombreDeLaCopia } from '../../../entities/nombres'
import type { PlantillaDeArte } from '../../../entities/tipos'
import { duplicarPlantillaDeArte } from '../actions/duplicar-plantilla-de-arte'
import { MENSAJE_DE_VALIDACION_DE_LA_PLANTILLA } from './mensajes'
import { anotarLaVuelta } from './vuelta-a-artes'

// «Duplicar»: una copia privada de quien mira, «<nombre> (copia)», en el mismo origen y formato; el aviso ofrece abrirla.
export function useDuplicarPlantilla() {
  const router = useRouter()
  const duplicar = useAction(duplicarPlantillaDeArte)
  return async (plantilla: PlantillaDeArte) => {
    const hecho = await enviarAccion(
      duplicar.executeAsync({
        idNuevo: crypto.randomUUID(),
        fuente: plantilla.id,
        nombre: nombreDeLaCopia(plantilla.nombre),
      }),
      MENSAJE_DE_VALIDACION_DE_LA_PLANTILLA,
    )
    if (!hecho.ok) {
      avisarError(hecho.error)
      return
    }
    avisarExito('Plantilla de arte duplicada.', {
      etiqueta: 'Abrir',
      alHacer: () => {
        anotarLaVuelta()
        router.push(rutaDeLaPlantillaDeArte(hecho.data.id))
      },
    })
  }
}
