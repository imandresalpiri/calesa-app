import type { FormatoDeXCell } from '@/shared/ui/xcell'
import type { Formato } from './nodos'

// El formato de un nodo de la fórmula en el de la celda. Un `usd` se imprime en dólares; un `moneda`, en la moneda base de la empresa (sin código: `<Monto>` la toma de ella).
const FORMATO_DE_CELDA: Record<Formato, FormatoDeXCell> = {
  usd: 'monto',
  moneda: 'monto',
  pct: 'porcentaje',
  raw: 'numero',
}
export const formatoDeCelda = (formato: Formato): FormatoDeXCell => FORMATO_DE_CELDA[formato]
export const monedaDeFormato = (formato: Formato): string | undefined =>
  formato === 'usd' ? 'USD' : undefined
