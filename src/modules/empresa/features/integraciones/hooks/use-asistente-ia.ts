'use client'

import { useAction } from 'next-safe-action/hooks'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { guardarAsistente } from '../actions/guardar-asistente'
import { probarAsistente } from '../actions/probar-asistente'

// El interruptor del asistente de IA (guarda al instante) y «Probar conexión», que no escribe: su resultado lo dibuja la tarjeta. `version`
// es el `actualizado_en` de su fila; el proveedor, las indicaciones y la clave se editan en sus modales.
export function useAsistenteIa(version: string) {
  const guardando = useAction(guardarAsistente)
  const probando = useAction(probarAsistente)

  return {
    cambiarEstado: async (activa: boolean) => {
      const resultado = resultadoDeAccion(
        await conRed(guardando.executeAsync({ actualizadoEnEsperado: version, activa })),
      )
      if (resultado.ok) {
        avisarExito(activa ? 'Asistente de IA activado' : 'Asistente de IA desactivado')
      } else {
        avisarError(resultado.error)
      }
    },
    probar: async () => resultadoDeAccion(await conRed(probando.executeAsync())),
    enCurso: guardando.isPending,
    probando: probando.isPending,
  }
}
