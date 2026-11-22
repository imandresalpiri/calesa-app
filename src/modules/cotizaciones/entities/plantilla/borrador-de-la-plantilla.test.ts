import { describe, expect, it } from 'vitest'
import type { PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import {
  alinearConLaFormula,
  AVISO_DE_LA_CONVERSION,
  AVISO_DE_LA_OMISION,
  AVISO_DEL_CORTE,
  cuadriculaParaEditar,
} from './borrador-de-la-plantilla'
import { formaDeCuadricula } from './forma-de-cuadricula'
import type { Plantilla } from './forma-de-plantilla'
import { revisarLaGrilla } from './reglas-de-la-grilla'
import type { VersionDePlantilla } from './lectura-de-la-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

const contexto: ContextoDePlantilla = {
  definicion: {
    nodos: [
      { id: 'fees', etiqueta: 'Fees', grupo: 'compra' },
      { id: 'grua', etiqueta: 'Grúa', grupo: 'logistica' },
      { id: 'cif', etiqueta: 'Valor CIF', salida: 'base_imponible' },
      { id: 'total', etiqueta: 'TOTAL DE LA FÓRMULA', salida: 'total' },
    ],
    grupos: [
      { id: 'compra', etiqueta: 'Compra' },
      { id: 'logistica', etiqueta: 'Logística' },
    ],
  },
  diseno: null,
  visibilidad: null,
  tonos: ['verde'],
}
const col = { leyenda: false, plazo: false, tipo_cambio: false }
const p = (o: Partial<Plantilla> = {}): Plantilla => ({
  grupos: [{ grupo: 'compra' }, { grupo: 'logistica' }],
  total: { etiqueta: 'T' },
  logo: false,
  columnas: col,
  ...o,
})
const version = (
  definicion: Plantilla | PlantillaEnCuadricula | null,
  extra: Partial<VersionDePlantilla> = {},
): VersionDePlantilla => ({
  id: 'x',
  version: null,
  nota: null,
  actualizadoEn: 'h',
  publicadoEn: null,
  contenido:
    definicion === null
      ? { motivo: 'La plantilla no tiene la forma esperada.' }
      : 'forma' in definicion
        ? { forma: 2, cuadricula: definicion }
        : { forma: 1, plantilla: definicion },
  ...extra,
})

describe('alinearConLaFormula', () => {
  it('quita el grupo que ya no está, deduplica y suma el que falta al final sin color', () => {
    const r = alinearConLaFormula(
      p({ grupos: [{ grupo: 'viejo' }, { grupo: 'compra', tono: 'verde' }, { grupo: 'compra' }] }),
      contexto,
    )
    expect(r.plantilla.grupos).toEqual([{ grupo: 'compra', tono: 'verde' }, { grupo: 'logistica' }])
    expect(r.avisos).toEqual([
      'El grupo «viejo» ya no está en la fórmula: se quitó.',
      'El grupo «Compra» estaba repetido: se quitó el segundo.',
      'El grupo «Logística» es nuevo en la fórmula: se sumó al final, sin color.',
    ])
  })
  it('quita las etiquetas y leyendas sin lugar, con la etiqueta del nodo o el id', () => {
    const r = alinearConLaFormula(
      p({ etiquetas: { fees: 'F', cif: 'C' }, leyendas: { zzz: 'z' } }),
      contexto,
    )
    expect(r.plantilla.etiquetas).toEqual({ fees: 'F' })
    expect(Object.hasOwn(r.plantilla, 'leyendas')).toBe(false)
    expect(r.avisos).toEqual([
      'La etiqueta de «Valor CIF» ya no tiene lugar en la tarjeta: se quitó.',
      'La leyenda de «zzz» ya no tiene lugar en la tarjeta: se quitó.',
    ])
  })
  it('no muta su entrada y una plantilla alineada no cambia', () => {
    const entrada = p({ etiquetas: { cif: 'C' } })
    const antes = JSON.stringify(entrada)
    alinearConLaFormula(entrada, contexto)
    expect(JSON.stringify(entrada)).toBe(antes)
    const ok = p()
    expect(alinearConLaFormula(ok, contexto)).toEqual({ plantilla: ok, avisos: [] })
  })
})

const TONOS = ['verde']
const cuadricula = (): PlantillaEnCuadricula => ({
  forma: 2,
  columnas: [{ id: 'a', ancho: 100 }],
  filas: [{ id: 'f', alto: 24, ocultar_si: 'nunca' }],
  celdas: [{ id: 'c', fila: 'f', columna: 'a', contenido: { tipo: 'texto', texto: 'Hola' } }],
})
const textos = (q: PlantillaEnCuadricula) =>
  q.celdas.flatMap((c) =>
    c.contenido.tipo === 'texto' && 'texto' in c.contenido ? [c.contenido.texto] : [],
  )
const nodos = (q: PlantillaEnCuadricula) =>
  q.celdas.flatMap((c) =>
    c.contenido.tipo === 'dato' && 'nodo' in c.contenido ? [c.contenido.nodo] : [],
  )

describe('cuadriculaParaEditar', () => {
  it('un borrador de la forma 2 se usa tal cual, sin avisos', () => {
    const r = cuadriculaParaEditar({
      borrador: version(cuadricula()),
      publicada: version(p()),
      contexto,
      tonos: TONOS,
    })
    expect(r).toEqual({ cuadricula: cuadricula(), de: 'borrador', avisos: [] })
  })
  it('una forma 1 se alinea, se convierte a la cuadrícula y lo dice (no se guarda sola)', () => {
    const r = cuadriculaParaEditar({
      borrador: null,
      publicada: version(p({ grupos: [{ grupo: 'compra' }] }), { version: 2 }),
      contexto,
      tonos: TONOS,
    })
    expect(r.de).toBe('publicada')
    expect(r.cuadricula.forma).toBe(2)
    expect(formaDeCuadricula(r.cuadricula, { conTope: false }).ok).toBe(true)
    expect(r.avisos[0]).toBe(AVISO_DE_LA_CONVERSION)
    // Lo que alineó (el grupo «Logística» que faltaba) también se dice.
    expect(r.avisos).toContain(
      'El grupo «Logística» es nuevo en la fórmula: se sumó al final, sin color.',
    )
    expect(nodos(r.cuadricula)).toEqual(expect.arrayContaining(['fees', 'grua', 'total']))
  })
  it('sin ninguna, la de por omisión convertida: los grupos de la fórmula y el total con la etiqueta de su nodo', () => {
    const r = cuadriculaParaEditar({ borrador: null, publicada: null, contexto, tonos: TONOS })
    expect(r.de).toBe('omision')
    expect(r.avisos).toEqual([AVISO_DE_LA_OMISION])
    expect(textos(r.cuadricula)).toContain('TOTAL DE LA FÓRMULA')
    expect(nodos(r.cuadricula)).toEqual(expect.arrayContaining(['fees', 'grua', 'total']))
    const sinEtiqueta = {
      ...contexto,
      definicion: { ...contexto.definicion, nodos: [{ id: 'total', salida: 'total' }] },
    }
    expect(
      textos(
        cuadriculaParaEditar({
          borrador: null,
          publicada: null,
          contexto: sinEtiqueta,
          tonos: TONOS,
        }).cuadricula,
      ),
    ).toContain('Total')
  })
})

describe('cuadriculaParaEditar: lo que no entra y lo que no se lee', () => {
  it('si la conversión no entra en la grilla (más de 120 filas), toma los primeros 4 miembros de cada grupo y lo dice', () => {
    const muchos = {
      ...contexto,
      definicion: {
        ...contexto.definicion,
        nodos: [
          ...Array.from({ length: 200 }, (_, i) => ({
            id: `m${String(i)}`,
            etiqueta: `M ${String(i)}`,
            grupo: 'compra',
          })),
          { id: 'grua', etiqueta: 'Grúa', grupo: 'logistica' },
          { id: 'total', etiqueta: 'Total', salida: 'total' },
        ],
      },
    }
    const r = cuadriculaParaEditar({
      borrador: null,
      publicada: null,
      contexto: muchos,
      tonos: TONOS,
    })
    expect(r.avisos).toEqual([AVISO_DE_LA_OMISION, AVISO_DEL_CORTE])
    expect(r.cuadricula.filas.length).toBeLessThanOrEqual(120)
    expect(revisarLaGrilla(r.cuadricula)).toBeNull()
    expect([...new Set(nodos(r.cuadricula).filter((n) => n.startsWith('m')))]).toEqual([
      'm0',
      'm1',
      'm2',
      'm3',
    ])
  })
  it('un borrador ilegible parte de la publicada con su aviso', () => {
    const r = cuadriculaParaEditar({
      borrador: version(null),
      publicada: version(cuadricula(), { version: 3 }),
      contexto,
      tonos: TONOS,
    })
    expect(r.de).toBe('publicada')
    expect(r.cuadricula).toEqual(cuadricula())
    expect(r.avisos).toEqual([
      'El borrador guardado no se pudo leer (La plantilla no tiene la forma esperada.): al guardar se reemplaza.',
    ])
  })
  it('una publicada ilegible parte de la de por omisión', () => {
    const r = cuadriculaParaEditar({
      borrador: null,
      publicada: version(null, { version: 4 }),
      contexto,
      tonos: TONOS,
    })
    expect(r.de).toBe('omision')
    expect(r.avisos[0]).toBe(
      'La versión 4 publicada no se pudo leer (La plantilla no tiene la forma esperada.): se parte de la de por omisión.',
    )
    expect(r.avisos[1]).toBe(AVISO_DE_LA_OMISION)
  })
})
