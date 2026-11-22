'use client'

import { motivosPorCampo } from '@/shared/lib/campos/esquema-de-valor'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import type { EdicionDePolitica, PoliticaDeLaCola } from '../../../../entities/cola/politica'
import { guardarPoliticaDeLaCola } from '../actions/guardar-politica'
import { esquemaPoliticaDeLaCola } from '../schemas/politica'

type Opciones = {
  // Lo guardado al abrir el modal, con su versión: llega por props y nunca va en la `key`.
  politica: PoliticaDeLaCola
  abierto: boolean
  alCerrar: () => void
  // Lo escrito. Un número que no es tal (`NaN`) no pasa el esquema y vuelve junto a su campo.
  edicion: EdicionDePolitica
  hayCambios: boolean
}

// El guardado de la política en su modal: la versión de la fila va con lo escrito y un `PT409` deja el aviso con «Recargar», que conserva lo tipeado. Lo escrito
// queda siempre: si algo falla, el motivo va junto a su campo. Sin cambios, guardar cierra.
export function useEnvioDeLaPolitica({
  politica,
  abierto,
  alCerrar,
  edicion,
  hayCambios,
}: Opciones) {
  const entrada = { ...edicion, actualizadoEnEsperado: politica.actualizadoEn }
  return useEnvioConVersion({
    abierto,
    hayCambios,
    version: politica.actualizadoEn,
    validar: () => {
      if (!hayCambios) {
        return null
      }
      const leido = esquemaPoliticaDeLaCola.safeParse(entrada)
      return leido.success ? null : motivosPorCampo(leido.error.issues)
    },
    pedir: async () =>
      hayCambios
        ? enviarAccion(
            guardarPoliticaDeLaCola(entrada),
            'No se pudo guardar la política de la cola.',
          )
        : { ok: true, data: { actualizadoEn: politica.actualizadoEn } },
    alGuardar: () => {
      if (hayCambios) {
        avisarExito('Guardaste la política de la cola.')
      }
      alCerrar()
    },
  })
}
