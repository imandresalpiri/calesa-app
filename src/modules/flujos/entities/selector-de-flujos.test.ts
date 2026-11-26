import { describe, expect, it } from 'vitest'
import type { FlujoConfigurable } from './flujo'
import {
  armarSelector,
  candidatosParaCopiar,
  entradaFija,
  flujosParaCopiar,
  textoSinFlujo,
  type OrigenDelSelector,
} from './selector-de-flujos'

const guid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const SUBASTA: OrigenDelSelector = {
  id: guid(1),
  nombre: 'Subasta',
  color: '#111111',
  activo: true,
}
const OFICINA: OrigenDelSelector = {
  id: guid(2),
  nombre: 'Oficina',
  color: '#222222',
  activo: false,
}
const AJENO: OrigenDelSelector = { id: guid(3), nombre: 'Ajeno', color: '#333333', activo: true }

const flujoDe = (
  n: number,
  origen: OrigenDelSelector | null,
  extra: Partial<FlujoConfigurable> = {},
): FlujoConfigurable => ({
  id: guid(100 + n),
  ambito: origen ? 'vehiculos' : 'repuestos',
  origenId: origen?.id ?? null,
  nombre: origen ? `Flujo ${String(n)}` : 'Repuestos',
  activo: true,
  ...extra,
})

describe('armarSelector', () => {
  it('pone los orígenes en el orden recibido y repuestos al final', () => {
    const entradas = armarSelector(
      [flujoDe(0, null), flujoDe(2, OFICINA), flujoDe(1, SUBASTA)],
      [SUBASTA, OFICINA],
    )
    expect(entradas.map((e) => e.titulo)).toEqual(['Subasta', 'Oficina (inactivo)', 'Repuestos'])
    expect(entradas.map((e) => e.clave)).toEqual([SUBASTA.id, OFICINA.id, 'repuestos'])
    expect(entradas[0]?.color).toBe('#111111')
    expect(entradas[2]?.color).toBeNull()
  })

  it('no ofrece un flujo cuyo origen no llegó en la lista', () => {
    const entradas = armarSelector([flujoDe(1, SUBASTA), flujoDe(3, AJENO)], [SUBASTA])
    expect(entradas.map((e) => e.clave)).toEqual([SUBASTA.id])
  })

  it('un origen sin flujo configurable no aparece', () => {
    expect(armarSelector([flujoDe(1, SUBASTA)], [SUBASTA, OFICINA])).toHaveLength(1)
  })

  it('el de repuestos lleva el nombre del flujo, no un texto fijo', () => {
    const [entrada] = armarSelector([flujoDe(0, null, { nombre: 'Flujo del taller' })], [])
    expect(entrada?.titulo).toBe('Flujo del taller')
  })
})

describe('entradaFija', () => {
  const entradas = armarSelector(
    [flujoDe(1, SUBASTA), flujoDe(2, OFICINA), flujoDe(0, null)],
    [SUBASTA, OFICINA],
  )

  it('abre el flujo del origen pedido', () => {
    expect(entradaFija(entradas, { origenId: OFICINA.id })?.clave).toBe(OFICINA.id)
  })

  it('abre el de repuestos con el ámbito', () => {
    expect(entradaFija(entradas, { ambito: 'repuestos' })?.clave).toBe('repuestos')
  })

  it('un origen sin flujo configurable da null: nunca cae en el de otro', () => {
    expect(entradaFija(entradas, { origenId: AJENO.id })).toBeNull()
    expect(entradaFija([], { origenId: SUBASTA.id })).toBeNull()
  })

  it('sin flujo de repuestos da null, aunque haya orígenes', () => {
    const sinRepuestos = entradas.filter((e) => e.clave !== 'repuestos')
    expect(entradaFija(sinRepuestos, { ambito: 'repuestos' })).toBeNull()
  })

  it('el texto sin flujo nombra el origen o el de repuestos', () => {
    expect(textoSinFlujo({ origenId: SUBASTA.id })).toBe('Este origen todavía no tiene flujo.')
    expect(textoSinFlujo({ ambito: 'repuestos' })).toBe('Todavía no hay flujo de repuestos.')
  })
})

describe('flujosParaCopiar', () => {
  // Las entradas ya vienen filtradas por permisos: un origen que quien mira no configura no llega (AJENO no está en la lista de orígenes).
  const entradas = armarSelector(
    [flujoDe(1, SUBASTA), flujoDe(2, OFICINA), flujoDe(3, AJENO), flujoDe(0, null)],
    [SUBASTA, OFICINA],
  )
  const conFases = new Set([guid(101), guid(102), guid(103), guid(100)])

  it('ofrece los de vehículos con fases, menos el propio, en el orden de las entradas', () => {
    expect(flujosParaCopiar(entradas, guid(102), conFases)).toEqual([
      { flujoId: guid(101), origenId: SUBASTA.id, titulo: 'Subasta', color: '#111111' },
    ])
  })

  it('deja fuera los que no tienen fases activas', () => {
    expect(
      flujosParaCopiar(entradas, guid(999), new Set([guid(102)])).map((f) => f.flujoId),
    ).toEqual([guid(102)])
  })

  it('nunca ofrece el de repuestos ni un origen que quien mira no configura', () => {
    const ids = flujosParaCopiar(entradas, guid(999), conFases).map((f) => f.flujoId)
    expect(ids).not.toContain(guid(100))
    expect(ids).not.toContain(guid(103))
  })

  it('pregunta las fases sólo de los de vehículos, menos el propio', () => {
    expect(candidatosParaCopiar(entradas, guid(101))).toEqual([guid(102)])
  })

  it('un flujo que quien mira sólo ve en lectura no se pregunta ni se ofrece', () => {
    const visibles = armarSelector(
      [
        { ...flujoDe(1, SUBASTA), soloLectura: false },
        { ...flujoDe(2, OFICINA), soloLectura: true },
      ],
      [SUBASTA, OFICINA],
    )
    expect(candidatosParaCopiar(visibles, guid(999))).toEqual([guid(101)])
    expect(flujosParaCopiar(visibles, guid(999), conFases).map((f) => f.flujoId)).toEqual([
      guid(101),
    ])
  })
})
