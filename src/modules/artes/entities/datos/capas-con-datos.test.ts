import { describe, expect, it } from 'vitest'
import { VERSION_DEL_DOCUMENTO, type CapaDeArte, type DocumentoDeArte } from '../documento'
import type { LogoDelEditor } from '../tipos'
import { capasConDatos, desconocidasDelDocumento, tieneDatos } from './capas-con-datos'
import {
  capaDeFoto,
  capaDeForma,
  capaDeImagen,
  capaDeLogo,
  capaDeTarjeta,
  capaDeTexto,
  catalogoDe,
  COTIZACION_ID,
  datosReales,
  FOTO_2,
  IMAGEN_ID,
  paginaCon,
  VEHICULO_ID,
} from './datos-de-prueba.soporte'
import type { DatosDelArte } from './tipos'
import { valoresDelArte } from './valores-del-arte'

const catalogo = catalogoDe('subasta')
const LOGOS: readonly LogoDelEditor[] = [
  { id: 'principal', nombre: 'Principal', ancho: 400, alto: 100 },
]

function conDatos(capas: CapaDeArte[], datos: DatosDelArte = datosReales(), sinMoneda = false) {
  return capasConDatos(paginaCon(capas), valoresDelArte(datos, { sinMoneda, catalogo }), {
    catalogo,
    logos: LOGOS,
    datos,
    sinMoneda,
  })
}

describe('qué capas llevan datos', () => {
  it('la foto, la tarjeta, el logo y el texto con alguna variable', () => {
    expect(tieneDatos(capaDeFoto('f', 0))).toBe(true)
    expect(tieneDatos(capaDeTarjeta('t'))).toBe(true)
    expect(tieneDatos(capaDeLogo('l', null))).toBe(true)
    expect(tieneDatos(capaDeTexto('x', 'VIN: {vin}'))).toBe(true)
    expect(tieneDatos(capaDeTexto('x', 'Sin variables'))).toBe(false)
    expect(tieneDatos(capaDeImagen('i'))).toBe(false)
    expect(tieneDatos(capaDeForma('r'))).toBe(false)
  })
})

describe('lo que resuelve una página con un vehículo elegido', () => {
  it('resuelve el texto, la foto, la tarjeta, el logo y la imagen de la biblioteca', () => {
    const { resueltas, escondidas, faltan } = conDatos([
      capaDeTexto('t', '{vehiculo}\nVIN: {vin}'),
      capaDeFoto('f', 1),
      capaDeTarjeta('ta'),
      capaDeLogo('l', null),
      capaDeImagen('i'),
      capaDeTexto('s', 'Sin variables'),
      capaDeForma('r'),
    ])
    expect(resueltas.get('t')).toEqual({
      tipo: 'texto',
      texto: 'Nissan Frontier 2019\nVIN: 3N6AD33A0KK800000',
    })
    expect(resueltas.get('f')).toEqual({
      tipo: 'imagen',
      fuente: {
        src: `/artes/fotos/${VEHICULO_ID}/${FOTO_2}?ancho=1600`,
        medidas: { ancho: 1200, alto: 1600 },
      },
    })
    expect(resueltas.get('ta')).toEqual({
      tipo: 'imagen',
      fuente: { src: `/cotizaciones/${COTIZACION_ID}/imagen`, medidas: null },
    })
    expect(resueltas.get('l')).toEqual({
      tipo: 'imagen',
      fuente: { src: '/artes/logos/principal', medidas: { ancho: 400, alto: 100 } },
    })
    expect(resueltas.get('i')).toEqual({
      tipo: 'imagen',
      fuente: { src: `/artes/imagenes/${IMAGEN_ID}`, medidas: null },
    })
    expect(resueltas.has('s')).toBe(false)
    expect(resueltas.has('r')).toBe(false)
    expect(escondidas.size).toBe(0)
    expect(faltan).toEqual([])
  })

  it('con el Modo Live, la tarjeta sin la moneda', () => {
    const { resueltas } = conDatos([capaDeTarjeta('ta')], datosReales(), true)
    expect(resueltas.get('ta')).toEqual({
      tipo: 'imagen',
      fuente: { src: `/cotizaciones/${COTIZACION_ID}/imagen?sin-moneda=1`, medidas: null },
    })
  })
})

