import { describe, expect, it } from 'vitest'
import { type Diseno } from './diseno'
import { enRejilla } from './diseno-sin-posicion'
import type { Nodo } from './nodos'
import { nodosDelDiseno } from './nodos-del-diseno'

const NODOS = [
  { id: 'remate', tipo: 'input', etiqueta: 'Remate' },
  { id: 'tasa', tipo: 'constante', etiqueta: 'Tasa', formato: 'pct' },
  {
    id: 'agencia',
    tipo: 'calculo',
    op: 'porcentaje_de',
    etiqueta: 'Agencia',
    de: ['remate'],
    pct: 'tasa',
  },
  {
    id: 'otra',
    tipo: 'calculo',
    op: 'porcentaje_de',
    etiqueta: 'Otra',
    de: ['remate'],
    pct: 'tasa2',
  },
] as Nodo[]

const DISENO: Diseno = enRejilla({
  cabecera: {
    modos: [
      {
        clave: 'm',
        nombre: 'Modo',
        buckets: [{ bucket: 'b', nodo: 'tc_paralelo' }],
        total_en: 'tc_oficial',
      },
    ],
    ver_total_bs: false,
  },
  secciones: [
    {
      id: 's',
      presentacion: 'principal',
      items: [
        { tipo: 'celda', nodo: 'remate', ancho: 'completo' },
        { tipo: 'celda', nodo: 'agencia', ancho: 'completo', secundario: 'porcentaje' },
        { tipo: 'celda', nodo: 'otra', ancho: 'completo' },
        { tipo: 'atajos', nodo: 'flete', columna: 'precio', filas: 3 },
      ],
    },
  ],
  tarjeta_total: { nodo: 'total', secundarios: ['garantia'] },
})

describe('nodosDelDiseno', () => {
  it('junta los ítems (también los atajos), el pct de una celda con secundario, los modos y el resumen', () => {
    expect([...nodosDelDiseno(DISENO, { nodos: NODOS })].sort()).toEqual(
      [
        'agencia',
        'flete',
        'garantia',
        'otra',
        'remate',
        'tasa',
        'tc_oficial',
        'tc_paralelo',
        'total',
      ].sort(),
    )
  })

  it('sin secundario, el pct de un porcentaje no cuenta', () => {
    expect(nodosDelDiseno(DISENO, { nodos: NODOS }).has('tasa2')).toBe(false)
  })
})
