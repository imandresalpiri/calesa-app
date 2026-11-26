'use client'

import { use, type ReactNode } from 'react'
import { ContextoDeLaRanuraDeLaCabecera } from './contexto'

// El lugar de la cabecera de la hoja en la fila de las barras. La cabecera llega al hidratar (un portal no se dibuja en el servidor): mientras el lugar está vacío se ve
// `reserva` (la `CabeceraQuieta` que arma la página, de la misma medida), y en cuanto el portal lo llena la reserva se esconde por CSS (`peer-empty`), en el mismo cuadro:
// la fila no salta. Sin nada que dibujar, no ocupa lugar.
export function RanuraDeLaCabecera({ reserva = null }: { reserva?: ReactNode }) {
  const ranura = use(ContextoDeLaRanuraDeLaCabecera)
  return (
    <div className="grid min-w-0 items-center">
      <div
        ref={ranura?.poner}
        data-ranura-de-la-cabecera=""
        className="peer flex min-w-0 items-center empty:hidden"
      />
      {reserva === null ? null : (
        <div inert className="hidden min-w-0 peer-empty:block">
          {reserva}
        </div>
      )}
    </div>
  )
}
