'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import { nombreDelTipo, tipoDelFormato } from '../../../entities/formatos'
import { porDefectoDelLugar } from '../../../entities/por-defecto'
import type { PlantillaDeArte, PorDefecto } from '../../../entities/tipos'
import { ponerPorDefecto } from '../actions/poner-por-defecto'
import { MENSAJE_DE_VALIDACION_DE_LA_PLANTILLA } from './mensajes'

// «Usar por defecto para imagen en <Origen>» y «Quitar como por defecto»: la de quien mira, una por origen y tipo, con la versión del lugar que
// tenía en pantalla (nula si no tenía: si ya hay una, `PT409`). Quitar es reversible: el aviso ofrece «Deshacer».
export function usePorDefectoDeArtes(
  porDefecto: readonly PorDefecto[],
  nombreDelOrigen: (id: string) => string,
) {
  const poner = useAction(ponerPorDefecto)
  return async (plantilla: PlantillaDeArte, usar: boolean) => {
    const tipo = tipoDelFormato(plantilla.formato)
    const lugar = porDefectoDelLugar(porDefecto, plantilla.origenId, tipo)
    const pedido = {
      origenId: plantilla.origenId,
      tipo,
      plantillaId: usar ? plantilla.id : null,
      actualizadoEnEsperado: lugar?.actualizadoEn ?? null,
    }
    const hecho = await enviarAccion(
      poner.executeAsync(pedido),
      MENSAJE_DE_VALIDACION_DE_LA_PLANTILLA,
    )
    if (!hecho.ok) {
      avisarError(hecho.error)
      return
    }
    const donde = `${nombreDelTipo(tipo)} en ${nombreDelOrigen(plantilla.origenId)}`
    if (usar) {
      avisarExito(`Ahora ${plantilla.nombre} es tu plantilla por defecto para ${donde}.`)
      return
    }
    avisarConDeshacer(
      `${plantilla.nombre} ya no es tu plantilla por defecto para ${donde}.`,
      () => {
        const deshacer = { ...pedido, plantillaId: plantilla.id, actualizadoEnEsperado: null }
        void enviarAccion(poner.executeAsync(deshacer), MENSAJE_DE_VALIDACION_DE_LA_PLANTILLA).then(
          (deshecho) => {
            if (!deshecho.ok) avisarError(deshecho.error)
          },
        )
      },
    )
  }
}
