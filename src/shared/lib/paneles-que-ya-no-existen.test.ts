import { describe, expect, it } from 'vitest'
import {
  conLaFormulaDelPanel,
  destinoConLaFormulaDelPanel,
  destinoSinLaEdicion,
  destinoSinLosPanelesQueYaNoExisten,
  sinLosPanelesQueYaNoExisten,
} from './paneles-que-ya-no-existen'

const PARTE = (parte: string) => `/configuracion/origenes/o-1/${parte}`

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
    expect(sin('/configuracion/origenes/o-1/planilla', 'panel=tablas&editar=si')).toBe(
      '/configuracion/origenes/o-1/planilla?panel=tablas',
    )
    expect(sin('/configuracion/origenes/o-1/fases', 'editar=si')).toBe(
      '/configuracion/origenes/o-1/fases',
    )
  })

  it('otro `editar`, otra sección o sin él siguen', () => {
    expect(sin('/configuracion/origenes/o-1/fases', 'editar=requisito&fase=f')).toBeNull()
    expect(sin('/cotizaciones/c-1', 'editar=si')).toBeNull()
    expect(sin('/configuracion/origenes/o-1/fases', '')).toBeNull()
  })
})

describe('conLaFormulaDelPanel y destinoConLaFormulaDelPanel', () => {
  it('pasa `formula` a `cual` en un panel de una fórmula; lo demás queda', () => {
    expect(conLaFormulaDelPanel({ panel: 'activar-formula', formula: 'f-1', vista: 'x' })).toEqual({
      panel: 'activar-formula',
      cual: 'f-1',
      vista: 'x',
    })
    const otro = { panel: 'nueva-formula', copia: 'f-1' }
    expect(conLaFormulaDelPanel(otro)).toBe(otro)
    const yaNueva = { panel: 'activar-formula', formula: 'f-1', cual: 'f-2' }
    expect(conLaFormulaDelPanel(yaNueva)).toBe(yaNueva)
  })

  it('en «Publicar» de la puesta en marcha, 308 con `cual`; en otra ruta o sin el panel, nada', () => {
    const publicar = '/configuracion/origenes/o-1/puesta-en-marcha/publicar'
    expect(
      destinoConLaFormulaDelPanel(
        publicar,
        new URLSearchParams('panel=activar-formula&formula=f-1'),
      ),
    ).toBe(`${publicar}?panel=activar-formula&cual=f-1`)
    expect(
      destinoConLaFormulaDelPanel(publicar, new URLSearchParams('panel=activar-formula&cual=f-1')),
    ).toBeNull()
    expect(
      destinoConLaFormulaDelPanel(
        '/configuracion/origenes/o-1/planilla',
        new URLSearchParams('panel=activar-formula&formula=f-1'),
      ),
    ).toBeNull()
  })
})
