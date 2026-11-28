import { describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'
import { formatearNumero } from '@/shared/lib/formato'

// Lo puro de cada módulo, de verdad; sus barriles (con lecturas de servidor), no.
vi.mock('@/modules/artes', async () => ({
  ...(await vi.importActual<object>('@/modules/artes/entities/datos/fotos-en-orden')),
  ...(await vi.importActual<object>('@/modules/artes/entities/datos/tipos')),
}))
vi.mock('@/modules/cotizaciones', async () =>
  vi.importActual<object>('@/modules/cotizaciones/entities/tarjeta/compartir/datos-para-compartir'),
)
vi.mock('@/modules/vehiculos', async () =>
  vi.importActual<object>('@/modules/vehiculos/entities/zona-del-patio'),
)

import {
  cotizacionParaElArte,
  fijosDelArte,
  vehiculoParaElArte,
  type ParaElVehiculo,
  type ParaLaCotizacion,
} from './datos-del-arte'

// Los esquemas con que el editor lee lo que llega (`artes` no los exporta: sólo sus tipos).
const { esquemaDelVehiculoDelArte, esquemaDeLaCotizacionDelArte } = await vi.importActual<{
  esquemaDelVehiculoDelArte: z.ZodType
  esquemaDeLaCotizacionDelArte: z.ZodType
}>('@/modules/artes/entities/datos/tipos')

const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const COTIZACION = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const formato = { locale: 'es-BO', zona: 'America/La_Paz' }
const foto = (i: number, esPortada = false) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  ancho: 1600,
  alto: 1200,
  orden: i,
  esPortada,
})
const campo = (
  clave: string,
  tipo: ParaElVehiculo['campos'][number]['tipo'],
  extra: Partial<ParaElVehiculo['campos'][number]> = {},
) => ({ clave, tipo, opciones: [], activo: true, ...extra })

const para = (extra: Partial<ParaElVehiculo> = {}): ParaElVehiculo => ({
  vehiculo: {
    id: VEHICULO,
    titulo: 'Toyota Hilux 2020',
    marca: 'Toyota',
    modelo: ' Hilux ',
    anio: 2020,
    kilometraje: 45000,
    vin: '',
    lote: '4455',
    urlOrigen: 'https://subastas.test/lote/4455',
    atributos: {
      color: 'rojo',
      ubicacion: '  Houston  ',
      ubicacion_estado: 'TX - HOUSTON',
      precio_base: 12500.5,
      ficha_tecnica: 'https://ficha.test/4455',
      motor: '2.8 diésel',
      oculto: 'no sale',
      vacio: '',
    },
  },
  origen: 'Copart',
  subasta: { subastaEn: '2026-11-30T14:00:00+00:00', subastaFinEn: null },
  campos: [
    campo('color', 'opcion', { opciones: [{ clave: 'rojo', etiqueta: 'Rojo' }] }),
    campo('precio_base', 'moneda'),
    campo('ficha_tecnica', 'url'),
    campo('motor', 'texto'),
    campo('oculto', 'texto', { activo: false }),
    campo('vacio', 'texto'),
  ],
  fotos: [foto(1), foto(2, true), foto(3)],
  formato,
  ...extra,
})

describe('vehiculoParaElArte', () => {
  it('arma el vehículo con la ficha de los campos activos con valor, ya escritos', () => {
    const datos = vehiculoParaElArte(para())
    expect(esquemaDelVehiculoDelArte.parse(datos)).toEqual(datos)
    expect(datos).toMatchObject({
      marca: 'Toyota',
      modelo: 'Hilux',
      vin: null,
      lote: '4455',
      color: 'Rojo',
      ubicacion: 'Houston',
      enlace: 'https://subastas.test/lote/4455',
      origen: 'Copart',
      zonaDelPatio: 'America/Chicago',
    })
    // El monto, como número sin moneda; el enlace, su dirección; lo desactivado y lo vacío no salen.
    expect(datos.ficha).toEqual({
      color: 'Rojo',
      precio_base: formatearNumero(12500.5, { locale: 'es-BO' }),
      ficha_tecnica: 'https://ficha.test/4455',
      motor: '2.8 diésel',
    })
  })

  it('el cierre es el fin de la subasta o, sin él, su inicio, como ISO; sin subasta, ninguno', () => {
    expect(vehiculoParaElArte(para()).cierre).toBe('2026-11-30T14:00:00.000Z')
    const conFin = para({
      subasta: {
        subastaEn: '2026-11-30T14:00:00+00:00',
        subastaFinEn: '2026-12-01T10:30:00.123456+00:00',
      },
    })
    expect(vehiculoParaElArte(conFin).cierre).toBe('2026-12-01T10:30:00.123Z')
    expect(vehiculoParaElArte(para({ subasta: null })).cierre).toBeNull()
  })

  it('un enlace que no es http(s) no sale; sin campo del layout, el color es el texto tal cual', () => {
    const base = para()
    const datos = vehiculoParaElArte({
      ...base,
      vehiculo: { ...base.vehiculo, urlOrigen: 'javascript:alert(1)' },
      campos: [],
    })
    expect(datos.enlace).toBeNull()
    expect(datos.color).toBe('rojo')
    expect(datos.ficha).toEqual({})
  })

  it('las fotos van con la portada primero y en su orden, hasta 20, sólo con su id y sus medidas', () => {
    const fotos = [...Array.from({ length: 23 }, (_, i) => foto(i + 1)), foto(30, true)]
    const datos = vehiculoParaElArte(para({ fotos }))
    expect(datos.fotos).toHaveLength(20)
    expect(datos.fotos[0]).toEqual({ id: foto(30).id, ancho: 1600, alto: 1200 })
    expect(datos.fotos[1]?.id).toBe(foto(1).id)
    expect(esquemaDelVehiculoDelArte.safeParse(datos).success).toBe(true)
  })
})

