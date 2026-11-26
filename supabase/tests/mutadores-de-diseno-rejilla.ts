// Los mutadores de la rejilla libre del corpus diferencial de `validar_diseno()` (`corpus-de-diseno.ts`): los de forma de la posición de una
// sección (D100–D103), del bloque «Avanzado» (D104–D105) y de la posición de un ítem (D106–D109), uno por marca como los de
// `mutadores-de-diseno-forma.ts`, y los cruzados de la geometría (`pieza_fuera_de_la_rejilla`, `piezas_se_pisan`, el bloque sobre una principal y
// un hueco, que vale). Cada uno pasa antes el diseño a la rejilla (`disenoEnRejilla()`, lo mismo que hace la base al leerlo): un diseño de flujo
// no trae posiciones que romper.
import { disenoEnRejilla } from '@/modules/cotizaciones/entities/diseno-en-rejilla'
import {
  itemsDe,
  lista,
  raiz,
  secciones,
  texto,
  type Entrada,
  type MutadorDeDiseno,
} from './mutadores-de-diseno-base'
import { clonar, elegir, esObjeto, type Azar, type Json, type Objeto } from './mutadores-de-formula'

const enRejilla = (e: Entrada) => {
  e.diseno = disenoEnRejilla(e.diseno) as Json
}

type Objetivo = (e: Entrada, azar: Azar) => Objeto | undefined
const unaSeccion: Objetivo = (e, azar) => elegir(azar, secciones(e))
const unItem: Objetivo = (e, azar) => elegir(azar, itemsDe(e))?.it
const posicionDe = (o: Objeto | undefined): Objeto | undefined => {
  const p = o?.['posicion']
  return esObjeto(p) ? p : undefined
}

// Pone en la posición de la pieza (o en la pieza misma, con `clave` 'posicion') un valor elegido al azar entre los de su lista.
function marca(
  nombre: string,
  objetivo: Objetivo,
  valores: Record<string, readonly (Json | undefined)[]>,
): MutadorDeDiseno {
  return {
    nombre: `forma_${nombre}`,
    aplicar: (e, azar) => {
      enRejilla(e)
      const o = objetivo(e, azar)
      const clave = elegir(azar, Object.keys(valores)) ?? ''
      const destino = clave === 'posicion' ? o : posicionDe(o)
      if (!o || !destino) return null
      const valor = elegir(azar, [...(valores[clave] ?? [])])
      if (valor === undefined) delete destino[clave]
      else destino[clave] = clonar(valor)
      return `forma_${nombre}(${clave}=${valor === undefined ? 'sin' : JSON.stringify(valor)})`
    },
  }
}

// El bloque «Avanzado» de la raíz con un valor que no es su forma.
function bloque(nombre: string, valores: readonly Json[]): MutadorDeDiseno {
  return {
    nombre: `forma_${nombre}`,
    aplicar: (e, azar) => {
      enRejilla(e)
      const r = raiz(e)
      if (!r) return null
      const valor = elegir(azar, [...valores]) ?? null
      r['avanzado'] = clonar(valor)
      return `forma_${nombre}(${JSON.stringify(valor)})`
    },
  }
}

const NO_OBJETO: readonly Json[] = ['x', null, 7, [], [1, 2]]
const COLUMNAS_MALAS: readonly (Json | undefined)[] = ['7', 0, 13, 1.5, null, -1, undefined]
const FILAS_MALAS: readonly (Json | undefined)[] = [0, 201, 2.5, 'x', undefined]

export const MUTADORES_DE_FORMA_DE_LA_REJILLA: readonly MutadorDeDiseno[] = [
  marca('D100', unaSeccion, { posicion: NO_OBJETO }),
  marca('D101', unaSeccion, { x: [1], ancho: [2], orden: ['1'] }),
  marca('D102', unaSeccion, { columna: COLUMNAS_MALAS }),
  marca('D103', unaSeccion, { fila: FILAS_MALAS }),
  bloque('D104', [3, null, 'x', [], { fila: 1, x: 1 }, { fila: 2, columna: 1 }]),
  bloque('D105', [{}, { fila: 0 }, { fila: 201 }, { fila: 2.5 }, { fila: '2' }]),
  marca('D106', unItem, { posicion: NO_OBJETO }),
  marca('D107', unItem, { x: [1], alto: [2] }),
  marca('D108', unItem, { columna: COLUMNAS_MALAS }),
  marca('D109', unItem, { fila: FILAS_MALAS }),
]

