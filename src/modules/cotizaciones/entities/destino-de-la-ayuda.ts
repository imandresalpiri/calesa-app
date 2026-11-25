import { formatearMonto, formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import { bloqueoDeLado, itemSeDibuja, type ContextoDeHoja } from './binding'
import type { Formato } from './nodos'

// La celda que llena un valor de la tabla de la ayuda (glosario: «Bloque de la ayuda», `llena`): el lado de la hoja (el principal o el secundario de un par) donde tocar
// el valor lo escribe como si se tipeara. `celda` es el nodo principal de la celda (el que la marca en la hoja) y `lado`, cuál de sus botones recibe el foco al volver. Puro:
// lo usan la ayuda y su prueba.
export type DestinoDeLaAyuda = {
  nodo: string
  celda: string
  lado: 'principal' | 'secundario'
  etiqueta: string
  formato: Formato
}

// El destino sólo si quien mira lo puede tipear ahora: la celda se dibuja y su lado no tiene candado (la base no lo dejó editar, se calcula sin poder pisarse, viene del
// vehículo, lo esconde la variante o su interruptor). Sin destino, el valor queda como texto.
export function destinoDeLaAyuda(c: ContextoDeHoja, nodo: string | null): DestinoDeLaAyuda | null {
  if (nodo === null) {
    return null
  }
  const lado = c.indice.lados.get(nodo)
  if (!lado || !itemSeDibuja(lado.celda, c) || bloqueoDeLado(nodo, c) !== undefined) {
    return null
  }
  const { celda } = lado
  const comun = { nodo, celda: celda.nodo, lado: lado.lado, etiqueta: celda.etiqueta }
  if (lado.lado === 'principal') {
    return { ...comun, formato: celda.formato }
  }
  return celda.secundario ? { ...comun, formato: celda.secundario.formato } : null
}

// Las columnas de un bloque que llenan una celda que se puede tipear, por su clave.
export function destinosDelBloque(
  c: ContextoDeHoja,
  columnas: readonly { columna: string; llena: string | null }[] | null,
): ReadonlyMap<string, DestinoDeLaAyuda> {
  const destinos = new Map<string, DestinoDeLaAyuda>()
  for (const { columna, llena } of columnas ?? []) {
    const destino = destinoDeLaAyuda(c, llena)
    if (destino) {
      destinos.set(columna, destino)
    }
  }
  return destinos
}

type Regional = { locale: string; monedaBase: string }

export const esDinero = (formato: Formato): boolean => formato === 'usd' || formato === 'moneda'

// El valor como lo diría la celda destino: un monto con su moneda, un porcentaje desde su fracción (0,1494 → «14,94 %») o un número.
export function textoDelValor(valor: number, formato: Formato, r: Regional): string {
  switch (formato) {
    case 'usd':
      return formatearMonto(valor, { moneda: 'USD', locale: r.locale })
    case 'moneda':
      return formatearMonto(valor, { moneda: r.monedaBase, locale: r.locale })
    case 'pct':
      return formatearPorcentaje(valor, { locale: r.locale, decimales: 2 })
    case 'raw':
      return formatearNumero(valor, { locale: r.locale })
  }
}

// El nombre del botón de un valor: «Usar 14,94 % en IVA». Con el Modo Live, un destino de dinero no dice la cifra.
export function nombreDelValor(
  destino: DestinoDeLaAyuda,
  valor: number,
  r: Regional,
  live: boolean,
): string {
  const texto =
    live && esDinero(destino.formato) ? 'este valor' : textoDelValor(valor, destino.formato, r)
  return `Usar ${texto} en ${destino.etiqueta}`
}

// El aviso tras tocar un valor: «IVA = 14,94 %». Con el Modo Live, un destino de dinero no dice la cifra.
export function avisoDelValor(
  destino: DestinoDeLaAyuda,
  valor: number,
  r: Regional,
  live: boolean,
): string {
  return live && esDinero(destino.formato)
    ? `${destino.etiqueta} actualizado.`
    : `${destino.etiqueta} = ${textoDelValor(valor, destino.formato, r)}`
}

// «Deshacer» después de otro cambio en la hoja: lo de antes del clic ya no es lo de ahora y reponerlo borraría lo que vino después.
export const SIN_DESHACER_EN_LA_HOJA = 'Ya cambiaste la hoja: no se puede deshacer.'
