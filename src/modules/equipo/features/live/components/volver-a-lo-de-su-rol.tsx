'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Confirmar } from '@/shared/ui/confirmar'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { PersonaDelLive } from '../../../entities/live-configuracion'
import { quitarPersonaDelLive } from '../actions/quitar-persona'

type Props = {
  abierto: boolean
  alCerrar: () => void
  persona: PersonaDelLive
}

// «Volver a lo de su rol» de una persona (`?panel=persona-a-su-rol&persona=<id>`): se pierde lo propio. Lo que la base rechaza (un conflicto, con
// «Recargar») se avisa y el diálogo queda abierto.
export function VolverALoDeSuRol({ abierto, alCerrar, persona }: Props) {
  const quitar = useAction(quitarPersonaDelLive)
  async function confirmar() {
    if (persona.actualizadoEn === null) {
      alCerrar()
      return
    }
    const envio = await enviarAccion(
      quitar.executeAsync({ usuarioId: persona.id, actualizadoEnEsperado: persona.actualizadoEn }),
      'No pudimos volver a lo de su rol.',
    )
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    alCerrar()
    avisarExito(`«${persona.nombre}» volvió a lo de su rol en el Modo Live.`)
  }
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={confirmar}
      titulo={`Volver a lo de su rol para «${persona.nombre}»`}
      descripcion={
        persona.rol
          ? `Se pierde su ajuste propio del Modo Live y sigue lo de ${persona.rol.nombre}.`
          : 'Se pierde su ajuste propio del Modo Live. No tiene rol: sigue lo por defecto.'
      }
      etiquetaConfirmar="Volver a lo de su rol"
      enCurso={quitar.isPending}
    />
  )
}
