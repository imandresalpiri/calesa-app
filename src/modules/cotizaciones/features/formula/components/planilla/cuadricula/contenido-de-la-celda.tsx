'use client'

import type {
  ContenidoDeC as Contenido,
  ContenidoDelEjemplo as DelEjemplo,
} from '../../../../../entities/formula/contenido-de-c'
import type { CifraDeLaFila } from '../../../../../entities/formula/vista-previa'
import { formatoDe, type Nodo } from '../../../../../entities/nodos'
import { CeldaDelValor } from '../celda-del-valor'
import { ValorDeConstante } from '../comunes/valor-de-constante'
import { TEXTO_RECORTADO } from './clases'
import type { ValorDeLaUnidad } from './valor-de-la-unidad'

const RAYA = <span className="text-(--color-ink-soft)">—</span>

type PropsDeC = {
  nodo: Nodo
  contenido: Contenido
  // El valor fijo (en `params`): nulo sin valor; `undefined` si la fila no es un valor fijo.
  constante: number | null | undefined
}

function DeLaUnidad({ nodo, unidad }: { nodo: Nodo; unidad: ValorDeLaUnidad }) {
  if (nodo.tipo === 'bandera') return <>{unidad === true ? 'Sí' : 'No'}</>
  if (nodo.tipo === 'opcion')
    return <>{nodo.opciones.find((o) => o.clave === unidad)?.etiqueta ?? '—'}</>
  if (typeof unidad === 'number')
    return <ValorDeConstante valor={unidad} formato={formatoDe(nodo)} />
  return unidad === null || unidad === false || unidad === true ? RAYA : <>{unidad}</>
}

// Lo que muestra la C, lo que guarda la fórmula: el valor fijo (el dinero por `<Monto>`, Modo Live), el texto en A1 de un cálculo o, en lo que la fórmula no
// guarda, de dónde sale en corto. Un texto va en una línea con «…» y entero en el `title` (nunca una cifra en `title`).
export function ContenidoDeC({ nodo, contenido, constante }: PropsDeC) {
  if (contenido.tipo === 'valor_fijo')
    return constante === null || constante === undefined ? (
      RAYA
    ) : (
      <ValorDeConstante valor={constante} formato={formatoDe(nodo)} />
    )
  return (
    <span
      title={contenido.texto}
      className={
        contenido.tipo === 'formula'
          ? `${TEXTO_RECORTADO} font-mono`
          : `${TEXTO_RECORTADO} text-(--color-ink-soft)`
      }
    >
      {contenido.texto}
    </span>
  )
}

type PropsDelEjemplo = {
  nodo: Nodo
  ejemplo: DelEjemplo
  // Lo de la unidad de ejemplo (lo que escribe el asesor, el dato del vehículo, el interruptor o la variante); `undefined` si la fila no es de la unidad.
  unidad: ValorDeLaUnidad | undefined
  cifra: CifraDeLaFila
  leyendo: boolean
}

// Lo que muestra Ejemplo, lo que da la fila con la unidad de ejemplo: lo de la unidad (el asesor, el vehículo, «Sí» o «No», la opción elegida) o la cifra
// calculada; nada en un valor fijo (su número ya está en C). El dinero por `<Monto>` (Modo Live).
export function ContenidoDelEjemplo(p: PropsDelEjemplo) {
  if (p.ejemplo === 'nada') return null
  if (p.ejemplo === 'unidad' && p.unidad !== undefined)
    return <DeLaUnidad nodo={p.nodo} unidad={p.unidad} />
  return <CeldaDelValor cifra={p.cifra} leyendo={p.leyendo} />
}

// Lo que muestra la B: el % de la fila (el absorbido, el de otra fila o el escrito en su fórmula), o «—» si todavía no tiene cifra.
export function ContenidoDeB({ valor }: { valor: number | null }) {
  return valor === null ? RAYA : <ValorDeConstante valor={valor} formato="pct" />
}
