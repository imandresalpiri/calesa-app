'use client'

import { insertarFuncion } from '../../../entities/formula/insertar-funcion'
import type { TextoDeLaCelda } from '../../../entities/formula/texto-de-la-celda'
import type { CeldaActiva } from './use-cuadricula'
import type { EdicionConReferencias } from './use-edicion-con-referencias'

export const MOTIVO_SIN_CELDA_PARA_FX = 'Toca una celda para escribir una fórmula.'
export const MOTIVO_FX_FUERA_DE_C = 'Las funciones van en C.'

type Args = {
  edicion: EdicionConReferencias
  activa: CeldaActiva | null
  textoDe: (celda: CeldaActiva) => TextoDeLaCelda
  elegir: (celda: CeldaActiva) => void
  // El id del texto de la barra, que toma el foco con el cursor entre los paréntesis.
  idDelTexto: string
}

// Lleva el foco al texto de la barra con el cursor en su lugar, ya dibujado (después de que el menú devolvió el foco a su botón).
function enfocarElTexto(id: string, cursor: number) {
  requestAnimationFrame(() => {
    const campo = document.getElementById(id)
    if (!(campo instanceof HTMLTextAreaElement)) return
    campo.setSelectionRange(cursor, cursor)
    campo.focus()
  })
}

// Por qué `fx ▾` está apagado: sin celda, con la edición abierta fuera de C o en una C que no se escribe. Nulo: se puede.
function motivoDeFx(
  celda: CeldaActiva | null,
  abiertaEn: CeldaActiva['col'] | null,
  deC: TextoDeLaCelda | null,
): string | null {
  if (celda === null) return MOTIVO_SIN_CELDA_PARA_FX
  if (abiertaEn !== null && abiertaEn !== 'C') return MOTIVO_FX_FUERA_DE_C
  return deC !== null && !deC.editable ? deC.motivo : null
}

// `fx ▾` de la barra de fórmula: por qué está apagado (sin celda, escribiendo en A, B o Ejemplo, o una C que no se escribe) y qué hace elegir una función: con
// la edición de C abierta, la inserta en el cursor; sin edición, abre la de la C de la fila activa con la función. Siempre en la barra, con el foco en su texto.
export function useFuncionEnLaBarra({ edicion, activa, textoDe, elegir, idDelTexto }: Args) {
  const e = edicion.edicion
  const celda: CeldaActiva | null =
    e !== null ? { id: e.id, col: e.col } : activa === null ? null : { id: activa.id, col: 'C' }
  // El texto con que abre la C de la fila: si no hay edición, el que se envuelve; siempre, si es un % en puntos.
  const deC = celda !== null && celda.col === 'C' ? textoDe(celda) : null
  const t = e === null ? deC : null
  const enPuntos = deC?.editable === true && deC.enPuntos === true
  const motivo = motivoDeFx(celda, e?.col ?? null, t)
  return {
    motivo,
    insertar: (nombre: string) => {
      if (motivo !== null || celda === null) return
      if (e !== null) {
        const r = insertarFuncion(e.texto, e.cursor, nombre, enPuntos)
        edicion.escribir(r.texto, r.cursor)
        edicion.ubicar(r.cursor, 'barra')
        enfocarElTexto(idDelTexto, r.cursor)
        return
      }
      const r = insertarFuncion(t?.editable === true ? t.texto : '', Infinity, nombre, enPuntos)
      elegir(celda)
      if (edicion.abrir(celda, { en: 'barra', tipeado: r.texto, cursor: r.cursor }))
        enfocarElTexto(idDelTexto, r.cursor)
    },
  }
}

export type FuncionEnLaBarra = ReturnType<typeof useFuncionEnLaBarra>
