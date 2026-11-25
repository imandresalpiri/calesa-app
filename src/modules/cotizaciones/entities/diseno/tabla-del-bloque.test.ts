import { describe, expect, it } from 'vitest'
import casos from '../casos-de-diseno.json'
import { esquemaDiseno, type BloqueDeAyuda, type Diseno } from '../diseno'
import { esquemaDefinicion } from '../formula'
import { validarDiseno } from '../validar-diseno'
import {
  celdasQueAceptanValor,
  mostrarColumna,
  ponerLlena,
  ponerResaltar,
  ponerTablaDelBloque,
  SIN_TABLAS,
  tablaParaElBloqueNuevo,
  tablasParaAyuda,
} from './tabla-del-bloque'

const juego = casos as unknown as {
  contexto: { niveles: string[]; retirados: string[]; tonos: string[] }
  formulas: Record<string, { definicion: unknown }>
  casos: { nombre: string; diseno: unknown }[]
}
const definicion = esquemaDefinicion.parse(juego.formulas['capturas']?.definicion)
const capturas = esquemaDiseno.parse(
  juego.casos.find((c) => c.nombre.startsWith('capturas'))?.diseno,
)
const TABLAS = [
  { clave: 'depreciacion', columnas: ['anio', 'factor', 'nota'] },
  { clave: 'transporte_usa_bolivia', columnas: ['tipo', 'cliente'] },
]
const TODAS = ['anio', 'factor', 'nota']

function congelar<T>(valor: T): T {
  if (typeof valor === 'object' && valor !== null) {
    Object.values(valor).forEach(congelar)
    Object.freeze(valor)
  }
  return valor
}
const EN = { seccion: 'compra', nodo: 'remate', bloque: 0 }
const con = (b: BloqueDeAyuda): Diseno =>
  congelar({
    ...capturas,
    secciones: capturas.secciones.map((s) =>
      s.id !== EN.seccion
        ? s
        : {
            ...s,
            items: s.items.map((it) =>
              it.tipo === 'celda' && it.nodo === EN.nodo ? { ...it, ayuda: [b] } : it,
            ),
          },
    ),
  })
const elBloque = (d: Diseno) => {
  const it = d.secciones
    .find((s) => s.id === EN.seccion)
    ?.items.find((i) => i.tipo === 'celda' && i.nodo === EN.nodo)
  return it?.tipo === 'celda' && Array.isArray(it.ayuda) ? it.ayuda[0] : undefined
}
const valida = (d: Diseno) => validarDiseno(definicion, d, { ...juego.contexto, tablas: TABLAS }).ok
const DEPRECIACION: BloqueDeAyuda = { tipo: 'tabla', tabla: 'depreciacion' }

describe('las columnas del bloque de tabla', () => {
  it('dejar de mostrar una arma la lista; volver a mostrarla en su lugar la quita (todas, sin llenar = sin lista)', () => {
    const sinNota = mostrarColumna(con(DEPRECIACION), { ...EN, columna: 'nota' }, TODAS, false)
    expect(elBloque(sinNota)).toEqual({
      tipo: 'tabla',
      tabla: 'depreciacion',
      columnas: [{ columna: 'anio' }, { columna: 'factor' }],
    })
    expect(valida(sinNota)).toBe(true)
    const sinAnio = mostrarColumna(sinNota, { ...EN, columna: 'anio' }, TODAS, false)
    expect(elBloque(mostrarColumna(sinAnio, { ...EN, columna: 'anio' }, TODAS, true))).toEqual(
      elBloque(sinNota),
    )
    expect(elBloque(mostrarColumna(sinNota, { ...EN, columna: 'nota' }, TODAS, true))).toEqual(
      DEPRECIACION,
    )
  })

  it('la última que queda no se deja de mostrar', () => {
    const una = con({ tipo: 'tabla', tabla: 'depreciacion', columnas: [{ columna: 'factor' }] })
    expect(mostrarColumna(una, { ...EN, columna: 'factor' }, TODAS, false)).toEqual(una)
  })

  it('«Llena la celda» pone el nodo y «Ninguna» lo quita; una que no se muestra no llena', () => {
    const llena = ponerLlena(con(DEPRECIACION), { ...EN, columna: 'factor' }, TODAS, 'remate')
    expect(elBloque(llena)).toEqual({
      tipo: 'tabla',
      tabla: 'depreciacion',
      columnas: [{ columna: 'anio' }, { columna: 'factor', llena: 'remate' }, { columna: 'nota' }],
    })
    expect(valida(llena)).toBe(true)
    expect(elBloque(ponerLlena(llena, { ...EN, columna: 'factor' }, TODAS, null))).toEqual(
      DEPRECIACION,
    )
    const sinNota = mostrarColumna(llena, { ...EN, columna: 'nota' }, TODAS, false)
    expect(ponerLlena(sinNota, { ...EN, columna: 'nota' }, TODAS, 'remate')).toEqual(sinNota)
    // Un nodo que la hoja no deja escribir (el subtotal del CIF) lo rechaza la regla.
    expect(valida(ponerLlena(con(DEPRECIACION), { ...EN, columna: 'factor' }, TODAS, 'cif'))).toBe(
      false,
    )
  })
})

