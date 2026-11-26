// Los «Decimales» de una celda (glosario: «Decimales (de una celda)»): con cuántos decimales se muestra el valor de un nodo, de 0 a 4. Sin la clave,
// «Automático»: cada superficie muestra lo de siempre (2 en un monto, hasta 2 en un número, 1 o 2 en un porcentaje). Sólo cambia la vista: el motor no
// la lee. La hoja, la tarjeta, comparar, las revisiones y la planilla leen el número de acá, con una sola regla.
import type { FormatoDeXCell } from '@/shared/ui/xcell'
import { formatoDeCelda, monedaDeFormato } from './formato-de-celda'
import { esCondicion, formatoDe, MAXIMO_DE_DECIMALES, type Nodo } from './nodos'

// Lo que se elige, además de «Automático».
export const DECIMALES_DE_CELDA = Array.from({ length: MAXIMO_DE_DECIMALES + 1 }, (_, i) => i)

// Los decimales del nodo, o `undefined` («Automático»).
export const decimalesDe = (nodo: Pick<Nodo, 'decimales'> | undefined): number | undefined =>
  nodo?.decimales

// Si el nodo se muestra como número y por eso ofrece «Decimales»: un interruptor, la variante y una condición se ven como texto («Sí», «No», una opción).
// Un dato del vehículo que no es un número lo decide quien conoce los campos del origen (la planilla), no el nodo.
export const aceptaDecimales = (nodo: Nodo): boolean =>
  nodo.tipo !== 'bandera' && nodo.tipo !== 'opcion' && !esCondicion(nodo)

// La cifra de ejemplo con que se ve el efecto de elegir: siempre la misma, para que el texto no salte al cambiar de opción. Un porcentaje, como
// fracción (0,149456 es «14,9456 %»).
export type EjemploDeDecimales = {
  readonly valor: number
  readonly formato: FormatoDeXCell
  readonly moneda: string | undefined
}

const EJEMPLO_DE_CIFRA = 1234.5678
const EJEMPLO_DE_PORCENTAJE = 0.149456

export function ejemploDeDecimales(nodo: Pick<Nodo, 'formato'>): EjemploDeDecimales {
  const formato = formatoDe(nodo)
  const celda = formatoDeCelda(formato)
  return {
    valor: celda === 'porcentaje' ? EJEMPLO_DE_PORCENTAJE : EJEMPLO_DE_CIFRA,
    formato: celda,
    moneda: monedaDeFormato(formato),
  }
}
