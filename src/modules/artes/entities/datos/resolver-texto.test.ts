import { describe, expect, it } from 'vitest'
import { catalogoDe } from './datos-de-prueba.soporte'
import {
  desconocidasDelTexto,
  motivoParaNoGuardar,
  noAplicanDelTexto,
  normalizarSaltos,
  quedoVacio,
  resolverTexto,
  textoDeLasQueNoAplican,
  textoDeVariablesDesconocidas,
} from './resolver-texto'
import type { ValoresDelArte } from './valores-del-arte'

function con(valores: Record<string, string | null>): ValoresDelArte {
  const mapa = new Map(Object.entries(valores))
  return { get: (clave) => mapa.get(clave) }
}

const subasta = catalogoDe('subasta')
const manual = catalogoDe('manual')

describe('resolver un texto con sus valores', () => {
  it('cambia cada variable por su valor', () => {
    const resuelto = resolverTexto(
      '{vehiculo} {anio}\nVIN: {vin}',
      con({ vehiculo: 'Nissan Frontier', anio: '2019', vin: 'ABC' }),
      subasta,
    )
    expect(resuelto).toEqual({
      texto: 'Nissan Frontier 2019\nVIN: ABC',
      desconocidas: [],
      noAplican: [],
      vacias: [],
      quitadas: 0,
    })
  })

  it('quita la línea entera si una de sus variables queda vacía', () => {
    const resuelto = resolverTexto(
      '{vehiculo}\nVIN: {vin}\nColor: {color} · Año: {anio}',
      con({ vehiculo: 'Nissan', vin: null, color: 'Gris', anio: '' }),
      subasta,
    )
    expect(resuelto.texto).toBe('Nissan')
    expect(resuelto.vacias).toEqual(['vin', 'anio'])
    expect(resuelto.quitadas).toBe(2)
  })

  it('deja las líneas en blanco que ya estaban', () => {
    const resuelto = resolverTexto('{vehiculo}\n\nGracias', con({ vehiculo: 'Nissan' }), subasta)
    expect(resuelto.texto).toBe('Nissan\n\nGracias')
    expect(resuelto.quitadas).toBe(0)
  })

  it('una `{…}` que el arte no conoce quita su línea y se anota', () => {
    const resuelto = resolverTexto(
      'Hola {Cliente}\n{vehiculo}\nTel: {telefono} {Cliente}',
      con({ vehiculo: 'Nissan' }),
      subasta,
    )
    expect(resuelto.texto).toBe('Nissan')
    expect(resuelto.desconocidas).toEqual(['Cliente', 'telefono'])
  })

  it('una de subasta en un origen manual quita su línea y se anota como que no aplica', () => {
    const resuelto = resolverTexto(
      '{vehiculo}\nLote: {lote}',
      con({ vehiculo: 'Nissan', lote: '5678' }),
      manual,
    )
    expect(resuelto.texto).toBe('Nissan')
    expect(resuelto.noAplican).toEqual(['lote'])
    expect(resuelto.desconocidas).toEqual([])
  })

  it('lo que trae un valor no se vuelve a leer', () => {
    const resuelto = resolverTexto(
      '{vehiculo} / {cliente}',
      con({ vehiculo: '$& {cliente}', cliente: "$' $1" }),
      subasta,
    )
    expect(resuelto.texto).toBe("$& {cliente} / $' $1")
  })

  it('lee los saltos de Windows y de Mac viejo como uno', () => {
    expect(normalizarSaltos('a\r\nb\rc\nd')).toBe('a\nb\nc\nd')
    expect(resolverTexto('{vin}\r\nfin', con({ vin: null }), subasta).texto).toBe('fin')
  })
})

describe('un texto que se queda sin nada', () => {
  it('quedó vacío si se le quitaron líneas y lo que queda está en blanco', () => {
    expect(quedoVacio(resolverTexto('VIN: {vin}\n ', con({}), subasta))).toBe(true)
    expect(quedoVacio(resolverTexto('VIN: {vin}\nFin', con({}), subasta))).toBe(false)
  })

  it('un texto en blanco sin variables no quedó vacío: así lo escribió la persona', () => {
    expect(quedoVacio(resolverTexto('  ', con({}), subasta))).toBe(false)
  })
})

describe('las variables de un texto', () => {
  it('las desconocidas, sin repetir y en su orden', () => {
    expect(
      desconocidasDelTexto('{x} {vin} {ficha.motor} {ficha.traccion} {x} {celda.Flete}', subasta),
    ).toEqual(['x', 'ficha.traccion'])
  })

  it('las de subasta en un origen que no es de subasta', () => {
    expect(noAplicanDelTexto('{lote} {vin} {subasta} {lote}', manual)).toEqual(['lote', 'subasta'])
    expect(noAplicanDelTexto('{lote}', subasta)).toEqual([])
  })
})

describe('los textos de los avisos', () => {
  it('las desconocidas, en singular y en plural', () => {
    expect(textoDeVariablesDesconocidas([])).toBeNull()
    expect(textoDeVariablesDesconocidas(['x'])).toBe('{x} no es un dato que el arte pueda llenar.')
    expect(textoDeVariablesDesconocidas(['x', 'y', 'z'])).toBe(
      '{x}, {y} y {z} no son datos que el arte pueda llenar.',
    )
  })

  it('las que no aplican, con el nombre del origen', () => {
    expect(textoDeLasQueNoAplican([], 'Manuales')).toBeNull()
    expect(textoDeLasQueNoAplican(['lote'], 'Manuales')).toBe(
      '{lote} no aplica en Manuales: no es de subasta.',
    )
    expect(textoDeLasQueNoAplican(['lote', 'subasta'], 'Manuales')).toBe(
      '{lote} y {subasta} no aplican en Manuales: no son de subasta.',
    )
  })

  it('el motivo para no guardar', () => {
    expect(motivoParaNoGuardar([])).toBeNull()
    expect(motivoParaNoGuardar(['x', 'y'])).toBe('Corrige {x} y {y} para guardar.')
  })
})
