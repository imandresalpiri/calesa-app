'use client'

import { useState } from 'react'
import { esperaOperando } from '../../../entities/formula/referencias-tipeadas'
import type { EdicionDeLaCelda } from './use-edicion-con-referencias'

export const MOTIVO_SIN_SIGNO = 'Escribe un signo (+ - * / ;) antes de elegir otra celda.'
export const GUIA_DE_ELEGIR = 'Toca la celda que quieres usar.'
export const FUERA_DE_LA_FORMULA =
  'Esa celda no entra en una fórmula: toca una de las columnas B o C.'

// ¿Un toque en otra celda insertaría su referencia? Si el cursor espera un operando o está justo tras la última referencia (que la reemplaza).
const puedeReferenciar = (e: EdicionDeLaCelda) =>
  (e.ultima !== null && e.cursor === e.ultima.hasta) || esperaOperando(e.texto, e.cursor)

// Lleva el foco al texto de la barra con el cursor en su lugar, ya dibujado.
function volverAlTexto(id: string, cursor: number) {
  requestAnimationFrame(() => {
    const campo = document.getElementById(id)
    if (!(campo instanceof HTMLTextAreaElement)) return
    campo.setSelectionRange(cursor, cursor)
    campo.focus()
  })
}

// «Elegir celda» del celular (D17 de la fórmula fácil): mientras se escribe una C, saca el foco del texto (el teclado se cierra y deja ver la cuadrícula) hasta
// que se toca una celda o se cancela; entonces el foco vuelve al texto con el cursor donde estaba. Va atado a la edición en que se entró: otra edición, o
// ninguna, lo apaga sola. Si el cursor no espera una celda, está apagado con su motivo.
export function useEleccionDeCelda(edicion: EdicionDeLaCelda | null, idDelTexto: string) {
  const [en, setEn] = useState<string | null>(null)
  // Sin edición, se olvida: reabrir la misma fila no vuelve a entrar.
  if (edicion === null && en !== null) setEn(null)
  const enC = edicion !== null && edicion.col === 'C'
  const activo = enC && en === edicion.id
  const motivo = enC && !puedeReferenciar(edicion) ? MOTIVO_SIN_SIGNO : null
  // `cursor`: dónde queda tras insertar la referencia; sin él, donde estaba.
  const salir = (cursor?: number) => {
    setEn(null)
    if (edicion !== null) volverAlTexto(idDelTexto, cursor ?? edicion.cursor)
  }
  return {
    // Si hay una C en edición: el botón se ofrece.
    enC,
    activo,
    motivo,
    entrar: () => {
      if (!enC || motivo !== null) return
      setEn(edicion.id)
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    },
    salir,
  }
}

export type EleccionDeCelda = ReturnType<typeof useEleccionDeCelda>
