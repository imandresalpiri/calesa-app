'use client'

import { createContext, use } from 'react'
import type { ResultadoDelLienzo } from '../../../entities/edicion-del-lienzo'

// Lo que el diagrama hace con las salidas: crear una arrastrando el asa, abrirla y pedir quitarla. Lo escribe el área `transiciones` (`transicion_crear`):
// llena este contexto con su hueco `salidasDelDiagrama` (el núcleo no importa áreas).
export type SalidasDelDiagrama = {
  // Crea la salida `salidaId` de `de` a `a` (sin acción, sin nota obligatoria) con la versión que se le pasa. El id lo da quien la pide, una vez por gesto:
  // un reintento tras un corte que sí llegó a la base cuenta como hecho.
  crear: (
    pedido: { salidaId: string; de: string; a: string },
    version: string,
  ) => Promise<ResultadoDelLienzo>
  // Abre la fase de origen con la salida en edición (`?fase=<de>&editar=salida&editada=<id>`).
  abrir: (salidaId: string, deFaseId: string) => void
  // Abre la fase de origen con la confirmación de quitarla (`?fase=<de>&eliminar=salida&salida=<id>`).
  quitar: (salidaId: string, deFaseId: string) => void
}

export const ContextoDeSalidasDelDiagrama = createContext<SalidasDelDiagrama | null>(null)

// Nulo fuera del proveedor: vincular queda apagado y las flechas sólo se miran.
export function useSalidasDelDiagrama(): SalidasDelDiagrama | null {
  return use(ContextoDeSalidasDelDiagrama)
}
