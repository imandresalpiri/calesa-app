import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BORDES, casosDeRejilla, casosDeRejillaComoTexto } from './casos-de-rejilla.soporte'
import { esquemaDeLaRejilla } from './diseno'
import { disenoEnRejilla, esDeFlujo } from './diseno-en-rejilla'
import type { Definicion } from './formula'
import { enOrdenDeLectura, type Posicion } from './rejilla-de-la-hoja'
import { validarFormula } from './validar'
import { validarDiseno } from './validar-diseno'

// La conversión de un diseño de flujo a la rejilla, contra todo el juego del diseño (las semillas incluidas): lo válido sigue válido y se lee en el
// mismo orden, lo inválido conserva su error, y es idempotente. Genera el juego espejo de la base (`casos-de-rejilla.json`).
type Contexto = { niveles: string[]; retirados: string[]; tonos: string[] }
type Caso = {
  nombre: string
  valida: boolean
  formula?: string
  formula_de?: string
  contexto?: Contexto
  diseno: unknown
}
const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const juego = JSON.parse(leer('./casos-de-diseno.json')) as {
  contexto: Contexto
  formulas: Record<string, { definicion: unknown; params: unknown }>
  casos: Caso[]
}
const deFormulas = (
  JSON.parse(leer('./casos-de-formula.json')) as {
    casos: { nombre: string; definicion: unknown; params: unknown }[]
  }
).casos

function formulaDe(c: Caso): Definicion {
  const cruda =
    c.formula !== undefined
      ? juego.formulas[c.formula]
      : deFormulas.find((f) => f.nombre === c.formula_de)
  const r = validarFormula(cruda?.definicion, cruda?.params)
  if (!r.ok) throw new Error(`la fórmula de «${c.nombre}» no valida`)
  return r.formula.definicion
}
const resultado = (c: Caso, diseno: unknown) => {
  const r = validarDiseno(formulaDe(c), diseno, c.contexto ?? juego.contexto)
  return r.ok ? 'válida' : `${r.error.regla}@${String(r.error.donde)}`
}

type ConPosicion = { id?: string; presentacion?: string; posicion?: Posicion }
const posicionDe = (x: ConPosicion) => x.posicion
const secciones = (d: unknown) => (d as { secciones: ConPosicion[] }).secciones

describe('disenoEnRejilla', () => {
  const objetos = juego.casos.filter(
    (c) => typeof c.diseno === 'object' && c.diseno !== null && !Array.isArray(c.diseno),
  )

  it.each(objetos)('$nombre: no lanza, es idempotente y da lo mismo que antes', (c) => {
    const salida = disenoEnRejilla(c.diseno)
    expect(disenoEnRejilla(salida)).toEqual(salida)
    expect(resultado(c, salida)).toBe(resultado(c, c.diseno))
  })

  const validasDeFlujo = juego.casos.filter((c) => c.valida && esDeFlujo(c.diseno))
  it.each(validasDeFlujo)(
    '$nombre: sale un diseño de rejilla que se lee en el orden de la lista',
    (c) => {
      const salida = disenoEnRejilla(c.diseno)
      expect(esDeFlujo(salida)).toBe(false)
      expect(esquemaDeLaRejilla.safeParse(salida).success).toBe(true)
      const principales = secciones(salida).filter((s) => s.presentacion !== 'avanzado')
      const avanzadas = secciones(salida).filter((s) => s.presentacion === 'avanzado')
      expect(enOrdenDeLectura(principales, posicionDe)).toEqual(principales)
      expect(enOrdenDeLectura(avanzadas, posicionDe)).toEqual(avanzadas)
      for (const s of secciones(salida)) {
        const items = (s as { items: ConPosicion[] }).items
        expect(enOrdenDeLectura(items, posicionDe), s.id).toEqual(items)
      }
    },
  )

  it('la semilla de la subasta: las avanzadas en el medio dan la fila del bloque', () => {
    const subasta = juego.casos.find((c) => c.nombre.startsWith('semilla subasta_usa'))
    const salida = disenoEnRejilla(subasta?.diseno) as {
      secciones: ConPosicion[]
      avanzado: { fila: number }
    }
    const lugar = (s: ConPosicion) => [s.id, s.posicion?.columna, s.posicion?.fila]
    expect(salida.secciones.filter((s) => s.presentacion !== 'avanzado').map(lugar)).toEqual([
      ['hoja', 1, 1],
      ['cambio', 7, 1],
      ['compra', 1, 2],
      ['logistica', 7, 2],
      ['aduana', 1, 3],
      ['garantia', 1, 5],
    ])
    expect(salida.avanzado).toEqual({ fila: 4 })
    expect(
      salida.secciones.filter((s) => s.presentacion === 'avanzado').map((s) => s.posicion),
    ).toEqual([
      { columna: 1, fila: 1 },
      { columna: 1, fila: 2 },
      { columna: 1, fila: 3 },
    ])
  })
})

