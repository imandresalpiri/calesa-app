'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { errorDeAccion } from '@/shared/lib/formularios'
import { avisarError } from '@/shared/ui/toasts'
import type { CambioDeConcesion } from '../../../entities/matriz'
import type { RolConConcesiones } from '../../../entities/rol'
import { otorgar } from '../actions/otorgar'
import { revocar } from '../actions/revocar'
import { useVersionesDeRoles, type VersionesDeRoles } from './use-versiones-de-roles'

export type { CambioDeConcesion } from '../../../entities/matriz'

// Cada cambio es una RPC que manda la versión del rol. Van de a una por rol: mientras una
// viaja, las celdas de ese rol esperan, así la siguiente sale con la versión que devolvió esta
// y nadie choca consigo mismo. Las versiones son las de la pantalla entera (`useVersionesDeRoles`): si no llegan, ésta crea las suyas.
export function useMatriz(versionesDeLaPantalla?: VersionesDeRoles) {
  const propias = useVersionesDeRoles()
  const versiones = versionesDeLaPantalla ?? propias
  const otorgando = useAction(otorgar)
  const revocando = useAction(revocar)
  const [rolEnCurso, setRolEnCurso] = useState<string | null>(null)

  async function aplicar(rol: RolConConcesiones, cambio: CambioDeConcesion): Promise<void> {
    setRolEnCurso(rol.id)
    const edicion = {
      rolId: rol.id,
      actualizadoEnEsperado: versiones.de(rol.id, rol.actualizadoEn),
      clave: cambio.clave,
      origenId: cambio.origenId,
    }
    const resultado =
      cambio.tipo === 'otorgar'
        ? await otorgando.executeAsync({ ...edicion, alcance: cambio.alcance })
        : await revocando.executeAsync(edicion)
    setRolEnCurso(null)
    if (resultado.data?.ok) {
      const { actualizadoEn } = resultado.data.data
      versiones.poner(rol.id, actualizadoEn)
      return
    }
    const error = errorDeAccion(resultado)
    if (error) {
      avisarError(error)
    }
  }

  return { aplicar, rolEnCurso }
}
