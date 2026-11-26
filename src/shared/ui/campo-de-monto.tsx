import { useId, type ChangeEvent, type ReactNode } from 'react'
import { cn } from 'cn'
import { Label } from './label'

type Opcion = { valor: string; etiqueta: string }

type Props = {
  // Prefijo de los nombres: `<prefijo>-moneda` y `<prefijo>-monto` (el envío y el foco al error los leen por nombre).
  prefijo: string
  monedas: readonly Opcion[]
  moneda: string
  monto: string
  alCambiarMoneda: (moneda: string) => void
  alCambiarMonto: (monto: string) => void
  errorDeMoneda?: string
  errorDeMonto?: string
  deshabilitado?: boolean
  // A la derecha de la etiqueta: el estado de lo que se carga («Sin confirmar»).
  estado?: ReactNode
  // Bajo el campo, con el alto reservado aunque no haya nada: «Equivale a …» no hace saltar lo de abajo.
  pie?: ReactNode
}

// Lo principal de un pago o una compra: el monto, grande, con su moneda pegada en un solo campo. La moneda es un `<select>` nativo (en el celular abre el selector del sistema) y el monto se
// escribe como texto (`inputMode="decimal"`): quien lo lee es el módulo, con `leerNumeroTipeado`. El equivalente en la base nunca se calcula acá.
export function CampoDeMonto(props: Props) {
  const { prefijo, monedas, moneda, monto, deshabilitado = false } = props
  const idDelMonto = `${prefijo}-monto`
  const idDelError = useId()
  const error = props.errorDeMonto ?? props.errorDeMoneda
  return (
    <div className="grid gap-1.5">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <Label htmlFor={idDelMonto}>Monto</Label>
        {props.estado}
      </div>
      <div
        className={cn(
          'flex h-14 min-w-0 rounded-lg border border-(--color-line-strong) bg-(--color-surface) focus-within:shadow-(--shadow-focus)',
          error && 'border-(--color-peligro)',
          deshabilitado && 'opacity-50',
        )}
      >
        <select
          id={`${prefijo}-moneda`}
          name={`${prefijo}-moneda`}
          aria-label="Moneda"
          aria-invalid={props.errorDeMoneda ? true : undefined}
          disabled={deshabilitado}
          value={moneda}
          onChange={(evento: ChangeEvent<HTMLSelectElement>) => {
            props.alCambiarMoneda(evento.target.value)
          }}
          className="max-w-[50%] shrink-0 rounded-l-lg border-r border-(--color-line) bg-(--color-surface-2) px-3 text-(length:--text-sm) text-(--color-ink-soft) outline-none disabled:cursor-not-allowed"
        >
          {monedas.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.etiqueta}
            </option>
          ))}
        </select>
        <input
          id={idDelMonto}
          name={idDelMonto}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={props.errorDeMonto ? true : undefined}
          aria-describedby={error ? idDelError : undefined}
          disabled={deshabilitado}
          value={monto}
          onChange={(evento) => {
            props.alCambiarMonto(evento.target.value)
          }}
          className="min-w-0 flex-1 rounded-r-lg bg-transparent px-3 text-right text-(length:--text-xl) font-semibold text-(--color-ink) tabular-nums outline-none disabled:cursor-not-allowed"
        />
      </div>
      <p
        id={idDelError}
        className={cn(
          'min-h-5 text-(length:--text-sm)',
          error ? 'text-(--color-peligro-ink)' : 'text-(--color-ink-soft)',
        )}
      >
        {error ?? props.pie}
      </p>
    </div>
  )
}
