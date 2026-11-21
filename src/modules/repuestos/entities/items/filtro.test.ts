import { describe, expect, it } from 'vitest'
import type { FaseDelItem, FilaDeItem } from '../nucleo/item'
import { CLAVE_SIN_FASE } from './grupos-por-paso'
import type { CatalogosDeLaHoja } from './hoja'
import {
  FILTRO_VACIO,
  filtrarItems,
  hayFiltro,
  leerFiltroDeItems,
  normalizar,
  opcionesDelFiltro,
  textoDeResultados,
  type FiltroDeItems,
} from './filtro'

const g = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const BOMBA = g(1)
const FARO = g(2)
const USADO = g(3)
const NUEVO = g(4)
const JAPON = g(5)
const AIRE = g(6)
const MAR = g(7)
const FASE_COMPRAR = g(8)
const FASE_TRANSITO = g(9)

const catalogos: CatalogosDeLaHoja = {
  tipo_pieza: {
    valores: [
      { id: BOMBA, nombre: 'Bomba de agua', activo: true },
      { id: FARO, nombre: 'Faro', activo: true },
    ],
  },
  condicion: {
    valores: [
      { id: USADO, nombre: 'Usado', activo: true },
      { id: NUEVO, nombre: 'Nuevo', activo: true },
    ],
  },
  pais_origen: { valores: [{ id: JAPON, nombre: 'Japón', activo: true }] },
  modo_transporte: {
    valores: [
      { id: AIRE, nombre: 'Aéreo', activo: true },
      { id: MAR, nombre: 'Marítimo', activo: false },
    ],
  },
}

const fase = (id: string, nombre: string): FaseDelItem => ({
  id,
  nombre,
  color: '#000',
  esFinal: false,
})
const COMPRAR = fase(FASE_COMPRAR, 'Comprar')
const TRANSITO = fase(FASE_TRANSITO, 'En tránsito')

const fila = (id: string, extra: Partial<FilaDeItem> = {}): FilaDeItem => ({
  id,
  proyectoId: 'p',
  descripcion: id,
  tipoPiezaId: null,
  condicionId: null,
  paisOrigenId: null,
  modoTransporteId: null,
  cantidad: 1,
  stockCantidad: 0,
  precioCliente: 10,
  moneda: 'USD',
  tracking: null,
  notas: null,
  fase: null,
  enStock: false,
  actualizadoEn: '2026-11-18T10:00:00Z',
  ...extra,
})

const filas = [
  fila('a', {
    descripcion: 'Bomba del Corolla',
    tipoPiezaId: BOMBA,
    condicionId: USADO,
    paisOrigenId: JAPON,
    modoTransporteId: AIRE,
    tracking: 'TRK-123',
    fase: COMPRAR,
  }),
  fila('b', {
    descripcion: 'Faro izquierdo',
    tipoPiezaId: FARO,
    condicionId: NUEVO,
    precioCliente: null,
    notas: 'Llegó rayado, reclamar',
    fase: TRANSITO,
  }),
  fila('c', { descripcion: 'Parabrisas', tracking: 'XYZ-9', modoTransporteId: MAR }),
]

const con = (parte: Partial<FiltroDeItems>): FiltroDeItems => ({ ...FILTRO_VACIO, ...parte })
const ids = (r: readonly FilaDeItem[]) => r.map((f) => f.id)

describe('normalizar', () => {
  it('quita acentos y mayúsculas', () => {
    expect(normalizar('Japón Á')).toBe('japon a')
  })
})

describe('leerFiltroDeItems', () => {
  it('lee lo válido', () => {
    expect(
      leerFiltroDeItems({ q: 'faro', fase: CLAVE_SIN_FASE, tipo: BOMBA, sin_precio: '1' }),
    ).toEqual(con({ q: 'faro', fase: CLAVE_SIN_FASE, tipo: BOMBA, sinPrecio: true }))
  })
  it('lo inválido no filtra', () => {
    expect(
      leerFiltroDeItems({
        fase: 'otra',
        tipo: 'x',
        condicion: '',
        pais: '1',
        via: ' ',
        sin_precio: 'si',
      }),
    ).toEqual(FILTRO_VACIO)
  })
  it('sin parámetros, vacío; la búsqueda se recorta', () => {
    expect(leerFiltroDeItems({})).toEqual(FILTRO_VACIO)
    expect(leerFiltroDeItems({ q: 'a'.repeat(500) }).q).toHaveLength(100)
  })
})

describe('hayFiltro', () => {
  it('es falso con el filtro vacío o sólo espacios', () => {
    expect(hayFiltro(FILTRO_VACIO)).toBe(false)
    expect(hayFiltro(con({ q: '  ' }))).toBe(false)
  })
  it('es verdadero con cualquier parte', () => {
    expect(hayFiltro(con({ q: 'a' }))).toBe(true)
    expect(hayFiltro(con({ sinPrecio: true }))).toBe(true)
    expect(hayFiltro(con({ via: AIRE }))).toBe(true)
  })
})

