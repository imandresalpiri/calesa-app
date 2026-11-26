'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import {
  armarMisElementos,
  paraGuardar,
  type ElementoDeMisEnlaces,
  type MisEnlacesLeidos,
} from '../../../entities/mis-enlaces-de-ayuda'
import { MENSAJE_DE_VALIDACION } from '../../enlaces-de-ayuda/hooks/use-pedidos-de-enlaces'
import { guardarMisEnlacesDeAyuda } from '../actions/guardar-mis-enlaces-de-ayuda'

export type EnvioDeMisEnlaces = Envio<MisEnlacesLeidos>

// Guardar la lista entera de una persona: con la versión de lo leído, una escritura a la vez, y lo releído que vuelve reemplaza a lo local
// (`poner`). Un conflicto (otra ventana) se dice y la página se vuelve a leer. `guardarConDeshacer` ofrece volver a la lista de antes, que se
// guarda con la versión nueva.
export function useGuardarMisEnlaces(
  leidos: MisEnlacesLeidos,
  poner: (leidos: MisEnlacesLeidos) => void,
) {
  const elementos = armarMisElementos(leidos)
  // Lo vigente para lo que corre después (el «Deshacer» de un aviso): la versión y la lista de ahora, no las de cuando se armó.
  const actual = useRef({ leidos, elementos })
  useEffect(() => {
    actual.current = { leidos, elementos }
  })
  const router = useRouter()
  const unaVez = useUnEnvioALaVez()
  const accion = useAction(guardarMisEnlacesDeAyuda)

  function guardar(nuevos: readonly ElementoDeMisEnlaces[]): Promise<EnvioDeMisEnlaces | null> {
    return unaVez.mandar(async () => {
      const envio = await enviarAccion<MisEnlacesLeidos>(
        accion.executeAsync({
          actualizadoEnEsperado: actual.current.leidos.version,
          elementos: paraGuardar(nuevos),
        }),
        MENSAJE_DE_VALIDACION,
      )
      if (envio.ok) {
        actual.current = { leidos: envio.data, elementos: armarMisElementos(envio.data) }
        poner(envio.data)
      }
      return envio
    })
  }

  function rechazar(envio: EnvioDeMisEnlaces) {
    if (envio.ok) {
      return
    }
    avisarError(envio.error)
    if (envio.error.codigo === 'conflicto') {
      router.refresh()
    }
  }

  async function guardarConDeshacer(nuevos: readonly ElementoDeMisEnlaces[], aviso: string) {
    const antes = actual.current.elementos
    const envio = await guardar(nuevos)
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      rechazar(envio)
      return
    }
    avisarConDeshacer(aviso, () => {
      void guardar(antes).then((otro) => {
        if (otro && !otro.ok) rechazar(otro)
      })
    })
  }

  return { elementos, actual, enCurso: unaVez.enCurso, guardar, rechazar, guardarConDeshacer }
}
