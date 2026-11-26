'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { avisar } from '@/shared/ui/toasts'
import type { Formula } from '../../../entities/formula'
import {
  aplicarLoEscrito,
  type CambioDeLaUnidad,
  type ColumnaQueSeEscribe,
  type ErrorDeLaCelda,
  type LoAplicado,
} from '../../../entities/formula/escrito-en-la-celda'
import {
  hojaDeLaPlanilla,
  type HojaDeLaPlanilla,
} from '../../../entities/formula/hoja-de-la-planilla'
import { moverFila } from '../../../entities/formula/mover-fila'
import {
  podarLugares,
  saltoTrasReferencia,
  siguienteLugar,
  type TextoConLugares,
} from '../../../entities/formula/operaciones-rapidas'
import {
  insertarReferencia,
  renumerar,
  type TramoDeTexto,
} from '../../../entities/formula/referencias-tipeadas'
import type { TextoDeLaCelda } from '../../../entities/formula/texto-de-la-celda'
import type { CeldaActiva } from './use-cuadricula'
import type { EditorDeLaFormula } from './use-editor-de-la-formula'
import { ESPERA_A_LA_FILA } from './use-guardar-borrador.soporte'

// Dónde se escribe: la celda o la barra de fórmula (la otra muestra lo mismo).
export type LugarDeLaEdicion = 'celda' | 'barra'

export type EdicionDeLaCelda = {
  readonly id: string
  readonly col: ColumnaQueSeEscribe
  readonly texto: string
  readonly cursor: number
  readonly ultima: TramoDeTexto | null
  readonly error: ErrorDeLaCelda | null
  readonly en: LugarDeLaEdicion
  // Al abrir, lo escrito queda elegido (una fila nueva: su concepto se reemplaza al tipear).
  readonly elegirTodo: boolean
  // Los lugares por llenar de una operación rápida que siguen después del cursor, como distancia al final del texto.
  readonly lugares: readonly number[]
}

type Args = {
  editor: EditorDeLaFormula
  hoja: HojaDeLaPlanilla
  locale: string
  textoDe: (celda: CeldaActiva) => TextoDeLaCelda
  alCambiarUnidad: (cambio: CambioDeLaUnidad) => void
}

// `cursor`: dónde queda el cursor en lo tipeado (`fx`: entre los paréntesis de la función); sin él, al final.
export type Apertura = {
  en: LugarDeLaEdicion
  tipeado?: string
  elegirTodo?: boolean
  cursor?: number
  lugares?: readonly number[]
}

// La edición que abre una celda, o nula (con el aviso de por qué no se escribe).
function edicionAlAbrir(
  celda: CeldaActiva,
  a: Apertura,
  libre: boolean,
  textoDe: (celda: CeldaActiva) => TextoDeLaCelda,
): EdicionDeLaCelda | null {
  if (!libre) {
    avisar(ESPERA_A_LA_FILA)
    return null
  }
  // El concepto de una fila recién insertada se abre antes de que la hoja la tenga.
  const t = celda.col === 'A' && a.tipeado !== undefined ? null : textoDe(celda)
  if (t !== null && !t.editable) {
    avisar(t.motivo)
    return null
  }
  const texto = a.tipeado ?? (t?.editable === true ? t.texto : '')
  return {
    id: celda.id,
    col: celda.col,
    texto,
    cursor: Math.min(a.cursor ?? texto.length, texto.length),
    ultima: null,
    error: null,
    en: a.en,
    elegirTodo: a.elegirTodo ?? false,
    lugares: a.lugares ?? [],
  }
}

type PedidoTrasMover = (
  hoja: HojaDeLaPlanilla,
  texto: string,
  formula: Formula,
) => Parameters<typeof aplicarLoEscrito>[0]

// «Mover esta fila debajo de la N»: mueve, vuelve a numerar lo tipeado (la referencia sigue a su fila) y lo aplica sobre la fórmula movida. Si no entra, el error
// va sin tramo (lo tipeado sigue con los números de antes) y nada cambia.
function aplicarTrasMover(
  e: EdicionDeLaCelda,
  { trabajo, hoja }: { trabajo: Formula; hoja: HojaDeLaPlanilla },
  armar: PedidoTrasMover,
): LoAplicado | null {
  const debajoDe = e.error?.moverDebajoDe ?? null
  if (e.error === null || debajoDe === null) return null
  const numero = hoja.numeroDe.get(e.id) ?? 0
  const movida = moverFila(trabajo, numero, { despuesDe: debajoDe }, { hoja })
  const sinTramo = { ...e.error, tramo: null, moverDebajoDe: null }
  if (!movida.ok) return { tipo: 'error', error: { ...sinTramo, mensaje: movida.mensaje } }
  const nueva = hojaDeLaPlanilla(movida.formula)
  const r = aplicarLoEscrito(armar(nueva, renumerar(e.texto, hoja, nueva), movida.formula))
  return r.tipo === 'error'
    ? { tipo: 'error', error: { ...r.error, tramo: null, moverDebajoDe: null } }
    : r
}

type FijarEdicion = Dispatch<SetStateAction<EdicionDeLaCelda | null>>

