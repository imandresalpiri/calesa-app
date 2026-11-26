// El autocompletar de la planilla (D5 y D18 del cambio de la planilla): según lo que hay justo antes del cursor, las funciones (por su nombre, con firma y
// ejemplo), los conceptos de las filas de arriba («Remate → C5»), las bandas («Primer pago → SUMA(primer_pago)») y, dentro de BUSCARV, las tablas del origen
// (2.º argumento) y las columnas de esa tabla (3.º). Sólo en un texto que empieza con «=». A lo sumo `TOPE_DE_SUGERENCIAS`. Puro.
import type { CatalogoDeTablas } from '../compilador'
import { T, type Token } from '../compilador-lexico'
import { FUNCIONES_DE_LA_AYUDA } from './ayuda-de-funciones'
import type { HojaDeLaPlanilla } from './hoja-de-la-planilla'
import { leerCelda, recorrerTexto, tokensDe, type MarcoDelTexto } from './referencias-a1'

export const TOPE_DE_SUGERENCIAS = 8

export type ClaseDeSugerencia = 'funcion' | 'concepto' | 'banda' | 'tabla' | 'columna'

// `texto` es lo que se lee primero; `detalle`, lo de al lado (la referencia, la firma); `insertar` reemplaza `[desde, hasta)` del texto.
export type Sugerencia = {
  readonly clase: ClaseDeSugerencia
  readonly texto: string
  readonly detalle: string
  readonly ejemplo?: string
  readonly insertar: string
  readonly desde: number
  readonly hasta: number
}

export type ContextoDelAutocompletar = {
  readonly hoja: HojaDeLaPlanilla
  // La fila en edición: los conceptos son los de arriba.
  readonly numero: number
  readonly tablas: CatalogoDeTablas
  // Las bandas: id y etiqueta.
  readonly grupos: readonly { readonly id: string; readonly etiqueta: string }[]
}

const normal = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

// Lo que se está escribiendo: el prefijo, su tramo, si va entre comillas y en qué marco de función.
type Escribiendo = {
  prefijo: string
  desde: number
  comillas: boolean
  marco: MarcoDelTexto | null
}

const sinCerrar = (t: Token) => t.t === T.ERROR && t.codigo === 'texto_sin_cerrar'

// El marco de función del último token.
function marcoDelUltimo(texto: string, tokens: readonly Token[]): MarcoDelTexto | null {
  let marco: MarcoDelTexto | null = null
  recorrerTexto(texto, tokens, (p) => {
    if (p.indice === tokens.length - 1) marco = p.marco
  })
  return marco
}

function loQueSeEscribe(texto: string, cursor: number): Escribiendo {
  const antes = texto.slice(0, cursor)
  const tokens = tokensDe(antes)
  const ultimo = tokens[tokens.length - 1]
  // Una comilla sin cerrar se lleva el resto del texto: lo de después de ella es lo que se escribe.
  if (ultimo !== undefined && sinCerrar(ultimo)) {
    const prefijo = antes.slice(ultimo.desde + 1)
    return { prefijo, desde: ultimo.desde, comillas: true, marco: marcoDelUltimo(antes, tokens) }
  }
  const escribe = ultimo?.t === T.NOMBRE && ultimo.hasta === cursor ? ultimo : null
  const desde = escribe?.desde ?? cursor
  // Sin nombre al cursor, uno vacío, para saber en qué marco está (tras «(», «;» o un operador).
  const recorridos = escribe === null ? [...tokens, { t: T.NOMBRE, desde, hasta: desde }] : tokens
  return {
    prefijo: antes.slice(desde),
    desde,
    comillas: false,
    marco: marcoDelUltimo(antes, recorridos),
  }
}

// El marco de función donde está el cursor (nulo, fuera de todo paréntesis): la función y en qué valor. Lo usa la firma en el cursor.
export function marcoEnElCursor(texto: string, cursor: number): MarcoDelTexto | null {
  return loQueSeEscribe(texto, cursor).marco
}

const sugerencia = (s: Omit<Sugerencia, 'hasta'>, hasta: number): Sugerencia => ({ ...s, hasta })

