import { describe, expect, it } from 'vitest'
import { leerFiltros } from '@/shared/lib/filtros'
import {
  embarquesFiltrados,
  esquemaDeFiltrosDeEmbarques,
  pedidoDeEmbarques,
} from './filtros-de-embarques'
import type { VistaDeGrupos } from './paneles'

const NAVIERA = '11111111-1111-4111-8111-111111111111'
const ORIGEN = '22222222-2222-4222-8222-222222222222'
const DESTINO = '33333333-3333-4333-8333-333333333333'
const CURSOR = '44444444-4444-4444-8444-444444444444'
const DEL_ORIGEN = '55555555-5555-4555-8555-555555555555'

const catalogos = {
  navieras: [{ id: NAVIERA, nombre: 'Maersk', activo: true }],
  puertos: [
    { id: ORIGEN, nombre: 'Miami', activo: true },
    { id: DESTINO, nombre: 'Iquique', activo: true },
  ],
}

const pedido = (
  url: Record<string, string>,
  { vista = 'embarques', desde = null }: { vista?: VistaDeGrupos; desde?: string | null } = {},
) =>
  pedidoDeEmbarques(leerFiltros(esquemaDeFiltrosDeEmbarques(vista, catalogos), url), {
    origenId: DEL_ORIGEN,
    vista,
    desde,
  })

describe('lo que la URL pide a la base', () => {
  it('sin nada en la URL no filtra', () => {
    expect(pedido({})).toEqual({
      origenId: DEL_ORIGEN,
      vista: 'embarques',
      filtros: {},
      desde: null,
    })
    expect(embarquesFiltrados(pedido({}).filtros)).toBe(false)
  })

  it('manda sólo las claves de la RPC', () => {
    const filtros = pedido({
      estado: 'en_transito',
      naviera: NAVIERA,
      puerto_origen: ORIGEN,
      puerto_destino: DESTINO,
      q: 'ecm',
    }).filtros
    expect(filtros).toEqual({
      estado: 'en_transito',
      naviera: NAVIERA,
      puerto_origen: ORIGEN,
      puerto_destino: DESTINO,
      prefijo: 'ecm',
    })
    expect(embarquesFiltrados(filtros)).toBe(true)
  })

  it('«Sin embarque» es un estado sólo de los contenedores', () => {
    expect(pedido({ estado: 'sin_embarque' }).filtros).toEqual({})
    expect(pedido({ estado: 'sin_embarque' }, { vista: 'contenedores' }).filtros).toEqual({
      estado: 'sin_embarque',
    })
    expect(pedido({ estado: 'quizá' }).filtros).toEqual({})
    expect(pedido({ estado: 'todos' }).filtros).toEqual({})
  })

  it('en contenedores no van naviera ni puertos', () => {
    expect(
      pedido({ naviera: NAVIERA, puerto_origen: ORIGEN, q: 'MSCU' }, { vista: 'contenedores' })
        .filtros,
    ).toEqual({ prefijo: 'MSCU' })
  })

  it('una búsqueda sin tres letras o números seguidos no filtra', () => {
    expect(pedido({ q: 'ab' }).filtros).toEqual({})
    expect(pedido({ q: 'ab-c' }).filtros).toEqual({})
    expect(pedido({ q: '  ' }).filtros).toEqual({})
  })

  it('un id que no es un uuid se descarta', () => {
    expect(pedido({ naviera: 'no-es-un-uuid' }).filtros).toEqual({})
  })

  it('el cursor es un uuid pelado; otra cosa es la primera página', () => {
    expect(pedido({}, { desde: CURSOR }).desde).toBe(CURSOR)
    expect(pedido({}, { desde: 'MjAyNnx4' }).desde).toBeNull()
  })
})

describe('el esquema', () => {
  it('la búsqueda y el estado según la vista', () => {
    const embarques = esquemaDeFiltrosDeEmbarques('embarques', catalogos)
    const contenedores = esquemaDeFiltrosDeEmbarques('contenedores', catalogos)
    expect(embarques.busqueda?.etiqueta).toBe('Buscar por booking')
    expect(contenedores.busqueda?.etiqueta).toBe('Buscar por número')
    const estados = (e: typeof embarques) => {
      const f = e.filtros[0]
      return f?.tipo === 'eleccion' ? f.opciones.map((o) => o.etiqueta) : []
    }
    expect(estados(embarques)).toEqual(['Todos', 'Armándose', 'En tránsito', 'Llegó', 'Entregado'])
    expect(estados(contenedores)).toContain('Sin embarque')
    expect(contenedores.filtros.map((f) => f.clave)).toEqual(['estado'])
  })

  it('sin navieras ni puertos activos, esos filtros no se dibujan', () => {
    const sin = esquemaDeFiltrosDeEmbarques('embarques', {
      navieras: [{ id: NAVIERA, nombre: 'Vieja', activo: false }],
      puertos: [],
    })
    expect(sin.filtros.map((f) => f.clave)).toEqual(['estado'])
  })
})
