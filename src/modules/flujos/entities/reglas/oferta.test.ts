import { describe, expect, it } from 'vitest'
import { claveDeCatalogo, claveDePuerto } from '@/shared/lib/catalogos/propios'
import {
  TOPE_DE_LA_OFERTA,
  cambioDeOferta,
  catalogoDelOrigen,
  elegibles,
  firmaDeOferta,
  ofertaDesde,
  textoSinCatalogo,
  vacioDe,
} from './oferta'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const e = (id: string, activo = true) => ({ id, nombre: `P${id}`, activo })
const puerto = (
  id: string,
  origenId: string | null,
  [nombre, pais]: [string, string],
  orden: number,
) => ({
  id,
  origenId,
  nombre,
  orden,
  activo: true,
  clave: claveDePuerto(nombre, pais),
})
const naviera = (id: string, origenId: string | null, nombre: string) => ({
  id,
  origenId,
  nombre,
  orden: 0,
  activo: true,
  clave: claveDeCatalogo(nombre),
})
const oferta = (o: string[], d: string[], n: string[]) => ({
  transporte: true,
  puertosOrigen: o.map((x) => e(x)),
  puertosDestino: d.map((x) => e(x)),
  navieras: n.map((x) => e(x)),
})

describe('oferta', () => {
  it('vacío = se ofrecen todos', () => {
    expect(vacioDe([])).toBe(true)
    expect(vacioDe([e('a')])).toBe(false)
  })

  it('un guardado inactivo sigue visible aunque no esté en el catálogo', () => {
    const lista = elegibles([e('a')], [e('a'), e('z', false)])
    expect(lista.map((x) => x.id)).toEqual(['a', 'z'])
  })

  it('la firma no depende del orden y detecta el cambio', () => {
    const guardada = oferta(['a', 'b'], [], [])
    expect(firmaDeOferta(guardada)).toBe(firmaDeOferta(oferta(['b', 'a'], [], [])))
    expect(
      cambioDeOferta(guardada, { puertosOrigen: ['b', 'a'], puertosDestino: [], navieras: [] }),
    ).toBe(false)
    expect(
      cambioDeOferta(guardada, { puertosOrigen: ['a'], puertosDestino: [], navieras: [] }),
    ).toBe(true)
  })

  it('el catálogo se corta en el tope', () => {
    const muchos = Array.from({ length: TOPE_DE_LA_OFERTA + 1 }, (_, i) =>
      naviera(String(i), null, `N${String(i)}`),
    )
    const c = catalogoDelOrigen(muchos, [], A)
    expect(c.puertos).toHaveLength(TOPE_DE_LA_OFERTA)
    expect(c.hayMasPuertos).toBe(true)
    expect(c.hayMasNavieras).toBe(false)
  })

  it('ofrece lo que usa el origen: sus propios y los compartidos que no tapa, en su orden', () => {
    const puertos = [
      puerto('arica-a', A, [' ARICA ', 'chile'], 1),
      puerto('callao-b', B, ['Callao', 'Perú'], 1),
      puerto('iquique', null, ['Iquique', 'Chile'], 2),
      puerto('arica', null, ['Arica', 'Chile'], 3),
      puerto('arica-peru', null, ['Arica', 'Perú'], 0),
    ]
    const navieras = [
      naviera('msc-a', A, 'msc'),
      naviera('msc', null, 'MSC'),
      naviera('cma', null, 'CMA'),
    ]
    const deA = catalogoDelOrigen(puertos, navieras, A)
    expect(deA.puertos.map((x) => x.id)).toEqual(['arica-peru', 'arica-a', 'iquique'])
    expect(deA.navieras.map((x) => x.id)).toEqual(['cma', 'msc-a'])
    // Otro origen no ve los propios de A ni tapa nada; sin origen (repuestos), sólo los compartidos.
    expect(catalogoDelOrigen(puertos, navieras, B).puertos.map((x) => x.id)).toEqual([
      'arica-peru',
      'callao-b',
      'iquique',
      'arica',
    ])
    expect(catalogoDelOrigen(puertos, navieras, null).navieras.map((x) => x.id)).toEqual([
      'cma',
      'msc',
    ])
  })

  it('ofertaDesde entiende la RPC y rechaza lo demás', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    const r = ofertaDesde({
      transporte: true,
      puertos_origen: [{ id, nombre: 'Iquique', activo: true }],
      puertos_destino: [],
      navieras: [],
    })
    expect(r?.puertosOrigen[0]?.nombre).toBe('Iquique')
    expect(ofertaDesde({})).toBeNull()
  })
})

describe('textoSinCatalogo', () => {
  it('dice dónde se cargan, según el flujo', () => {
    expect(textoSinCatalogo('navieras', false)).toBe(
      'Todavía no hay navieras cargadas. Se cargan en «Navieras», arriba del diagrama.',
    )
    expect(textoSinCatalogo('puertos', true)).toBe(
      'Todavía no hay puertos cargados. Se cargan en «Puertos», en las fases de un origen.',
    )
  })
})
