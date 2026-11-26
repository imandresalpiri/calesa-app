import { describe, expect, it } from 'vitest'
import { lecturaDesdeLaPlana, tarjetaDesde } from './lectura-de-la-tarjeta'
import { crudaDeLaTarjeta } from './tarjeta.soporte'

describe('tarjetaDesde', () => {
  it('lee la cuadrícula y lo que nombra, con `Map` por id (un id como constructor no cae en el prototipo)', () => {
    const t = tarjetaDesde(crudaDeLaTarjeta())
    if (t === null || t.estado !== 'lista') throw new Error('no se lee')
    expect(t.definicion.columnas).toHaveLength(4)
    expect(t.nodos.get('flete')).toEqual({
      etiqueta: 'Flete',
      descripcion: 'Flete marítimo',
      grupo: 'logistica',
      pct: 'flete_pct',
    })
    expect(t.nodos.get('constructor')).toBeUndefined()
    expect(t.grupos.get('compra')).toEqual({
      etiqueta: 'Compra',
      plazo: '48 horas',
      bucket: 'compra',
    })
    expect(t.tiposDeCambio.modos.get('bcb')?.get('compra')).toEqual({
      nombre: 'Dólar BCB',
      nodo: 'tc_bcb',
    })
    expect(t.colores.get('verde')).toBe('#31869b')
    expect(t.total).toEqual({ nodo: 'total' })
  })

  it('sin_plantilla tal cual; lo que no es lo que la base promete, nulo', () => {
    expect(tarjetaDesde({ estado: 'sin_plantilla' })).toEqual({ estado: 'sin_plantilla' })
    expect(tarjetaDesde(null)).toBeNull()
    expect(
      tarjetaDesde(crudaDeLaTarjeta({ colores: [{ clave: 'verde', hex: 'verde' }] })),
    ).toBeNull()
    expect(tarjetaDesde(crudaDeLaTarjeta({ definicion: { forma: 1 } }))).toBeNull()
    const definicion = crudaDeLaTarjeta().definicion
    const conTamanoRaro = {
      ...definicion,
      celdas: [{ ...definicion.celdas[0], estilo: { tamano: 13 } }],
    }
    expect(tarjetaDesde(crudaDeLaTarjeta({ definicion: conTamanoRaro }))).toBeNull()
  })
})

describe('tarjetaDesde con la lista de respaldo y las condiciones', () => {
  it('lee una lista de respaldo, unas condiciones y una fila que se oculta por las suyas; una condición incompleta, nulo', () => {
    const definicion = crudaDeLaTarjeta().definicion
    const [primera] = definicion.celdas
    const si = [{ es: 'mayor', nodo: 'total', a: 0.5 }]
    const con = (contenido: unknown, filas: readonly unknown[] = definicion.filas) =>
      tarjetaDesde(
        crudaDeLaTarjeta({
          definicion: { ...definicion, filas, celdas: [{ ...primera, contenido }] },
        }),
      )
    const respaldo = {
      tipo: 'respaldo',
      datos: [
        { tipo: 'dato', variable: 'titulo' },
        { tipo: 'dato', nodo: 'remate', mostrar: 'etiqueta' },
      ],
    }
    const leida = con(respaldo, [
      ...definicion.filas,
      { id: 'otra', alto: 20, ocultar_si: 'condiciones', si },
    ])
    if (leida?.estado !== 'lista') throw new Error('no se lee')
    expect(leida.definicion.celdas[0]?.contenido).toEqual(respaldo)
    expect(leida.definicion.filas.at(-1)).toEqual({
      id: 'otra',
      alto: 20,
      ocultar_si: 'condiciones',
      si,
    })
    const condiciones = {
      tipo: 'condiciones',
      ramas: [{ si, contenido: { tipo: 'texto', texto: 'Sí' } }],
      si_no: { tipo: 'vacio' },
    }
    expect(con(condiciones)).not.toBeNull()
    expect(
      con({
        ...condiciones,
        ramas: [{ si: [{ es: 'mayor', nodo: 'total' }], contenido: { tipo: 'vacio' } }],
      }),
    ).toBeNull()
    expect(con({ ...condiciones, si_no: { tipo: 'logo' } })).toBeNull()
  })
})

