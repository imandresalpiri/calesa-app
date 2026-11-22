import { describe, expect, it } from 'vitest'
import { aplicarMovimiento, destinoAlSoltar, destinoDeMovimiento } from './orden'

function campo(n: number, grupo: string | null = 'Vehículo', activo = true) {
  return { id: `c${String(n)}`, grupo, activo }
}

describe('destinoDeMovimiento', () => {
  const campos = [campo(1), campo(2), campo(3), campo(4, 'Venta')]

  it('bajar lo pone después de su vecino de grupo', () => {
    expect(destinoDeMovimiento(campos, 'c1', 'bajar')).toEqual({ despuesDe: 'c2' })
  })

  it('subir lo pone antes de su vecino: después del que estaba antes de él', () => {
    expect(destinoDeMovimiento(campos, 'c3', 'subir')).toEqual({ despuesDe: 'c1' })
  })

  it('subir al segundo lo deja primero de todo', () => {
    expect(destinoDeMovimiento(campos, 'c2', 'subir')).toEqual({ despuesDe: null })
  })

  it('no se sale de su grupo', () => {
    expect(destinoDeMovimiento(campos, 'c1', 'subir')).toBeNull()
    expect(destinoDeMovimiento(campos, 'c3', 'bajar')).toBeNull()
    expect(destinoDeMovimiento(campos, 'c4', 'subir')).toBeNull()
  })

  it('cuenta los desactivados al medir «antes de»', () => {
    const conInactivo = [campo(1, 'Vehículo', false), campo(2), campo(3)]
    expect(destinoDeMovimiento(conInactivo, 'c3', 'subir')).toEqual({ despuesDe: 'c1' })
  })

  it('un campo que no existe no se mueve', () => {
    expect(destinoDeMovimiento(campos, 'no-existe', 'subir')).toBeNull()
  })
})

describe('destinoAlSoltar', () => {
  const campos = [campo(1), campo(2), campo(3), campo(4, 'Venta'), campo(5)]

  it('al bajar queda después del que se eligió', () => {
    expect(destinoAlSoltar(campos, 'c1', 'c3')).toEqual({ despuesDe: 'c3' })
  })

  it('al subir queda antes del que se eligió', () => {
    expect(destinoAlSoltar(campos, 'c3', 'c2')).toEqual({ despuesDe: 'c1' })
    expect(destinoAlSoltar(campos, 'c3', 'c1')).toEqual({ despuesDe: null })
  })

  it('soltar sobre el vecino es lo mismo que subir o bajar un lugar', () => {
    expect(destinoAlSoltar(campos, 'c1', 'c2')).toEqual(destinoDeMovimiento(campos, 'c1', 'bajar'))
    expect(destinoAlSoltar(campos, 'c3', 'c2')).toEqual(destinoDeMovimiento(campos, 'c3', 'subir'))
  })

  it('salta los de otro grupo que quedan entre medio', () => {
    expect(destinoAlSoltar(campos, 'c5', 'c3')).toEqual({ despuesDe: 'c2' })
    expect(destinoAlSoltar(campos, 'c3', 'c5')).toEqual({ despuesDe: 'c5' })
  })

  it('no cruza de grupo, no toca desactivados ni se suelta sobre sí mismo', () => {
    expect(destinoAlSoltar(campos, 'c1', 'c4')).toBeNull()
    expect(destinoAlSoltar([campo(1), campo(2, 'Vehículo', false)], 'c1', 'c2')).toBeNull()
    expect(destinoAlSoltar(campos, 'c1', 'c1')).toBeNull()
    expect(destinoAlSoltar(campos, 'c1', 'no-existe')).toBeNull()
  })
})

describe('aplicarMovimiento', () => {
  const ids = (lista: readonly { id: string }[]) => lista.map((c) => c.id)
  const campos = [campo(1), campo(2), campo(3)]

  it('lo pone después del vecino o primero de todo', () => {
    expect(ids(aplicarMovimiento(campos, 'c1', 'c3'))).toEqual(['c2', 'c3', 'c1'])
    expect(ids(aplicarMovimiento(campos, 'c3', null))).toEqual(['c3', 'c1', 'c2'])
    expect(ids(aplicarMovimiento(campos, 'c3', 'c1'))).toEqual(['c1', 'c3', 'c2'])
  })

  it('aplica lo que dice destinoAlSoltar', () => {
    const destino = destinoAlSoltar(campos, 'c3', 'c1')
    expect(destino).not.toBeNull()
    expect(ids(aplicarMovimiento(campos, 'c3', destino?.despuesDe ?? null))).toEqual([
      'c3',
      'c1',
      'c2',
    ])
  })

  it('con un campo o un vecino que no están, queda igual', () => {
    expect(ids(aplicarMovimiento(campos, 'no-existe', 'c1'))).toEqual(['c1', 'c2', 'c3'])
    expect(ids(aplicarMovimiento(campos, 'c1', 'no-existe'))).toEqual(['c1', 'c2', 'c3'])
    expect(ids(aplicarMovimiento(campos, 'c1', 'c1'))).toEqual(['c1', 'c2', 'c3'])
  })
})