describe('disenoEnRejilla en los bordes', () => {
  it('lo que no tiene forma vuelve igual, el alto que no hace nada se quita y lo angosto deja su hueco', () => {
    const salidaDe = (nombre: string) =>
      disenoEnRejilla(BORDES.find((b) => b.nombre.startsWith(nombre))?.entrada)
    for (const x of ['x', null, [], 7, { secciones: {} }]) expect(disenoEnRejilla(x)).toBe(x)
    const altos = secciones(salidaDe('borde: a 12 columnas'))
    expect(altos.map((s) => [s.id, 'alto' in s, s.posicion])).toEqual([
      ['a', false, { columna: 1, fila: 1 }],
      ['b', true, { columna: 1, fila: 2 }],
      ['c', true, { columna: 1, fila: 3 }],
      ['d', false, { columna: 7, fila: 3 }],
      ['e', false, { columna: 7, fila: 4 }],
    ])
    const hueco = secciones(salidaDe('borde: una pieza que no cabe'))
    expect(hueco.map((s) => [s.id, s.posicion?.columna, s.posicion?.fila])).toEqual([
      ['a', 1, 1],
      ['b', 7, 1],
      ['c', 7, 2],
      ['d', 1, 3],
      ['e', 9, 3],
      ['f', 1, 4],
    ])
    const avanzadas = salidaDe('borde: avanzadas en el medio') as {
      secciones: (ConPosicion & { alto?: number })[]
      avanzado: { fila: number }
    }
    expect(avanzadas.avanzado).toEqual({ fila: 2 })
    expect(avanzadas.secciones.map((s) => [s.id, s.posicion, s.alto])).toEqual([
      ['a', { columna: 1, fila: 1 }, undefined],
      ['x', { columna: 1, fila: 1 }, 3],
      ['b', { columna: 1, fila: 3 }, undefined],
      ['y', { columna: 1, fila: 4 }, undefined],
      ['z', { columna: 1, fila: 5 }, undefined],
      ['c', { columna: 7, fila: 3 }, undefined],
    ])
  })
})

const CASOS = join(dirname(fileURLToPath(import.meta.url)), 'casos-de-rejilla.json')
const REGENERAR =
  'ACTUALIZAR_CASOS_DE_REJILLA=1 pnpm vitest run src/modules/cotizaciones/entities/diseno-en-rejilla.test.ts'

describe('casos-de-rejilla.json', () => {
  it('el archivo es el que genera disenoEnRejilla()', () => {
    const texto = casosDeRejillaComoTexto(casosDeRejilla(juego.casos))
    if (process.env['ACTUALIZAR_CASOS_DE_REJILLA'] === '1') writeFileSync(CASOS, texto)
    expect(existsSync(CASOS), `falta el juego: ${REGENERAR}`).toBe(true)
    expect(readFileSync(CASOS, 'utf8') === texto, `juego viejo: ${REGENERAR}`).toBe(true)
  })
})
