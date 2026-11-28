import { describe, expect, it } from 'vitest'
import { catalogoDe, datosReales, EMPRESA } from './datos-de-prueba.soporte'
import { MONTO_DE_CELDA_DE_EJEMPLO, textoDeLaSubasta, valoresDelArte } from './valores-del-arte'

const catalogo = catalogoDe('subasta')

function valores(datos = datosReales(), sinMoneda = false) {
  return valoresDelArte(datos, { sinMoneda, catalogo })
}

describe('la subasta escrita', () => {
  it('el día largo y la hora en la zona, con de quién es la hora', () => {
    expect(textoDeLaSubasta('2026-11-19T19:30:00.000Z', 'America/La_Paz', 'hora de La Paz')).toBe(
      'jueves 19 de noviembre a las 15:30 (hora de La Paz)',
    )
  })
})

describe('los valores del vehículo', () => {
  const v = valores()

  it('lo de la ficha general, tal cual', () => {
    expect(v.get('vehiculo')).toBe('Nissan Frontier 2019')
    expect(v.get('marca')).toBe('Nissan')
    expect(v.get('modelo')).toBe('Frontier')
    expect(v.get('anio')).toBe('2019')
    expect(v.get('color')).toBe('Gris')
    expect(v.get('vin')).toBe('3N6AD33A0KK800000')
    expect(v.get('lote')).toBe('5678')
    expect(v.get('origen')).toBe('Copart')
    expect(v.get('ubicacion')).toBe('Dallas, TX')
    expect(v.get('enlace_del_lote')).toBe('https://subastas.example.com/lote/5678')
  })

  it('el kilometraje con el número de la empresa y «km»', () => {
    expect(v.get('kilometraje')).toBe('48.200 km')
  })

  it('la subasta en la zona de la empresa y la hora del patio en la suya', () => {
    expect(v.get('subasta')).toBe('jueves 19 de noviembre a las 15:30 (hora de La Paz)')
    expect(v.get('hora_del_patio')).toBe('jueves 19 de noviembre a las 13:30 (hora del patio)')
  })

  it('sin la zona del patio no hay hora del patio, y sin cierre no hay subasta', () => {
    const base = datosReales()
    if (!base.vehiculo) {
      throw new Error('falta el vehículo')
    }
    const sinZona = valores(datosReales({ vehiculo: { ...base.vehiculo, zonaDelPatio: null } }))
    expect(sinZona.get('hora_del_patio')).toBeNull()
    expect(sinZona.get('subasta')).not.toBeNull()
    const sinCierre = valores(datosReales({ vehiculo: { ...base.vehiculo, cierre: null } }))
    expect(sinCierre.get('subasta')).toBeNull()
    expect(sinCierre.get('hora_del_patio')).toBeNull()
  })

  it('lo vacío o en blanco es nulo', () => {
    const base = datosReales()
    if (!base.vehiculo) {
      throw new Error('falta el vehículo')
    }
    const vacio = valores(
      datosReales({
        vehiculo: { ...base.vehiculo, vin: '  ', anio: null, kilometraje: null, color: null },
      }),
    )
    expect(vacio.get('vin')).toBeNull()
    expect(vacio.get('anio')).toBeNull()
    expect(vacio.get('kilometraje')).toBeNull()
    expect(vacio.get('color')).toBeNull()
  })

  it('un campo de la ficha del origen por su clave; uno sin valor, nulo', () => {
    expect(v.get('ficha.motor')).toBe('2.5 L diésel')
    expect(v.get('ficha.vin')).toBeNull()
  })

  it('sin vehículo, nada del vehículo', () => {
    const sin = valores(datosReales({ vehiculo: null }))
    expect(sin.get('vehiculo')).toBeNull()
    expect(sin.get('ficha.motor')).toBeNull()
  })
})

describe('los valores de la cotización', () => {
  it('el número, el total con su moneda, el modo y la vigencia', () => {
    const v = valores()
    expect(v.get('numero')).toBe('128')
    expect(v.get('total')).toBe('USD 21.300,00')
    expect(v.get('modo')).toBe('Paralelo')
    expect(v.get('vigencia')).toBe('5 dic 2026')
    expect(v.get('celda.Flete')).toBe('USD 1.800,00')
  })

  it('con el Modo Live, los montos sin la moneda', () => {
    const v = valores(datosReales(), true)
    expect(v.get('total')).toBe('21.300,00')
    expect(v.get('celda.Flete')).toBe('1.800,00')
  })

  it('una celda que la tarjeta no tiene, o una cotización sin total, es nula', () => {
    const base = datosReales()
    if (!base.cotizacion) {
      throw new Error('falta la cotización')
    }
    expect(valores().get('celda.Seguro')).toBeNull()
    const sinTotal = valores(datosReales({ cotizacion: { ...base.cotizacion, total: null } }))
    expect(sinTotal.get('total')).toBeNull()
  })

  it('sin cotización, todo lo suyo es nulo', () => {
    const v = valores(datosReales({ cotizacion: null }))
    for (const clave of ['numero', 'total', 'modo', 'vigencia', 'celda.Flete']) {
      expect(v.get(clave)).toBeNull()
    }
  })
})

describe('el cliente, quien comparte y la empresa', () => {
  it('el lead, el asesor con su cargo y WhatsApp, la empresa, la web y sus redes', () => {
    const v = valores()
    expect(v.get('cliente')).toBe('Lucía Paz')
    expect(v.get('asesor')).toBe('Teo Vargas')
    expect(v.get('cargo')).toBe('Asesor comercial')
    expect(v.get('whatsapp')).toBe('+591 71111111')
    expect(v.get('empresa')).toBe('Calesa Motors')
    expect(v.get('web')).toBe('calesa.bo')
    expect(v.get('red.instagram')).toBe('@calesa')
    expect(v.get('red.facebook')).toBeNull()
  })

  it('sin lead ni asesor, nulos', () => {
    const v = valores(datosReales({ lead: null, asesor: null }))
    expect(v.get('cliente')).toBeNull()
    expect(v.get('asesor')).toBeNull()
    expect(v.get('whatsapp')).toBeNull()
  })

  it('una clave que no es del arte es nula', () => {
    expect(valores().get('telefono')).toBeNull()
  })
})

describe('con los datos de ejemplo', () => {
  const ejemplo = datosReales({ deEjemplo: true })

  it('un campo de la ficha muestra su etiqueta y una celda, el monto de ejemplo', () => {
    const v = valores(ejemplo)
    expect(v.get('ficha.motor')).toBe('Motor')
    expect(v.get('ficha.vin')).toBe('VIN de la ficha')
    expect(v.get('ficha.traccion')).toBeNull()
    expect(v.get('celda.Cualquiera')).toBe(MONTO_DE_CELDA_DE_EJEMPLO.conMoneda)
    expect(valores(ejemplo, true).get('celda.Cualquiera')).toBe(MONTO_DE_CELDA_DE_EJEMPLO.sinMoneda)
  })

  it('la empresa es la de verdad', () => {
    expect(valores(ejemplo).get('empresa')).toBe(EMPRESA.nombre)
  })
})
