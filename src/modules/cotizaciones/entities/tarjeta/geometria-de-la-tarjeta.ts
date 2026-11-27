// La geometría de la tarjeta de una cotización: el único modelo de dibujo, que pintan el HTML (la vista previa), el PDF y la imagen con posiciones absolutas
// (lo único que entienden igual los tres: satori no tiene `grid`). Pura: toma la cuadrícula (ya convertida si era de la forma 1), la lectura, el cálculo
// (valores, estados y totales por id de nodo) y el contexto de la cotización, y da el ancho y el alto en px y, por celda visible y en orden de lectura, su
// rectángulo, su contenido ya resuelto (la lista de respaldo y las condiciones, también) y su estilo; las bandas de las filas que se dibujan, y las filas ocultas con su
// motivo. Una fila se oculta si su nodo no está en la versión del cálculo (no tiene estado), no aplica (o vale 0, con `no_aplica_o_cero`) o se cumplen sus
// condiciones (con `condiciones`), y las celdas que la cruzan se acortan; una celda sin filas visibles no se dibuja. Sin plantilla o sin estados, la de por omisión.
import type { CalculoDeLaTarjeta } from '../calculo-de-la-tarjeta'
import type {
  CeldaDeLaTarjeta,
  ContenidoDeLaCelda,
  DatoDeLaCelda,
  FilaDeLaTarjeta,
} from '../cuadricula-de-la-tarjeta'
import type { MotivoDeLaOculta } from '../vista-previa-de-la-plantilla'
import { resolverElContenido, seCumplen } from './condiciones-de-la-celda'
import {
  aplica,
  contenidoDibujado,
  esElTotal,
  textoConDatosDibujado,
  valorDelNodo,
  type ContenidoDibujado,
  type EntradaDelContenido,
} from './contenido-de-la-celda'
import type { ContextoDeLaCotizacion } from './contexto-de-la-cotizacion'
import { colorDelFondo, estiloDibujado, type EstiloDibujado } from './estilo-de-la-celda'
import type { LecturaDeLaTarjeta, TarjetaLista } from './lectura-de-la-tarjeta'
import { tarjetaPorOmision } from './por-omision'

export type MarcaDeLaCelda = {
  nodo?: string
  mostrar?: string
  variable?: string
  // La clave del color del fondo, si se dibuja con su color.
  color?: string
  // El monto del total.
  total?: true
  // Un texto con datos (para «Copiar texto» es un texto literal: no lleva `nodo` ni `variable`).
  conDatos?: true
}

export type CeldaDibujada = {
  id: string
  fila: string
  columna: string
  x: number
  y: number
  ancho: number
  alto: number
  contenido: ContenidoDibujado
  estilo: EstiloDibujado
  marca: MarcaDeLaCelda
}

// Una fila que no se dibuja: su rótulo (el primer texto o etiqueta que lleva), la etiqueta de su nodo (sin nodo, por sus condiciones: su rótulo) y por qué. Con `no_aplica`, `variante` es el título de la opción
// elegida de la variante (si la lectura la trae y el cálculo la eligió): «No aplica en esta cotización: la variante es Moto». Es la misma forma que `OcultaParaEditar`
// del hueco del lienzo (`entities/vista-previa-de-la-plantilla.ts`).
export type FilaOculta = {
  fila: string
  etiqueta: string
  delNodo: string
  motivo: MotivoDeLaOculta
  variante: string | null
}

// Una fila que se dibuja: su banda en px (la usa el modo «Retocar» para ocultarla).
export type FilaDibujada = { id: string; y: number; alto: number }

export type Geometria = {
  ancho: number
  alto: number
  porOmision: boolean
  celdas: CeldaDibujada[]
  // Las filas que se dibujan, en orden.
  filas: FilaDibujada[]
  ocultas: FilaOculta[]
}

export type EntradaDeLaGeometria = {
  lectura: LecturaDeLaTarjeta
  calculo: CalculoDeLaTarjeta
  contexto: ContextoDeLaCotizacion
  monedaBs: string | null
  locale: string
  // Los montos sin moneda (`EntradaDelContenido.sinMoneda`): la imagen del Modo Live.
  sinMoneda?: boolean
}

