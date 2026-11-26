'use client'

import { createContext, use } from 'react'
import type { ResultadoDelLienzo } from '../../../entities/edicion-del-lienzo'
import type { CambioDePosicion } from '../../../entities/posiciones-del-diagrama'
import type { Punto } from '../../../entities/disposicion-del-diagrama'

// Lo que el diagrama hace con las fases: guardar sus posiciones y pedir una fase nueva en un punto. Lo escribe el área `fases` (`fase_posiciones_guardar`,
// `fase_crear`): llena este contexto con su hueco `diagramaDeFases` (el núcleo no importa áreas).
export type FasesDelDiagrama = {
  // Por qué no se mueven (la lista cortada por el tope), o nulo.
  motivoDeMover: string | null
  // Por qué no se crea una (el tope de fases), o nulo.
  motivoDeNuevaFase: string | null
  // Todo o nada, con la versión que se le pasa (la vigente del lienzo, no la leída).
  guardarPosiciones: (
    cambios: readonly CambioDePosicion[],
    version: string,
  ) => Promise<ResultadoDelLienzo>
  // Abre «Nueva fase» (`?panel=nueva-fase`), con `&en=<x>,<y>` si se pidió en un punto del lienzo (rem).
  nuevaFaseEn: (punto: Punto | null) => void
}

export const ContextoDeFasesDelDiagrama = createContext<FasesDelDiagrama | null>(null)

// Nulo fuera del proveedor: mover y crear quedan apagados.
export function useFasesDelDiagrama(): FasesDelDiagrama | null {
  return use(ContextoDeFasesDelDiagrama)
}
