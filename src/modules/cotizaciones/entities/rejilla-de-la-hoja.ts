// La rejilla de la hoja (docs/GLOSARIO.md › «Rejilla de la hoja»): 12 columnas en cada sección (para sus ítems) y 12 para las secciones, y cada pieza
// en su posición (columna y fila, «Posición (en la rejilla)»). Una pieza de N columnas toma su ancho cuando le tocan al menos 16 rem; una rejilla entera
// dibuja las posiciones desde el corte de su pieza más exigente (`corteDeLaRejilla()`) y, debajo, apila en orden de lectura (fila y luego columna). Como
// los cortes van en rem, al 200 % la rejilla colapsa sola. Puro y sin Zod (la hoja lo lleva al navegador sin el esquema del diseño): las clases que lo
// dibujan son las de `features/hoja/components/clases-de-la-rejilla.ts`.
import type { AnchoDeCelda } from './diseno'

// Las columnas de cada rejilla y las filas que puede ocupar una pieza (sin `alto`, las que pida su contenido). `diseno.ts` las valida.
export const COLUMNAS_DE_LA_REJILLA = 12
export const MAXIMO_DE_FILAS = 4
// La última fila que puede ocupar una pieza: 40 piezas de 4 filas que no caben lado a lado ocupan 160.
export const FILAS_DE_LA_REJILLA = 200
// Lo que mide una fila sin ninguna pieza (un lugar libre que se dejó a propósito): si colapsara, el lienzo y la hoja no coincidirían.
export const ALTO_DE_UNA_FILA_VACIA = '2.5rem'

// Dónde empieza una pieza en su rejilla (las dos de 1 en adelante).
export type Posicion = { columna: number; fila: number }
// Una pieza ya medida: su posición, sus columnas y sus filas.
export type PiezaEnLaRejilla = { posicion: Posicion; ancho: number; alto: number }

// Los anchos con nombre de los diseños guardados, en columnas.
export const COLUMNAS_DE_CADA_ANCHO = { completo: 12, mitad: 6, tercio: 4 } as const

export const columnasDeLaCelda = (ancho: AnchoDeCelda): number =>
  typeof ancho === 'number' ? ancho : COLUMNAS_DE_CADA_ANCHO[ancho]

// Lo mínimo que una pieza que no ocupa la fila entera tiene que medir.
export const ANCHO_MINIMO_DE_UNA_PIEZA = 16

// Los cortes de contenedor de Tailwind desde el primero que deja dos piezas lado a lado, en rem.
export const CORTES = {
  lg: 32,
  xl: 36,
  '2xl': 42,
  '3xl': 48,
  '4xl': 56,
  '5xl': 64,
  '6xl': 72,
  '7xl': 80,
} as const
export type Corte = keyof typeof CORTES
const ORDEN_DE_LOS_CORTES = Object.keys(CORTES) as Corte[]

// Desde qué corte una pieza de N columnas toma su ancho: el primero en que N/12 del contenedor mide 16 rem o más (12 → siempre; 6 a 11 → `lg`; 5 →
// `2xl`; 4 → `3xl`; 3 → `5xl`); 1 y 2 nunca llegan y van desde el último (`7xl`).
export function corteDe(columnas: number): Corte | 'siempre' {
  if (columnas >= COLUMNAS_DE_LA_REJILLA) return 'siempre'
  const alcanza = ORDEN_DE_LOS_CORTES.find(
    (c) => (CORTES[c] * columnas) / COLUMNAS_DE_LA_REJILLA >= ANCHO_MINIMO_DE_UNA_PIEZA,
  )
  return alcanza ?? '7xl'
}

// Una pieza que ocupa toda su fila no tiene al lado con qué compartir filas: su alto no cambia nada.
export const altoSirve = (columnas: number): boolean => columnas < COLUMNAS_DE_LA_REJILLA

// Una sección sin ancho es «Automática»: la mitad desde que el contenedor de las secciones mide 64 rem (lo de siempre), si no la fila entera.
export const SECCION_AUTOMATICA = { columnas: 6, corte: '5xl' } as const

// El orden de los cortes, del más chico al más exigente: el de una rejilla es el más exigente de sus piezas.
const ORDEN_CON_SIEMPRE: readonly (Corte | 'siempre')[] = ['siempre', ...ORDEN_DE_LOS_CORTES]

// Desde qué corte una rejilla dibuja las posiciones: el más exigente de sus piezas (una sección «Automática» cuenta como `5xl`). Sin piezas, siempre.
export function corteDeLaRejilla(cortes: Iterable<Corte | 'siempre'>): Corte | 'siempre' {
  let indice = 0
  for (const c of cortes) indice = Math.max(indice, ORDEN_CON_SIEMPRE.indexOf(c))
  return ORDEN_CON_SIEMPRE[indice] ?? 'siempre'
}

// Las filas que ocupa una pieza en su rejilla, como un área cerrada.
export type Area = { columna: number; fila: number; hastaColumna: number; hastaFila: number }

export const areaDe = (p: PiezaEnLaRejilla): Area => ({
  columna: p.posicion.columna,
  fila: p.posicion.fila,
  hastaColumna: p.posicion.columna + p.ancho - 1,
  hastaFila: p.posicion.fila + p.alto - 1,
})

