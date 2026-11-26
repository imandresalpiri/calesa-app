'use client'

import type { HojaLista } from '../../../../entities/hoja'
import type { ParDeHoja } from '../../../../entities/hoja-en-par'
import type { ColumnaDeLaHoja } from '../../hooks/use-hoja-en-par'
import { VistaPreviaDeLaHojaViva } from '../vista-previa-de-la-hoja'
import type { PropsDeLaHojaEnPar } from './hoja-en-par'

type DeDos<T> = readonly [T, T]

// «Vista previa» de la hoja en par: la tarjeta de la cotización abierta y la de su hermana, una bajo la otra en el orden de las opciones.
export function VistaPreviaDelPar({
  hoja,
  par,
  columnas,
  props,
  hayCambios,
}: {
  hoja: HojaLista
  par: ParDeHoja
  columnas: DeDos<ColumnaDeLaHoja>
  props: PropsDeLaHojaEnPar
  hayCambios: boolean
}) {
  const abierta = props.abierta ?? 0
  const otra = abierta === 0 ? 1 : 0
  return (
    <VistaPreviaDeLaHojaViva
      hoja={hoja}
      h={columnas[abierta]}
      {...props.deLoGuardado}
      hayCambios={hayCambios}
      opcion={par.opciones[abierta].etiqueta}
      hermana={{
        h: columnas[otra],
        calculo: props.deLaHermana?.calculo,
        opcion: par.opciones[otra].etiqueta,
        antes: otra < abierta,
        ...(props.deLaHermana ? { pagina: props.deLaHermana.pagina } : {}),
      }}
    />
  )
}
