import { describe, expect, it } from 'vitest'
import { paradaTrasLaFlecha, type EntradaDeLaFlecha } from './flechas-de-la-fila'

const base: EntradaDeLaFlecha = {
  tecla: 'ArrowRight',
  tipo: 'texto',
  inicio: 3,
  fin: 3,
  largo: 3,
  indice: 2,
  total: 5,
}
const con = (parte: Partial<EntradaDeLaFlecha>) => ({ ...base, ...parte })

describe('paradaTrasLaFlecha', () => {
  it('en un texto, → sale sólo con el cursor al final', () => {
    expect(paradaTrasLaFlecha(base)).toBe(3)
    expect(paradaTrasLaFlecha(con({ inicio: 1, fin: 1 }))).toBeNull()
  })
  it('en un texto, ← sale sólo con el cursor al principio', () => {
    expect(paradaTrasLaFlecha(con({ tecla: 'ArrowLeft', inicio: 0, fin: 0 }))).toBe(1)
    expect(paradaTrasLaFlecha(con({ tecla: 'ArrowLeft' }))).toBeNull()
  })
  it('un texto vacío sale para los dos lados', () => {
    const vacio = con({ inicio: 0, fin: 0, largo: 0 })
    expect(paradaTrasLaFlecha(vacio)).toBe(3)
    expect(paradaTrasLaFlecha({ ...vacio, tecla: 'ArrowLeft' })).toBe(1)
  })
  it('con texto seleccionado, la flecha es del texto', () => {
    expect(paradaTrasLaFlecha(con({ inicio: 0, fin: 3 }))).toBeNull()
    expect(paradaTrasLaFlecha(con({ tecla: 'ArrowLeft', inicio: 0, fin: 3 }))).toBeNull()
  })
  it('un select siempre sale', () => {
    expect(paradaTrasLaFlecha(con({ tipo: 'seleccion' }))).toBe(3)
    expect(paradaTrasLaFlecha(con({ tipo: 'seleccion', tecla: 'ArrowLeft' }))).toBe(1)
  })
  it('el valor de una XCell sale, salvo que tenga otra parada en ese sentido', () => {
    expect(paradaTrasLaFlecha(con({ tipo: 'valor' }))).toBe(3)
    expect(paradaTrasLaFlecha(con({ tipo: 'valor', otraParadaEnLaCelda: true }))).toBeNull()
  })
  it('sin vecina no sale', () => {
    expect(paradaTrasLaFlecha(con({ tipo: 'seleccion', indice: 4 }))).toBeNull()
    expect(paradaTrasLaFlecha(con({ tipo: 'seleccion', tecla: 'ArrowLeft', indice: 0 }))).toBeNull()
  })
  it('otra tecla no hace nada', () => {
    expect(paradaTrasLaFlecha(con({ tecla: 'ArrowUp', tipo: 'seleccion' }))).toBeNull()
    expect(paradaTrasLaFlecha(con({ tecla: 'Tab', tipo: 'seleccion' }))).toBeNull()
  })
})