// Por qué no se dibuja una fila; nulo si se dibuja. Un nodo sin estado (que no es el total) no está en la versión del cálculo: va antes que «no aplica». Una
// condición sin respuesta no se cumple: la fila se dibuja.
function motivoDeLaFila(e: EntradaDelContenido, f: FilaDeLaTarjeta): FilaOculta['motivo'] | null {
  if (f.ocultar_si === 'condiciones') return seCumplen(e, f.si ?? []) ? 'condicion' : null
  if (f.ocultar_si === 'nunca' || f.nodo === undefined) return null
  const { estados } = e.calculo
  if (!esElTotal(e, f.nodo) && estados !== null && !estados.has(f.nodo))
    return 'fuera_de_la_version'
  if (!aplica(e, f.nodo)) return 'no_aplica'
  return f.ocultar_si === 'no_aplica_o_cero' && valorDelNodo(e, f.nodo) === 0 ? 'cero' : null
}

// La marca va con el contenido resuelto: el dato que ganó en una lista de respaldo o en unas condiciones.
function marcaDe(
  e: EntradaDelContenido,
  c: CeldaDeLaTarjeta,
  resuelto: ContenidoDeLaCelda,
  contenido: ContenidoDibujado,
): MarcaDeLaCelda {
  const color = colorDelFondo(c.estilo, e.tarjeta.colores)
  return {
    ...(resuelto.tipo === 'dato' ? marcaDelDato(e, resuelto, contenido) : {}),
    ...(color === null ? {} : { color }),
    ...(resuelto.tipo === 'texto' && 'partes' in resuelto ? { conDatos: true as const } : {}),
  }
}

// Lo que marca un dato: su nodo y qué muestra (y si es el monto del total) o su variable.
function marcaDelDato(
  e: EntradaDelContenido,
  dato: DatoDeLaCelda,
  contenido: ContenidoDibujado,
): MarcaDeLaCelda {
  if ('variable' in dato) return { variable: dato.variable }
  const total = contenido.tipo === 'monto' && e.tarjeta.total.nodo === dato.nodo
  return { nodo: dato.nodo, mostrar: dato.mostrar, ...(total ? { total: true as const } : {}) }
}

// El rótulo de una fila: el primer texto (o la etiqueta de un nodo) de sus celdas, en orden de columna. Nunca un texto con un monto (`tramos`): un nombre no
// lleva una cifra, que el Modo Live no taparía.
function rotuloDe(celdas: readonly CeldaDibujada[], porDefecto: string): string {
  for (const c of celdas) {
    if (c.contenido.tipo !== 'texto' || c.contenido.tramos !== undefined) continue
    const t = c.contenido.lineas.join(' ').trim()
    if (t !== '') return t
  }
  return porDefecto
}

type Lienzo = {
  e: EntradaDelContenido
  xs: readonly number[]
  ys: readonly number[]
  ancho: number
  motivos: readonly (FilaOculta['motivo'] | null)[]
  indiceDeFila: ReadonlyMap<string, number>
  indiceDeColumna: ReadonlyMap<string, number>
}

// Una celda con su rectángulo: la unión de sus filas visibles y de sus columnas. Nula si no le queda ninguna fila visible (o nombra una que no existe).
function dibujada(
  l: Lienzo,
  c: CeldaDeLaTarjeta,
): { orden: [number, number]; celda: CeldaDibujada } | null {
  const { filas, columnas } = l.e.tarjeta.definicion
  const fi = l.indiceDeFila.get(c.fila)
  const ci = l.indiceDeColumna.get(c.columna)
  if (fi === undefined || ci === undefined) return null
  const suyas = filas
    .map((f, i) => ({ f, i }))
    .slice(fi, fi + (c.abarca_filas ?? 1))
    .filter(({ i }) => l.motivos[i] === null)
  const [primera] = suyas
  if (primera === undefined) return null
  const hasta = Math.min(columnas.length, ci + (c.abarca_columnas ?? 1))
  const x = l.xs[ci] ?? 0
  const resuelto = resolverElContenido(l.e, c.contenido)
  const contenido = contenidoDibujado(l.e, resuelto)
  return {
    orden: [primera.i, ci],
    celda: {
      id: c.id,
      fila: c.fila,
      columna: c.columna,
      x,
      y: l.ys[primera.i] ?? 0,
      ancho: (l.xs[hasta] ?? l.ancho) - x,
      alto: suyas.reduce((s, { f }) => s + f.alto, 0),
      contenido,
      estilo: estiloDibujado(c.estilo, l.e.tarjeta.colores),
      marca: marcaDe(l.e, c, resuelto, contenido),
    },
  }
}

