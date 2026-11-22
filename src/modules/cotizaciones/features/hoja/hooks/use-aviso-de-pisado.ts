'use client'

import { useCallback, useState } from 'react'

// El aviso de la primera vez que se pisa un cálculo (`docs/COTIZADOR.md` › «Pisar un cálculo»): una vez por hoja abierta, no por celda. Cerrado no vuelve; la `key`
// de la hoja lo reinicia y no va al borrador (reponer lo tipeado no lo enciende).
type EstadoDelAviso = 'nunca' | 'visible' | 'cerrado'

export function useAvisoDePisado() {
  const [aviso, setAviso] = useState<EstadoDelAviso>('nunca')
  const alPisar = useCallback(() => {
    setAviso((antes) => (antes === 'nunca' ? 'visible' : antes))
  }, [])
  const cerrarAvisoDePisado = useCallback(() => {
    setAviso('cerrado')
  }, [])
  return { avisoDePisado: aviso === 'visible', alPisar, cerrarAvisoDePisado }
}
