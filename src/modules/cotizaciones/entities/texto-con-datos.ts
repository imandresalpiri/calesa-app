// El texto con datos de la tarjeta (glosario: «Texto con datos»): una celda de texto que mezcla texto literal y datos, guardada como `{tipo: 'texto', partes}`
// (cada parte, un string o un dato). Lo que leen de él el área `plantilla` (la forma, el editor) y el área `tarjeta` (el dibujo, los retoques). Puro.
import type {
  ContenidoDeLaCelda,
  DatoDeLaCelda,
  ParteDelTexto,
  TextoConDatos,
} from './cuadricula-de-la-tarjeta'
import { caracteres } from './json-de-la-base'

export const esTextoConDatos = (c: ContenidoDeLaCelda): c is TextoConDatos =>
  c.tipo === 'texto' && 'partes' in c

// Sólo el texto literal, sin los datos: lo que nombra la celda fuera de la tarjeta (el nombre en «Retocar», la copia como texto).
export const textoDeLasPartes = (partes: readonly ParteDelTexto[]): string =>
  partes.filter((p): p is string => typeof p === 'string').join('')

// Los caracteres del texto literal (code points, como `char_length` de la base): lo que mide el tope de 300.
export const caracteresDeLasPartes = (partes: readonly ParteDelTexto[]): number =>
  caracteres(textoDeLasPartes(partes))

export const datosDeLasPartes = (partes: readonly ParteDelTexto[]): DatoDeLaCelda[] =>
  partes.filter((p): p is DatoDeLaCelda => typeof p !== 'string')