// Lo que cambia el texto en edición sin aplicarlo: escribir, mover el cursor, la referencia de un clic (que, en una operación rápida, salta el operador hasta el
// siguiente lugar por llenar), una operación rápida y el paso al siguiente lugar.
function loQueSeEscribe(edicion: EdicionDeLaCelda | null, setEdicion: FijarEdicion) {
  return {
    escribir: (texto: string, cursor: number) => {
      setEdicion((e) =>
        e === null
          ? e
          : {
              ...e,
              texto,
              cursor,
              ultima: null,
              error: null,
              elegirTodo: false,
              lugares: podarLugares(texto, cursor, e.lugares),
            },
      )
    },
    ubicar: (cursor: number, en: LugarDeLaEdicion) => {
      setEdicion((e) =>
        e === null || (e.cursor === cursor && e.en === en) ? e : { ...e, cursor, en },
      )
    },
    // La referencia de `celda` («C5», «B9») si el cursor espera un operando, y dónde queda el cursor; si no, nulo (el clic aplica).
    referenciar: (celda: string, conShift: boolean): number | null => {
      if (edicion === null) return null
      const r = insertarReferencia(edicion, celda, conShift)
      if (r === null) return null
      const lugares = podarLugares(r.texto, r.cursor, edicion.lugares)
      const salto = saltoTrasReferencia(r.texto, r.cursor, lugares)
      setEdicion({ ...edicion, ...r, lugares, ...salto, error: null, elegirTodo: false })
      return salto?.cursor ?? r.cursor
    },
    // Una operación rápida ya insertada en lo tipeado (`insertarOperacion()`), con sus lugares por llenar.
    insertarOperacion: (r: TextoConLugares) => {
      setEdicion((e) =>
        e === null ? e : { ...e, ...r, ultima: null, error: null, elegirTodo: false },
      )
    },
    // Tab o «Siguiente»: el cursor al próximo lugar por llenar; falso si no queda ninguno.
    siguienteLugar: (): boolean => {
      if (edicion === null) return false
      const s = siguienteLugar(edicion.texto, edicion.cursor, edicion.lugares)
      if (s === null) return false
      setEdicion({ ...edicion, ...s, ultima: null, elegirTodo: false })
      return true
    },
  }
}

// Un solo texto en edición (D15 del cambio de la planilla), que muestran la celda y la barra de fórmula: abrirlo, escribir (`loQueSeEscribe()`), aplicar
// (`aplicarLoEscrito()`: la fórmula de trabajo, la unidad de ejemplo o el error, que deja la edición abierta con su tramo), descartar y «Mover esta fila debajo
// de la N» (mueve, vuelve a numerar lo tipeado y aplica; si no entra, nada cambia).
export function useEdicionConReferencias({ editor, hoja, locale, textoDe, alCambiarUnidad }: Args) {
  const [edicion, setEdicion] = useState<EdicionDeLaCelda | null>(null)
  const cerrar = () => {
    setEdicion(null)
    editor.cerrar()
  }
  const conError = (e: EdicionDeLaCelda, error: ErrorDeLaCelda) => {
    setEdicion({ ...e, error, elegirTodo: false })
  }
  const resolver = (e: EdicionDeLaCelda, r: LoAplicado): boolean => {
    if (r.tipo === 'error') {
      conError(e, r.error)
      return false
    }
    if (r.tipo === 'unidad') alCambiarUnidad(r.cambio)
    else if (r.tipo === 'nada') {
      // Nada que cambiar: se cierra como si se aplicara.
    } else if (!editor.cambiar(r.formula, { id: e.id, soltados: r.soltados })) {
      avisar('Espera a que se guarde el borrador.')
      return false
    }
    cerrar()
    return true
  }
  const pedido = (e: EdicionDeLaCelda, h: HojaDeLaPlanilla, texto: string) => ({
    formula: editor.trabajo,
    hoja: h,
    numero: h.numeroDe.get(e.id) ?? 0,
    col: e.col,
    texto,
    locale,
    tablas: editor.tablas,
  })
  return {
    edicion,
    abrir: (celda: CeldaActiva, a: Apertura): boolean => {
      const nueva = edicionAlAbrir(celda, a, editor.libre, textoDe)
      if (nueva === null) return false
      editor.abrir(celda.id)
      setEdicion(nueva)
      return true
    },
    ...loQueSeEscribe(edicion, setEdicion),
    aplicar: (confirmaPisar = false): boolean =>
      edicion === null ||
      resolver(
        edicion,
        aplicarLoEscrito({ ...pedido(edicion, hoja, edicion.texto), confirmaPisar }),
      ),
    descartar: cerrar,
    moverYAplicar: () => {
      if (edicion === null) return
      const r = aplicarTrasMover(
        edicion,
        { trabajo: editor.trabajo, hoja },
        (h, texto, formula) => ({
          ...pedido(edicion, h, texto),
          formula,
        }),
      )
      if (r !== null) resolver(edicion, r)
    },
  }
}

export type EdicionConReferencias = ReturnType<typeof useEdicionConReferencias>
