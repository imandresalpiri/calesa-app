import { describe, expect, it } from 'vitest'
import { escribirPanelDeLaGuia, leerPanelDeLaGuia } from './panel-lateral'

function almacenEnMemoria() {
  const datos = new Map<string, string>()
  return {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor)
    },
  }
}

const roto = {
  getItem: (): string | null => {
    throw new Error('sin almacenamiento')
  },
  setItem: () => {
    throw new Error('sin almacenamiento')
  },
}

describe('el panel de la guía recordado', () => {
  it('sin nada guardado está abierto', () => {
    expect(leerPanelDeLaGuia(almacenEnMemoria())).toBe(true)
    expect(leerPanelDeLaGuia(null)).toBe(true)
  })

  it('recuerda abierto y cerrado', () => {
    const almacen = almacenEnMemoria()
    escribirPanelDeLaGuia(almacen, false)
    expect(almacen.getItem('guia:panel')).toBe('0')
    expect(leerPanelDeLaGuia(almacen)).toBe(false)
    escribirPanelDeLaGuia(almacen, true)
    expect(almacen.getItem('guia:panel')).toBe('1')
    expect(leerPanelDeLaGuia(almacen)).toBe(true)
  })

  it('un almacenamiento que falla no rompe: abierto y sin recordar', () => {
    expect(leerPanelDeLaGuia(roto)).toBe(true)
    expect(() => {
      escribirPanelDeLaGuia(roto, false)
    }).not.toThrow()
  })
})
