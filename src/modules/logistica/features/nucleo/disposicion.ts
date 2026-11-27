'use client'

import { createContext, createElement, use, type ReactNode } from 'react'

// ¿Los huecos están en la página de la unidad (cada tarjeta abre los suyos en un drawer, «Qué falta» al costado) o en un drawer (gastos, el ítem de repuestos)? Un área lo
// pregunta para cambiar cómo se ofrece algo: «Qué falta» lleva a la página lo que en un drawer sacaría de la pantalla, y Documentos sube en su propio drawer sólo en la
// página. Lo da `EnLaPagina`; fuera de él vale `false`.
const ContextoDeLaPagina = createContext(false)

/** Marca a sus hijos como dibujados en la página de la unidad. Un componente (y no el `Provider` suelto) para que un Server Component lo pueda envolver. */
export function EnLaPagina({ children }: { children: ReactNode }) {
  return createElement(ContextoDeLaPagina, { value: true }, children)
}

export function useEnLaPagina(): boolean {
  return use(ContextoDeLaPagina)
}
