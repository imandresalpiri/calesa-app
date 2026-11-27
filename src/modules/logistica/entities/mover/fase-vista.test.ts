import { describe, expect, it } from 'vitest'
import type { NodoDeLaCadena } from './cadena'
import {
  noSeLeyeronLosRequisitos,
  nodoVisto,
  queMostrarDeLaFase,
  textoDeLaFaseVista,
  textoDePrimero,
} from './fase-vista'

const nodo = (
  clave: string,
  tipo: NodoDeLaCadena['tipo'],
  extra: Partial<NodoDeLaCadena> = {},
): NodoDeLaCadena => ({
  clave,
  faseId: tipo === 'pasada' ? 'a' : clave,
  nombre: clave.toUpperCase(),
  color: null,
  tipo,
  jubilada: false,
  entro: null,
  quienEntro: null,
  notaEntro: null,
  salio: null,
  quienSalio: null,
  notaSalio: null,
  ...extra,
})

const NODOS = [
  nodo('pasada-1', 'pasada', {
    entro: '2026-11-01',
    salio: '2026-11-05',
    quienSalio: 'Ana',
    notaSalio: 'Listo',
  }),
  nodo('b', 'actual'),
  nodo('c', 'falta'),
  nodo('d', 'falta'),
]

describe('queMostrarDeLaFase', () => {
  it('sin clave, una clave que no es de la cadena o la actual: lo de hoy', () => {
    expect(queMostrarDeLaFase(null, NODOS, ['c'])).toEqual({ tipo: 'actual' })
    expect(queMostrarDeLaFase('otra', NODOS, ['c'])).toEqual({ tipo: 'actual' })
    expect(queMostrarDeLaFase('b', NODOS, ['c'])).toEqual({ tipo: 'actual' })
    expect(nodoVisto('b', NODOS)).toBeNull()
  })

  it('una que falta y es destino directo: con «Mover»', () => {
    expect(queMostrarDeLaFase('c', NODOS, ['c'])).toMatchObject({
      tipo: 'directa',
      nodo: { clave: 'c' },
    })
    // Un atajo: una más adelante que también es una salida de la actual.
    expect(queMostrarDeLaFase('d', NODOS, ['c', 'd'])).toMatchObject({ tipo: 'directa' })
  })

  it('una que falta y no es directa: primero tiene que pasar por la siguiente del camino', () => {
    expect(queMostrarDeLaFase('d', NODOS, ['c'])).toMatchObject({ tipo: 'indirecta', primero: 'C' })
    expect(textoDePrimero('C')).toBe('Primero tiene que pasar por «C».')
  })

  it('la siguiente del camino sin transición hoy no se nombra a sí misma', () => {
    expect(queMostrarDeLaFase('c', NODOS, [])).toMatchObject({ tipo: 'indirecta', primero: null })
  })

  it('una pasada: entró, salió, quién y su nota, sin lectura', () => {
    const vista = queMostrarDeLaFase('pasada-1', NODOS, ['c'])
    expect(vista).toMatchObject({
      tipo: 'pasada',
      nodo: { entro: '2026-11-01', salio: '2026-11-05', quienSalio: 'Ana', notaSalio: 'Listo' },
    })
  })

  it('los textos de la fase vista nombran la fase', () => {
    expect(textoDeLaFaseVista('Aduana')).toBe('Viendo «Aduana»')
    expect(noSeLeyeronLosRequisitos('Aduana')).toBe('No pudimos leer los requisitos de «Aduana».')
  })
})
