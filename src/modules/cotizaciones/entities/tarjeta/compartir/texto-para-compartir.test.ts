import { describe, expect, it } from 'vitest'
import { ANTES_DEL_CIERRE, DATOS_DE_PRUEBA } from './compartir.soporte'
import type { DatosParaCompartir } from './datos-para-compartir'
import {
  FORMATOS_DE_TEXTO,
  textoParaCompartir,
  zonasDisponibles,
  type ZonaParaCompartir,
} from './texto-para-compartir'

const datos: DatosParaCompartir = DATOS_DE_PRUEBA
const conVehiculo = (mas: Partial<NonNullable<DatosParaCompartir['vehiculo']>>) => ({
  ...datos,
  vehiculo: { ...DATOS_DE_PRUEBA.vehiculo, ...mas },
})
const texto = (
  d: DatosParaCompartir,
  formato: (typeof FORMATOS_DE_TEXTO)[number] = 'simple',
  zona: ZonaParaCompartir = 'empresa',
) => textoParaCompartir(d, { formato, zona, ahora: ANTES_DEL_CIERRE })

describe('textoParaCompartir', () => {
  it('WhatsApp con la hora del patio: el orden de V1, bloques y negritas en el título y el total', () => {
    expect(texto(datos, 'whatsapp', 'patio')).toBe(
      [
        '*Hilux para Juan*',
        '',
        'Toyota Hilux 2022',
        'Lote: 4455',
        'Año: 2022',
        'Kilometraje: 45.000 km',
        'VIN: 1HGCM82633A004352',
        'URL: https://www.copart.com/lot/4455',
        'Se subasta el jueves 19 de noviembre a las 22:00 (hora del patio)',
        '',
        'Remate: $ 1.000,00',
        '$ 300,00',
        '',
        '*TOTAL: $ 1.300,00*',
        'Bs 9.048,00',
        'Modo de tipo de cambio: Oficial',
        '',
        'Asesor: Luis Rojas, Asesor comercial',
        'WhatsApp: +59170000002',
      ].join('\n'),
    )
  })

  it('la hora de la empresa dice su ciudad, en su zona', () => {
    expect(texto(datos, 'simple', 'empresa')).toContain(
      'Se subasta el viernes 20 de noviembre a las 00:00 (hora de La Paz)',
    )
  })

  it('«Simple» va sin líneas en blanco y sin marcas; Facebook y TikTok con bloques y sin marcas', () => {
    const simple = texto(datos, 'simple')
    expect(simple).not.toContain('\n\n')
    expect(simple).not.toContain('*')
    for (const formato of ['facebook', 'tiktok'] as const) {
      const t = texto(datos, formato)
      expect(t).toContain('\n\n')
      expect(t).not.toContain('*')
    }
  })

  it('en los cuatro formatos y las dos zonas: ninguna línea vacía de más ni un nulo escrito', () => {
    for (const formato of FORMATOS_DE_TEXTO) {
      for (const zona of ['empresa', 'patio'] as const) {
        const t = texto(datos, formato, zona)
        expect(t).not.toMatch(/\n\n\n|^\n|\n$|undefined|null/)
      }
    }
  })

  it('sin vehículo, sin la parte del vehículo', () => {
    expect(texto({ ...datos, vehiculo: null }, 'whatsapp')).toBe(
      [
        '*Hilux para Juan*',
        'Remate: $ 1.000,00\n$ 300,00',
        '*TOTAL: $ 1.300,00*\nBs 9.048,00\nModo de tipo de cambio: Oficial',
        'Asesor: Luis Rojas, Asesor comercial\nWhatsApp: +59170000002',
      ].join('\n\n'),
    )
  })
})

describe('textoParaCompartir: la firma del asesor (quien comparte)', () => {
  const firma = (asesor: DatosParaCompartir['asesor']) =>
    texto({ ...datos, asesor }, 'facebook')
      .split('\n\n')
      .at(-1)

  it('con todo: su nombre con su cargo y su WhatsApp tal como lo guardó, al final', () => {
    expect(firma(datos.asesor)).toBe('Asesor: Luis Rojas, Asesor comercial\nWhatsApp: +59170000002')
  })

  it('sin cargo, sólo el nombre; sin WhatsApp, sin esa línea', () => {
    expect(firma({ nombre: 'Luis Rojas', cargo: null, telefono: '+59170000002' })).toBe(
      'Asesor: Luis Rojas\nWhatsApp: +59170000002',
    )
    expect(firma({ nombre: 'Luis Rojas', cargo: 'Asesor comercial', telefono: null })).toBe(
      'Asesor: Luis Rojas, Asesor comercial',
    )
  })

  it('sin asesor, el texto termina en el total', () => {
    const t = texto({ ...datos, asesor: null }, 'facebook')
    expect(t).not.toMatch(/Asesor:|WhatsApp:/)
    expect(t.endsWith('Modo de tipo de cambio: Oficial')).toBe(true)
  })
})

