'use client'

import { parseAsString, useQueryState } from 'nuqs'
import {
  CLAVE_DE_LA_PIEZA,
  piezaDelTexto,
  textoDeLaPieza,
  type PiezaDeLaHoja,
} from '../../../entities/diseno/pieza-de-la-hoja'

// La pieza elegida del editor de la hoja, en `?pieza=` (recargar la conserva; «Ir a la pieza» de un rechazo lleva ahí). Elegir reemplaza la entrada del
// historial y no mueve el scroll; un texto que no es una pieza no elige nada.
export function usePiezaElegida() {
  const [texto, poner] = useQueryState(
    CLAVE_DE_LA_PIEZA,
    parseAsString.withOptions({ history: 'replace', scroll: false }),
  )
  return {
    pieza: piezaDelTexto(texto),
    elegir: (pieza: PiezaDeLaHoja | null) => {
      void poner(pieza === null ? null : textoDeLaPieza(pieza))
    },
  }
}

export type PiezaElegida = ReturnType<typeof usePiezaElegida>
