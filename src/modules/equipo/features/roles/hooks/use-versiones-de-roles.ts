'use client'

import { useMemo, useRef } from 'react'
import { versionMasNueva } from '../../../entities/rol'

// La versión que devolvió la última edición de cada rol, por si llega antes que la pantalla nueva. La matriz y «Quién crea y quién ve» escriben sobre los
// mismos roles: comparten esta (la crea `MatrizDeRoles`) para que una edición salga con la versión que dejó la otra y nadie choque (`PT409`) consigo mismo. Va en un ref:
// la siguiente escritura sale antes de que React vuelva a dibujar.
export function useVersionesDeRoles() {
  const versiones = useRef<Record<string, string>>({})
  return useMemo(
    () => ({
      // La más nueva entre la que trae el rol de la pantalla y la que devolvió la última edición.
      de: (rolId: string, base: string): string => versionMasNueva(base, versiones.current[rolId]),
      poner: (rolId: string, version: string): void => {
        versiones.current[rolId] = version
      },
    }),
    [],
  )
}

export type VersionesDeRoles = ReturnType<typeof useVersionesDeRoles>
