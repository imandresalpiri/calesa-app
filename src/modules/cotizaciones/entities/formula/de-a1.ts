// Lo tipeado en A1 a ids, antes de compilar (`compilarFila()` recibe siempre el texto con ids: `nodo.texto` nunca lleva `C5`). Cada referencia se revisa contra
// la hoja con el mensaje de la planilla: una fila de más abajo (con «Mover esta fila debajo de la N»), la propia fila, una que no existe, las columnas A y D,
// una B sin % o con un número escrito en la fórmula, un rango fuera de SUMA, MAX o MIN o fuera de la columna C. Un id tipeado (sin forma A1) se acepta y se
// revisa igual. El mapa de la traducción devuelve el tramo de un error del compilador a lo tipeado. Puro, O(texto).
import type { Token } from '../compilador-lexico'
import { T } from '../compilador-lexico'
import { inicioDeLineas, tramoDe, type Tramo } from '../motivos-del-compilador'
import { bDe, numeroDeLaCelda, type HojaDeLaPlanilla } from './hoja-de-la-planilla'
import {
  CON_RANGO,
  leerCelda,
  recorrerTexto,
  tokensDe,
  type Celda,
  type MarcoDelTexto,
} from './referencias-a1'

export type CodigoDeA1 =
  | 'hacia_abajo'
  | 'misma_fila'
  | 'fila_inexistente'
  | 'columna_a'
  | 'columna_ejemplo'
  | 'columna_inexistente'
  | 'b_sin_pct'
  | 'b_en_la_formula'
  | 'rango_fuera_de_lugar'
  | 'rango_fuera_de_c'

export type ErrorDeA1 = {
  codigo: CodigoDeA1
  mensaje: string
  tramo: Tramo
  // Con una referencia hacia abajo: la fila más abajo que nombra (para «Mover esta fila debajo de la N»).
  moverDebajoDe?: number
}

// Un tramo de lo tipeado y el que lo reemplaza en el texto con ids.
export type TramoTraducido = { tipeado: [number, number]; ids: [number, number] }

export type ResultadoDeA1 =
  { ok: true; texto: string; mapa: readonly TramoTraducido[] } | { ok: false; error: ErrorDeA1 }

type Rechazo = { codigo: CodigoDeA1; mensaje: string; desde: number; hasta: number; abajo?: number }

const c = (col: string, n: number) => `${col}${String(n)}`

function mensajeDeColumna(celda: Celda): Omit<Rechazo, 'desde' | 'hasta'> {
  const n = celda.fila
  const nombre = c(celda.col, n)
  if (celda.col === 'A')
    return {
      codigo: 'columna_a',
      mensaje: `${nombre} es el concepto: en una fórmula va ${c('C', n)} (valor) o ${c('B', n)} (%).`,
    }
  if (celda.col === 'D')
    return {
      codigo: 'columna_ejemplo',
      mensaje: `${nombre}: Ejemplo no se usa en una fórmula: es la unidad de ejemplo. En una fórmula va ${c('C', n)}.`,
    }
  return {
    codigo: 'columna_inexistente',
    mensaje: `${nombre} no es una columna de la planilla: en una fórmula va ${c('C', n)} (valor) o ${c('B', n)} (%).`,
  }
}

const haciaAbajo = (nombre: string, n: number): Omit<Rechazo, 'desde' | 'hasta'> => ({
  codigo: 'hacia_abajo',
  mensaje: `${nombre} está más abajo: una fórmula sólo usa filas de arriba.`,
  abajo: n,
})

type Contexto = { hoja: HojaDeLaPlanilla; actual: number }

// Lo que nombra una fila `n` en la columna C (o un id tipeado de esa fila): el id, o por qué no.
function deLaFila(
  ctx: Contexto,
  n: number,
  nombre: string,
): string | Omit<Rechazo, 'desde' | 'hasta'> {
  const total = ctx.hoja.filas.length
  if (n < 1 || n > total)
    return {
      codigo: 'fila_inexistente',
      mensaje: `${nombre} no existe: la planilla llega hasta la fila ${String(total)}.`,
    }
  if (n === ctx.actual)
    return { codigo: 'misma_fila', mensaje: `Una fila no se usa a sí misma (${nombre}).` }
  if (n > ctx.actual) return haciaAbajo(nombre, n)
  return ctx.hoja.filas[n - 1]?.id ?? ''
}

