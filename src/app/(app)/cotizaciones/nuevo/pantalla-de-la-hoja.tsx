import type { ComponentProps } from 'react'
import type { HojaLista, RecalculoInicial } from '@/modules/cotizaciones'
import {
  PantallaDeCotizar,
  PantallaDeCotizarEnParDiferida,
} from '@/modules/cotizaciones/pantallas/cotizar'

type Props = Omit<ComponentProps<typeof PantallaDeCotizar>, 'hoja' | 'inicial'> & {
  hoja: HojaLista
  // El primer cálculo de cada opción (el de la segunda, sólo con la variante en par).
  iniciales: readonly [RecalculoInicial, RecalculoInicial | undefined]
}

// La hoja de siempre o, con la variante en par (glosario: «Variante en par»), la hoja con las dos opciones, que se pide sólo entonces (`diferido()`). En par la ayuda sólo
// se consulta: sin «Tu vehículo» (`valoresDelVehiculo`) ni valores que llenan.
export function PantallaDeLaHoja({
  hoja,
  iniciales: [primera, segunda],
  valoresDelVehiculo,
  ...props
}: Props) {
  if (hoja.par && segunda) {
    return (
      <PantallaDeCotizarEnParDiferida
        hoja={{ ...hoja, par: hoja.par }}
        iniciales={[primera, segunda]}
        {...props}
      />
    )
  }
  return (
    <PantallaDeCotizar
      hoja={hoja}
      inicial={primera}
      valoresDelVehiculo={valoresDelVehiculo}
      {...props}
    />
  )
}
