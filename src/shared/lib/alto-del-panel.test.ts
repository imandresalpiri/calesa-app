import { describe, expect, it } from 'vitest'
import {
  ALTO_INICIAL,
  ALTO_MAXIMO,
  ALTO_MINIMO,
  acotarAlto,
  altoConTecla,
  altoDesdePuntero,
} from './alto-del-panel'

describe('acotarAlto', () => {
  it('deja pasar lo que cabe y corta lo que no', () => {
    expect(acotarAlto(60)).toBe(60)
    expect(acotarAlto(10)).toBe(ALTO_MINIMO)
    expect(acotarAlto(120)).toBe(ALTO_MAXIMO)
  })
  it('vuelve al inicial con un número roto', () => {
    expect(acotarAlto(Number.NaN)).toBe(ALTO_INICIAL)
    expect(acotarAlto(Number.POSITIVE_INFINITY)).toBe(ALTO_INICIAL)
  })
})

describe('altoConTecla', () => {
  it('↑ agranda y ↓ achica de 5 en 5', () => {
    expect(altoConTecla(60, 'ArrowUp')).toBe(65)
    expect(altoConTecla(60, 'ArrowDown')).toBe(55)
  })
  it('no pasa de los extremos', () => {
    expect(altoConTecla(95, 'ArrowUp')).toBe(ALTO_MAXIMO)
    expect(altoConTecla(30, 'ArrowDown')).toBe(ALTO_MINIMO)
  })
  it('Inicio y Fin van a los extremos', () => {
    expect(altoConTecla(60, 'Home')).toBe(ALTO_MINIMO)
    expect(altoConTecla(60, 'End')).toBe(ALTO_MAXIMO)
  })
  it('otra tecla no cambia nada', () => {
    expect(altoConTecla(60, 'a')).toBeNull()
    expect(altoConTecla(60, 'Tab')).toBeNull()
  })
})

describe('altoDesdePuntero', () => {
  it('es lo que queda de la ventana bajo el puntero', () => {
    expect(altoDesdePuntero(400, 1000)).toBe(60)
    expect(altoDesdePuntero(200, 1000)).toBe(80)
  })
  it('se acota', () => {
    expect(altoDesdePuntero(0, 1000)).toBe(ALTO_MAXIMO)
    expect(altoDesdePuntero(990, 1000)).toBe(ALTO_MINIMO)
  })
  it('sin alto de ventana, el inicial', () => {
    expect(altoDesdePuntero(100, 0)).toBe(ALTO_INICIAL)
  })
})
