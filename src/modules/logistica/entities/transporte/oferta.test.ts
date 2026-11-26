import { describe, expect, it } from 'vitest'
import { claveDeCatalogo } from '@/shared/lib/catalogos/propios'
import { alcanceDelCatalogo, alcanceLibre } from '../nucleo/alcance-del-catalogo'
import { elementosDesde, ofertaDesde, opcionesDeTransporte, type ElementoDeOferta } from './oferta'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const el = (n: number, nombre: string, activo = true): ElementoDeOferta => ({
  id: id(n),
  nombre,
  activo,
})

const catalogo = [el(1, 'Maersk'), el(2, 'CMA', true), el(3, 'Hapag', false)]
const libre = alcanceLibre(catalogo)

describe('opcionesDeTransporte', () => {
  it('con la oferta vacía ofrece todos los activos del catálogo, por nombre', () => {
    const r = opcionesDeTransporte({
      ofrecidos: [],
      catalogo,
      alcance: libre,
      guardado: null,
      femenino: true,
    })
    expect(r.map((o) => o.etiqueta)).toEqual(['CMA', 'Maersk'])
  })

  it('con elementos en la oferta ofrece sólo esos', () => {
    const r = opcionesDeTransporte({
      ofrecidos: [el(1, 'Maersk')],
      catalogo,
      alcance: libre,
      guardado: null,
      femenino: true,
    })
    expect(r).toEqual([{ valor: id(1), etiqueta: 'Maersk' }])
  })

  it('lo guardado que se desactivó sigue, rotulado según el género', () => {
    const naviera = opcionesDeTransporte({
      ofrecidos: [],
      catalogo,
      alcance: libre,
      guardado: id(3),
      femenino: true,
    })
    expect(naviera.at(-1)).toEqual({ valor: id(3), etiqueta: 'Hapag (inactiva)' })
    const puerto = opcionesDeTransporte({
      ofrecidos: [],
      catalogo,
      alcance: libre,
      guardado: id(3),
      femenino: false,
    })
    expect(puerto.at(-1)?.etiqueta).toBe('Hapag (inactivo)')
  })

  it('lo guardado que ya no se ofrece sigue, rotulado «fuera de la oferta»', () => {
    const r = opcionesDeTransporte({
      ofrecidos: [el(1, 'Maersk')],
      catalogo,
      alcance: libre,
      guardado: id(2),
      femenino: true,
    })
    expect(r.at(-1)).toEqual({ valor: id(2), etiqueta: 'CMA (fuera de la oferta)' })
  })

  it('un ofrecido que se desactivó no se ofrece como nuevo, pero lo guardado sigue', () => {
    const r = opcionesDeTransporte({
      ofrecidos: [el(3, 'Hapag', false)],
      catalogo,
      alcance: libre,
      guardado: id(3),
      femenino: true,
    })
    expect(r).toEqual([{ valor: id(3), etiqueta: 'Hapag (inactiva)' }])
  })

  it('lo guardado que está en la oferta no se repite', () => {
    const r = opcionesDeTransporte({
      ofrecidos: catalogo,
      catalogo,
      alcance: libre,
      guardado: id(1),
      femenino: true,
    })
    expect(r.filter((o) => o.valor === id(1))).toHaveLength(1)
  })

  it('lo guardado que el catálogo ya no nombra se muestra sin perderlo', () => {
    const r = opcionesDeTransporte({
      ofrecidos: [],
      catalogo,
      alcance: libre,
      guardado: id(9),
      femenino: true,
    })
    expect(r.at(-1)?.valor).toBe(id(9))
  })
})

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const conOrigen = (n: number, nombre: string, origenId: string | null) => ({
  ...el(n, nombre),
  origenId,
  clave: claveDeCatalogo(nombre),
})
const propiosYCompartidos = [
  conOrigen(11, 'Arica', null),
  conOrigen(12, 'Iquique', null),
  conOrigen(13, 'ARICA', A),
  conOrigen(14, 'Mejillones', B),
]

describe('opcionesDeTransporte por origen', () => {
  const deA = alcanceDelCatalogo(propiosYCompartidos, [A])

  it('sin oferta ofrece lo que usa el origen: su propio y no el compartido que tapa, ni lo de otro', () => {
    const r = opcionesDeTransporte({
      ofrecidos: [],
      catalogo: propiosYCompartidos,
      alcance: deA,
      guardado: null,
      femenino: false,
    })
    expect(r.map((o) => o.valor)).toEqual([id(13), id(12)])
  })

  it('con oferta ofrece la intersección con lo que usa el origen', () => {
    const r = opcionesDeTransporte({
      ofrecidos: [el(11, 'Arica'), el(12, 'Iquique')],
      catalogo: propiosYCompartidos,
      alcance: deA,
      guardado: null,
      femenino: false,
    })
    expect(r).toEqual([{ valor: id(12), etiqueta: 'Iquique' }])
  })

  it('lo guardado tapado o de otro origen sigue, rotulado, sin vaciar el campo', () => {
    const tapado = opcionesDeTransporte({
      ofrecidos: [],
      catalogo: propiosYCompartidos,
      alcance: deA,
      guardado: id(11),
      femenino: false,
    })
    expect(tapado.at(-1)).toEqual({ valor: id(11), etiqueta: 'Arica (tapado)' })
    const ajena = opcionesDeTransporte({
      ofrecidos: [],
      catalogo: propiosYCompartidos,
      alcance: deA,
      guardado: id(14),
      femenino: true,
    })
    expect(ajena.at(-1)).toEqual({ valor: id(14), etiqueta: 'Mejillones (de otro origen)' })
  })
})

describe('elementosDesde', () => {
  it('lee origen y clave: la de un puerto con su país, la de una naviera sin él', () => {
    const [puerto] =
      elementosDesde([
        { id: id(1), nombre: ' Arica ', activo: true, origen_id: A, pais: 'CHILE' },
      ]) ?? []
    expect(puerto).toEqual({
      id: id(1),
      nombre: ' Arica ',
      activo: true,
      origenId: A,
      clave: 'arica\nchile',
    })
    const [naviera] =
      elementosDesde([{ id: id(2), nombre: 'MSC', activo: true, origen_id: null }]) ?? []
    expect(naviera?.clave).toBe('msc')
    expect(elementosDesde([{ id: 'x' }])).toBeNull()
  })
})

describe('ofertaDesde', () => {
  it('lee la forma de flujo_oferta y rechaza otra', () => {
    const ok = ofertaDesde({
      transporte: true,
      puertos_origen: [],
      puertos_destino: [],
      navieras: [el(1, 'A')],
    })
    expect(ok?.navieras).toHaveLength(1)
    expect(ofertaDesde({ transporte: 'sí' })).toBeNull()
  })
})
