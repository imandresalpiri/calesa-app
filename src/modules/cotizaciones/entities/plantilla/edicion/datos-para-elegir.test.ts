import { describe, expect, it } from 'vitest'
import type { ContextoDePlantilla } from '../validar-plantilla'
import {
  acotarDatos,
  mostrarQueAdmite,
  nodosParaElegir,
  nombreDeLaPastilla,
  nombreDeLaVariable,
  nombreDeMostrar,
  VARIABLES_PARA_ELEGIR,
} from './datos-para-elegir'

const contexto: ContextoDePlantilla = {
  definicion: {
    nodos: [
      { id: 'remate', etiqueta: 'Remate', grupo: 'compra' },
      { id: 'grua', etiqueta: 'Grúa', grupo: 'logistica' },
      { id: 'comision_pct', etiqueta: 'Comisión (%)' },
      {
        id: 'comision',
        etiqueta: 'Comisión',
        tipo: 'calculo',
        op: 'porcentaje_de',
        pct: 'comision_pct',
      },
      { id: 'cif', etiqueta: 'CIF', salida: 'base_imponible' },
      { id: 'total', etiqueta: 'TOTAL', salida: 'total' },
      { id: 'huerfano', etiqueta: 'Huérfano', grupo: 'ya_no_esta' },
    ],
    grupos: [
      { id: 'compra', etiqueta: 'Compra' },
      { id: 'logistica', etiqueta: 'Logística' },
    ],
  },
  diseno: null,
  visibilidad: {
    remate: { ver: 'todos' },
    grua: { ver: 'todos' },
    comision: { ver: 'todos' },
    comision_pct: { ver: 'todos' },
    total: { ver: 'todos' },
    cif: { ver: 'costos' },
    huerfano: { ver: 'todos' },
  },
  tonos: [],
}

describe('mostrarQueAdmite', () => {
  it('siempre monto, etiqueta y descripción; tipo de cambio y plazo sólo de un nodo de un grupo de la fórmula', () => {
    expect(mostrarQueAdmite('remate', contexto)).toEqual([
      'monto',
      'etiqueta',
      'descripcion',
      'tc_nombre',
      'tc_valor',
      'plazo',
    ])
    expect(mostrarQueAdmite('total', contexto)).toEqual(['monto', 'etiqueta', 'descripcion'])
    expect(mostrarQueAdmite('huerfano', contexto)).toEqual(['monto', 'etiqueta', 'descripcion'])
  })
  it('el porcentaje sólo de un par porcentaje-monto (el nodo o su `pct`)', () => {
    expect(mostrarQueAdmite('comision', contexto)).toContain('porcentaje')
    expect(mostrarQueAdmite('comision_pct', contexto)).toContain('porcentaje')
    expect(mostrarQueAdmite('remate', contexto)).not.toContain('porcentaje')
  })
})

describe('nodosParaElegir', () => {
  it('los del nivel «todos» por grupo de la fórmula y, al final, «Otros»; un restringido sólo si se nombra, marcado', () => {
    const grupos = nodosParaElegir(contexto, new Set())
    // `huerfano` nombra un grupo que la fórmula ya no tiene: va a «Otros», con los que no son de un grupo.
    expect(grupos.map((g) => [g.etiqueta, g.nodos.map((n) => n.id)])).toEqual([
      ['Compra', ['remate']],
      ['Logística', ['grua']],
      ['Otros', ['comision_pct', 'comision', 'total', 'huerfano']],
    ])
    const conCif = nodosParaElegir(contexto, new Set(['cif'])).flatMap((g) => g.nodos)
    expect(conCif.find((n) => n.id === 'cif')).toEqual({
      id: 'cif',
      etiqueta: 'CIF',
      restringido: true,
    })
    expect(conCif.find((n) => n.id === 'remate')?.restringido).toBe(false)
  })
})

