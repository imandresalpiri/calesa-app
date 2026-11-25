'use client'

import { useEffect, useState } from 'react'

// Lo que se espera a que la hoja vuelva con la versión nueva antes de decir que no llegó.
export const ESPERA_DE_LA_HOJA_MS = 10_000

export type EsperaDeLaHoja = 'no' | 'esperando' | 'tarde'

// Publicada la tabla, la página se vuelve a pedir y la hoja se monta de nuevo con la versión siguiente (este componente se va con ella). Si en `ESPERA_DE_LA_HOJA_MS` sigue
// aquí, la hoja no se puso al día: se dice, con «Recargar».
export function useEsperaDeLaHoja() {
  const [espera, setEspera] = useState<EsperaDeLaHoja>('no')
  useEffect(() => {
    if (espera !== 'esperando') return
    const reloj = window.setTimeout(() => {
      setEspera('tarde')
    }, ESPERA_DE_LA_HOJA_MS)
    return () => {
      window.clearTimeout(reloj)
    }
  }, [espera])
  return {
    espera,
    esperar: () => {
      setEspera('esperando')
    },
  }
}
