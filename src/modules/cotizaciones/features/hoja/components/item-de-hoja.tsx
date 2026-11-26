'use client'

import { useContext } from 'react'
import { bloqueoDeLado, valorDeSubtotal, type ContextoDeHoja } from '../../../entities/binding'
import type { ItemDeHoja as Item } from '../../../entities/hoja'
import type { Corte } from '../../../entities/rejilla-de-la-hoja'
import type { AccionesDeHoja } from '../hooks/use-hoja'
import { AtajosDeHoja } from './atajos-de-hoja'
import { CeldaDeHoja } from './celda-de-hoja'
import { estiloDelItem } from './clases-de-la-posicion'
import { claseDelItem } from './clases-de-la-rejilla'
import { InterruptorDeHoja } from './interruptor-de-hoja'
import { ContextoDelPar } from './par/contexto-del-par'
import { ItemEnPar } from './par/item-en-par'
import { SubtotalDeHoja } from './subtotal-de-hoja'
import { TotalDeHoja } from './total-de-hoja'
import { VarianteDeHoja } from './variante-de-hoja'

type Props = { item: Item; contexto: ContextoDeHoja; acciones: AccionesDeHoja }
// Desde qué corte la rejilla de su sección dibuja posiciones (`rejillaDeLosItems()`); sin él, el ítem va en el flujo.
type CorteDeSuRejilla = Corte | 'siempre' | undefined

function Atajos({ item, contexto, acciones }: Props & { item: Extract<Item, { tipo: 'atajos' }> }) {
  const celda = contexto.indice.lados.get(item.nodo)?.celda
  if (!celda) {
    return null
  }
  const { entradas } = contexto
  const posicion = entradas.atajos.get(item.nodo)
  // Sigue pulsado sólo mientras lo que vale es lo que ese chip puso.
  const chip = posicion === undefined ? undefined : item.chips[posicion]
  const vigente = chip !== undefined && entradas.overrides.get(item.nodo) === chip.valor
  return (
    <AtajosDeHoja
      item={item}
      etiquetaDeLaCelda={celda.etiqueta}
      bloqueada={bloqueoDeLado(item.nodo, contexto) !== undefined}
      pulsado={vigente ? (posicion ?? null) : null}
      alElegir={acciones.alElegirAtajo}
    />
  )
}

// En una hoja en par, lo que cambia según la opción va en dos celdas (glosario: «Variante en par»). Sin el par (una hermana abierta sola), la celda de siempre.
const enParDe = (
  item: Item,
  enPar: boolean,
): Extract<Item, { tipo: 'celda' | 'subtotal' }> | null =>
  enPar && (item.tipo === 'celda' || item.tipo === 'subtotal') && item.enPar === true ? item : null

// La tarjeta del total como pieza, visible a todo ancho. En par mandan los dos totales (`TotalesEnPar`, la tarjeta suelta arriba de «Avanzado»): la pieza no dibuja nada.
function PiezaDelTotal({
  item,
  contexto,
  enPar,
  corte,
}: {
  item: Extract<Item, { tipo: 'total' }>
  contexto: ContextoDeHoja
  enPar: boolean
  corte: CorteDeSuRejilla
}) {
  if (enPar) return null
  return (
    <div className={claseDelItem(item, corte)} style={estiloDelItem(item, corte)}>
      <TotalDeHoja item={item} contexto={contexto} />
    </div>
  )
}

// Un ítem de una sección, con su `data-nodo` (lo que miran los e2e: el orden del DOM es el de lectura). Su lugar en la rejilla de 12 pistas de su sección (columnas,
// filas, letra y énfasis) sale de su aspecto (`claseDelItem()`): sin él, la celda con su ancho con nombre y lo demás a lo ancho, como siempre. Con el corte de su
// rejilla, además su posición desde ese corte (`estiloDelItem()`: las variables en el estilo del mismo nodo).
export function ItemDeHoja({
  item,
  contexto,
  acciones,
  corte,
}: Props & { corte?: CorteDeSuRejilla }) {
  const enPar = useContext(ContextoDelPar) !== null
  const enDos = enParDe(item, enPar)
  if (enDos !== null) {
    return <ItemEnPar item={enDos} acciones={acciones} />
  }
  const clase = claseDelItem(item, corte)
  const estilo = estiloDelItem(item, corte)
  switch (item.tipo) {
    case 'celda':
      return (
        <div data-nodo={item.nodo} className={clase} style={estilo}>
          <CeldaDeHoja celda={item} contexto={contexto} acciones={acciones} />
        </div>
      )
    case 'atajos':
      return (
        <div data-atajos={item.nodo} className={clase} style={estilo}>
          <Atajos item={item} contexto={contexto} acciones={acciones} />
        </div>
      )
    case 'variante':
      return (
        <div data-nodo={item.nodo} className={clase} style={estilo}>
          <VarianteDeHoja
            item={item}
            elegida={contexto.entradas.variante ?? item.porDefecto}
            alElegir={acciones.alElegirVariante}
          />
        </div>
      )
    case 'interruptor':
      return (
        <div data-nodo={item.nodo} className={clase} style={estilo}>
          <InterruptorDeHoja
            item={item}
            encendido={contexto.entradas.banderas.has(item.nodo)}
            fueraDeVariante={contexto.respuesta?.estados.get(item.nodo) === 'fuera_de_variante'}
            alCambiar={acciones.alAlternarBandera}
          />
        </div>
      )
    case 'subtotal':
      return (
        <div data-nodo={item.nodo} className={clase} style={estilo}>
          <SubtotalDeHoja item={item} valor={valorDeSubtotal(item.nodo, contexto.respuesta)} />
        </div>
      )
    case 'total':
      return <PiezaDelTotal item={item} contexto={contexto} enPar={enPar} corte={corte} />
    default: {
      const _: never = item
      return _
    }
  }
}
