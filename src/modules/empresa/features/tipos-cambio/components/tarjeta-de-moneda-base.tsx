import { TarjetaTocable } from '@/shared/ui/tarjetas-de-ajustes'
import { MOTIVO_MONEDA_BASE_CON_DATOS, MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import type { Moneda } from '../../../entities/tipos-cambio'

type Props = {
  // La moneda base con su nombre y símbolo; null si ya no está entre las monedas (no debería pasar: la base no se desactiva).
  moneda: Moneda | null
  codigo: string
  // Con vehículos, cotizaciones o gastos cargados la base ya no se cambia: «Cambiar» abre el modal y éste lo dice.
  conDatosCargados: boolean
  // `empresa.ajustes.gestionar`: la base es un ajuste de la empresa, no un tipo de cambio.
  puedeEditar: boolean
  alCambiar: () => void
}

// La moneda en la que se guardan todos los montos. Arriba de todo: los tipos de cambio de abajo se leen contra ella.
export function TarjetaDeMonedaBase({
  moneda,
  codigo,
  conDatosCargados,
  puedeEditar,
  alCambiar,
}: Props) {
  const motivo = puedeEditar ? null : MOTIVO_SIN_PERMISO_AJUSTES
  return (
    <TarjetaTocable
      titulo="Moneda base"
      accion="Cambiar la moneda base"
      motivo={motivo}
      abrir={alCambiar}
    >
      <p className="flex flex-wrap items-baseline gap-x-2 text-(--color-ink)">
        <span className="font-mono text-(length:--text-2xl) font-semibold">{codigo}</span>
        {moneda ? (
          <span className="text-(length:--text-base) break-words">
            {moneda.nombre} · {moneda.simbolo}
          </span>
        ) : null}
      </p>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {motivo ??
          (conDatosCargados
            ? MOTIVO_MONEDA_BASE_CON_DATOS
            : 'Los montos se guardan en esta moneda.')}
      </p>
    </TarjetaTocable>
  )
}
