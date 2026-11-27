'use client'

import { cn } from 'cn'
import { useId } from 'react'

// Una opción de «Para»: lo propio de un origen o lo compartido con todos. Con `motivo`, va apagada y lo dice debajo.
export type OpcionParaQuien<V extends string> = {
  valor: V
  etiqueta: string
  motivo?: string | null
}

type Props<V extends string> = {
  valor: V
  alCambiar: (valor: V) => void
  opciones: readonly OpcionParaQuien<V>[]
  // Mientras se guarda, nada se cambia.
  deshabilitado?: boolean
}

// «Para»: si lo que se crea es sólo de un origen o compartido con todos los orígenes (las tablas de referencia, los catálogos de logística y los tipos de
// documento). Dos opciones como botones de radio a 44 px; una opción que la persona no puede elegir va apagada con su motivo, a la vista.
export function CampoParaQuien<V extends string>({
  valor,
  alCambiar,
  opciones,
  deshabilitado = false,
}: Props<V>) {
  const grupo = useId()
  const motivos = opciones.flatMap((opcion) => (opcion.motivo ? [opcion.motivo] : []))
  return (
    <fieldset className="grid min-w-0 gap-1.5" disabled={deshabilitado}>
      <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">Para</legend>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        {opciones.map((opcion) => (
          <label
            key={opcion.valor}
            className={cn('min-w-0', opcion.motivo ? 'cursor-not-allowed' : 'cursor-pointer')}
          >
            <input
              type="radio"
              name={grupo}
              value={opcion.valor}
              checked={valor === opcion.valor}
              disabled={Boolean(opcion.motivo)}
              aria-describedby={opcion.motivo ? `${grupo}-motivo` : undefined}
              className="peer sr-only"
              onChange={() => {
                alCambiar(opcion.valor)
              }}
            />
            <span
              className={cn(
                'flex min-h-11 items-center rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 py-2',
                'text-(length:--text-sm) break-words text-(--color-ink)',
                'peer-checked:border-(--color-primario) peer-checked:bg-(--color-surface-2)',
                'peer-focus-visible:shadow-(--shadow-focus) peer-disabled:opacity-60',
              )}
            >
              {opcion.etiqueta}
            </span>
          </label>
        ))}
      </div>
      {motivos.length > 0 ? (
        <p id={`${grupo}-motivo`} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {motivos.join(' ')}
        </p>
      ) : null}
    </fieldset>
  )
}