function deBuscarv(
  e: Escribiendo,
  cursor: number,
  texto: string,
  tablas: CatalogoDeTablas,
): Sugerencia[] {
  const marco = e.marco
  if (marco?.fn !== 'BUSCARV' || tablas === null) return []
  const p = normal(e.prefijo)
  if (marco.arg === 1)
    return tablas
      .filter((t) => normal(t.clave).startsWith(p))
      .map((t) =>
        sugerencia(
          {
            clase: 'tabla',
            texto: t.clave,
            detalle: 'Tabla',
            insertar: `"${t.clave}"`,
            desde: e.desde,
          },
          cursor,
        ),
      )
  if (marco.arg !== 2) return []
  const clave = claveDeLaTabla(texto, marco)
  const tabla = tablas.find((t) => t.clave === clave)
  return (tabla?.columnas ?? [])
    .filter((c) => normal(c).startsWith(p))
    .map((c) =>
      sugerencia(
        {
          clase: 'columna',
          texto: c,
          detalle: `Columna de ${tabla?.clave ?? ''}`,
          insertar: `"${c}"`,
          desde: e.desde,
        },
        cursor,
      ),
    )
}

// La tabla del 2.º argumento de BUSCARV, sin comillas.
function claveDeLaTabla(texto: string, marco: MarcoDelTexto): string | null {
  const tokens = tokensDe(texto)
  const t = (marco.args[1] ?? []).map((i) => tokens[i]).find((x) => x?.t === T.TEXTO)
  return t === undefined ? null : texto.slice(t.desde + 1, t.hasta - 1)
}

function deFunciones(e: Escribiendo, cursor: number): Sugerencia[] {
  const p = e.prefijo.toUpperCase()
  return FUNCIONES_DE_LA_AYUDA.filter((f) => f.nombre.startsWith(p)).map((f) =>
    sugerencia(
      {
        clase: 'funcion',
        texto: f.nombre,
        detalle: f.firma,
        ejemplo: f.ejemplo,
        insertar: `${f.nombre}(`,
        desde: e.desde,
      },
      cursor,
    ),
  )
}

// Una etiqueta coincide si alguna de sus palabras empieza con el prefijo.
const coincide = (etiqueta: string, prefijo: string) =>
  normal(etiqueta)
    .split(/[^a-z0-9]+/)
    .some((palabra) => palabra.startsWith(prefijo))

function deConceptos(e: Escribiendo, cursor: number, c: ContextoDelAutocompletar): Sugerencia[] {
  const p = normal(e.prefijo)
  return c.hoja.filas
    .filter((f) => f.numero < c.numero && coincide(f.nodo.etiqueta, p))
    .map((f) => {
      const celda = `C${String(f.numero)}`
      return sugerencia(
        {
          clase: 'concepto',
          texto: f.nodo.etiqueta,
          detalle: celda,
          insertar: celda,
          desde: e.desde,
        },
        cursor,
      )
    })
}

function deBandas(e: Escribiendo, cursor: number, c: ContextoDelAutocompletar): Sugerencia[] {
  const p = normal(e.prefijo)
  const dentroDeSuma = e.marco?.fn === 'SUMA'
  return c.grupos
    .filter((g) => coincide(g.etiqueta, p) || g.id.startsWith(p))
    .map((g) => {
      const insertar = dentroDeSuma ? g.id : `SUMA(${g.id})`
      return sugerencia(
        { clase: 'banda', texto: g.etiqueta, detalle: insertar, insertar, desde: e.desde },
        cursor,
      )
    })
}

export function sugerencias(
  texto: string,
  cursor: number,
  c: ContextoDelAutocompletar,
): Sugerencia[] {
  if (!texto.startsWith('=') || cursor < 1 || cursor > texto.length) return []
  const e = loQueSeEscribe(texto, cursor)
  const enBuscarv = deBuscarv(e, cursor, texto, c.tablas)
  if (enBuscarv.length > 0 || e.comillas) return enBuscarv.slice(0, TOPE_DE_SUGERENCIAS)
  // Sin letras no se sugiere nada; una celda ya escrita (`C5`), tampoco.
  if (e.prefijo === '' || leerCelda(e.prefijo) !== null) return []
  return [...deFunciones(e, cursor), ...deConceptos(e, cursor, c), ...deBandas(e, cursor, c)].slice(
    0,
    TOPE_DE_SUGERENCIAS,
  )
}