describe('lecturaDesdeLaPlana', () => {
  it('arma los mismos `Map` desde la lectura plana de la vista previa', () => {
    const t = lecturaDesdeLaPlana({
      definicion: {
        forma: 2,
        columnas: [{ id: 'a', ancho: 100 }],
        filas: [{ id: 'f', alto: 24, ocultar_si: 'nunca' }],
        celdas: [],
      },
      nodos: [{ id: 'remate', etiqueta: 'Remate', descripcion: null, grupo: 'compra', pct: null }],
      grupos: [{ id: 'compra', etiqueta: 'Compra', plazo: null, bucket: 'exterior' }],
      tiposDeCambio: {
        buckets: [{ bucket: 'exterior', nombre: 'TC paralelo', nodo: 'tc_p' }],
        modos: [{ modo: 'unificado', bucket: 'exterior', nombre: 'Dólar unificado', nodo: 'tc_u' }],
      },
      modos: [{ clave: 'unificado', nombre: 'Unificado' }],
      variante: null,
      colores: [{ clave: 'verde', hex: '#E6F6EE' }],
      total: { nodo: 'total' },
    })
    expect(t.tiposDeCambio.modos.get('unificado')?.get('exterior')?.nodo).toBe('tc_u')
    expect(t.colores.get('verde')).toBe('#e6f6ee')
    expect(t.modos.get('unificado')).toBe('Unificado')
  })
})

describe('tarjetaDesde y lecturaDesdeLaPlana: los «Decimales» de cada nodo', () => {
  const conDecimalesEnFlete = (mas: Record<string, unknown>) =>
    crudaDeLaTarjeta({
      nodos: crudaDeLaTarjeta().nodos.map((n) => (n.id === 'flete' ? { ...n, ...mas } : n)),
    })

  it('los del nodo y los del `pct` de su porcentaje, sólo si llegan; otra cifra no es lo que la base promete', () => {
    const t = tarjetaDesde(conDecimalesEnFlete({ decimales: 0, decimales_del_pct: 3 }))
    if (t === null || t.estado !== 'lista') throw new Error('no se lee')
    expect(t.nodos.get('flete')).toMatchObject({ decimales: 0, decimalesDelPct: 3 })
    expect(t.nodos.get('remate')).not.toHaveProperty('decimales')
    expect(t.nodos.get('remate')).not.toHaveProperty('decimalesDelPct')
    for (const malo of [5, -1, 1.5, '2', null]) {
      expect(tarjetaDesde(conDecimalesEnFlete({ decimales: malo })), String(malo)).toBeNull()
      expect(
        tarjetaDesde(conDecimalesEnFlete({ decimales_del_pct: malo })),
        String(malo),
      ).toBeNull()
    }
  })

  it('la lectura plana los pasa igual', () => {
    const t = lecturaDesdeLaPlana({
      definicion: { forma: 2, columnas: [], filas: [], celdas: [] },
      nodos: [
        {
          id: 'a',
          etiqueta: 'A',
          descripcion: null,
          grupo: null,
          pct: 'p',
          decimales: 1,
          decimalesDelPct: 0,
        },
        { id: 'b', etiqueta: 'B', descripcion: null, grupo: null, pct: null },
      ],
      grupos: [],
      tiposDeCambio: { buckets: [], modos: [] },
      modos: [],
      variante: null,
      colores: [],
      total: { nodo: null },
    })
    expect(t.nodos.get('a')).toMatchObject({ decimales: 1, decimalesDelPct: 0 })
    expect(t.nodos.get('b')).toEqual({ etiqueta: 'B', descripcion: null, grupo: null, pct: null })
  })
})
