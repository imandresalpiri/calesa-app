'use client'

import { useCallback, useEffect, useRef } from 'react'

// Guardar sin red: no se pierde ni se pide dos veces. Queda anotado y, cuando vuelve la conexión, se guarda con lo último que se escribió. Sólo
// guarda sin cambiar el estado: nunca publica solo.
export function useGuardadoPendiente(enLinea: boolean, guardarAhora: () => void) {
  const pendiente = useRef(false)
  const ultimo = useRef(guardarAhora)
  useEffect(() => {
    ultimo.current = guardarAhora
  })
  useEffect(() => {
    if (enLinea && pendiente.current) {
      pendiente.current = false
      ultimo.current()
    }
  }, [enLinea])
  return useCallback(() => {
    if (enLinea) {
      ultimo.current()
    } else {
      pendiente.current = true
    }
  }, [enLinea])
}
