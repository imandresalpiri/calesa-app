'use client'

import { useEffect, useEffectEvent, type RefObject } from 'react'
import { useBorrador } from '@/shared/ui/use-borrador'

type Args = {
  clave: string
  formulario: RefObject<HTMLFormElement | null>
  nombres: readonly string[]
  activo: boolean
}

// El borrador del formulario de un campo (`sessionStorage`), sólo con permiso.
export function useBorradorDelCampo({ clave, formulario, nombres, activo }: Args) {
  return useBorrador(clave, formulario, [...nombres], { activo, controlado: true })
}

// Algo que se hace una vez, al abrir el panel (cada apertura lo monta de nuevo).
export function useAlAbrir(hacer: () => void) {
  const alAbrir = useEffectEvent(hacer)
  useEffect(() => {
    alAbrir()
  }, [])
}
