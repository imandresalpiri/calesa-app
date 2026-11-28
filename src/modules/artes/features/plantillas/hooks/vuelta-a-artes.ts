'use client'

import { CLAVE_DE_LA_VUELTA_A_ARTES } from '../../../entities/vuelta'

// Anota la dirección de la lista (con sus filtros) antes de abrir una plantilla: el editor vuelve ahí (`vueltaAArtes()`). Sin
// `sessionStorage` (un navegador que lo bloquea), el editor vuelve a `/artes`.
export function anotarLaVuelta(): void {
  try {
    sessionStorage.setItem(CLAVE_DE_LA_VUELTA_A_ARTES, `${location.pathname}${location.search}`)
  } catch {
    // Sin almacenamiento: se vuelve a `/artes`.
  }
}
