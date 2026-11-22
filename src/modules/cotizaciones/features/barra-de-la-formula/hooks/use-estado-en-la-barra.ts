'use client'

import { useEffect, useRef } from 'react'
import type { EstadoDeLaEdicion } from '../../../entities/estado-de-la-edicion'
import { useContextoDeLaBarra } from '../components/contexto'

const claveDelEstado = (estado: EstadoDeLaEdicion): string => (estado ? JSON.stringify(estado) : '')

// El editor le dice a la barra de la fórmula el estado de lo que edita (Cambios sin guardar · Borrador · Publicada vN). El último que lo dice
// gana; al irse, la barra vuelve al de la fórmula. Fuera de la barra no hace nada.
export function useEstadoEnLaBarra(estado: EstadoDeLaEdicion): void {
  const registrar = useContextoDeLaBarra()?.registrarEstado
  const ultimo = useRef(estado)
  useEffect(() => {
    ultimo.current = estado
  })
  const clave = claveDelEstado(estado)
  useEffect(() => {
    registrar?.(ultimo.current)
  }, [registrar, clave])
  useEffect(
    () => () => {
      registrar?.(null)
    },
    [registrar],
  )
}
