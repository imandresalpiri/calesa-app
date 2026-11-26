'use client'

import { createContext, use } from 'react'
import type { MedidasDelDiagrama, Punto } from '../../../../entities/disposicion-del-diagrama'

// Lo que las cajas y las flechas necesitan del lienzo y no viaja en los datos de cada una (así no cambian de identidad en cada dibujo).
export type Lienzo = {
  medidas: MedidasDelDiagrama
  alAbrir: (faseId: string) => void
  // Un `mouseup` tras arrastrar no abre la fase.
  vieneDeArrastrar: () => boolean
  // Se pueden mover las fases (y con el teclado); se pueden vincular (el asa).
  puedeMover: boolean
  puedeVincular: boolean
  // Una flecha del teclado sobre una caja: 1 rem, o 10 con Shift.
  alTeclado: (faseId: string, paso: Punto) => void
  // Tocar una flecha abre su salida; Supr o Retroceso sobre ella pide quitarla. Nulo sin el área `transiciones`.
  salidas: {
    abrir: (salidaId: string, de: string) => void
    quitar: (salidaId: string, de: string) => void
  } | null
}

export const ContextoDelLienzo = createContext<Lienzo | null>(null)

export function useLienzo(): Lienzo {
  const lienzo = use(ContextoDelLienzo)
  if (!lienzo) throw new Error('useLienzo() sólo se usa dentro del diagrama del flujo.')
  return lienzo
}
