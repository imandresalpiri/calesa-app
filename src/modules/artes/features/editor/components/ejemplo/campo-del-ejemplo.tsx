'use client'

import { useId, type ReactNode } from 'react'
import { Label } from '@/shared/ui/label'

type Props = {
  etiqueta: string
  // El valor elegido; vacío, ninguno.
  valor: string
  alCambiar: (valor: string) => void
  // Apagado: la única opción dice por qué (`apagado`) y no hay nada que elegir.
  apagado: string | null
  children: ReactNode
  // El renglón de debajo, de alto reservado («Ver más cotizaciones», lo que no llegó).
  pie?: ReactNode
}

// Un `<select>` nativo del popover del vehículo de ejemplo (la cotización, el lead), con su renglón de abajo reservado: lo que dice o lo que
// ofrece no mueve lo de abajo.
export function CampoDelEjemplo({ etiqueta, valor, alCambiar, apagado, children, pie }: Props) {
  const id = useId()
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id} className="text-(length:--text-xs) font-normal text-(--color-ink-soft)">
        {etiqueta}
      </Label>
      <select
        id={id}
        value={apagado === null ? valor : ''}
        disabled={apagado !== null}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
        className="h-8 w-full min-w-0 rounded-lg border border-(--color-line-strong) bg-(--color-surface) px-2 text-(length:--text-sm) text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus) disabled:cursor-not-allowed disabled:opacity-50"
      >
        {apagado === null ? children : <option value="">{apagado}</option>}
      </select>
      {pie === undefined ? null : <div className="flex h-7 min-w-0 items-center">{pie}</div>}
    </div>
  )
}
