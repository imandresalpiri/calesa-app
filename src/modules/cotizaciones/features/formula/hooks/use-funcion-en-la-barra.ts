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

// `fx ▾` de la barra de fórmula: por qué está apagado (sin celda, escribiendo en A, B o Ejemplo, o una C que no se escribe) y qué hace elegir una función: con
// la edición de C abierta, la inserta en el cursor; sin edición, abre la de la C de la fila activa con la función. Siempre en la barra, con el foco en su texto.
export function useFuncionEnLaBarra({ edicion, activa, textoDe, elegir, idDelTexto }: Args) {
  const e = edicion.edicion
  const celda: CeldaActiva | null =
    e !== null ? { id: e.id, col: e.col } : activa === null ? null : { id: activa.id, col: 'C' }
  const t = e === null && celda !== null ? textoDe(celda) : null
  const motivo =
    celda === null
      ? MOTIVO_SIN_CELDA_PARA_FX
      : e !== null && e.col !== 'C'
        ? MOTIVO_FX_FUERA_DE_C
        : t !== null && !t.editable
          ? t.motivo
          : null
  return {
    motivo,
    insertar: (nombre: string) => {
      if (motivo !== null || celda === null) return
      if (e !== null) {
        const r = insertarFuncion(e.texto, e.cursor, nombre)
        edicion.escribir(r.texto, r.cursor)
        edicion.ubicar(r.cursor, 'barra')
        enfocarElTexto(idDelTexto, r.cursor)
        return
      }
      const r = insertarFuncion(t?.editable === true ? t.texto : '', Infinity, nombre)
      elegir(celda)
      if (edicion.abrir(celda, { en: 'barra', tipeado: r.texto, cursor: r.cursor }))
        enfocarElTexto(idDelTexto, r.cursor)
    },
  }
}

export type FuncionEnLaBarra = ReturnType<typeof useFuncionEnLaBarra>