// La B de la fila `n`: su % (absorbido o con fila propia), o por qué no.
function deLaB(
  ctx: Contexto,
  n: number,
  nombre: string,
): string | Omit<Rechazo, 'desde' | 'hasta'> {
  const total = ctx.hoja.filas.length
  if (n < 1 || n > total)
    return {
      codigo: 'fila_inexistente',
      mensaje: `${nombre} no existe: la planilla llega hasta la fila ${String(total)}.`,
    }
  if (n > ctx.actual) return haciaAbajo(nombre, n)
  const b = bDe(ctx.hoja, n)
  if (b === null)
    return {
      codigo: 'b_sin_pct',
      mensaje: `${nombre} no tiene porcentaje: B sólo vale en una fila con %.`,
    }
  if (b.como === 'auxiliar')
    return {
      codigo: 'b_en_la_formula',
      mensaje: `${nombre} es un número escrito en la fórmula de la fila ${String(n)}: pásalo a su propia fila para usarlo.`,
    }
  return b.id
}

function deLaCelda(ctx: Contexto, celda: Celda): string | Omit<Rechazo, 'desde' | 'hasta'> {
  const nombre = c(celda.col, celda.fila)
  if (celda.col === 'C') return deLaFila(ctx, celda.fila, nombre)
  if (celda.col === 'B') return deLaB(ctx, celda.fila, nombre)
  return mensajeDeColumna(celda)
}

// Un id tipeado: si es una fila (o la pct que absorbe una), se revisa como su celda; si no (un grupo, una clave), queda.
function deUnId(ctx: Contexto, id: string): string | Omit<Rechazo, 'desde' | 'hasta'> {
  const n = numeroDeLaCelda(ctx.hoja, id)
  if (n === null) return id
  if (ctx.hoja.numeroDe.get(id) === n) return deLaFila(ctx, n, c('C', n))
  return n > ctx.actual ? haciaAbajo(c('B', n), n) : id
}

type Traduccion = { desde: number; hasta: number; ids: string }

// `C5:C9` dentro de SUMA, MAX o MIN: las filas de arriba, en orden, separadas con «;».
function deUnRango(
  ctx: Contexto,
  marco: MarcoDelTexto | null,
  [a, b]: [Celda, Celda],
  tramo: { desde: number; hasta: number },
): Traduccion | Rechazo {
  const desde = Math.min(a.fila, b.fila)
  const hasta = Math.max(a.fila, b.fila)
  const escrito = `${c(a.col, a.fila)}:${c(b.col, b.fila)}`
  if (marco?.fn === null || marco === null || !CON_RANGO.has(marco.fn))
    return {
      codigo: 'rango_fuera_de_lugar',
      mensaje: `Un rango (${escrito}) sólo va dentro de SUMA, MAX o MIN.`,
      ...tramo,
    }
  if (a.col !== 'C' || b.col !== 'C')
    return {
      codigo: 'rango_fuera_de_c',
      mensaje: `Un rango va sobre la columna C, como ${c('C', desde)}:${c('C', hasta)}.`,
      ...tramo,
    }
  const ids: string[] = []
  for (const n of [hasta, desde]) {
    const r = deLaFila(ctx, n, c('C', n))
    if (typeof r !== 'string') return { ...r, ...tramo }
  }
  for (let n = desde; n <= hasta; n += 1) ids.push(ctx.hoja.filas[n - 1]?.id ?? '')
  return { ...tramo, ids: ids.join('; ') }
}

// Un nombre del texto: la celda o el id que nombra, o por qué no. Nulo si queda como está (una función, una clave, un grupo, un nombre que no es de la hoja).
function deUnNombre(ctx: Contexto, nombre: string, grupos: ReadonlySet<string>) {
  if (grupos.has(nombre)) return null
  const celda = leerCelda(nombre)
  const r = celda === null ? deUnId(ctx, nombre) : deLaCelda(ctx, celda)
  return r === nombre ? null : r
}

