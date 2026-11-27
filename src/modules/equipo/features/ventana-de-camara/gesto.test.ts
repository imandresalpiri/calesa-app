import { describe, expect, it } from 'vitest'
import { anchoMaximoDe } from '../../entities/ventana-de-camara'
import {
  arrastrada,
  cambioDeAnchoDeLaTecla,
  conAnchoNuevo,
  empujeDeLaTecla,
  redimensionada,
} from './gesto'

const navegador = { ancho: 1200, alto: 800 }
const partida = { posicion: { x: 100, y: 100 }, medida: { ancho: 300, alto: 400 } }

describe('gesto de la ventana de cámara', () => {
  it('arrastrar mueve la ventana lo que se movió el puntero y no la saca de la pantalla', () => {
    expect(arrastrada(partida, { x: 50, y: -30 }, navegador).posicion).toEqual({ x: 150, y: 70 })
    const afuera = arrastrada(partida, { x: 5000, y: 5000 }, navegador).posicion
    expect(afuera.x + 300).toBeLessThanOrEqual(navegador.ancho)
    expect(afuera.y + 400).toBeLessThanOrEqual(navegador.alto)
    expect(
      arrastrada(partida, { x: -5000, y: -5000 }, navegador).posicion.x,
    ).toBeGreaterThanOrEqual(0)
  })

  it('la esquina de la derecha agranda hacia la derecha y deja fija la izquierda', () => {
    const gesto = redimensionada(
      partida,
      { x: 40, y: 0 },
      { aLaDerecha: true, abajo: true },
      navegador,
    )
    expect(gesto.ancho).toBe(340)
    expect(gesto.posicion).toEqual({ x: 100, y: 100 })
  })

  it('la esquina de la izquierda agranda hacia la izquierda y deja fija la derecha', () => {
    const gesto = redimensionada(
      partida,
      { x: -40, y: 0 },
      { aLaDerecha: false, abajo: true },
      navegador,
    )
    expect(gesto.ancho).toBe(340)
    expect(gesto.posicion.x).toBe(60)
  })

  it('el ancho no baja de 200 px ni pasa de la mitad de la ventana', () => {
    const esquina = { aLaDerecha: true, abajo: true }
    expect(conAnchoNuevo(partida, 10, esquina, navegador).ancho).toBe(200)
    expect(conAnchoNuevo(partida, 5000, esquina, navegador).ancho).toBe(
      anchoMaximoDe(navegador.ancho),
    )
  })

  it('las flechas empujan y con Mayús empujan más; otras teclas no hacen nada', () => {
    expect(empujeDeLaTecla('ArrowLeft', false)).toEqual({ x: -16, y: 0 })
    expect(empujeDeLaTecla('ArrowDown', true)).toEqual({ x: 0, y: 64 })
    expect(empujeDeLaTecla('a', false)).toBeNull()
    expect(cambioDeAnchoDeLaTecla('ArrowRight')).toBe(20)
    expect(cambioDeAnchoDeLaTecla('ArrowLeft')).toBe(-20)
    expect(cambioDeAnchoDeLaTecla('Enter')).toBeNull()
  })
})
