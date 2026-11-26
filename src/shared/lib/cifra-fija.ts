// Una cifra con N decimales fijos (los «Decimales» de una celda de la fórmula): se redondea mitad lejos de cero con `redondear()`,
// el `round(numeric, n)` de la base, y recién después se formatea con mínimo y máximo N. `Intl` solo no alcanza: en un casi empate
// redondea otra cifra (1234,5649999999998 con 2 da «1.234,56» y la base, 1234,57). Redondear antes además vuelve 0 lo que se ve 0
// (−0,001 con 2 es «0,00», nunca «−0,00»). Va aparte de `formato.ts` (que viaja en toda pantalla): el BigInt de `redondear()` lo
// pagan sólo quienes muestran una cifra fija.
import { formatearMonto, formatearNumero, formatearPorcentaje } from './formato'
import { redondear } from './redondeo'

export type TipoDeCifra = 'monto' | 'numero' | 'porcentaje'

// La cifra redondeada a lo que se ve. Un porcentaje llega como fracción y sus decimales son los de los puntos: 0,14945 con 1 es
// 0,149 («14,9 %»).
export function redondeadaParaMostrar(valor: number, tipo: TipoDeCifra, decimales: number): number {
  return redondear(valor, tipo === 'porcentaje' ? decimales + 2 : decimales)
}

type Opciones = { decimales: number; locale: string; moneda?: string | undefined }

// El texto de una cifra con N decimales fijos. Un monto sin moneda va sin ella (como `<Monto moneda={null}>`). En pantalla, el
// dinero sigue por `<Monto>` con la cifra de `redondeadaParaMostrar()`: esto es el texto plano (un `title`, la tarjeta, el PDF).
export function formatearConDecimales(
  valor: number,
  tipo: TipoDeCifra,
  opciones: Opciones,
): string {
  const { decimales, locale, moneda } = opciones
  const redondeada = redondeadaParaMostrar(valor, tipo, decimales)
  if (tipo === 'monto' && moneda !== undefined) {
    return formatearMonto(redondeada, { moneda, locale, decimales })
  }
  if (tipo === 'porcentaje') {
    return formatearPorcentaje(redondeada, { locale, decimales, fijos: true })
  }
  return formatearNumero(redondeada, { locale, decimales, fijos: true })
}