// Las columnas que ocupa una pieza ya en la rejilla (como `anchoEfectivoDeLaSeccion()` y `anchoEfectivoDelItem()`).
const COLUMNAS_CON_NOMBRE: Record<string, number> = { completo: 12, mitad: 6, tercio: 4 }
function anchoDe(o: Objeto, esSeccion: boolean): number {
  const a = o['ancho']
  if (typeof a === 'number') return a
  if (typeof a === 'string') return COLUMNAS_CON_NOMBRE[a] ?? 12
  return esSeccion ? 6 : 12
}
const altoDe = (o: Objeto): number => (typeof o['alto'] === 'number' ? o['alto'] : 1)
const filaDe = (o: Objeto): number => {
  const f = posicionDe(o)?.['fila']
  return typeof f === 'number' ? f : 1
}
const esAvanzada = (s: Objeto) => texto(s, 'presentacion') === 'avanzado'
const piezas = (e: Entrada, azar: Azar): { o: Objeto; esSeccion: boolean } | undefined => {
  const todas = [
    ...secciones(e).map((o) => ({ o, esSeccion: true })),
    ...itemsDe(e).map(({ it }) => ({ o: it, esSeccion: false })),
  ].filter(({ o }) => posicionDe(o) !== undefined)
  return elegir(azar, todas)
}

// Dos piezas del mismo espacio: dos ítems de una sección, dos principales o dos avanzadas.
function dosDelMismoEspacio(e: Entrada, azar: Azar): [Objeto, Objeto] | undefined {
  const espacios: Objeto[][] = [
    secciones(e).filter((s) => !esAvanzada(s)),
    secciones(e).filter(esAvanzada),
    ...secciones(e).map((s) => lista(s['items']).filter(esObjeto)),
  ].filter((xs) => xs.filter((x) => posicionDe(x) !== undefined).length >= 2)
  const espacio = elegir(azar, espacios)?.filter((x) => posicionDe(x) !== undefined)
  if (!espacio) return undefined
  const i = azar.entero(espacio.length)
  const j = (i + 1 + azar.entero(espacio.length - 1)) % espacio.length
  const a = espacio[i]
  const b = espacio[j]
  return a && b ? [a, b] : undefined
}

export const MUTADORES_DE_LA_REJILLA: readonly MutadorDeDiseno[] = [
  // Una pieza que se sale: por abajo (pasa la fila 200 con su alto) o por la derecha (pasa la columna 12 con su ancho).
  {
    nombre: 'rejilla_fuera',
    aplicar: (e, azar) => {
      enRejilla(e)
      const p = piezas(e, azar)
      const pos = posicionDe(p?.o)
      if (!p || !pos) return null
      if (azar.entero(2) === 0) {
        const alto = 2 + azar.entero(3)
        p.o['alto'] = alto
        pos['fila'] = 202 - alto + azar.entero(alto - 1)
        return `rejilla_fuera(alto=${String(alto)},fila=${String(pos['fila'])})`
      }
      const ancho = anchoDe(p.o, p.esSeccion)
      if (ancho < 2) return null
      pos['columna'] = 14 - ancho + azar.entero(ancho - 1)
      return `rejilla_fuera(ancho=${String(ancho)},columna=${String(pos['columna'])})`
    },
  },
  // Una pieza sobre otra de su espacio: la misma posición.
  {
    nombre: 'rejilla_pisa',
    aplicar: (e, azar) => {
      enRejilla(e)
      const par = dosDelMismoEspacio(e, azar)
      if (!par) return null
      const [a, b] = par
      b['posicion'] = clonar(a['posicion'] ?? null)
      return `rejilla_pisa(${JSON.stringify(a['posicion'])})`
    },
  },
  // El bloque «Avanzado» en la fila de una principal.
  {
    nombre: 'rejilla_bloque_pisa',
    aplicar: (e, azar) => {
      enRejilla(e)
      const r = raiz(e)
      const principal = elegir(
        azar,
        secciones(e).filter((s) => !esAvanzada(s) && posicionDe(s) !== undefined),
      )
      if (!r || !esObjeto(r['avanzado']) || !principal) return null
      const fila = filaDe(principal) + azar.entero(altoDe(principal))
      r['avanzado'] = { fila }
      return `rejilla_bloque_pisa(fila=${String(fila)})`
    },
  },
  // Un hueco que se respeta: un ítem dos filas debajo del último de su sección, en la columna 1 (vale).
  {
    nombre: 'rejilla_hueco',
    aplicar: (e, azar) => {
      enRejilla(e)
      const lugar = elegir(
        azar,
        itemsDe(e).filter(({ it }) => posicionDe(it) !== undefined),
      )
      if (!lugar) return null
      const ultima = Math.max(
        ...lista(lugar.s['items'])
          .filter(esObjeto)
          .map((it) => filaDe(it) + altoDe(it) - 1),
      )
      const fila = ultima + 2
      if (fila + altoDe(lugar.it) - 1 > 200) return null
      lugar.it['posicion'] = { columna: 1, fila }
      return `rejilla_hueco(fila=${String(fila)})`
    },
  },
]
