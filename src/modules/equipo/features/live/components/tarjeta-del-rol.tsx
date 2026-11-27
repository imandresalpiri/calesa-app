'use client'

import { Badge } from '@/shared/ui/badge'
import { TarjetaEditable, ValoresDeLaTarjeta } from '@/shared/ui/tarjetas-de-ajustes'
import type { AjustesDeUnRol, OrigenDelLive } from '../../../entities/live-configuracion'
import { filasDelRol } from '../../../entities/live-textos'

type Props = {
  fila: AjustesDeUnRol
  origenes: readonly OrigenDelLive[]
  alEditar: (rolId: string) => void
  alVolverALoPorDefecto: (rolId: string) => void
}

// Un rol con lo que se ve de él en el Modo Live, campo por campo (sin fila, lo por defecto y la insignia «Por defecto»). Tocar la tarjeta abre su
// modal; el «⋯» suma «Volver a lo por defecto…» sólo si el rol tiene lo suyo.
export function TarjetaDelRol({ fila, origenes, alEditar, alVolverALoPorDefecto }: Props) {
  const filas = filasDelRol(fila.ajustes, origenes).map(({ etiqueta, valor }) => ({
    etiqueta,
    valor,
  }))
  return (
    <TarjetaEditable
      titulo={fila.rol.nombre}
      motivo={null}
      abrir={() => {
        alEditar(fila.rol.id)
      }}
      estado={fila.ajustes === null ? <Badge variant="secondary">Por defecto</Badge> : undefined}
      extra={
        fila.ajustes === null
          ? []
          : [
              {
                tipo: 'accion',
                clave: 'por-defecto',
                etiqueta: 'Volver a lo por defecto…',
                destructiva: true,
                despuesDeCerrar: true,
                alElegir: () => {
                  alVolverALoPorDefecto(fila.rol.id)
                },
              },
            ]
      }
    >
      <ValoresDeLaTarjeta filas={filas} />
    </TarjetaEditable>
  )
}
