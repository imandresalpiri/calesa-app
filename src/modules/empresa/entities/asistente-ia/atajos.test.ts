import { describe, expect, it } from 'vitest'
import {
  MOTIVO_TOPE_DE_ATAJOS,
  agregarAtajo,
  cambiarAtajo,
  motivoParaNoAgregarAtajo,
  moverAtajo,
  quitarAtajo,
  resumenDeLosAtajos,
} from './atajos'
import { MAX_TOKENS_DE_UN_ATAJO_NUEVO, TOPE_DE_ATAJOS, type AtajoDelAsistente } from './config'

const atajo = (id: string): AtajoDelAsistente => ({
  id,
  nombre: `Atajo ${id}`,
  instruccion: 'Hazlo así.',
  activo: true,
  maxTokens: 300,
})
const lista = [atajo('a'), atajo('b'), atajo('c')]
const ids = (l: readonly AtajoDelAsistente[]) => l.map((a) => a.id).join('')

describe('los atajos del asistente', () => {
  it('uno nuevo entra primero, activo, vacío y con el tope de salida de un atajo nuevo', () => {
    const nueva = agregarAtajo(lista, 'n')
    expect(ids(nueva)).toBe('nabc')
    expect(nueva[0]).toEqual({
      id: 'n',
      nombre: '',
      instruccion: '',
      activo: true,
      maxTokens: MAX_TOKENS_DE_UN_ATAJO_NUEVO,
    })
  })

  it('con el tope no se suma otro y se dice por qué', () => {
    const llena = Array.from({ length: TOPE_DE_ATAJOS }, (_, i) => atajo(String(i)))
    expect(motivoParaNoAgregarAtajo(llena)).toBe(MOTIVO_TOPE_DE_ATAJOS)
    expect(MOTIVO_TOPE_DE_ATAJOS).toBe('Llegaste a 20 atajos: quita uno para sumar otro.')
    expect(agregarAtajo(llena, 'n')).toHaveLength(TOPE_DE_ATAJOS)
    expect(motivoParaNoAgregarAtajo(llena.slice(1))).toBeNull()
  })

  it('quita, mueve y cambia sin tocar los demás', () => {
    expect(ids(quitarAtajo(lista, 'b'))).toBe('ac')
    expect(ids(moverAtajo(lista, 'b', 'subir'))).toBe('bac')
    expect(ids(moverAtajo(lista, 'b', 'bajar'))).toBe('acb')
    const cambiada = cambiarAtajo(lista, 'c', { nombre: 'Corto', activo: false })
    expect(cambiada[2]).toMatchObject({ nombre: 'Corto', activo: false, instruccion: 'Hazlo así.' })
    expect(cambiada[0]).toBe(lista[0])
  })

  it('en un extremo o con un id que no está, mover deja la lista igual', () => {
    expect(ids(moverAtajo(lista, 'a', 'subir'))).toBe('abc')
    expect(ids(moverAtajo(lista, 'c', 'bajar'))).toBe('abc')
    expect(ids(moverAtajo(lista, 'z', 'bajar'))).toBe('abc')
  })
})

describe('resumenDeLosAtajos', () => {
  const con = (...nombres: string[]) =>
    resumenDeLosAtajos(nombres.map((nombre, i) => ({ ...atajo(String(i)), nombre })))

  it('nombra hasta tres activos, en su orden, y cuenta el resto', () => {
    expect(con('A', 'B', 'C', 'D', 'E')).toBe('A, B, C y 2 más')
    expect(con('A', 'B', 'C')).toBe('A, B y C')
    expect(con('A', 'B')).toBe('A y B')
    expect(con('A')).toBe('A')
  })

  it('los apagados no cuentan; sin activos lo dice', () => {
    expect(resumenDeLosAtajos([{ ...atajo('a'), activo: false }, atajo('b')])).toBe('Atajo b')
    expect(resumenDeLosAtajos([{ ...atajo('a'), activo: false }])).toBe('Ninguno activo')
  })
})
