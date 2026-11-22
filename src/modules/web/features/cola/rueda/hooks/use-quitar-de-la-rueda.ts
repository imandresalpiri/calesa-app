'use client'

import { useAction } from 'next-safe-action/hooks'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import type { ConfiguracionEnLaRueda } from '../../../../entities/cola/rueda'
import { deshacerQuitar } from '../actions/deshacer-quitar'
import { quitarDeLaRueda } from '../actions/quitar-de-la-rueda'

// Quitar a alguien de la rueda, ya confirmado: se hace en el acto y ofrece «Deshacer» (vuelve a habilitarla con los mismos valores). Sin versión: la última
// escritura gana (8.04-1, D8). La página se relee por la revalidación. `quitar` dice si pudo (si no, el aviso ya salió).
export function useQuitarDeLaRueda() {
  const quitarAccion = useAction(quitarDeLaRueda)
  const deshacerAccion = useAction(deshacerQuitar)

  async function deshacer(configuracion: ConfiguracionEnLaRueda, nombre: string) {
    const resultado = resultadoDeAccion(await conRed(deshacerAccion.executeAsync(configuracion)))
    if (resultado.ok) {
      avisarExito(`${nombre} volvió a la rueda.`)
    } else {
      avisarError(resultado.error)
    }
  }

  async function quitar(configuracion: ConfiguracionEnLaRueda, nombre: string): Promise<boolean> {
    const resultado = resultadoDeAccion(await conRed(quitarAccion.executeAsync(configuracion)))
    if (!resultado.ok) {
      avisarError(resultado.error)
      return false
    }
    avisarConDeshacer(`Quitaste a ${nombre} de la rueda.`, () => {
      void deshacer(configuracion, nombre)
    })
    return true
  }

  return { quitar, enCurso: quitarAccion.isPending || deshacerAccion.isPending }
}
