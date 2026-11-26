// La conversión de un diseño de flujo a la rejilla libre (docs/COTIZADOR.md › «El diseño de la hoja»; docs/DECISIONES.md › «La rejilla se convierte al
// leerla»). Un diseño es de flujo si ni su raíz trae `avanzado` ni ninguna sección o ítem trae `posicion`: entonces cada pieza recibe la posición que hoy le
// toca en el flujo a lo ancho de escritorio (`colocarEnFlujo()`, la regla del «mismo dibujo») y se quita el `alto` que no hace nada (a 12 columnas). Un
// diseño que ya es de rejilla vuelve igual: la conversión es idempotente. Es tolerante y nunca lanza: lo que no tiene forma lo deja como está y lo rechaza
// la forma con su error de siempre. Su espejo es `public._diseno_en_rejilla()`, con el juego `casos-de-rejilla.json`. Sin Zod: la usa el preproceso del
// esquema del diseño.
import type { ItemDeDiseno, SeccionDeDiseno } from './diseno'
import type { ItemSinPosicion } from './diseno-sin-posicion'
import {
  columnasDeLaCelda,
  colocarEnFlujo,
  COLUMNAS_DE_LA_REJILLA,
  MAXIMO_DE_FILAS,
  SECCION_AUTOMATICA,
} from './rejilla-de-la-hoja'

type Objeto = Record<string, unknown>

const esObjeto = (x: unknown): x is Objeto =>
  typeof x === 'object' && x !== null && !Array.isArray(x)

// Un entero de 1 a `max` como lo lee el esquema (`z.int().min(1).max(max)`): lo demás no es una medida.
const entero = (x: unknown, max: number): number | undefined =>
  typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= max ? x : undefined

// Las columnas de una sección: sin ancho, «Automática» (6); con uno inválido, 12 (la forma lo rechaza igual).
function anchoDeLaSeccionCruda(s: Objeto): number {
  if (!('ancho' in s)) return SECCION_AUTOMATICA.columnas
  return entero(s['ancho'], COLUMNAS_DE_LA_REJILLA) ?? COLUMNAS_DE_LA_REJILLA
}

// Las columnas de un ítem: la celda con nombre son 12, 6 o 4; sin ancho, toda la fila; con uno inválido, 12.
function anchoDelItemCrudo(it: Objeto): number {
  const ancho = it['ancho']
  if (it['tipo'] === 'celda' && (ancho === 'completo' || ancho === 'mitad' || ancho === 'tercio')) {
    return columnasDeLaCelda(ancho)
  }
  return entero(ancho, COLUMNAS_DE_LA_REJILLA) ?? COLUMNAS_DE_LA_REJILLA
}

// Las columnas de una pieza ya validada (las usan la validación y el editor).
export const anchoEfectivoDeLaSeccion = (s: Pick<SeccionDeDiseno, 'ancho'>): number =>
  s.ancho ?? SECCION_AUTOMATICA.columnas
export const anchoEfectivoDelItem = (it: ItemDeDiseno | ItemSinPosicion): number =>
  it.tipo === 'celda' ? columnasDeLaCelda(it.ancho) : (it.ancho ?? COLUMNAS_DE_LA_REJILLA)
// Las filas que cuentan: a 12 columnas, 1 (en un diseño de rejilla el alto vale siempre; esto es para lo que aún no se convirtió).
export const altoEfectivo = (p: { alto?: number }): number => p.alto ?? 1

export function esDeFlujo(crudo: unknown): boolean {
  if (!esObjeto(crudo) || 'avanzado' in crudo) return false
  const secciones = crudo['secciones']
  if (!Array.isArray(secciones)) return true
  return secciones.every((s) => {
    if (!esObjeto(s)) return true
    if ('posicion' in s) return false
    const items = s['items']
    return !Array.isArray(items) || items.every((it) => !esObjeto(it) || !('posicion' in it))
  })
}

