'use client'

// Elegir uno de una lista en el inspector del editor de artes (la fuente, el peso, la variante del logo, la foto): un `<select>` nativo y
// compacto. Sin un valor común, «Mixto»; un valor que ya no está entre las opciones se ve con `sinOpcion` y no se puede volver a elegir.
import { useId } from 'react'
import { Label } from '@/shared/ui/label'

type Opcion = { valor: string; etiqueta: string }

type Props = {
  etiqueta: string
  // Nulo: las capas elegidas no lo comparten («Mixto»).
  valor: string | null
  opciones: readonly Opcion[]
  alCambiar: (valor: string) => void
  sinOpcion?: string
  deshabilitado?: boolean
}

const MIXTO = ''

export function CampoDesplegable({
  etiqueta,
  valor,
  opciones,
  alCambiar,
  sinOpcion = 'Ya no está',
  deshabilitado,
}: Props) {
  const id = useId()
  const perdido = valor !== null && !opciones.some((o) => o.valor === valor)
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id} className="text-(length:--text-xs) font-normal text-(--color-ink-soft)">
        {etiqueta}
      </Label>
      <select
        id={id}
        value={valor ?? MIXTO}
        disabled={deshabilitado}
        onChange={(evento) => {
          if (evento.target.value !== MIXTO) {
            alCambiar(evento.target.value)
          }
        }}
        className="h-8 w-full min-w-0 rounded-lg border border-(--color-line-strong) bg-(--color-surface) px-2 text-(length:--text-sm) text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus) disabled:cursor-not-allowed disabled:opacity-50"
      >
        {valor === null ? (
          <option value={MIXTO} disabled>
            Mixto
          </option>
        ) : null}
        {perdido ? (
          <option value={valor} disabled>
            {sinOpcion}
          </option>
        ) : null}
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </div>
  )
}
