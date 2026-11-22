'use client'

import type { ReactNode } from 'react'
import type { AccionDeMenu } from '../lista'
import { TarjetaTocable } from './tarjeta-tocable'

type Props = {
  titulo: string
  // Por qué no se puede editar (o `null`): apaga «Editar…» en el «⋯», lo dice ahí y la tarjeta no abre nada.
  motivo: string | null
  abrir: () => void
  estado?: ReactNode
  // Más acciones de la entidad, después de «Editar…» en el «⋯».
  extra?: AccionDeMenu[]
  children: ReactNode
}

// Una tarjeta de ajustes que se edita en un modal: sólo su «⋯» (la lista única de acciones de la entidad, «Editar…» primera) y tocar la tarjeta la abre.
// Con el teclado, la tarjeta es un botón con nombre («Editar Identidad») y el «⋯» va aparte («Más acciones de Identidad»).
export function TarjetaEditable({ titulo, motivo, abrir, estado, extra, children }: Props) {
  return (
    <TarjetaTocable
      titulo={titulo}
      accion={`Editar ${titulo}`}
      etiquetaDelMenu="Editar…"
      motivo={motivo}
      abrir={abrir}
      estado={estado}
      extra={extra}
    >
      {children}
    </TarjetaTocable>
  )
}
