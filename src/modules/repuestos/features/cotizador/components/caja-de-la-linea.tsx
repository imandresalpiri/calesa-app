'use client'

import { Monto } from '@/shared/ui/monto'
import { SIN_CAJA } from '../../../entities/cotizador/hoja-editable'

type Props = {
  lineaId: string
  valor: string | null
  cajas: readonly string[]
  moneda: string
  // La línea tiene un error en la caja: lo dice el renglón de la línea, y acá se marca el campo.
  invalida: boolean
  deshabilitada: boolean
  alCambiar: (id: string, campo: 'caja', valor: string | null) => void
}

const SIN_ELEGIR = ''

// La caja de una línea (8.12-4, C10): una de las del snapshot, «Sin caja» (0) o sin elegir (D44: una línea nueva nace sin caja y queda sin total). Un
// `<option>` no admite `<Monto>`: las opciones se llaman «Caja N» y la elegida se dibuja al lado con `<Monto>` (así ninguna cifra se ve antes de hidratar
// con el Modo Live encendido, D51).
export function CajaDeLaLinea({
  lineaId,
  valor,
  cajas,
  moneda,
  invalida,
  deshabilitada,
  alCambiar,
}: Props) {
  const nombre = `${lineaId}-caja`
  const conocida = valor === null || valor === SIN_CAJA || cajas.includes(valor)
  const elegida = valor !== null && valor !== SIN_CAJA
  return (
    <div className="grid gap-1 text-(length:--text-sm)">
      <label htmlFor={nombre} className="text-(--color-ink-faint)">
        Caja
      </label>
      <select
        id={nombre}
        value={valor ?? SIN_ELEGIR}
        disabled={deshabilitada}
        aria-invalid={invalida ? true : undefined}
        className="h-11 w-full min-w-0 rounded-lg border border-(--color-line-strong) bg-(--color-surface) px-2 text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus) disabled:opacity-50 aria-invalid:border-(--color-peligro) md:h-9"
        onChange={(evento) => {
          alCambiar(
            lineaId,
            'caja',
            evento.target.value === SIN_ELEGIR ? null : evento.target.value,
          )
        }}
      >
        <option value={SIN_ELEGIR}>Elige una caja</option>
        <option value={SIN_CAJA}>Sin caja</option>
        {cajas.map((monto, i) => (
          <option key={monto} value={monto}>
            Caja {String(i + 1)}
          </option>
        ))}
        {conocida ? null : <option value={valor}>Caja guardada</option>}
      </select>
      <span className="min-h-5">
        {elegida ? <Monto valor={Number(valor)} moneda={moneda} /> : null}
      </span>
    </div>
  )
}
