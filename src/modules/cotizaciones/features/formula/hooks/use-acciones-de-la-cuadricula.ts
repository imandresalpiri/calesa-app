'use client'

import { avisar } from '@/shared/ui/toasts'
import type { Formula } from '../../../entities/formula'
import {
  cambioAlAlternar,
  type CambioDeLaUnidad,
} from '../../../entities/formula/escrito-en-la-celda'
import { bDe, filaDe, type HojaDeLaPlanilla } from '../../../entities/formula/hoja-de-la-planilla'
import type { UnidadDeEjemplo } from '../../../entities/formula/unidad-de-ejemplo'
import type { AccionesDelTeclado, CeldaActiva } from './use-cuadricula'
import type { EdicionConReferencias } from './use-edicion-con-referencias'
import {
  FUERA_DE_LA_FORMULA,
  MOTIVO_SIN_SIGNO,
  type EleccionDeCelda,
} from './use-eleccion-de-celda'
import type { OperacionesDeFila } from './use-operaciones-de-fila'

type Args = {
  hoja: HojaDeLaPlanilla
  trabajo: Formula
  unidad: UnidadDeEjemplo
  edicion: EdicionConReferencias
  ops: OperacionesDeFila
  elegir: (celda: CeldaActiva) => void
  alCambiarUnidad: (cambio: CambioDeLaUnidad) => void
  abrirMenu: () => void
  // El foco vuelve a la grilla (tras aplicar o descartar).
  enfocar: () => void
  // Lo que dice la región viva al insertar una referencia.
  anunciar: (texto: string) => void
  eligiendo: Pick<EleccionDeCelda, 'activo' | 'salir'>
}

// La referencia que inserta un clic en esa celda: su B si tiene %, si no su C.
function referenciaDe(hoja: HojaDeLaPlanilla, celda: CeldaActiva, numero: number) {
  const fila = filaDe(hoja, numero)
  if (fila === undefined) return null
  return celda.col === 'B' && bDe(hoja, numero) !== null
    ? { ref: `B${String(numero)}`, etiqueta: `% de ${fila.nodo.etiqueta}` }
    : { ref: `C${String(numero)}`, etiqueta: fila.nodo.etiqueta }
}

// Supr: un valor fijo (en C) o un % que es constante quedan en 0; lo que escribe el asesor (en Ejemplo), en 0 en la unidad de ejemplo. Nada más se vacía (una
// fórmula no se borra así).
function vaciar(a: Args, celda: CeldaActiva) {
  const numero = a.hoja.numeroDe.get(celda.id) ?? 0
  const nodo = filaDe(a.hoja, numero)?.nodo
  if (celda.col === 'B') {
    const b = bDe(a.hoja, numero)
    const delPct = a.trabajo.definicion.nodos.find((n) => n.id === b?.id)
    if (b !== null && delPct?.tipo === 'constante') a.ops.vaciar(b.id)
    return
  }
  if (nodo === undefined) return
  if (celda.col === 'C' && nodo.tipo === 'constante') a.ops.vaciar(nodo.id)
  else if (celda.col === 'D' && nodo.tipo === 'input')
    a.alCambiarUnidad({ tipo: 'input', id: nodo.id, valor: 0 })
}

// El toque con «Elegir celda» activo (D17 de la fórmula fácil): inserta la referencia de esa celda y vuelve al texto, o dice por qué no. Nunca aplica.
function elegirCelda(a: Args, celda: CeldaActiva) {
  if (celda.col !== 'B' && celda.col !== 'C') return void avisar(FUERA_DE_LA_FORMULA)
  const r = referenciaDe(a.hoja, celda, a.hoja.numeroDe.get(celda.id) ?? 0)
  const cursor = r === null ? null : a.edicion.referenciar(r.ref, false)
  if (r === null || cursor === null) return void avisar(MOTIVO_SIN_SIGNO)
  a.anunciar(`${r.ref}, ${r.etiqueta}, insertada`)
  a.eligiendo.salir(cursor)
}

// Lo que hacen las teclas que no mueven y el clic en una celda (D15): sin edición, el clic elige; con edición, inserta la referencia de esa celda si el cursor
// espera un operando o, si no, aplica y elige esa celda (como Excel); con «Elegir celda» activo, sólo inserta.
export function useAccionesDeLaCuadricula(a: Args) {
  const { hoja, edicion } = a
  const teclado: AccionesDelTeclado = {
    editar: (celda, tipeado) => {
      edicion.abrir(celda, tipeado === undefined ? { en: 'celda' } : { en: 'celda', tipeado })
    },
    mover: (id, hacia) => {
      const n = hoja.numeroDe.get(id) ?? 0
      if (hacia === 'arriba' && n > 1) a.ops.mover(n, { antesDe: n - 1 })
      if (hacia === 'abajo' && n < hoja.filas.length) a.ops.mover(n, { despuesDe: n + 1 })
    },
    vaciar: (celda) => {
      vaciar(a, celda)
    },
    alternar: (celda) => {
      const nodo = filaDe(hoja, hoja.numeroDe.get(celda.id) ?? 0)?.nodo
      const cambio =
        celda.col === 'D' && nodo !== undefined ? cambioAlAlternar(nodo, a.unidad) : null
      if (cambio !== null) a.alCambiarUnidad(cambio)
      return cambio !== null
    },
    abrirMenu: a.abrirMenu,
  }
  const alClic = (celda: CeldaActiva, conShift: boolean) => {
    const e = edicion.edicion
    if (e === null) return void a.elegir(celda)
    if (e.id === celda.id && e.col === celda.col) return
    if (a.eligiendo.activo) return void elegirCelda(a, celda)
    const r = referenciaDe(hoja, celda, hoja.numeroDe.get(celda.id) ?? 0)
    if (r !== null && edicion.referenciar(r.ref, conShift) !== null) {
      a.anunciar(`${r.ref}, ${r.etiqueta}, insertada`)
      return
    }
    if (edicion.aplicar()) {
      a.elegir(celda)
      a.enfocar()
    }
  }
  const alDobleClic = (celda: CeldaActiva) => {
    if (edicion.edicion === null) teclado.editar(celda)
  }
  return { teclado, alClic, alDobleClic }
}