export const sePisan = (a: PiezaEnLaRejilla, b: PiezaEnLaRejilla): boolean => {
  const x = areaDe(a)
  const y = areaDe(b)
  return (
    x.columna <= y.hastaColumna &&
    y.columna <= x.hastaColumna &&
    x.fila <= y.hastaFila &&
    y.fila <= x.hastaFila
  )
}

// Cada celda de un área, como un número (`(fila - 1) * 12 + columna - 1`): lo que la validación y el editor marcan como ocupado.
export function* celdasDe(area: Area): Generator<number> {
  for (let f = area.fila; f <= area.hastaFila; f++) {
    for (let c = area.columna; c <= area.hastaColumna; c++)
      yield (f - 1) * COLUMNAS_DE_LA_REJILLA + c - 1
  }
}

// La última fila que ocupa alguna pieza (0 sin piezas).
export const ultimaFila = (piezas: Iterable<PiezaEnLaRejilla>): number => {
  let ultima = 0
  for (const p of piezas) ultima = Math.max(ultima, p.posicion.fila + p.alto - 1)
  return ultima
}

// Cómo CSS acomoda solas unas piezas en orden, sin `dense` y con cada una en su ancho (la regla del «mismo dibujo»): el cursor empieza en la fila 1,
// columna 1; cada pieza avanza la columna hasta caber sin pisar nada y, si no hay lugar en esa fila, pasa a la siguiente desde la columna 1. Tras
// ponerla, el cursor queda donde termina. Por eso los inicios crecen en orden de lectura: la lista y la lectura coinciden.
export function colocarEnFlujo(piezas: readonly { ancho: number; alto: number }[]): Posicion[] {
  const ocupadas = new Set<number>()
  const posiciones: Posicion[] = []
  let cursor: Posicion = { columna: 1, fila: 1 }
  for (const p of piezas) {
    const ancho = Math.min(Math.max(p.ancho, 1), COLUMNAS_DE_LA_REJILLA)
    const alto = Math.max(p.alto, 1)
    const lugar = siguienteLugar(ocupadas, cursor, ancho, alto)
    for (const c of celdasDe(areaEn(lugar, ancho, alto))) ocupadas.add(c)
    posiciones.push(lugar)
    cursor = { columna: lugar.columna + ancho, fila: lugar.fila }
  }
  return posiciones
}

const areaEn = (p: Posicion, ancho: number, alto: number): Area =>
  areaDe({ posicion: p, ancho, alto })

// Desde el cursor, el primer lugar donde la pieza entra sin pisar nada: avanza la columna y, si en esa fila no hay, pasa a la siguiente desde la 1.
function siguienteLugar(
  ocupadas: ReadonlySet<number>,
  desde: Posicion,
  ancho: number,
  alto: number,
): Posicion {
  let { columna, fila } = desde
  for (;;) {
    for (; columna + ancho - 1 <= COLUMNAS_DE_LA_REJILLA; columna++) {
      const area = areaEn({ columna, fila }, ancho, alto)
      if (![...celdasDe(area)].some((c) => ocupadas.has(c))) return { columna, fila }
    }
    fila += 1
    columna = 1
  }
}

// Una lista en orden de lectura: por fila y luego por columna, estable. Si a alguna le falta la posición (un diseño de fixture), la lista como vino.
export function enOrdenDeLectura<T>(
  lista: readonly T[],
  posicionDe: (x: T) => Posicion | undefined,
): T[] {
  const conPosicion = lista.map((x, i) => ({ x, i, p: posicionDe(x) }))
  if (conPosicion.some((e) => e.p === undefined)) return [...lista]
  return conPosicion
    .sort((a, b) => {
      const pa = a.p as Posicion
      const pb = b.p as Posicion
      return pa.fila - pb.fila || pa.columna - pb.columna || a.i - b.i
    })
    .map((e) => e.x)
}

// Las pistas de las filas de una rejilla que dibuja posiciones (`grid-template-rows`): `auto` la que ocupa alguna pieza y `ALTO_DE_UNA_FILA_VACIA` la que
// no; `filasExtra` suma filas vacías al final (la del «+» del lienzo). Las corridas de 3 o más van con `repeat()`, para que el estilo no crezca.
export function pistasDeLasFilas(piezas: readonly PiezaEnLaRejilla[], filasExtra = 0): string {
  const ultima = ultimaFila(piezas)
  const ocupada = new Array<boolean>(ultima + filasExtra).fill(false)
  for (const p of piezas) {
    for (let f = p.posicion.fila; f < p.posicion.fila + p.alto; f++) ocupada[f - 1] = true
  }
  const pistas: string[] = []
  let i = 0
  while (i < ocupada.length) {
    let j = i
    while (j < ocupada.length && ocupada[j] === ocupada[i]) j++
    const pista = ocupada[i] === true ? 'auto' : ALTO_DE_UNA_FILA_VACIA
    const n = j - i
    pistas.push(n >= 3 ? `repeat(${String(n)},${pista})` : Array<string>(n).fill(pista).join(' '))
    i = j
  }
  return pistas.join(' ')
}
