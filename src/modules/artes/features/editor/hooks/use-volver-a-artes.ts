'use client'

import { useSyncExternalStore } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { CLAVE_DE_LA_VUELTA_A_ARTES, vueltaAArtes } from '../../../entities/vuelta'

const SIN_SUSCRIPCION = () => () => {}

function leerLaVuelta(): string {
  try {
    return vueltaAArtes(sessionStorage.getItem(CLAVE_DE_LA_VUELTA_A_ARTES))
  } catch {
    return RUTAS.artes
  }
}

// A dónde vuelve «Volver a Artes»: la lista como se dejó (con sus filtros, la anotó quien abrió la plantilla) o `/artes`. En el servidor y al
// hidratar, `/artes`: el enlace se dibuja igual y cambia de destino después, sin moverse.
export function useVolverAArtes(): string {
  return useSyncExternalStore(SIN_SUSCRIPCION, leerLaVuelta, () => RUTAS.artes)
}
