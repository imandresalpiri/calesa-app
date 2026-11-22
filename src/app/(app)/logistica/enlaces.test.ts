import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  conBotonDeConfigurar,
  enlacesDeLogistica,
  esEnlaceActual,
  esLaConfiguracion,
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
  it('lo ve quien gestiona los catálogos de logística, en algún origen; nadie más', () => {
    expect(conBotonDeConfigurar([concede('logistica.catalogos.gestionar')])).toBe(true)
    expect(conBotonDeConfigurar([concede('logistica.catalogos.gestionar', 'o1')])).toBe(true)
    expect(conBotonDeConfigurar([])).toBe(false)
    expect(conBotonDeConfigurar([concede('flujos.configurar'), concede('logistica.ver')])).toBe(
      false,
    )
  })

  it('la configuración es su página y sus pestañas; la barra no marca ningún enlace ahí', () => {
    expect(esLaConfiguracion('/logistica/configuracion')).toBe(true)
    expect(esLaConfiguracion('/logistica/configuracion/puertos')).toBe(true)
    expect(esLaConfiguracion('/logistica/configuracion-x')).toBe(false)
    expect(esLaConfiguracion('/logistica/gastos')).toBe(false)
    const enlaces = enlacesDeLogistica([concede('logistica.ver', 'o1')])
    for (const enlace of enlaces) {
      expect(esEnlaceActual(enlace, '/logistica/configuracion/navieras'), enlace.titulo).toBe(false)
    }
  })
})
