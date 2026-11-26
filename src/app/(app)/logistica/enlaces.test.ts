import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  destinoDeConfigurar,
  enlacesDeLogistica,
  esEnlaceActual,
  origenesParaConfigurar,
} from './enlaces'

const concede = (clave: string, origenId: string | null = null): Permisos[number] => ({
  clave: clave as Permisos[number]['clave'],
  origenId,
  alcance: 'todos',
})

describe('enlaces de la sub-navegación de logística', () => {
  it('sin logistica.ver en ningún origen no hay ninguno', () => {
    expect(enlacesDeLogistica([])).toEqual([])
    expect(enlacesDeLogistica([concede('vehiculos.ver')])).toEqual([])
  })

  it('con logistica.ver (aunque sea en un origen) están Cadena, Embarques y Aduana; con sólo ése, ningún otro enlace de las áreas', () => {
    expect(enlacesDeLogistica([concede('logistica.ver', 'o1')])).toEqual([
      { titulo: 'Cadena', ruta: '/logistica' },
      { titulo: 'Embarques', ruta: '/logistica/embarques' },
      { titulo: 'Aduana', ruta: '/logistica/aduana' },
    ])
  })

  it('con logistica.gastos.ver suma «Gastos» después de Cadena; con sólo pagos.ver, no', () => {
    expect(
      enlacesDeLogistica([concede('logistica.ver', 'o1'), concede('logistica.gastos.ver', 'o1')]),
    ).toEqual([
      { titulo: 'Cadena', ruta: '/logistica' },
      { titulo: 'Embarques', ruta: '/logistica/embarques' },
      { titulo: 'Aduana', ruta: '/logistica/aduana' },
      { titulo: 'Gastos', ruta: '/logistica/gastos' },
    ])
    expect(
      enlacesDeLogistica([concede('logistica.ver', 'o1'), concede('logistica.pagos.ver', 'o1')]),
    ).toEqual([
      { titulo: 'Cadena', ruta: '/logistica' },
      { titulo: 'Embarques', ruta: '/logistica/embarques' },
      { titulo: 'Aduana', ruta: '/logistica/aduana' },
    ])
  })
})

describe('el enlace actual', () => {
  const cadena = { titulo: 'Cadena', ruta: '/logistica' }
  const aduana = { titulo: 'Aduana', ruta: '/logistica/aduana' }

  it('«Cadena» es la actual en la portada, en la lista de una fase y en la de un grupo de la bandeja', () => {
    expect(esEnlaceActual(cadena, '/logistica')).toBe(true)
    expect(esEnlaceActual(cadena, '/logistica/fase/sin_fase')).toBe(true)
    expect(esEnlaceActual(cadena, '/logistica/bandeja/demorados')).toBe(true)
  })

  it('no lo es en las otras áreas ni en la página de un vehículo', () => {
    expect(esEnlaceActual(cadena, '/logistica/aduana')).toBe(false)
    expect(esEnlaceActual(cadena, '/logistica/embarques')).toBe(false)
    expect(esEnlaceActual(cadena, '/logistica/vehiculo/abc')).toBe(false)
  })

  it('las áreas marcan su ruta y lo que cuelga de ella, y no las de las otras', () => {
    expect(esEnlaceActual(aduana, '/logistica/aduana')).toBe(true)
    expect(esEnlaceActual(aduana, '/logistica/aduana/algo')).toBe(true)
    expect(esEnlaceActual(aduana, '/logistica')).toBe(false)
    expect(esEnlaceActual(aduana, '/logistica/aduanas')).toBe(false)
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
