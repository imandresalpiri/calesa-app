// La firma en el cursor (docs/GLOSARIO.md): mientras se escribe dentro de una función, su forma con el valor que se está escribiendo resaltado, como en una
// hoja de cálculo («SI(condición; **si se cumple**; si no)»). Gana la función de más adentro; pasado el último valor de una que `repite`, se resalta el último.
// Fuera de una función, en una que no es de la ayuda o en un texto sin «=», nula. O(largo del texto). Puro.
import { marcoEnElCursor } from './autocompletar'
import { FUNCIONES_DE_LA_AYUDA } from './ayuda-de-funciones'

export type PiezaDeLaFirma = { readonly texto: string; readonly actual: boolean }

export type FirmaEnElCursor = {
  readonly nombre: string
  // Los valores en orden y, si la función repite, «…» al final (nunca actual).
  readonly piezas: readonly PiezaDeLaFirma[]
}

export function firmaEnElCursor(texto: string, cursor: number): FirmaEnElCursor | null {
  if (!texto.startsWith('=') || cursor < 1 || cursor > texto.length) return null
  const marco = marcoEnElCursor(texto, cursor)
  const ayuda = FUNCIONES_DE_LA_AYUDA.find((f) => f.nombre === marco?.fn)
  if (marco === null || ayuda === undefined) return null
  const ultimo = ayuda.argumentos.length - 1
  const actual = ayuda.repite ? Math.min(marco.arg, ultimo) : marco.arg
  const piezas = ayuda.argumentos.map((a, i) => ({ texto: a, actual: i === actual }))
  return {
    nombre: ayuda.nombre,
    piezas: ayuda.repite ? [...piezas, { texto: '…', actual: false }] : piezas,
  }
}

// La firma como texto plano («SI(condición; si se cumple; si no)»): el `title` del renglón, cuando no entra.
export function firmaEnTexto(firma: FirmaEnElCursor): string {
  return `${firma.nombre}(${firma.piezas.map((p) => p.texto).join('; ')})`
}