// Los rangos del texto: `C5`, `:`, `C9` seguidos.
function rangoEn(texto: string, tokens: readonly Token[], i: number): [Celda, Celda] | null {
  const [a, dos, b] = [tokens[i], tokens[i + 1], tokens[i + 2]]
  if (a?.t !== T.NOMBRE || dos?.t !== T.DOS_PUNTOS || b?.t !== T.NOMBRE) return null
  const ca = leerCelda(texto.slice(a.desde, a.hasta))
  const cb = leerCelda(texto.slice(b.desde, b.hasta))
  return ca === null || cb === null ? null : [ca, cb]
}

function traducir(
  texto: string,
  ctx: Contexto,
  grupos: ReadonlySet<string>,
): { traducciones: Traduccion[]; rechazos: Rechazo[] } {
  const tokens = tokensDe(texto)
  const traducciones: Traduccion[] = []
  const rechazos: Rechazo[] = []
  let saltar = -1
  recorrerTexto(texto, tokens, ({ token, indice, marco, esFuncion, esClave }) => {
    if (indice <= saltar || token.t !== T.NOMBRE || esFuncion || esClave) return
    const rango = rangoEn(texto, tokens, indice)
    if (rango !== null) {
      saltar = indice + 2
      const tramo = { desde: token.desde, hasta: tokens[indice + 2]?.hasta ?? token.hasta }
      const r = deUnRango(ctx, marco, rango, tramo)
      if ('ids' in r) traducciones.push(r)
      else rechazos.push(r)
      return
    }
    const r = deUnNombre(ctx, texto.slice(token.desde, token.hasta), grupos)
    if (r === null) return
    if (typeof r === 'string') traducciones.push({ desde: token.desde, hasta: token.hasta, ids: r })
    else rechazos.push({ ...r, desde: token.desde, hasta: token.hasta })
  })
  return { traducciones, rechazos }
}

function tramoEn(texto: string, desde: number, hasta: number): Tramo {
  const m = { visitas: 0 }
  return tramoDe(inicioDeLineas(texto, m), desde, hasta, m)
}

// `actual`: el número de la fila que se escribe. Los grupos de la fórmula quedan como se escribieron (`SUMA(primer_pago)`).
export function deA1(
  texto: string,
  hoja: HojaDeLaPlanilla,
  actual: number,
  grupos: ReadonlySet<string> = new Set(),
): ResultadoDeA1 {
  const { traducciones, rechazos } = traducir(texto, { hoja, actual }, grupos)
  const [primero] = rechazos
  if (primero !== undefined) {
    const abajo = Math.max(0, ...rechazos.map((r) => r.abajo ?? 0))
    return {
      ok: false,
      error: {
        codigo: primero.codigo,
        mensaje: primero.mensaje,
        tramo: tramoEn(texto, primero.desde, primero.hasta),
        ...(primero.codigo === 'hacia_abajo' ? { moverDebajoDe: abajo } : {}),
      },
    }
  }
  let salida = ''
  let desde = 0
  const mapa: TramoTraducido[] = []
  for (const t of traducciones) {
    salida += texto.slice(desde, t.desde)
    mapa.push({ tipeado: [t.desde, t.hasta], ids: [salida.length, salida.length + t.ids.length] })
    salida += t.ids
    desde = t.hasta
  }
  return { ok: true, texto: salida + texto.slice(desde), mapa }
}

// Un lugar del texto con ids, en lo tipeado: dentro de un tramo traducido, su inicio (o su fin, si es el final de un tramo de error); fuera, corrido lo que
// corrieron los de antes.
function aLoTipeado(pos: number, mapa: readonly TramoTraducido[], esFin: boolean): number {
  let corrido = 0
  for (const { tipeado, ids } of mapa) {
    if (esFin ? pos <= ids[0] : pos < ids[0]) break
    if (esFin ? pos <= ids[1] : pos < ids[1]) return esFin ? tipeado[1] : tipeado[0]
    corrido = tipeado[1] - ids[1]
  }
  return pos + corrido
}

// El tramo de un error del compilador (sobre el texto con ids), devuelto a lo tipeado.
export function tramoEnLoTipeado(
  tramo: Tramo,
  mapa: readonly TramoTraducido[],
  tipeado: string,
): Tramo {
  const desde = aLoTipeado(tramo.desde, mapa, false)
  const hasta = Math.max(desde, aLoTipeado(tramo.desde + tramo.largo, mapa, true))
  return tramoEn(tipeado, desde, Math.min(hasta, tipeado.length))
}