// Una pieza con su posición y, si su alto no hace nada (a 12 columnas) y es una medida válida, sin él. Un alto inválido queda para la forma.
function conPosicion(o: Objeto, ancho: number, columna: number, fila: number): Objeto {
  const copia: Objeto = { ...o }
  if (ancho >= COLUMNAS_DE_LA_REJILLA && entero(copia['alto'], MAXIMO_DE_FILAS) !== undefined) {
    delete copia['alto']
  }
  copia['posicion'] = { columna, fila }
  return copia
}

// El alto que cuenta para acomodar: el suyo si es válido y la pieza no ocupa la fila entera; si no, 1.
const altoParaAcomodar = (o: Objeto, ancho: number): number =>
  ancho < COLUMNAS_DE_LA_REJILLA ? (entero(o['alto'], MAXIMO_DE_FILAS) ?? 1) : 1

function itemsEnRejilla(items: unknown[]): unknown[] {
  const objetos = items.filter(esObjeto)
  const medidas = objetos.map((it) => {
    const ancho = anchoDelItemCrudo(it)
    return { ancho, alto: altoParaAcomodar(it, ancho) }
  })
  const posiciones = colocarEnFlujo(medidas)
  let k = 0
  return items.map((it) => {
    if (!esObjeto(it)) return it
    const p = posiciones[k]
    const m = medidas[k]
    k += 1
    return p && m ? conPosicion(it, m.ancho, p.columna, p.fila) : it
  })
}

// El lugar del bloque «Avanzado» (el total suelto, el botón y el cierre): una fila entera donde aparece la primera avanzada.
const BLOQUE = 'bloque'

export function disenoEnRejilla(crudo: unknown): unknown {
  if (!esObjeto(crudo) || !Array.isArray(crudo['secciones']) || !esDeFlujo(crudo)) return crudo
  const secciones = crudo['secciones'] as unknown[]
  // Las principales en su orden con el bloque metido donde aparece la primera avanzada; las avanzadas, aparte.
  const principales: (number | typeof BLOQUE)[] = []
  const avanzadas: number[] = []
  secciones.forEach((s, i) => {
    if (!esObjeto(s)) return
    if (s['presentacion'] === 'avanzado') {
      if (avanzadas.length === 0) principales.push(BLOQUE)
      avanzadas.push(i)
    } else {
      principales.push(i)
    }
  })
  const medida = (i: number | typeof BLOQUE) => {
    if (i === BLOQUE) return { ancho: COLUMNAS_DE_LA_REJILLA, alto: 1 }
    const s = secciones[i] as Objeto
    const ancho = anchoDeLaSeccionCruda(s)
    return { ancho, alto: altoParaAcomodar(s, ancho) }
  }
  const lugares = new Map<
    number | typeof BLOQUE,
    { columna: number; fila: number; ancho: number }
  >()
  const deLasPrincipales = principales.map(medida)
  colocarEnFlujo(deLasPrincipales).forEach((p, k) => {
    lugares.set(principales[k] ?? BLOQUE, { ...p, ancho: deLasPrincipales[k]?.ancho ?? 12 })
  })
  // Las avanzadas se apilan a todo el ancho, como en su bloque y en su modal: cada una en sus filas, columna 1.
  const deLasAvanzadas = avanzadas.map(medida)
  colocarEnFlujo(
    deLasAvanzadas.map((m) => ({ ancho: COLUMNAS_DE_LA_REJILLA, alto: m.alto })),
  ).forEach((p, k) => {
    lugares.set(avanzadas[k] ?? -1, { ...p, ancho: deLasAvanzadas[k]?.ancho ?? 12 })
  })
  const convertidas = secciones.map((s, i) => {
    const lugar = lugares.get(i)
    if (!esObjeto(s) || lugar === undefined) return s
    const conLugar = conPosicion(s, lugar.ancho, lugar.columna, lugar.fila)
    const items = s['items']
    return Array.isArray(items) ? { ...conLugar, items: itemsEnRejilla(items) } : conLugar
  })
  const bloque = lugares.get(BLOQUE)
  return {
    ...crudo,
    secciones: convertidas,
    ...(bloque === undefined ? {} : { avanzado: { fila: bloque.fila } }),
  }
}
