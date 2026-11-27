// Los montos de la tarjeta de una cotización como líneas de texto, para «Compartir la cotización»: de la misma geometría que dibujan el HTML, el PDF y la imagen
// (sólo lo del nivel «todos»: `cotizacion_tarjeta`, K4), nunca de lo guardado suelto. Por cada celda con un monto, en orden de lectura, su concepto (el texto de la
// celda de antes en su fila, si lo hay), el monto y su segunda línea (el total en moneda local). El monto del total (`marca.total`) va aparte. Las filas sin monto
// (la cabecera: cliente, asesor, fecha) no salen. Cada monto lleva su gemelo sin moneda (`…SinMoneda`), de la geometría dibujada con `sinMoneda`: lo que el panel
// muestra con el Modo Live (lo que se copia y se comparte va siempre con su moneda).
import type { CeldaDibujada, Geometria } from '../geometria-de-la-tarjeta'
import { textoDe } from '../texto-de-la-tarjeta'

export type LineaDeLaTarjeta = {
  concepto: string | null
  monto: string
  segunda: string | null
  montoSinMoneda: string
  segundaSinMoneda: string | null
}

export type LineasDeLaTarjeta = { conceptos: LineaDeLaTarjeta[]; total: LineaDeLaTarjeta | null }

// El concepto de un monto: la celda de texto de antes en su fila (vacía o ninguna, sin concepto).
function conceptoDe(anterior: CeldaDibujada | undefined): string | null {
  const texto = anterior === undefined ? '' : textoDe(anterior)
  return texto === '' ? null : texto
}

// `sinMoneda`: la misma geometría dibujada con `sinMoneda` (las mismas celdas, con sus ids).
export function lineasDeLaTarjeta(geometria: Geometria, sinMoneda: Geometria): LineasDeLaTarjeta {
  const gemelas = new Map(sinMoneda.celdas.map((c) => [c.id, c]))
  const porFila = new Map<string, CeldaDibujada[]>()
  for (const c of geometria.celdas) {
    if (c.contenido.tipo === 'monto' || textoDe(c) !== '') {
      porFila.set(c.fila, [...(porFila.get(c.fila) ?? []), c])
    }
  }
  const conceptos: LineaDeLaTarjeta[] = []
  let total: LineaDeLaTarjeta | null = null
  for (const celdas of porFila.values()) {
    celdas.forEach((c, i) => {
      if (c.contenido.tipo !== 'monto') return
      const gemela = gemelas.get(c.id)?.contenido
      const sin = gemela?.tipo === 'monto' ? gemela : c.contenido
      const linea = {
        concepto: conceptoDe(celdas[i - 1]),
        monto: c.contenido.texto,
        segunda: c.contenido.segunda?.texto ?? null,
        montoSinMoneda: sin.texto,
        segundaSinMoneda: sin.segunda?.texto ?? null,
      }
      if (c.marca.total === true && total === null) total = linea
      else conceptos.push(linea)
    })
  }
  return { conceptos, total }
}