describe('lo que se esconde con un vehículo elegido', () => {
  it('esconde la foto N que el vehículo no tiene y la nombra', () => {
    const { resueltas, escondidas, faltan } = conDatos([capaDeFoto('f', 2)])
    expect(resueltas.has('f')).toBe(false)
    expect([...escondidas]).toEqual(['f'])
    expect(faltan).toEqual([{ clave: 'foto.2', nombre: 'la foto 3' }])
  })

  it('sin ninguna foto, faltan «las fotos» una sola vez', () => {
    const base = datosReales()
    if (!base.vehiculo) {
      throw new Error('falta el vehículo')
    }
    const datos = datosReales({ vehiculo: { ...base.vehiculo, fotos: [] } })
    const { escondidas, faltan } = conDatos([capaDeFoto('a', 0), capaDeFoto('b', 3)], datos)
    expect([...escondidas]).toEqual(['a', 'b'])
    expect(faltan).toEqual([{ clave: 'fotos', nombre: 'las fotos' }])
  })

  it('sin cotización, la tarjeta se esconde y lo de la cotización falta junto', () => {
    const { resueltas, escondidas, faltan } = conDatos(
      [
        capaDeTarjeta('ta'),
        capaDeTexto(
          't',
          '{vehiculo}\nTotal: {total}\nVálida hasta: {vigencia}\nFlete: {celda.Flete}',
        ),
      ],
      datosReales({ cotizacion: null }),
    )
    expect([...escondidas]).toEqual(['ta'])
    expect(resueltas.get('t')).toEqual({ tipo: 'texto', texto: 'Nissan Frontier 2019' })
    expect(faltan).toEqual([{ clave: 'cotizacion', nombre: 'la cotización' }])
  })

  it('con cotización, cada dato de ella que falta se nombra por separado', () => {
    const { faltan } = conDatos([capaDeTexto('t', 'Seguro: {celda.Seguro}')])
    expect(faltan).toEqual([{ clave: 'celda.Seguro', nombre: '«Seguro»' }])
  })
})

describe('lo que se esconde y lo que no cuenta', () => {
  it('esconde el logo de una variante que la empresa ya no tiene', () => {
    const { escondidas, faltan } = conDatos([capaDeLogo('l', 'oscuro')])
    expect([...escondidas]).toEqual(['l'])
    expect(faltan).toEqual([{ clave: 'logo', nombre: 'el logo' }])
  })

  it('esconde el texto que se quedó sin líneas', () => {
    const base = datosReales()
    if (!base.vehiculo) {
      throw new Error('falta el vehículo')
    }
    const datos = datosReales({ vehiculo: { ...base.vehiculo, vin: null, color: null } })
    const { resueltas, escondidas, faltan } = conDatos(
      [capaDeTexto('t', 'VIN: {vin}\nColor: {color}'), capaDeTexto('u', 'VIN: {vin}\nFin')],
      datos,
    )
    expect(resueltas.get('t')).toEqual({ tipo: 'texto', texto: '' })
    expect([...escondidas]).toEqual(['t'])
    expect(resueltas.get('u')).toEqual({ tipo: 'texto', texto: 'Fin' })
    expect(faltan).toEqual([
      { clave: 'vin', nombre: 'el VIN' },
      { clave: 'color', nombre: 'el color' },
    ])
  })

  it('lo que la persona ocultó no cuenta, salvo la imagen de la biblioteca', () => {
    const oculta = { ...capaDeFoto('f', 9), oculta: true }
    const enGrupo = { ...capaDeTexto('t', 'VIN: {vin}'), grupoId: 'g' }
    const imagen = { ...capaDeImagen('i'), oculta: true }
    const pagina = paginaCon(
      [oculta, enGrupo, imagen],
      [{ id: 'g', nombre: 'Grupo', oculto: true, bloqueado: false }],
    )
    const datos = datosReales({ vehiculo: null })
    const { resueltas, escondidas, faltan } = capasConDatos(
      pagina,
      valoresDelArte(datos, { sinMoneda: false, catalogo }),
      { catalogo, logos: LOGOS, datos, sinMoneda: false },
    )
    expect(escondidas.size).toBe(0)
    expect(faltan).toEqual([])
    expect([...resueltas.keys()]).toEqual(['i'])
  })
})

describe('con los datos de ejemplo', () => {
  it('nada se esconde por la foto ni por la tarjeta', () => {
    const datos = datosReales({ deEjemplo: true, cotizacion: null })
    const { escondidas, resueltas } = conDatos([capaDeFoto('f', 7), capaDeTarjeta('ta')], datos)
    expect(escondidas.size).toBe(0)
    expect(resueltas.get('f')).toMatchObject({ tipo: 'imagen' })
    expect(resueltas.get('ta')).toMatchObject({ tipo: 'imagen' })
  })

  it('sin cotización, lo de la cotización se nombra por separado (no se junta)', () => {
    const datos = datosReales({ deEjemplo: true, cotizacion: null })
    const { faltan } = conDatos([capaDeTexto('t', 'Total: {total}')], datos)
    expect(faltan).toEqual([{ clave: 'total', nombre: 'el total' }])
  })
})

describe('las variables desconocidas de un documento', () => {
  it('las de todas las páginas, sin repetir y en su orden', () => {
    const documento: DocumentoDeArte = {
      version: VERSION_DEL_DOCUMENTO,
      paginas: [
        paginaCon([capaDeTexto('a', '{x} {vin}'), capaDeFoto('f', 0)]),
        { ...paginaCon([capaDeTexto('b', '{y} {x} {ficha.traccion}')]), id: 'p2' },
      ],
    }
    expect(desconocidasDelDocumento(documento, catalogo)).toEqual(['x', 'y', 'ficha.traccion'])
  })
})