const linea = (concepto: string | null, monto: string, sinMoneda: string) => ({
  concepto,
  monto,
  segunda: null,
  montoSinMoneda: sinMoneda,
  segundaSinMoneda: null,
})

const cotizacion = (extra: Partial<ParaLaCotizacion> = {}): ParaLaCotizacion => ({
  cotizacion: { id: COTIZACION, numero: 128 },
  venceEl: '2026-12-15',
  cifras: {
    conceptos: [
      linea(' Precio ', 'US$ 10.000', '10.000'),
      linea('Precio', 'US$ 1', '1'),
      linea(null, 'US$ 2', '2'),
      linea('  ', 'US$ 3', '3'),
      linea('Flete', 'US$ 1.500', '1.500'),
    ],
    total: linea('Total', 'US$ 11.500', '11.500'),
    modo: 'Oficial',
  },
  ...extra,
})

describe('cotizacionParaElArte', () => {
  it('cada celda por su concepto (la primera gana), con su moneda y sin ella, y la imagen del mismo origen', () => {
    const datos = cotizacionParaElArte(cotizacion())
    expect(esquemaDeLaCotizacionDelArte.parse(datos)).toEqual(datos)
    expect(datos).toEqual({
      id: COTIZACION,
      numero: 128,
      total: { conMoneda: 'US$ 11.500', sinMoneda: '11.500' },
      modo: 'Oficial',
      venceEl: '2026-12-15',
      celdas: {
        Precio: { conMoneda: 'US$ 10.000', sinMoneda: '10.000' },
        Flete: { conMoneda: 'US$ 1.500', sinMoneda: '1.500' },
      },
      imagen: {
        src: `/cotizaciones/${COTIZACION}/imagen`,
        srcSinMoneda: `/cotizaciones/${COTIZACION}/imagen?sin-moneda=1`,
      },
    })
  })

  it('sin total ni modo, nulos; una vigencia que no es un día, ninguna', () => {
    const base = cotizacion()
    const datos = cotizacionParaElArte({
      ...base,
      venceEl: 'mañana',
      cifras: { ...base.cifras, total: null, modo: ' ' },
    })
    expect(datos).toMatchObject({ total: null, modo: null, venceEl: null })
    expect(esquemaDeLaCotizacionDelArte.safeParse(datos).success).toBe(true)
  })
})

describe('fijosDelArte', () => {
  const empresa = { nombre: 'Calesa', locale: 'es-BO', zona: 'America/La_Paz' }

  it('del asesor, sólo su nombre, su cargo y su WhatsApp; de la web, las redes que un arte nombra', () => {
    const fijos = fijosDelArte({
      asesor: { nombre: 'Ana Pérez', cargo: ' ', telefono: '+59170000001' },
      empresa,
      sitio: {
        direccionPublica: ' https://calesa.test ',
        redes: {
          facebook: 'https://fb.test/calesa',
          instagram: '  ',
          tiktok: '@calesa',
          otra: 'x',
        },
      },
    })
    expect(fijos).toEqual({
      asesor: { nombre: 'Ana Pérez', cargo: null, whatsapp: '+59170000001' },
      empresa: {
        nombre: 'Calesa',
        web: 'https://calesa.test',
        redes: { facebook: 'https://fb.test/calesa', tiktok: '@calesa' },
        zona: 'America/La_Paz',
        locale: 'es-BO',
      },
    })
  })

  it('sin asesor ni sitio: sin nombrar a nadie, sin web ni redes', () => {
    expect(fijosDelArte({ asesor: null, empresa, sitio: null })).toEqual({
      asesor: null,
      empresa: { ...empresa, web: null, redes: {} },
    })
  })
})
