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

// Un campo del origen con su tipo (`origenes_campos.tipo`), lo que dice si su dato del vehículo es un número.
export type CampoDelOrigen = { readonly clave: string; readonly tipo: string }

// Las columnas comunes de `vehiculos` que son un texto, y los tipos de un campo del origen que son un número.
const COMUNES_DE_TEXTO: readonly string[] = ['marca', 'modelo']
const TIPOS_DE_NUMERO: readonly string[] = ['numero', 'moneda']

// Las filas (ids de sus nodos) cuyo dato del vehículo no es un número: una columna común de texto o un campo del origen de otro tipo. No ofrecen «Decimales».
// Un campo que no se conoce (el origen no lo tiene, o no se leyó: `campos` nulo) no entra: elegir decimales no cambia un texto.
export function datosQueNoSonNumero(
  nodos: readonly Nodo[],
  campos: readonly CampoDelOrigen[] | null,
): ReadonlySet<string> {
  const tipos = new Map((campos ?? []).map((c) => [c.clave, c.tipo]))
  return new Set(
    nodos.flatMap((n) => {
      if (n.tipo !== 'campo_vehiculo') return []
      const tipo = tipos.get(n.campo)
      const esTexto =
        COMUNES_DE_TEXTO.includes(n.campo) ||
        (tipo !== undefined && !TIPOS_DE_NUMERO.includes(tipo))
      return esTexto ? [n.id] : []
    }),
  )
}