// El título de la opción elegida de la variante, o nulo sin variante en la lectura o sin una opción que coincida.
function tituloDeLaVariante({ tarjeta, calculo }: EntradaDelContenido): string | null {
  if (tarjeta.variante === null) return null
  const clave = calculo.valores.get(tarjeta.variante.nodo)
  return tarjeta.variante.opciones.find((o) => o.clave === clave)?.titulo ?? null
}

function ocultasDe(l: Lienzo): FilaOculta[] {
  const { filas, celdas } = l.e.tarjeta.definicion
  const variante = tituloDeLaVariante(l.e)
  return filas.flatMap((f, i): FilaOculta[] => {
    const motivo = l.motivos[i]
    if (motivo == null) return []
    const propias = celdas.filter((c) => c.fila === f.id).map((c) => contenidoDeRotulo(l.e, c))
    const delNodo =
      f.nodo === undefined
        ? rotuloDe(propias, `Fila ${String(i + 1)}`)
        : (l.e.tarjeta.nodos.get(f.nodo)?.etiqueta ?? f.nodo)
    return [
      {
        fila: f.id,
        etiqueta: rotuloDe(propias, delNodo),
        delNodo,
        motivo,
        variante: motivo === 'no_aplica' ? variante : null,
      },
    ]
  })
}

function dibujar(
  tarjeta: TarjetaLista,
  entrada: EntradaDeLaGeometria,
  porOmision: boolean,
): Geometria {
  const e: EntradaDelContenido = { ...entrada, tarjeta }
  const { columnas, filas, celdas } = tarjeta.definicion
  const xs = columnas.reduce<number[]>(
    (acc, c) => [...acc, (acc[acc.length - 1] ?? 0) + c.ancho],
    [0],
  )
  const motivos = filas.map((f) => motivoDeLaFila(e, f))
  const ys: number[] = []
  let alto = 0
  for (const [i, f] of filas.entries()) {
    ys.push(alto)
    if (motivos[i] === null) alto += f.alto
  }
  const l: Lienzo = {
    e,
    xs,
    ys,
    ancho: xs[xs.length - 1] ?? 0,
    motivos,
    indiceDeFila: new Map(filas.map((f, i) => [f.id, i])),
    indiceDeColumna: new Map(columnas.map((c, i) => [c.id, i])),
  }
  const dibujadas = celdas.flatMap((c) => {
    const d = dibujada(l, c)
    return d === null ? [] : [d]
  })
  dibujadas.sort((a, b) => a.orden[0] - b.orden[0] || a.orden[1] - b.orden[1])
  return {
    ancho: l.ancho,
    alto,
    porOmision,
    celdas: dibujadas.map((d) => d.celda),
    filas: filas.flatMap((f, i) =>
      motivos[i] === null ? [{ id: f.id, y: ys[i] ?? 0, alto: f.alto }] : [],
    ),
    ocultas: ocultasDe(l),
  }
}

// Para el rótulo de una fila oculta: sus celdas (resueltas) como si aplicaran (la etiqueta de un nodo que no aplica se dibujaría vacía).
function contenidoDeRotulo(e: EntradaDelContenido, c: CeldaDeLaTarjeta): CeldaDibujada {
  const r = resolverElContenido(e, c.contenido)
  const contenido: ContenidoDibujado =
    r.tipo === 'dato' && 'nodo' in r && r.mostrar === 'etiqueta'
      ? { tipo: 'texto', lineas: [e.tarjeta.nodos.get(r.nodo)?.etiqueta ?? ''] }
      : r.tipo === 'texto' && 'partes' in r
        ? textoConDatosDibujado(e, r.partes)
        : r.tipo === 'texto'
          ? { tipo: 'texto', lineas: r.texto.split('\n') }
          : { tipo: 'vacio' }
  return {
    id: c.id,
    fila: c.fila,
    columna: c.columna,
    x: 0,
    y: 0,
    ancho: 0,
    alto: 0,
    contenido,
    estilo: estiloDibujado(undefined, new Map()),
    marca: {},
  }
}

export function geometriaDeLaTarjeta(entrada: EntradaDeLaGeometria): Geometria {
  const { lectura, calculo } = entrada
  if (lectura.estado !== 'lista' || calculo.estados === null)
    return dibujar(tarjetaPorOmision(), entrada, true)
  return dibujar(lectura, entrada, false)
}
