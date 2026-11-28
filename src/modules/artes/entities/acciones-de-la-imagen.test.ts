import { describe, expect, it } from 'vitest'
import { lineasDeLaImagen } from './acciones-de-la-imagen'
import { MOTIVO_DE_OTRA_PERSONA, MOTIVO_SIN_GESTIONAR } from './permisos-de-artes'

const YO = '11111111-1111-4111-8111-111111111111'
const OTRA = '22222222-2222-4222-8222-222222222222'

const acciones = (lineas: ReturnType<typeof lineasDeLaImagen>) =>
  lineas.flatMap((l) => (l.tipo === 'accion' ? [[l.clave, l.deshabilitada] as const] : []))
const notas = (lineas: ReturnType<typeof lineasDeLaImagen>) =>
  lineas.flatMap((l) => (l.tipo === 'nota' ? [l.texto] : []))

describe('lineasDeLaImagen', () => {
  it('la personal propia se renombra y se quita, sin notas', () => {
    const lineas = lineasDeLaImagen(
      { yo: YO, gestiona: false },
      { ambito: 'personal', duenoId: YO },
    )
    expect(acciones(lineas)).toEqual([
      ['renombrar', false],
      ['quitar', false],
    ])
    expect(notas(lineas)).toEqual([])
  })

  it('la de la empresa sin gestionar se ve apagada, con el motivo del permiso', () => {
    const lineas = lineasDeLaImagen(
      { yo: YO, gestiona: false },
      { ambito: 'empresa', duenoId: null },
    )
    expect(acciones(lineas)).toEqual([
      ['renombrar', true],
      ['quitar', true],
    ])
    expect(notas(lineas)).toEqual([MOTIVO_SIN_GESTIONAR])
  })

  it('la de la empresa la cambia quien gestiona', () => {
    const lineas = lineasDeLaImagen(
      { yo: YO, gestiona: true },
      { ambito: 'empresa', duenoId: null },
    )
    expect(acciones(lineas).every(([, apagada]) => !apagada)).toBe(true)
  })

  it('la personal de otra persona no se cambia, aunque se gestione', () => {
    const lineas = lineasDeLaImagen(
      { yo: YO, gestiona: true },
      { ambito: 'personal', duenoId: OTRA },
    )
    expect(acciones(lineas).every(([, apagada]) => apagada)).toBe(true)
    expect(notas(lineas)).toEqual([MOTIVO_DE_OTRA_PERSONA])
  })

  it('Quitar va último y destructiva', () => {
    const lineas = lineasDeLaImagen(
      { yo: YO, gestiona: false },
      { ambito: 'personal', duenoId: YO },
    )
    const quitar = lineas.find((l) => l.tipo === 'accion' && l.clave === 'quitar')
    expect(quitar).toMatchObject({ destructiva: true })
  })
})
