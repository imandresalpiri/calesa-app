// Lo que cada fila de la cuadrícula saca de la planilla, en valores simples: las filas son `memo` y la planilla dibuja hasta 500. Puro.
import type { ReactNode } from 'react'
import type { ContenidoDeLaFila } from '../../../../../entities/formula/contenido-de-c'
import type { FilaDeLaHoja } from '../../../../../entities/formula/hoja-de-la-planilla'
import type { CifraDeLaFila } from '../../../../../entities/formula/vista-previa'
import type { Arrastre } from '../../../hooks/use-arrastre-de-fila'
import type { Planilla } from '../../../hooks/use-planilla'
import type { PropsDeLaFila } from './fila-de-la-cuadricula'
import { porcentajeDe, unidadDe } from './valor-de-la-unidad'

const SIN_CIFRA: CifraDeLaFila = { tipo: 'nada' }
// Una fila recién insertada, antes de que el cálculo la tenga.
const SIN_CONTENIDO: ContenidoDeLaFila = {
  c: { tipo: 'de_donde_sale', texto: '' },
  ejemplo: 'nada',
}

type Extra = { arrastre: Arrastre | null; entrada: ReactNode; menu: ReactNode }

function alSoltar(arrastre: Arrastre | null, id: string) {
  const sobre = arrastre?.sobre
  return sobre === undefined || sobre === null || sobre.id !== id || arrastre?.id === id
    ? null
    : sobre.lado
}

// Dónde está la fila en lo que pasa: la celda activa, la que se escribe, el «⋯», los bordes de lo nombrado y el arrastre.
function deLaCelda(pl: Planilla, fila: FilaDeLaHoja, x: Extra) {
  const { id, numero } = fila
  const { activa } = pl.cuadricula
  const e = pl.edicion.edicion
  const enEdicion = e?.id === id ? e.col : null
  const bordes = pl.bordes.get(numero)
  return {
    activa: activa?.id === id ? activa.col : null,
    enEdicion,
    entrada: enEdicion === null ? null : x.entrada,
    menu: activa?.id === id && e === null ? x.menu : null,
    bordeB: bordes?.B,
    bordeC: bordes?.C,
    soltar: alSoltar(x.arrastre, id),
    arrastrada: x.arrastre?.id === id,
  }
}

// Lo que la fila muestra: su %, su valor fijo, lo de la unidad de ejemplo, su cifra, qué va en C y en Ejemplo, el rechazo que la nombra y el dato del vehículo que
// falta.
function deLosValores(pl: Planilla, fila: FilaDeLaHoja) {
  const { id, nodo, numero } = fila
  const { trabajo, rechazo } = pl.editor
  return {
    b: porcentajeDe(pl.hoja, numero, { trabajo, vista: pl.calculo.vista }),
    constante: nodo.tipo === 'constante' ? (trabajo.params.constantes[id] ?? null) : undefined,
    unidad: unidadDe(pl.unidad, nodo),
    cifra: pl.calculo.cifras.get(id) ?? SIN_CIFRA,
    leyendo: pl.calculo.vista === null,
    contenido: pl.contenidos.get(id) ?? SIN_CONTENIDO,
    rechazo: rechazo?.filaId === id ? rechazo.mensaje : null,
    falta: pl.faltan.get(id) ?? null,
  }
}

export const propsDeLaFila = (pl: Planilla, fila: FilaDeLaHoja, x: Extra): PropsDeLaFila => ({
  fila,
  prefijo: pl.prefijo,
  ...deLaCelda(pl, fila, x),
  ...deLosValores(pl, fila),
})