describe('filtrarItems', () => {
  it('sin filtro devuelve las mismas filas', () => {
    expect(filtrarItems(filas, FILTRO_VACIO, catalogos)).toBe(filas)
  })
  it('busca en la descripción, sin acentos ni mayúsculas, desde la primera letra', () => {
    expect(ids(filtrarItems(filas, con({ q: 'PARA' }), catalogos))).toEqual(['c'])
    expect(ids(filtrarItems(filas, con({ q: 'b' }), catalogos))).toEqual(['a', 'c'])
  })
  it('busca en el nombre del tipo de pieza', () => {
    expect(ids(filtrarItems(filas, con({ q: 'agua' }), catalogos))).toEqual(['a'])
  })
  it('busca en el tracking y en las notas', () => {
    expect(ids(filtrarItems(filas, con({ q: 'xyz' }), catalogos))).toEqual(['c'])
    expect(ids(filtrarItems(filas, con({ q: 'llego' }), catalogos))).toEqual(['b'])
  })
  it('cada filtro por separado', () => {
    expect(ids(filtrarItems(filas, con({ fase: FASE_COMPRAR }), catalogos))).toEqual(['a'])
    expect(ids(filtrarItems(filas, con({ fase: CLAVE_SIN_FASE }), catalogos))).toEqual(['c'])
    expect(ids(filtrarItems(filas, con({ tipo: FARO }), catalogos))).toEqual(['b'])
    expect(ids(filtrarItems(filas, con({ condicion: USADO }), catalogos))).toEqual(['a'])
    expect(ids(filtrarItems(filas, con({ pais: JAPON }), catalogos))).toEqual(['a'])
    expect(ids(filtrarItems(filas, con({ via: MAR }), catalogos))).toEqual(['c'])
    expect(ids(filtrarItems(filas, con({ sinPrecio: true }), catalogos))).toEqual(['b'])
  })
  it('varios a la vez se suman (Y)', () => {
    expect(ids(filtrarItems(filas, con({ q: 'a', sinPrecio: true }), catalogos))).toEqual(['b'])
    expect(ids(filtrarItems(filas, con({ tipo: FARO, condicion: USADO }), catalogos))).toEqual([])
  })
})

describe('opcionesDelFiltro', () => {
  const orden = new Map([
    [FASE_COMPRAR, 0],
    [FASE_TRANSITO, 1],
  ])
  it('ofrece sólo lo que los ítems tienen, en el orden del catálogo', () => {
    const o = opcionesDelFiltro(filas, catalogos, FILTRO_VACIO, orden)
    expect(o.tipo.map((x) => x.etiqueta)).toEqual(['Bomba de agua', 'Faro'])
    expect(o.condicion.map((x) => x.etiqueta)).toEqual(['Usado', 'Nuevo'])
    expect(o.pais.map((x) => x.etiqueta)).toEqual(['Japón'])
    expect(o.via.map((x) => x.etiqueta)).toEqual(['Aéreo', 'Marítimo'])
  })
  it('las fases van en el orden del flujo y «Sin fase» al final, sólo si hay', () => {
    const o = opcionesDelFiltro(filas, catalogos, FILTRO_VACIO, orden)
    expect(o.fase.map((x) => x.etiqueta)).toEqual(['Comprar', 'En tránsito', 'Sin fase'])
    const sinSinFase = opcionesDelFiltro(filas.slice(0, 2), catalogos, FILTRO_VACIO, orden)
    expect(sinSinFase.fase.map((x) => x.etiqueta)).toEqual(['Comprar', 'En tránsito'])
  })
  it('sin orden de fases, por nombre', () => {
    const o = opcionesDelFiltro(filas, catalogos, FILTRO_VACIO, null)
    expect(o.fase.map((x) => x.etiqueta)).toEqual(['Comprar', 'En tránsito', 'Sin fase'])
  })
  it('suma el elegido si ya no está entre los ítems, o dice que ya no existe', () => {
    const sinFaros = filas.filter((f) => f.tipoPiezaId !== FARO)
    const o = opcionesDelFiltro(sinFaros, catalogos, con({ tipo: FARO }), orden)
    expect(o.tipo.map((x) => x.etiqueta)).toEqual(['Bomba de agua', 'Faro'])
    const raro = opcionesDelFiltro(sinFaros, catalogos, con({ tipo: g(99) }), orden)
    expect(raro.tipo.at(-1)).toEqual({ valor: g(99), etiqueta: 'Ya no existe' })
  })
})

describe('textoDeResultados', () => {
  it('«N de M ítems»', () => {
    expect(textoDeResultados(3, 12, false)).toBe('3 de 12 ítems')
  })
  it('con la hoja topada, el total lleva «+»', () => {
    expect(textoDeResultados(3, 200, true)).toBe('3 de 200+ ítems')
  })
})