describe('la tabla del bloque', () => {
  it('otra tabla vuelve a mostrar todas y conserva «Resaltar»; apagarlo quita la clave', () => {
    const resaltada = ponerResaltar(
      ponerLlena(con(DEPRECIACION), { ...EN, columna: 'factor' }, TODAS, 'remate'),
      EN,
      true,
    )
    const otra = ponerTablaDelBloque(resaltada, EN, 'transporte_usa_bolivia')
    expect(elBloque(otra)).toEqual({
      tipo: 'tabla',
      tabla: 'transporte_usa_bolivia',
      resaltar: true,
    })
    expect(elBloque(ponerResaltar(otra, EN, false))).toEqual({
      tipo: 'tabla',
      tabla: 'transporte_usa_bolivia',
    })
    expect(valida(ponerTablaDelBloque(otra, EN, 'no_existe'))).toBe(false)
  })
})

describe('lo que ofrece el inspector', () => {
  it('celdasQueAceptanValor: las celdas que se tipean (y el porcentaje de un par), en orden y sin repetir', () => {
    const celdas = celdasQueAceptanValor(capturas, definicion)
    const nodos = celdas.map((c) => c.nodo)
    expect(nodos[0]).toBe('remate')
    expect(nodos).toContain('fees_pct')
    expect(nodos).not.toContain('cif')
    expect(nodos).not.toContain('tc_oficial')
    expect(new Set(nodos).size).toBe(nodos.length)
    expect(celdas.find((c) => c.nodo === 'remate')?.rotulo).toBe(
      definicion.nodos.find((n) => n.id === 'remate')?.etiqueta,
    )
    expect(celdasQueAceptanValor({ secciones: [] }, definicion)).toEqual([])
  })

  it('tablasParaAyuda da las tablas que nombra la fórmula, en orden y sin repetir, con la actual', () => {
    const tablas = tablasParaAyuda(definicion, 'otra')
    expect(new Set(tablas).size).toBe(tablas.length)
    expect(tablas).toContain('depreciacion')
    expect(tablas).toContain('otra')
  })
  it('tablaParaElBloqueNuevo: la primera que la ayuda no muestra, las del origen antes que las compartidas', () => {
    const tabla = (clave: string, compartida: boolean) => ({
      id: clave,
      clave,
      nombre: clave,
      compartida,
      columnas: [],
    })
    const catalogo = [
      tabla('fletes', true),
      tabla('depreciacion', false),
      tabla('aranceles', false),
    ]
    const bloque = (t: string): BloqueDeAyuda => ({ tipo: 'tabla', tabla: t })
    expect(tablaParaElBloqueNuevo([], catalogo, [])).toEqual({ tabla: 'depreciacion' })
    expect(tablaParaElBloqueNuevo([bloque('depreciacion')], catalogo, [])).toEqual({
      tabla: 'aranceles',
    })
    expect(
      tablaParaElBloqueNuevo([bloque('depreciacion'), bloque('aranceles')], catalogo, []),
    ).toEqual({ tabla: 'fletes' })
    expect(
      tablaParaElBloqueNuevo(
        [bloque('depreciacion'), bloque('aranceles'), bloque('fletes')],
        catalogo,
        [],
      ),
    ).toEqual({ tabla: 'depreciacion' })
    // Sin catálogo, las de la fórmula; sin ninguna, el motivo.
    expect(tablaParaElBloqueNuevo([], null, ['tramos'])).toEqual({ tabla: 'tramos' })
    expect(tablaParaElBloqueNuevo([], [], ['tramos'])).toEqual({ motivo: SIN_TABLAS })
    expect(tablaParaElBloqueNuevo([], null, [])).toEqual({ motivo: SIN_TABLAS })
  })
})
