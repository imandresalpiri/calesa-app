import { Badge } from '@/shared/ui/badge'
import { TarjetaTocable, ValoresDeLaTarjeta } from '@/shared/ui/tarjetas-de-ajustes'
import { MOTIVO_SIN_PERMISO_TIPOS_CAMBIO } from '../../../entities/motivos'
import type { LeyendaDeTiposCambio } from '../../../entities/compartir-tipos-cambio'
import type { Moneda } from '../../../entities/tipos-cambio'

type PropsDeMonedas = {
  monedas: readonly Moneda[]
  monedaBase: string
  puedeGestionar: boolean
  alGestionar: () => void
  alCrear: () => void
}

// Las monedas con las que se trabaja, como fichas. «Gestionar» abre la lista de hoy (también las inactivas) en un modal.
export function TarjetaDeMonedasActivas({
  monedas,
  monedaBase,
  puedeGestionar,
  alGestionar,
  alCrear,
}: PropsDeMonedas) {
  const motivo = puedeGestionar ? null : MOTIVO_SIN_PERMISO_TIPOS_CAMBIO
  return (
    <TarjetaTocable
      titulo="Monedas activas"
      accion="Gestionar las monedas"
      etiquetaDelMenu="Gestionar monedas…"
      motivo={motivo}
      abrir={alGestionar}
      extra={[
        {
          tipo: 'accion',
          clave: 'nueva',
          etiqueta: 'Nueva moneda',
          despuesDeCerrar: true,
          deshabilitada: !puedeGestionar,
          alElegir: alCrear,
        },
      ]}
    >
      <ul className="flex flex-wrap gap-2">
        {monedas.map((moneda) => (
          <li
            key={moneda.codigo}
            className="flex items-center gap-1.5 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface-2) px-2.5 py-1 text-(length:--text-sm)"
          >
            <span className="font-mono font-medium text-(--color-ink)">{moneda.codigo}</span>
            <span className="text-(--color-ink-faint)">{moneda.simbolo}</span>
            {moneda.codigo === monedaBase ? <Badge variant="secondary">Base</Badge> : null}
          </li>
        ))}
      </ul>
    </TarjetaTocable>
  )
}

type PropsDeLeyenda = {
  leyenda: LeyendaDeTiposCambio
  puedeGestionar: boolean
  alEditar: () => void
}

// La leyenda al pie de los tipos de cambio que se comparten con un cliente (imagen o texto). «Editar» abre su modal.
export function TarjetaAlCompartir({ leyenda, puedeGestionar, alEditar }: PropsDeLeyenda) {
  const motivo = puedeGestionar ? null : MOTIVO_SIN_PERMISO_TIPOS_CAMBIO
  return (
    <TarjetaTocable
      titulo="Al compartir"
      accion="Editar la leyenda"
      motivo={motivo}
      abrir={alEditar}
    >
      <ValoresDeLaTarjeta
        filas={[
          {
            etiqueta: 'Leyenda',
            valor: leyenda.leyenda || <span className="text-(--color-ink-faint)">Sin leyenda</span>,
          },
        ]}
      />
    </TarjetaTocable>
  )
}
