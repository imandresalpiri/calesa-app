import { describe, expect, it } from 'vitest'
import { claveDeCatalogo } from '@/shared/lib/catalogos/propios'
import {
  compartidosTapadosEnElOrigen,
  filasDelCatalogo,
  paraDe,
  textosDelCatalogo,
  type CatalogoDelOrigenLeido,
} from './catalogo-del-origen'

const A = '00000000-0000-4000-8000-000000000001'
type Fila = { id: string; origenId: string | null; activo: boolean; nombre: string }

const fila = (id: string, origenId: string | null, nombre: string, activo = true): Fila => ({
  id,
  origenId,
  activo,
  nombre,
})

describe('textosDelCatalogo', () => {
  it('concuerda en masculino', () => {
    expect(
      textosDelCatalogo({ singular: 'puerto', plural: 'puertos', femenino: false }, 'Miami'),
    ).toEqual({
      nuevo: 'Nuevo puerto',
      tituloDeLosPropios: 'De Miami',
      tituloDeLosCompartidos: 'Compartidos',
      vacio: 'Todavía no hay puertos en Miami ni compartidos.',
      vacioDeLosPropios: 'Ninguno sólo de Miami.',
      vacioDeLosCompartidos: 'Ninguno compartido.',
      soloDelOrigen: 'Sólo de Miami',
      compartidoConTodos: 'Compartido con todos los orígenes',
      tapado: 'Tapado por el de Miami',
    })
  })

  it('concuerda en femenino', () => {
    const t = textosDelCatalogo(
      { singular: 'naviera', plural: 'navieras', femenino: true },
      'Miami',
    )
    expect([t.nuevo, t.vacio, t.vacioDeLosCompartidos, t.tapado, t.compartidoConTodos]).toEqual([
      'Nueva naviera',
      'Todavía no hay navieras en Miami ni compartidas.',
      'Ninguna compartida.',
      'Tapada por la de Miami',
      'Compartida con todos los orígenes',
    ])
  })
})

describe('compartidosTapadosEnElOrigen', () => {
  const catalogo: CatalogoDelOrigenLeido<Fila> = {
    propios: { filas: [fila('p1', A, 'Arica'), fila('p2', A, 'Iquique', false)], hayMas: false },
    compartidos: {
      filas: [fila('c1', null, 'ARICA'), fila('c2', null, 'Iquique'), fila('c3', null, 'Callao')],
      hayMas: false,
    },
  }

  it('un propio activo de la misma clave tapa al compartido; uno inactivo no', () => {
    expect(compartidosTapadosEnElOrigen(catalogo, A, (f) => claveDeCatalogo(f.nombre))).toEqual(
      new Set(['c1']),
    )
  })

  it('las filas de los dos grupos, propios primero', () => {
    expect(filasDelCatalogo(catalogo).map((f) => f.id)).toEqual(['p1', 'p2', 'c1', 'c2', 'c3'])
  })
})

it('`?de=` vale origen salvo «compartido»', () => {
  expect(paraDe('compartido')).toBe('compartido')
  expect(paraDe(null)).toBe('origen')
  expect(paraDe('x')).toBe('origen')
})
