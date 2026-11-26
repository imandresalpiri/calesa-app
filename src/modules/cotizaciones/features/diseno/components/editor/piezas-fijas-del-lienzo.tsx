'use client'

import type { ContextoDeHoja } from '../../../../entities/binding'
import type { HojaDeLaVistaPrevia } from '../../../../entities/diseno/hoja-del-diseno'
import { CabeceraDeHoja } from '../../../hoja/components/cabecera-de-hoja'
import { TarjetaDelTotal } from '../../../hoja/components/region-del-total'
import type { ApoyoDelLienzo } from '../../hooks/use-apoyo-del-lienzo'
import { nada } from './acciones-quietas'
import { PiezaFija } from './pieza-fija'

type PropsDeLaPieza = {
  hoja: HojaDeLaVistaPrevia
  contexto: ContextoDeHoja
  apoyo: ApoyoDelLienzo
}

// La tarjeta del total suelta, como en `/cotizaciones/nuevo` sin la pieza en una sección: a todo el ancho, debajo de las secciones, y es la pieza que se elige. Con la tarjeta
// en una sección, ésta no se dibuja: se elige allí.
export function TotalSueltoDelLienzo({ hoja, contexto, apoyo }: PropsDeLaPieza) {
  return (
    <PiezaFija pieza={{ pieza: 'total' }} nombre="la tarjeta del total" vacio="" apoyo={apoyo}>
      <TarjetaDelTotal
        etiqueta={hoja.tarjetaTotal.etiqueta}
        decimales={hoja.tarjetaTotal.decimales}
        contexto={contexto}
      />
    </PiezaFija>
  )
}

export function CabeceraDelLienzo({ hoja, contexto, apoyo }: PropsDeLaPieza) {
  return (
    <PiezaFija
      pieza={{ pieza: 'cabecera' }}
      nombre="la cabecera"
      vacio="Cabecera: sin modos ni «Ver total en moneda local»."
      apoyo={apoyo}
    >
      <CabeceraDeHoja
        cabecera={hoja.cabecera}
        modoElegido={contexto.entradas.modoTc}
        alElegirModo={nada}
        verTotalBs={false}
        alCambiarVerTotalBs={nada}
      />
    </PiezaFija>
  )
}