describe('acotarDatos', () => {
  const grupos = [
    {
      id: 'g',
      etiqueta: 'G',
      nodos: Array.from({ length: 60 }, (_, i) => ({
        id: `n${String(i)}`,
        etiqueta: `Nodo ${String(i)}`,
        restringido: false,
      })),
    },
    { id: 'h', etiqueta: 'H', nodos: [{ id: 'grua', etiqueta: 'Grúa', restringido: false }] },
  ]
  it('a lo sumo el tope, y dice si quedaron fuera', () => {
    const r = acotarDatos(grupos, '')
    expect(r.grupos.flatMap((g) => g.nodos)).toHaveLength(50)
    expect(r.hayMas).toBe(true)
  })
  it('por la etiqueta o el id, sin acentos ni mayúsculas', () => {
    const r = acotarDatos(grupos, 'GRUA')
    expect(r).toEqual({
      grupos: [
        { id: 'h', etiqueta: 'H', nodos: [{ id: 'grua', etiqueta: 'Grúa', restringido: false }] },
      ],
      hayMas: false,
    })
    expect(acotarDatos(grupos, 'n59').grupos.flatMap((g) => g.nodos.map((n) => n.id))).toEqual([
      'n59',
    ])
  })
})

describe('los nombres', () => {
  it('cada variable cerrada y cada «qué mostrar» en español; lo desconocido, tal cual', () => {
    expect(VARIABLES_PARA_ELEGIR).toHaveLength(15)
    expect(VARIABLES_PARA_ELEGIR[0]).toEqual({
      clave: 'empresa_nombre',
      nombre: 'Nombre de la empresa',
    })
    expect(nombreDeLaVariable('fecha_larga')).toBe('Fecha')
    expect(nombreDeLaVariable('asesor_telefono')).toBe('WhatsApp del asesor')
    expect(nombreDeLaVariable('asesor_cargo')).toBe('Cargo del asesor')
    expect(nombreDeLaVariable('__proto__')).toBe('__proto__')
    expect(nombreDeMostrar('tc_valor')).toBe('Valor del tipo de cambio')
    expect(nombreDeMostrar('otro')).toBe('otro')
  })
})

describe('nodosParaElegir con etiquetas repetidas', () => {
  it('distingue dos nodos con la misma etiqueta con su id', () => {
    const contexto = {
      definicion: {
        nodos: [
          { id: 'transporte_bolivia', etiqueta: 'Transporte', grupo: 'logistica' },
          { id: 'transporte_chile', etiqueta: 'Transporte', grupo: 'logistica' },
          { id: 'grua', etiqueta: 'Grúa', grupo: 'logistica' },
        ],
        grupos: [{ id: 'logistica', etiqueta: 'Logística' }],
      },
      diseno: null,
      visibilidad: {
        transporte_bolivia: { ver: 'todos' },
        transporte_chile: { ver: 'todos' },
        grua: { ver: 'todos' },
      },
      tonos: null,
    }
    const [logistica] = nodosParaElegir(contexto, new Set())
    expect(logistica?.nodos.map((n) => n.etiqueta)).toEqual([
      'Transporte (transporte_bolivia)',
      'Transporte (transporte_chile)',
      'Grúa',
    ])
  })
})

describe('nombreDeLaPastilla', () => {
  it('una variable por su nombre; un nodo por su etiqueta, «% …» con el porcentaje, «… · qué muestra» con lo demás; uno que no está, su id', () => {
    expect(nombreDeLaPastilla({ tipo: 'dato', variable: 'cliente_nombre' }, contexto)).toBe(
      'Nombre del cliente',
    )
    expect(nombreDeLaPastilla({ tipo: 'dato', nodo: 'remate', mostrar: 'monto' }, contexto)).toBe(
      'Remate',
    )
    expect(
      nombreDeLaPastilla({ tipo: 'dato', nodo: 'comision', mostrar: 'porcentaje' }, contexto),
    ).toBe('% Comisión')
    expect(nombreDeLaPastilla({ tipo: 'dato', nodo: 'grua', mostrar: 'plazo' }, contexto)).toBe(
      'Grúa · Plazo',
    )
    expect(nombreDeLaPastilla({ tipo: 'dato', nodo: 'borrado', mostrar: 'monto' }, contexto)).toBe(
      'borrado',
    )
  })
})
