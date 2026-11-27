'use client'

import { useSearchParams } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useCallback } from 'react'
import { CLAVE_DE_VISTA_DE_EMBARQUES, guardarPreferencia } from '@/modules/equipo/client'
import { CLAVE_DE_VISTA, vistaDeLista, type VistaDeLista } from '@/shared/lib/vista-de-lista'
import { avisarError } from '@/shared/ui/toasts'

// Tabla o tarjetas en escritorio (las dos listas de Embarques comparten la preferencia `embarques.vista`): `?vista=` para compartir lo que se ve o, sin él, lo que la persona
// eligió la última vez. Cambiar escribe la URL sin volver a pedir la página y guarda la preferencia; si no se pudo guardar, la vista igual cambió en esta pestaña.
export function useVistaDeEmbarques(preferida: VistaDeLista | null) {
  const parametros = useSearchParams()
  const vista = vistaDeLista({ pedida: parametros.get(CLAVE_DE_VISTA), preferida })
  const { execute } = useAction(guardarPreferencia, {
    onError: ({ error }) => {
      if (error.serverError) avisarError(error.serverError)
    },
  })
  const cambiar = useCallback(
    (nueva: VistaDeLista) => {
      const siguientes = new URLSearchParams(parametros.toString())
      siguientes.set(CLAVE_DE_VISTA, nueva)
      window.history.replaceState(null, '', `${window.location.pathname}?${siguientes.toString()}`)
      execute({ clave: CLAVE_DE_VISTA_DE_EMBARQUES, valor: nueva })
    },
    [parametros, execute],
  )
  return { vista, cambiar }
}
