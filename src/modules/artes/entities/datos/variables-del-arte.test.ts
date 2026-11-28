import { describe, expect, it } from 'vitest'
import { catalogoDe } from './datos-de-prueba.soporte'
import {
  CLAVES_COMUNES_DEL_ARTE,
  CLAVES_DE_SUBASTA,
  esClaveDelArte,
  esDeLaCotizacion,
  noAplica,
  nombreDelDato,
  valeEnElOrigen,
  variablesDelArte,
} from './variables-del-arte'

const claves = (tipo: 'subasta' | 'manual') => catalogoDe(tipo).variables.map((v) => v.clave)

describe('el catálogo de variables de un origen', () => {
  it('uno de subasta ofrece las comunes y las de subasta', () => {
    const ofrecidas = claves('subasta')
    for (const clave of [...CLAVES_COMUNES_DEL_ARTE, ...CLAVES_DE_SUBASTA]) {
      expect(ofrecidas).toContain(clave)
    }
  })

  it('uno manual no ofrece las de subasta', () => {
    const ofrecidas = claves('manual')
    for (const clave of CLAVES_DE_SUBASTA) {
      expect(ofrecidas).not.toContain(clave)
    }
    expect(ofrecidas).toContain('vin')
  })

  it('lo de la subasta va después del origen, y la cotización después del vehículo', () => {
    const ofrecidas = claves('subasta')
    expect(ofrecidas.slice(0, 13)).toEqual([
      'vehiculo',
      'marca',
      'modelo',
      'anio',
      'color',
      'kilometraje',
      'vin',
      'lote',
      'origen',
      'ubicacion',
      'subasta',
      'hora_del_patio',
      'enlace_del_lote',
    ])
    expect(ofrecidas.indexOf('numero')).toBeGreaterThan(ofrecidas.indexOf('enlace_del_lote'))
  })

  it('suma los campos activos de la ficha que no repiten una fija, al final y en el grupo del vehículo', () => {
    const { variables, campos } = catalogoDe('subasta')
    const deLaFicha = variables.filter((v) => v.clave.startsWith('ficha.'))
    expect(deLaFicha).toEqual([{ clave: 'ficha.motor', etiqueta: 'Motor', grupo: 'vehiculo' }])
    expect(variables.at(-1)?.clave).toBe('ficha.motor')
    expect([...campos.keys()]).toEqual(['motor', 'vin'])
  })

  it('cada fija trae su etiqueta y su grupo', () => {
    const { variables } = catalogoDe('subasta')
    expect(variables.find((v) => v.clave === 'numero')).toEqual({
      clave: 'numero',
      etiqueta: 'Número de cotización',
      grupo: 'cotizacion',
    })
    expect(variables.find((v) => v.clave === 'red.instagram')).toEqual({
      clave: 'red.instagram',
      etiqueta: 'Instagram',
      grupo: 'empresa',
    })
    expect(variables.find((v) => v.clave === 'whatsapp')?.grupo).toBe('quien')
  })

  it('sin campos, sólo las fijas', () => {
    const { variables } = variablesDelArte({ tipo: 'manual', campos: [] })
    expect(variables.some((v) => v.clave.startsWith('ficha.'))).toBe(false)
  })
})

describe('qué claves conoce el arte', () => {
  const catalogo = catalogoDe('manual')

  it('las comunes y las de subasta, también en un origen manual', () => {
    expect(esClaveDelArte('vin', catalogo)).toBe(true)
    expect(esClaveDelArte('red.tiktok', catalogo)).toBe(true)
    expect(esClaveDelArte('lote', catalogo)).toBe(true)
  })

  it('un campo de la ficha sólo si está activo', () => {
    expect(esClaveDelArte('ficha.motor', catalogo)).toBe(true)
    expect(esClaveDelArte('ficha.vin', catalogo)).toBe(true)
    expect(esClaveDelArte('ficha.traccion', catalogo)).toBe(false)
    expect(esClaveDelArte('ficha.', catalogo)).toBe(false)
  })

  it('una celda con cualquier concepto, pero no vacía', () => {
    expect(esClaveDelArte('celda.Flete', catalogo)).toBe(true)
    expect(esClaveDelArte('celda.Gastos de despacho', catalogo)).toBe(true)
    expect(esClaveDelArte('celda.', catalogo)).toBe(false)
    // Como la base (`char_length > 6`, sin recortar): con algo después del punto ya es una celda.
    expect(esClaveDelArte('celda. ', catalogo)).toBe(true)
  })

  it('lo demás no', () => {
    for (const clave of ['', 'Vin', 'red.myspace', 'telefono', 'ficha', 'celda']) {
      expect(esClaveDelArte(clave, catalogo)).toBe(false)
    }
  })

  it('lo de subasta no aplica en un origen manual, sí en uno de subasta', () => {
    for (const clave of CLAVES_DE_SUBASTA) {
      expect(noAplica(clave, 'manual')).toBe(true)
      expect(noAplica(clave, 'subasta')).toBe(false)
      expect(valeEnElOrigen(clave, catalogo)).toBe(false)
      expect(valeEnElOrigen(clave, catalogoDe('subasta'))).toBe(true)
    }
    expect(noAplica('vin', 'manual')).toBe(false)
    expect(valeEnElOrigen('ficha.traccion', catalogo)).toBe(false)
  })
})

describe('cómo se nombra el dato en un aviso', () => {
  const catalogo = catalogoDe('subasta')

  it('las fijas con su artículo', () => {
    expect(nombreDelDato('vin', catalogo)).toBe('el VIN')
    expect(nombreDelDato('vigencia', catalogo)).toBe('la vigencia')
    expect(nombreDelDato('hora_del_patio', catalogo)).toBe('la hora del patio')
  })

  it('la ficha y la celda por su nombre, entre comillas', () => {
    expect(nombreDelDato('ficha.motor', catalogo)).toBe('«Motor»')
    expect(nombreDelDato('celda.Flete', catalogo)).toBe('«Flete»')
  })

  it('una red, de la empresa', () => {
    expect(nombreDelDato('red.instagram', catalogo)).toBe('el Instagram de la empresa')
  })
})

describe('lo que sale de la cotización', () => {
  it('el número, el total, el modo, la vigencia y las celdas', () => {
    for (const clave of ['numero', 'total', 'modo', 'vigencia', 'celda.Flete']) {
      expect(esDeLaCotizacion(clave)).toBe(true)
    }
    for (const clave of ['vin', 'cliente', 'asesor', 'ficha.motor']) {
      expect(esDeLaCotizacion(clave)).toBe(false)
    }
  })
})
