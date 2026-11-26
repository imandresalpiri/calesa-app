import { describe, expect, it } from 'vitest'
import type { CeldaDeLaTarjeta, PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import { lecturaEnCuadricula } from './lectura-en-cuadricula'
import type { TonoDelCatalogo } from './lectura-de-la-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

const contexto: ContextoDePlantilla = {
  definicion: {
    nodos: [
      { id: 'remate', etiqueta: 'Remate', grupo: 'compra', descripcion: 'En la subasta' },
      { id: 'comision_pct', etiqueta: 'Comisión (%)' },
      {
        id: 'comision',
        etiqueta: 'Comisión',
        tipo: 'calculo',
        op: 'porcentaje_de',
        pct: 'comision_pct',
        grupo: 'compra',
      },
      { id: 'tc_ext', etiqueta: 'TC paralelo' },
      {
        id: 'variante',
        etiqueta: 'Variante',
        tipo: 'opcion',
        opciones: [{ clave: 'moto', titulo: 'Moto' }],
      },
      { id: 'total', etiqueta: 'TOTAL', salida: 'total' },
    ],
    grupos: [{ id: 'compra', etiqueta: 'Compra', plazo: '2 días', bucket: 'exterior' }],
    buckets: { exterior: 'tc_ext' },
  },
  diseno: {
    cabecera: {
      modos: [
        {
          clave: 'paralelo',
          nombre: 'Paralelo',
          buckets: [{ bucket: 'exterior', nodo: 'tc_ext' }],
        },
      ],
    },
  },
  visibilidad: { variante: { ver: 'todos' } },
  tonos: ['verde'],
}
const TONOS: TonoDelCatalogo[] = [
  { clave: 'verde', nombre: 'Verde', hex: '#00aa00' },
  { clave: 'rojo', nombre: 'Rojo', hex: '#aa0000' },
  { clave: 'sin_hex', nombre: 'Sin hex' },
]

const celda = (
  id: string,
  contenido: CeldaDeLaTarjeta['contenido'],
  estilo?: CeldaDeLaTarjeta['estilo'],
): CeldaDeLaTarjeta => ({
  id,
  fila: 'f',
  columna: id,
  contenido,
  ...(estilo === undefined ? {} : { estilo }),
})
const plantilla = (celdas: CeldaDeLaTarjeta[]): PlantillaEnCuadricula => ({
  forma: 2,
  columnas: celdas.map((c) => ({ id: c.columna, ancho: 50 })),
  filas: [{ id: 'f', alto: 20, ocultar_si: 'no_aplica', nodo: 'remate' }],
  celdas,
})

describe('lecturaEnCuadricula', () => {
  it('los nodos que nombran las filas y las celdas, con el `pct` del par sólo si se muestra su porcentaje', () => {
    const sinPorcentaje = lecturaEnCuadricula(
      plantilla([celda('a', { tipo: 'dato', nodo: 'comision', mostrar: 'monto' })]),
      contexto,
      TONOS,
    )
    expect(sinPorcentaje.nodos).toEqual([
      {
        id: 'remate',
        etiqueta: 'Remate',
        descripcion: 'En la subasta',
        grupo: 'compra',
        pct: null,
      },
      { id: 'comision', etiqueta: 'Comisión', descripcion: null, grupo: 'compra', pct: null },
    ])
    const conPorcentaje = lecturaEnCuadricula(
      plantilla([celda('a', { tipo: 'dato', nodo: 'comision', mostrar: 'porcentaje' })]),
      contexto,
      TONOS,
    )
    expect(conPorcentaje.nodos.find((n) => n.id === 'comision')?.pct).toBe('comision_pct')
  })

  it('la variante del nivel «todos» va siempre (dice qué opción hace que una fila no aplique); restringida, no', () => {
    const l = lecturaEnCuadricula(plantilla([]), contexto, TONOS)
    expect(l.variante).toEqual({ nodo: 'variante', opciones: [{ clave: 'moto', titulo: 'Moto' }] })
    expect(
      lecturaEnCuadricula(plantilla([]), { ...contexto, visibilidad: {} }, TONOS).variante,
    ).toBeNull()
  })

  it('los modos sólo si una celda muestra `modo_tc`; el total, el nodo con salida `total`', () => {
    expect(lecturaEnCuadricula(plantilla([]), contexto, TONOS).modos).toEqual([])
    const l = lecturaEnCuadricula(
      plantilla([celda('a', { tipo: 'dato', variable: 'modo_tc' })]),
      contexto,
      TONOS,
    )
    expect(l.modos).toEqual([{ clave: 'paralelo', nombre: 'Paralelo' }])
    expect(l.total).toEqual({ nodo: 'total' })
  })

  it('el tipo de cambio y el grupo de un nodo con `tc_*` o `plazo`', () => {
    const l = lecturaEnCuadricula(
      plantilla([
        celda('a', { tipo: 'dato', nodo: 'remate', mostrar: 'tc_nombre' }),
        celda('b', { tipo: 'dato', nodo: 'remate', mostrar: 'plazo' }),
      ]),
      contexto,
      TONOS,
    )
    expect(l.tiposDeCambio.buckets).toEqual([
      { bucket: 'exterior', nombre: 'TC paralelo', nodo: 'tc_ext' },
    ])
    expect(l.tiposDeCambio.modos).toEqual([
      { modo: 'paralelo', bucket: 'exterior', nombre: 'TC paralelo', nodo: 'tc_ext' },
    ])
    expect(l.grupos).toEqual([
      { id: 'compra', etiqueta: 'Compra', plazo: '2 días', bucket: 'exterior' },
    ])
  })

  it('sólo los colores del catálogo que usan los estilos y que tienen hex', () => {
    const l = lecturaEnCuadricula(
      plantilla([celda('a', { tipo: 'vacio' }, { fondo: 'verde', texto: 'sin_hex' })]),
      contexto,
      TONOS,
    )
    expect(l.colores).toEqual([{ clave: 'verde', hex: '#00aa00' }])
  })
})

describe('lecturaEnCuadricula con un texto con datos', () => {
  it('un porcentaje dentro de un texto con datos trae el `pct` del par; un tipo de cambio, su grupo', () => {
    const l = lecturaEnCuadricula(
      plantilla([
        celda('a', {
          tipo: 'texto',
          partes: [
            'Comisión ',
            { tipo: 'dato', nodo: 'comision', mostrar: 'porcentaje' },
            ' · ',
            { tipo: 'dato', nodo: 'remate', mostrar: 'tc_nombre' },
          ],
        }),
      ]),
      contexto,
      TONOS,
    )
    expect(l.nodos.find((n) => n.id === 'comision')?.pct).toBe('comision_pct')
    expect(l.tiposDeCambio.buckets).toEqual([
      { bucket: 'exterior', nombre: 'TC paralelo', nodo: 'tc_ext' },
    ])
    expect(l.grupos.map((g) => g.id)).toEqual(['compra'])
  })
})

describe('lecturaEnCuadricula: los «Decimales»', () => {
  it('los «Decimales» del nodo y, con su porcentaje, los del `pct`; sin ellos, ninguna clave', () => {
    const conDecimales: ContextoDePlantilla = {
      ...contexto,
      definicion: {
        ...contexto.definicion,
        nodos: (contexto.definicion.nodos ?? []).map((n) =>
          n.id === 'remate'
            ? { ...n, decimales: 0 }
            : n.id === 'comision_pct'
              ? { ...n, decimales: 1 }
              : n,
        ),
      },
    }
    const conPorcentaje = lecturaEnCuadricula(
      plantilla([celda('a', { tipo: 'dato', nodo: 'comision', mostrar: 'porcentaje' })]),
      conDecimales,
      TONOS,
    )
    expect(conPorcentaje.nodos.find((n) => n.id === 'remate')).toMatchObject({ decimales: 0 })
    const comision = conPorcentaje.nodos.find((n) => n.id === 'comision')
    expect(comision).toMatchObject({ pct: 'comision_pct', decimalesDelPct: 1 })
    expect(comision).not.toHaveProperty('decimales')
    const sinPorcentaje = lecturaEnCuadricula(
      plantilla([celda('a', { tipo: 'dato', nodo: 'comision', mostrar: 'monto' })]),
      conDecimales,
      TONOS,
    )
    expect(sinPorcentaje.nodos.find((n) => n.id === 'comision')).not.toHaveProperty(
      'decimalesDelPct',
    )
  })
})
