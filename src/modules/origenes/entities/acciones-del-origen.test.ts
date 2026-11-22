import { describe, expect, it } from 'vitest'
import { lineasDelOrigen } from './acciones-del-origen'
import { origenesConUsoDesde, type OrigenConUso } from './origen'

const FILA = {
  id: '00000000-0000-0000-0000-00000000000a',
  clave: 'corea',
  nombre: 'Corea',
  sustantivo: 'vehículo',
  genero: 'm',
  tipo: 'manual',
  color: '#027a48',
  activo: true,
  apibara_plataformas: [],
  datos_clave: [],
  actualizado_en: '2026-10-12T20:00:00+00:00',
}

function origen(activo: boolean, uso: Partial<OrigenConUso['uso']> = {}): OrigenConUso {
  const [base] = origenesConUsoDesde([{ ...FILA, activo }], [])
  if (!base) {
    throw new Error('sin origen')
  }
  return { ...base, uso: { ...base.uso, ...uso } }
}

describe('lineasDelOrigen', () => {
  it('un activo sin uso: Desactivar y Eliminar habilitado, sin nota', () => {
    expect(lineasDelOrigen(origen(true))).toEqual([
      { tipo: 'accion', clave: 'desactivar', etiqueta: 'Desactivar' },
      { tipo: 'separador', clave: 'separador' },
      { tipo: 'accion', clave: 'eliminar', etiqueta: 'Eliminar origen', deshabilitada: false },
    ])
  })

  it('un inactivo ofrece Activar', () => {
    expect(lineasDelOrigen(origen(false))[0]).toEqual({
      tipo: 'accion',
      clave: 'activar',
      etiqueta: 'Activar',
    })
  })

  it('con uso, Eliminar va apagado y la nota dice qué lo ata', () => {
    const lineas = lineasDelOrigen(origen(true, { vehiculos: 3 }))
    expect(lineas.find((l) => l.clave === 'eliminar')).toMatchObject({ deshabilitada: true })
    expect(lineas.at(-1)).toMatchObject({ tipo: 'nota', clave: 'motivo' })
  })

  it('en el celular, Datos primero y separado de lo demás', () => {
    const lineas = lineasDelOrigen(origen(true), { conDatos: true })
    expect(lineas.slice(0, 2)).toEqual([
      { tipo: 'accion', clave: 'datos', etiqueta: 'Datos' },
      { tipo: 'separador', clave: 'separador' },
    ])
    expect(lineas[2]).toMatchObject({ clave: 'desactivar' })
  })

  it('sin gestionar orígenes, sólo Datos (en el celular) o nada', () => {
    expect(lineasDelOrigen(origen(true), { conDatos: true, gestiona: false })).toEqual([
      { tipo: 'accion', clave: 'datos', etiqueta: 'Datos' },
    ])
    expect(lineasDelOrigen(origen(true), { gestiona: false })).toEqual([])
  })
})
