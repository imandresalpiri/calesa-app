import { describe, expect, it } from 'vitest'
import { lineasDeLaPlantilla, type LineaDeLaPlantilla } from './acciones-de-la-plantilla'
import { MOTIVO_SIN_GESTIONAR } from './permisos-de-artes'

const YO = 'yo'
const MIA = {
  autorId: YO,
  visibilidad: 'privada' as const,
  formato: 'vertical' as const,
  origenNombre: 'Corea',
  esPorDefecto: false,
}

function acciones(lineas: LineaDeLaPlantilla[]) {
  return lineas.flatMap((l) =>
    l.tipo === 'accion' ? [[l.clave, l.etiqueta, l.deshabilitada]] : [],
  )
}

function textosDeNotas(lineas: LineaDeLaPlantilla[]) {
  return lineas.flatMap((l) => (l.tipo === 'nota' ? [l.texto] : []))
}

describe('lineasDeLaPlantilla', () => {
  it('una privada propia, sin gestionar', () => {
    const lineas = lineasDeLaPlantilla({ yo: YO, gestiona: false }, MIA)
    expect(acciones(lineas)).toEqual([
      ['abrir', 'Abrir', false],
      ['duplicar', 'Duplicar', false],
      ['otro-formato', 'Duplicar en otro formato', false],
      ['usar-por-defecto', 'Usar por defecto para imagen en Corea', false],
      ['hacerla-de-la-empresa', 'Hacerla de la empresa', true],
      ['eliminar', 'Eliminar', false],
    ])
    expect(textosDeNotas(lineas)).toEqual([MOTIVO_SIN_GESTIONAR])
    expect(lineas[0]).toMatchObject({ principal: true })
    expect(lineas.find((l) => l.clave === 'eliminar')).toMatchObject({ destructiva: true })
  })

  it('«Duplicar en otro formato» va encendida para quien la ve, propia o de la empresa', () => {
    for (const gestiona of [true, false]) {
      for (const autorId of [YO, 'otra']) {
        const linea = lineasDeLaPlantilla(
          { yo: YO, gestiona },
          { ...MIA, autorId, visibilidad: 'empresa' },
        ).find((l) => l.clave === 'otro-formato')
        expect(linea).toMatchObject({ deshabilitada: false })
      }
    }
  })

  it('una de la empresa sin gestionar: abrir y duplicar sí; privada y eliminar apagadas con una sola nota', () => {
    const lineas = lineasDeLaPlantilla(
      { yo: YO, gestiona: false },
      { ...MIA, autorId: 'otra', visibilidad: 'empresa' },
    )
    expect(acciones(lineas)).toEqual([
      ['abrir', 'Abrir', false],
      ['duplicar', 'Duplicar', false],
      ['otro-formato', 'Duplicar en otro formato', false],
      ['usar-por-defecto', 'Usar por defecto para imagen en Corea', false],
      ['hacerla-privada', 'Hacerla privada', true],
      ['eliminar', 'Eliminar', true],
    ])
    expect(textosDeNotas(lineas)).toEqual([MOTIVO_SIN_GESTIONAR])
  })

  it('con gestionar, todo lo de gestión habilitado y sin nota', () => {
    const lineas = lineasDeLaPlantilla(
      { yo: YO, gestiona: true },
      { ...MIA, autorId: 'otra', visibilidad: 'empresa' },
    )
    expect(lineas.find((l) => l.clave === 'hacerla-privada')).toMatchObject({
      deshabilitada: false,
    })
    expect(lineas.find((l) => l.clave === 'eliminar')).toMatchObject({ deshabilitada: false })
    expect(textosDeNotas(lineas)).toEqual([])
  })

  it('la por defecto ofrece quitarla; un PDF dice PDF', () => {
    const porDefecto = lineasDeLaPlantilla(
      { yo: YO, gestiona: false },
      { ...MIA, esPorDefecto: true },
    )
    expect(porDefecto.find((l) => l.clave === 'quitar-por-defecto')).toMatchObject({
      etiqueta: 'Quitar como por defecto',
    })
    const pdf = lineasDeLaPlantilla({ yo: YO, gestiona: false }, { ...MIA, formato: 'a4' })
    expect(pdf.find((l) => l.clave === 'usar-por-defecto')).toMatchObject({
      etiqueta: 'Usar por defecto para PDF en Corea',
    })
  })
})