describe('textoParaCompartir: lo que falta no deja línea', () => {
  it('una subasta que ya cerró o sin fecha no se dice; sin enlace no hay «URL:»', () => {
    const pasada = conVehiculo({ cierre: '2026-11-01T00:00:00.000Z' })
    expect(texto(pasada)).not.toContain('Se subasta')
    expect(texto(conVehiculo({ cierre: null }))).not.toContain('Se subasta')
    expect(texto(conVehiculo({ enlace: null }))).not.toContain('URL:')
  })

  it('lo que el vehículo no tiene no deja línea', () => {
    const pelado = conVehiculo({ lote: null, anio: null, kilometraje: null, vin: null })
    expect(texto(pelado)).not.toMatch(/Lote:|Año:|Kilometraje:|VIN:/)
  })

  it('con el título que sale del vehículo no se repite el del vehículo', () => {
    const delVehiculo = {
      ...datos,
      titulo: { texto: 'Toyota Hilux 2022', fuente: 'vehiculo' as const },
    }
    expect(texto(delVehiculo).match(/Toyota Hilux 2022/g)).toHaveLength(1)
    // El automático guardado en la columna llega como propio: tampoco se repite.
    const automatico = {
      ...datos,
      titulo: { texto: 'Toyota Hilux 2022', fuente: 'titulo' as const },
    }
    expect(texto(automatico).match(/Toyota Hilux 2022/g)).toHaveLength(1)
  })

  it('un título con `*` va sin marca en WhatsApp', () => {
    const conAsterisco = { ...datos, titulo: { texto: 'Hilux *4x4*', fuente: 'titulo' as const } }
    expect(texto(conAsterisco, 'whatsapp').split('\n')[0]).toBe('Hilux *4x4*')
  })

  it('sólo usa lo que trae el JSON: sin conceptos ni total no inventa cifras', () => {
    const sinCifras = { ...datos, conceptos: [], total: null, modo: null }
    expect(texto(sinCifras)).not.toMatch(/\$|Bs|Total/i)
  })

  it('con `sinMoneda` (la vista del Modo Live) los mismos números sin su moneda; el resto, igual', () => {
    const opciones = { formato: 'whatsapp', zona: 'empresa', ahora: ANTES_DEL_CIERRE } as const
    const conMoneda = textoParaCompartir(datos, opciones)
    const sinMoneda = textoParaCompartir(datos, { ...opciones, sinMoneda: true })
    expect(sinMoneda).toContain('Remate: 1.000,00\n300,00')
    expect(sinMoneda).toContain('*TOTAL: 1.300,00*\n9.048,00')
    expect(sinMoneda).not.toMatch(/\$|Bs /)
    expect(sinMoneda.split('\n')).toHaveLength(conMoneda.split('\n').length)
  })
})

describe('zonasDisponibles', () => {
  it('la de la empresa siempre y primero; la del patio sólo con patio y subasta', () => {
    expect(zonasDisponibles(datos).map((z) => z.etiqueta)).toEqual([
      'Hora de La Paz',
      'Hora del patio',
    ])
    expect(zonasDisponibles(conVehiculo({ zonaDelPatio: null })).map((z) => z.clave)).toEqual([
      'empresa',
    ])
    expect(zonasDisponibles({ ...datos, vehiculo: null }).map((z) => z.clave)).toEqual(['empresa'])
  })
})

describe('textoParaCompartir de las cotizaciones hermanas', () => {
  it('las cotizaciones hermanas: un bloque por opción, una debajo de la otra, y el modo una vez', () => {
    const linea = (concepto: string | null, monto: string) => ({
      concepto,
      monto,
      segunda: null,
      montoSinMoneda: monto.replace('$ ', ''),
      segundaSinMoneda: null,
    })
    const enPar: DatosParaCompartir = {
      ...datos,
      vehiculo: null,
      versiones: [
        {
          etiqueta: '20 pies',
          cotizacionId: '11111111-1111-4111-8111-111111111111',
          conceptos: [linea('Transporte', '$ 1.500,00')],
          total: linea('TOTAL', '$ 11.500,00'),
        },
        {
          etiqueta: '40 pies',
          cotizacionId: '22222222-2222-4222-8222-222222222222',
          conceptos: [linea('Transporte', '$ 2.400,00')],
          total: linea('TOTAL', '$ 12.400,00'),
        },
      ],
    }
    expect(texto(enPar, 'whatsapp')).toBe(
      [
        '*Hilux para Juan*',
        '',
        '*20 pies*',
        'Transporte: $ 1.500,00',
        '*TOTAL: $ 11.500,00*',
        '',
        '*40 pies*',
        'Transporte: $ 2.400,00',
        '*TOTAL: $ 12.400,00*',
        '',
        'Modo de tipo de cambio: Oficial',
        '',
        'Asesor: Luis Rojas, Asesor comercial',
        'WhatsApp: +59170000002',
      ].join('\n'),
    )
  })
})
