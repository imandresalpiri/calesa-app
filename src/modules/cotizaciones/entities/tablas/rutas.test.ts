import { describe, expect, it } from 'vitest'
import {
  PANEL_COLUMNAS_DE_TABLA,
  PANEL_NUEVA_TABLA,
  claveDeLaAccion,
  lugarDelDestino,
  origenIdDelDestino,
  rutaDeLasTablas,
} from './rutas'

const EN = '/configuracion/origenes/o1/planilla?formula=f1'

describe('rutaDeLasTablas en el drawer de un origen', () => {
  it('abre el drawer en la pestaña, con la fórmula elegida, y si se pide la tabla', () => {
    expect(rutaDeLasTablas(EN)).toBe(`${EN}&panel=tablas`)
    expect(rutaDeLasTablas(EN, 't1')).toBe(`${EN}&panel=tablas&tabla=t1`)
    expect(rutaDeLasTablas('/configuracion/origenes/o1/hoja')).toBe(
      '/configuracion/origenes/o1/hoja?panel=tablas',
    )
  })

  it('el panel de la tabla va en `accion`', () => {
    expect(rutaDeLasTablas(EN, undefined, PANEL_NUEVA_TABLA)).toBe(
      `${EN}&panel=tablas&accion=nueva-tabla`,
    )
    expect(rutaDeLasTablas(EN, 't1', PANEL_COLUMNAS_DE_TABLA)).toBe(
      `${EN}&panel=tablas&tabla=t1&accion=columnas-de-tabla`,
    )
  })
})

describe('rutaDeLasTablas en Catálogos', () => {
  it('lleva a Tablas compartidas con el panel en `panel`', () => {
    expect(rutaDeLasTablas(null)).toBe('/configuracion/catalogos/tablas')
    expect(rutaDeLasTablas(null, 't1')).toBe('/configuracion/catalogos/tablas?tabla=t1')
    expect(rutaDeLasTablas(null, undefined, PANEL_NUEVA_TABLA)).toBe(
      '/configuracion/catalogos/tablas?panel=nueva-tabla',
    )
  })
})

describe('lugarDelDestino y claveDeLaAccion', () => {
  it('el drawer usa su pestaña y `accion`; Catálogos, nulo y `panel`', () => {
    const origen = { id: 'o1', nombre: 'A', activo: true }
    expect(lugarDelDestino({ origen, en: EN })).toBe(EN)
    expect(lugarDelDestino('compartidas')).toBeNull()
    expect(origenIdDelDestino({ origen, en: EN })).toBe('o1')
    expect(origenIdDelDestino('compartidas')).toBeNull()
    expect(claveDeLaAccion(EN)).toBe('accion')
    expect(claveDeLaAccion(null)).toBe('panel')
  })
})
