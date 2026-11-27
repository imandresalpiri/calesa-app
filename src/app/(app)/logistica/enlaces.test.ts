import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  destinoDeConfigurar,
  hrefDeOtroOrigen,
  origenesParaConfigurar,
  pestanaDisponible,
  pestanasDelOrigen,
  pestanasQuePidenElFlujo,
  tituloDeLaPestana,
} from './enlaces'

const concede = (clave: string, origenId: string | null = null): Permisos[number] => ({
  clave: clave as Permisos[number]['clave'],
  origenId,
  alcance: 'todos',
})

const TODAS_LAS_REGLAS = ['logistica', 'transporte', 'contenedor', 'aduana', 'gastos', 'pagos']
const origen = (reglas: readonly string[] | null, id = 'o1') => ({ id, reglas })
const ver = [concede('logistica.ver', 'o1')]
const claves = (permisos: Permisos, reglas: readonly string[] | null) =>
  pestanasDelOrigen(permisos, origen(reglas)).map((p) => p.clave)

describe('las pestañas de un origen', () => {
  it('Cadena y Bandeja del día van siempre; las de un área, con su regla y su permiso en el origen', () => {
    expect(claves(ver, TODAS_LAS_REGLAS)).toEqual(['cadena', 'bandeja', 'embarques', 'aduana'])
    expect(claves([...ver, concede('logistica.gastos.ver', 'o1')], TODAS_LAS_REGLAS)).toEqual([
      'cadena',
      'bandeja',
      'embarques',
      'aduana',
      'gastos',
    ])
  })

  it('un origen sin aduana no da Aduana; sólo contenedor da Embarques; sólo pagos da Gastos', () => {
    const conGastos = [...ver, concede('logistica.pagos.ver', 'o1')]
    expect(claves(conGastos, ['logistica', 'contenedor', 'pagos'])).toEqual([
      'cadena',
      'bandeja',
      'embarques',
      'gastos',
    ])
    expect(pestanaDisponible(ver, origen(['contenedor']), 'aduana')).toBe('no_usa')
  })

  it('sin gastos.ver ni pagos.ver no hay Gastos; un permiso de otro origen no cuenta', () => {
    expect(pestanaDisponible(ver, origen(TODAS_LAS_REGLAS), 'gastos')).toBe('sin_permiso')
    expect(
      pestanaDisponible(
        [...ver, concede('logistica.gastos.ver', 'o2')],
        origen(TODAS_LAS_REGLAS),
        'gastos',
      ),
    ).toBe('sin_permiso')
    expect(
      pestanaDisponible([concede('logistica.ver', 'o2')], origen(TODAS_LAS_REGLAS), 'aduana'),
    ).toBe('sin_permiso')
  })

  it('con el flujo sin leer sólo Cadena y Bandeja, y las demás «flujo_no_leido»', () => {
    expect(claves(ver, null)).toEqual(['cadena', 'bandeja'])
    expect(pestanaDisponible(ver, origen(null), 'embarques')).toBe('flujo_no_leido')
    expect(pestanaDisponible(ver, origen(null), 'cadena')).toBe('si')
    expect(pestanasQuePidenElFlujo()).toEqual(['Embarques', 'Aduana', 'Gastos'])
  })

  it('todas llevan `?origen=` con el origen', () => {
    expect(pestanasDelOrigen(ver, origen(TODAS_LAS_REGLAS)).map((p) => p.href)).toEqual([
      '/logistica?origen=o1',
      '/logistica/bandeja?origen=o1',
      '/logistica/embarques?origen=o1',
      '/logistica/aduana?origen=o1',
    ])
  })

  it('el título de cada una', () => {
    expect(tituloDeLaPestana('bandeja')).toBe('Bandeja del día')
    expect(tituloDeLaPestana('aduana')).toBe('Aduana')
  })
})

describe('ir a otro origen', () => {
  const ambos = [concede('logistica.ver')]

  it('conserva la pestaña si el otro origen la tiene; si no, cae a su Cadena', () => {
    expect(hrefDeOtroOrigen('aduana', origen(['aduana'], 'o2'), ambos)).toBe(
      '/logistica/aduana?origen=o2',
    )
    expect(hrefDeOtroOrigen('aduana', origen(['transporte'], 'o2'), ambos)).toBe(
      '/logistica?origen=o2',
    )
    expect(hrefDeOtroOrigen('bandeja', origen([], 'o2'), ambos)).toBe(
      '/logistica/bandeja?origen=o2',
    )
  })

  it('desde la unidad (sin pestaña) o con el flujo sin leer, a su Cadena', () => {
    expect(hrefDeOtroOrigen(null, origen(TODAS_LAS_REGLAS, 'o2'), ambos)).toBe(
      '/logistica?origen=o2',
    )
    expect(hrefDeOtroOrigen('embarques', origen(null, 'o2'), ambos)).toBe('/logistica?origen=o2')
  })
})

describe('el botón «Configurar»', () => {
  const origenes = [
    { id: 'o1', activo: false },
    { id: 'o2', activo: true },
    { id: 'o3', activo: true },
  ]

  it('lleva a los orígenes que la persona configura o donde gestiona los catálogos, los activos primero', () => {
    expect(
      origenesParaConfigurar(
        [concede('flujos.configurar', 'o1'), concede('logistica.catalogos.gestionar', 'o3')],
        origenes,
      ),
    ).toEqual(['o3', 'o1'])
    expect(origenesParaConfigurar([concede('logistica.catalogos.gestionar')], origenes)).toEqual([
      'o2',
      'o3',
      'o1',
    ])
  })

  it('sin flujos.configurar ni los catálogos en ningún origen, ninguno', () => {
    expect(
      origenesParaConfigurar([concede('logistica.ver'), concede('repuestos.configurar')], origenes),
    ).toEqual([])
  })

  it('va al origen pedido si lo configura; si no, al primero; sin ninguno, nulo', () => {
    expect(destinoDeConfigurar('o3', ['o2', 'o3'])).toBe('o3')
    expect(destinoDeConfigurar('o9', ['o2', 'o3'])).toBe('o2')
    expect(destinoDeConfigurar(null, ['o2', 'o3'])).toBe('o2')
    expect(destinoDeConfigurar('o2', [])).toBeNull()
  })
})
