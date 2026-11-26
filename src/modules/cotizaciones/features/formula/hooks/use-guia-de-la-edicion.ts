'use client'

import { firmaEnElCursor } from '../../../entities/formula/firma-en-el-cursor'
import { esperaOperando } from '../../../entities/formula/referencias-tipeadas'
import type { EdicionConReferencias } from './use-edicion-con-referencias'

// La guía del renglón bajo la barra mientras se escribe una fórmula en C: la firma en el cursor (dentro de una función) o, si el cursor espera un operando, que
// tocar una celda la usa; y si quedan lugares por llenar de una operación rápida («Siguiente»). Puro sobre lo que se escribe: O(largo del texto) por tecla.
export function useGuiaDeLaEdicion(edicion: EdicionConReferencias) {
  const e = edicion.edicion
  const enC = e !== null && e.col === 'C'
  return {
    firma: enC ? firmaEnElCursor(e.texto, e.cursor) : null,
    esperaCelda: enC && esperaOperando(e.texto, e.cursor),
    quedanLugares: enC && e.lugares.length > 0,
  }
}
