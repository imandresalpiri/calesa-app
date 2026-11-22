import { describe, expect, it } from 'vitest'
import { colorCreadoDe } from './color-creado'
import type { ListaDeTonos, Tono } from './tonos'

const tema = (fondo: string) => ({ fondo, borde: '#999999', tinta: '#111111' })
const tono = (id: string, clave: string, nombre: string): Tono => ({
  id,
  clave,
  nombre,
  hex: '#31869b',
  actualizadoEn: '2026-11-22 10:00:00.123456+00',
  colores: { claro: tema('#eeeeee'), oscuro: tema('#222222') },
})

const LISTA: ListaDeTonos = {
  tope: 48,
  tonos: [
    tono('8f1f7a52-6d38-4b5e-9a4d-3c2b1a0f9e8d', 'azul', 'Azul'),
    tono('0b6c1f3e-2a4d-4c5b-8e9f-1a2b3c4d5e6f', 'dorado', 'Dorado'),
  ],
}

describe('colorCreadoDe', () => {
  it('toma el color por el id del intento, con su clave, su nombre y sus versiones de la hoja', () => {
    expect(colorCreadoDe(LISTA, '0b6c1f3e-2a4d-4c5b-8e9f-1a2b3c4d5e6f')).toEqual({
      clave: 'dorado',
      nombre: 'Dorado',
      claro: tema('#eeeeee'),
      oscuro: tema('#222222'),
    })
  })

  it('sin ese id en la lista no inventa nada', () => {
    expect(colorCreadoDe(LISTA, '11111111-2222-4333-8444-555555555555')).toBeNull()
  })
})
