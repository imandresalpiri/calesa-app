import { describe, expect, it } from 'vitest'
import {
  destinoSinLaEdicion,
  destinoSinLosPanelesQueYaNoExisten,
  sinLosPanelesQueYaNoExisten,
} from './paneles-que-ya-no-existen'

const PARTE = (parte: string) => `/configuracion/origenes/o-1/formulas/f-1/${parte}`

describe('destinoSinLosPanelesQueYaNoExisten', () => {
  it('el Modo avanzado va a la misma planilla, sin el panel y con el resto de la consulta', () => {
    expect(
      destinoSinLosPanelesQueYaNoExisten(
        PARTE('planilla'),
        new URLSearchParams('panel=editar-formula'),
      ),
    ).toBe(PARTE('planilla'))
    expect(
      destinoSinLosPanelesQueYaNoExisten(
        PARTE('planilla'),
        new URLSearchParams('version=v-2&panel=editar-formula&x=1&x=2'),
      ),
    ).toBe(`${PARTE('planilla')}?version=v-2&x=1&x=2`)
  })

  it('«Empezar desde una plantilla» se quita en las tres partes de la fórmula, con el resto de la consulta', () => {
    for (const parte of ['planilla', 'hoja', 'tarjeta']) {
      expect(
        destinoSinLosPanelesQueYaNoExisten(
          PARTE(parte),
          new URLSearchParams('panel=plantillas-de-v1'),
        ),
      ).toBe(PARTE(parte))
    }
    expect(
      destinoSinLosPanelesQueYaNoExisten(
        PARTE('hoja'),
        new URLSearchParams('vista=412&panel=plantillas-de-v1'),
      ),
    ).toBe(`${PARTE('hoja')}?vista=412`)
  })

  it('otro panel que viene con él se queda', () => {
    expect(
      destinoSinLosPanelesQueYaNoExisten(
        PARTE('tarjeta'),
        new URLSearchParams('panel=plantillas-de-v1&panel=publicar-tarjeta'),
      ),
    ).toBe(`${PARTE('tarjeta')}?panel=publicar-tarjeta`)
  })

  it('otro panel, otra ruta o sin consulta siguen', () => {
    expect(
      destinoSinLosPanelesQueYaNoExisten(PARTE('planilla'), new URLSearchParams('panel=publicar')),
    ).toBeNull()
    expect(destinoSinLosPanelesQueYaNoExisten(PARTE('planilla'), new URLSearchParams())).toBeNull()
    expect(
      destinoSinLosPanelesQueYaNoExisten(
        '/configuracion/origenes/o-1/formulas',
        new URLSearchParams('panel=plantillas-de-v1'),
      ),
    ).toBeNull()
    expect(
      destinoSinLosPanelesQueYaNoExisten('/leads', new URLSearchParams('panel=plantillas-de-v1')),
    ).toBeNull()
  })
})

describe('sinLosPanelesQueYaNoExisten', () => {
  it('quita sólo los paneles que no existen y deja el resto de la consulta', () => {
    expect(sinLosPanelesQueYaNoExisten({ panel: 'plantillas-de-v1', x: '1' })).toEqual({
      panel: undefined,
      x: '1',
    })
    expect(sinLosPanelesQueYaNoExisten({ panel: ['plantillas-de-v1', 'publicar'] })).toEqual({
      panel: ['publicar'],
    })
    const sin = { x: '1' }
    expect(sinLosPanelesQueYaNoExisten(sin)).toBe(sin)
  })
})

describe('destinoSinLaEdicion', () => {
  const sin = (ruta: string, consulta: string) =>
    destinoSinLaEdicion(ruta, new URLSearchParams(consulta))

  it('quita `editar=si` en Configuración y deja el resto de la consulta', () => {
    expect(sin('/configuracion/origenes/o-1/tablas', 'tabla=t-1&editar=si')).toBe(
      '/configuracion/origenes/o-1/tablas?tabla=t-1',
    )
    expect(sin('/configuracion/origenes/o-1/flujo', 'editar=si')).toBe(
      '/configuracion/origenes/o-1/flujo',
    )
  })

  it('otro `editar`, otra sección o sin él siguen', () => {
    expect(sin('/configuracion/origenes/o-1/flujo', 'editar=requisito&fase=f')).toBeNull()
    expect(sin('/cotizaciones/c-1', 'editar=si')).toBeNull()
    expect(sin('/configuracion/origenes/o-1/flujo', '')).toBeNull()
  })
})
