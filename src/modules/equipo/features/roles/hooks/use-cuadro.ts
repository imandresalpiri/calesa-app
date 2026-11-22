'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError } from '@/shared/ui/toasts'
import type { ObjetivoDelCuadro } from '../../../entities/cuadro-de-cotizaciones'
import type { CambioDeConcesion } from '../../../entities/matriz'
import type { RolConConcesiones } from '../../../entities/rol'
import { otorgar } from '../actions/otorgar'
import { revocar } from '../actions/revocar'
import { useVersionesDeRoles, type VersionesDeRoles } from './use-versiones-de-roles'

export const MENSAJE_GUARDADO_A_MEDIAS = 'Se guardó sólo una parte: recarga para ver cómo quedó.'

// Lo que queda a la vista cuando una elección no terminó: otra persona cambió el rol antes (`PT409`) o se cortó después de guardar algo.
export type AvisoDelCuadro = { rolId: string; tipo: 'conflicto' | 'a_medias'; mensaje: string }

// Una elección del cuadro «Quién crea y quién ve» puede ser más de una RPC sobre el mismo rol (dar `ver` y después las privadas). Van en orden y cada una
// sale con la versión que devolvió la anterior: se guarda en un ref, porque la siguiente sale antes de que React vuelva a dibujar. Mientras viajan, la
// fila de ese rol espera y muestra lo elegido (`enCurso`), no lo de antes. Las versiones son las de la pantalla entera (`useVersionesDeRoles`, que comparte con
// la matriz de Roles): si no llegan, ésta crea las suyas.
export function useCuadro(versionesDeLaPantalla?: VersionesDeRoles) {
  const propias = useVersionesDeRoles()
  const versiones = versionesDeLaPantalla ?? propias
  const router = useRouter()
  const otorgando = useAction(otorgar)
  const revocando = useAction(revocar)
  const [enCurso, setEnCurso] = useState<{ rolId: string; objetivo: ObjetivoDelCuadro } | null>(
    null,
  )
  const [aviso, setAviso] = useState<AvisoDelCuadro | null>(null)
  const [recargando, iniciarRecarga] = useTransition()

  async function una(rol: RolConConcesiones, cambio: CambioDeConcesion): Promise<ErrorApp | null> {
    const edicion = {
      rolId: rol.id,
      actualizadoEnEsperado: versiones.de(rol.id, rol.actualizadoEn),
      clave: cambio.clave,
      origenId: cambio.origenId,
    }
    const resultado = resultadoDeAccion(
      cambio.tipo === 'otorgar'
        ? await otorgando.executeAsync({ ...edicion, alcance: cambio.alcance })
        : await revocando.executeAsync(edicion),
    )
    if (!resultado.ok) return resultado.error
    versiones.poner(rol.id, resultado.data.actualizadoEn)
    return null
  }

  async function aplicar(
    rol: RolConConcesiones,
    objetivo: ObjetivoDelCuadro,
    cambios: readonly CambioDeConcesion[],
  ) {
    if (cambios.length === 0) return
    setAviso(null)
    setEnCurso({ rolId: rol.id, objetivo })
    for (const [indice, cambio] of cambios.entries()) {
      const error = await una(rol, cambio)
      if (!error) continue
      setEnCurso(null)
      if (indice > 0) {
        setAviso({ rolId: rol.id, tipo: 'a_medias', mensaje: MENSAJE_GUARDADO_A_MEDIAS })
      } else if (error.codigo === 'conflicto') {
        setAviso({ rolId: rol.id, tipo: 'conflicto', mensaje: error.mensaje })
      } else {
        avisarError(error)
      }
      return
    }
    setEnCurso(null)
  }

  function recargar() {
    iniciarRecarga(() => {
      setAviso(null)
      router.refresh()
    })
  }

  return { aplicar, enCurso, aviso, recargar, recargando }
}
