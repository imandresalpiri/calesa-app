'use client'

import { createContext, createElement, use, type ReactNode } from 'react'
import type { ClaveDeTarjeta } from '../../entities/nucleo/tarjetas'

type Avisos = Partial<Record<ClaveDeTarjeta, string>>

const ContextoDeLosAvisos = createContext<Avisos>({})

// Los avisos de las tarjetas que salen de «Qué falta» («Falta «BL»» en Documentos): los calcula el área `mover` sobre su última lectura y los pone aquí; el núcleo no conoce
// `mover`. Sin proveedor (los drawers), ninguno.
export function ProveedorDeAvisosDeLasTarjetas({
  avisos,
  children,
}: {
  avisos: Avisos
  children: ReactNode
}) {
  return createElement(ContextoDeLosAvisos, { value: avisos }, children)
}

export function useAvisoDeQueFalta(tarjeta: string): string | null {
  const avisos = use(ContextoDeLosAvisos)
  return (avisos as Partial<Record<string, string>>)[tarjeta] ?? null
}
