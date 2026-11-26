import type { ComponentProps } from 'react'
import { Textarea } from './textarea'

type Props = Omit<ComponentProps<'textarea'>, 'id' | 'aria-label'> & {
  // Sirve de `id` y de `name`; el título visible lo pone el grupo que lo contiene (`<GrupoDeCampos titulo="Notas">`), por eso la etiqueta va sólo para quien no ve.
  nombre: string
  etiqueta: string
  error?: string
}

// Las notas libres de un formulario de panel: tres renglones de alto fijo (no crece al escribir ni al corregir un error: lo que cambia es su contenido, no el área). El `aria-invalid` es lo
// que busca `enfocarPrimerError()`.
export function CampoDeNotas({ nombre, etiqueta, error, ...resto }: Props) {
  const idError = error ? `${nombre}-error` : undefined
  return (
    <div className="grid gap-1.5">
      <Textarea
        id={nombre}
        name={nombre}
        aria-label={etiqueta}
        aria-invalid={error ? true : undefined}
        aria-describedby={idError}
        className="field-sizing-fixed h-24 resize-none"
        {...resto}
      />
      {error ? (
        <p id={idError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </div>
  )
}
