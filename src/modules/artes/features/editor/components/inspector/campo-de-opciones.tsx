'use client'

// Una entre pocas opciones a la vista en el inspector del editor de artes (la alineación del texto, el ajuste de una imagen, el tipo de
// fondo): radios nativos con piel de botonera compacta, así las flechas, el foco y el lector de pantalla funcionan solos. Con icono, el
// nombre va oculto para el lector y en el `title`.
import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { cn } from 'cn'

type Opcion<Valor extends string> = { valor: Valor; etiqueta: string; icono?: LucideIcon }

type Props<Valor extends string> = {
  etiqueta: string
  opciones: readonly Opcion<Valor>[]
  valor: Valor | null
  alCambiar: (valor: Valor) => void
  deshabilitado?: boolean
}

export function CampoDeOpciones<Valor extends string>({
  etiqueta,
  opciones,
  valor,
  alCambiar,
  deshabilitado,
}: Props<Valor>) {
  const grupo = useId()
  return (
    <fieldset className="grid min-w-0 gap-1" disabled={deshabilitado}>
      <legend className="mb-1 text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-(--radius-md) bg-(--color-paper-dim) p-0.5">
        {opciones.map(({ valor: suyo, etiqueta: nombre, icono: Icono }) => (
          <label
            key={suyo}
            title={Icono ? nombre : undefined}
            className="min-w-0 cursor-pointer has-disabled:cursor-not-allowed"
          >
            <input
              type="radio"
              name={grupo}
              value={suyo}
              checked={valor === suyo}
              className="peer sr-only"
              onChange={() => {
                alCambiar(suyo)
              }}
            />
            <span
              className={cn(
                'flex h-7 items-center justify-center truncate rounded-(--radius-sm) px-2 text-(length:--text-xs) text-(--color-ink-soft)',
                'peer-checked:bg-(--color-surface) peer-checked:font-medium peer-checked:text-(--color-ink) peer-checked:shadow-(--shadow-sm)',
                'peer-focus-visible:shadow-(--shadow-focus) peer-disabled:opacity-50',
              )}
            >
              {Icono ? <Icono aria-hidden="true" className="size-4" /> : nombre}
              {Icono ? <span className="sr-only">{nombre}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
