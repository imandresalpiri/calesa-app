import type { ComponentProps, ReactNode } from 'react'
import { cn } from 'cn'
import { Label } from './label'

// `deshabilitada`: se ve pero no se elige (su etiqueta dice por qué).
type Opcion = { valor: string; etiqueta: string; deshabilitada?: boolean }

type Props = Omit<ComponentProps<'select'>, 'id' | 'children'> & {
  // Sirve de `id` y de `name`: el envío lee el formulario por nombre.
  nombre: string
  etiqueta: string
  opciones: readonly Opcion[]
  // Más opciones, agrupadas bajo su título (`<optgroup>`), después de las sueltas.
  grupos?: readonly { etiqueta: string; opciones: readonly Opcion[] }[]
  ayuda?: string
  error?: string
  // Una insignia junto a la etiqueta («Ajuste propio»); quien la pasa le reserva el lugar si va y viene.
  insignia?: ReactNode
}

const dibujarOpcion = (opcion: Opcion) => (
  <option key={opcion.valor} value={opcion.valor} disabled={opcion.deshabilitada}>
    {opcion.etiqueta}
  </option>
)

// Elegir una entre varias dentro de un formulario no controlado. Es un <select> nativo: se lee
// con `valoresDe()` como cualquier campo, y en el celular abre el selector del sistema.
export function CampoSeleccion({
  nombre,
  etiqueta,
  opciones,
  grupos = [],
  ayuda,
  error,
  insignia,
  ...resto
}: Props) {
  const idAyuda = ayuda ? `${nombre}-ayuda` : undefined
  const idError = error ? `${nombre}-error` : undefined
  const descritoPor = [idError, idAyuda].filter(Boolean).join(' ') || undefined

  return (
    <div className="grid gap-1.5">
      {insignia === undefined ? (
        <Label htmlFor={nombre}>{etiqueta}</Label>
      ) : (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Label htmlFor={nombre}>{etiqueta}</Label>
          {insignia}
        </div>
      )}
      <select
        id={nombre}
        name={nombre}
        aria-invalid={error ? true : undefined}
        aria-describedby={descritoPor}
        className={cn(
          'h-11 w-full min-w-0 rounded-lg border border-(--color-line-strong) bg-(--color-surface) px-2.5 text-(length:--text-base) text-(--color-ink) outline-none md:h-9 md:text-(length:--text-sm)',
          'focus-visible:shadow-(--shadow-focus) disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-(--color-peligro)',
        )}
        {...resto}
      >
        {opciones.map(dibujarOpcion)}
        {grupos.map((grupo) => (
          <optgroup key={grupo.etiqueta} label={grupo.etiqueta}>
            {grupo.opciones.map(dibujarOpcion)}
          </optgroup>
        ))}
      </select>
      {error ? (
        <p id={idError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
      {ayuda ? (
        <p id={idAyuda} className="text-(length:--text-sm) text-(--color-ink-faint)">
          {ayuda}
        </p>
      ) : null}
    </div>
  )
}
