'use client'

import { useQueryState } from 'nuqs'
import { useEffect } from 'react'
import { PARAMETRO_DEL_BLOQUE } from '@/shared/lib/rutas'

// `?bloque=cotizaciones` (y las URL viejas de Niveles y de Quién crea y quién ve, que llegan con él) deja a la vista el bloque de ese módulo: el título
// (`id="bloque-<módulo>"`) queda bajo la cabecera pegada de los roles. Se desplaza una vez, al llegar, cuando la matriz ya está dibujada.
export function useBloqueALaVista(hayMatriz: boolean) {
  const [bloque] = useQueryState(PARAMETRO_DEL_BLOQUE)
  useEffect(() => {
    if (bloque && hayMatriz) {
      document.getElementById(`bloque-${bloque}`)?.scrollIntoView({ block: 'start' })
    }
  }, [bloque, hayMatriz])
}
