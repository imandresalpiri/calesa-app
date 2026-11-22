import { describe, expect, it } from 'vitest'
import { MOTIVO_OTRO_GRUPO } from './motivos'
import {
  idDeCasilla,
  idDeCasillaLibre,
  idDeFijo,
  idDeFila,
  leerId,
  queHaceLaSoltada,
  type CasillasDeLaSoltada,
} from './soltar'

const TOPE = 'Ya hay 4 datos clave.'

function campo(n: number, grupo: string | null = 'Vehículo', activo = true) {
  return { id: `c${String(n)}`, grupo, activo }
}

const campos = [campo(1), campo(2), campo(3, 'Venta'), campo(4, 'Vehículo', false)]

function casillas(llaves: readonly string[]): CasillasDeLaSoltada {
  return {
    llaves,
    tope: 4,
    motivoTope: TOPE,
    llaveDeCampo: (id) => {
      const encontrado = campos.find((otro) => otro.id === id)
      return encontrado?.activo ? `campo:${id}` : null
    },
  }
}

const soltar = (activo: string, sobre: string | null, llaves: readonly string[] = []) =>
  queHaceLaSoltada({ activo, sobre, campos, casillas: casillas(llaves) })

describe('leerId', () => {
  it('lee cada prefijo, también una llave que lleva dos puntos', () => {
    expect(leerId(idDeFila('c1'))).toEqual({ tipo: 'campo', id: 'c1' })
    expect(leerId(idDeFijo('comun:anio'))).toEqual({ tipo: 'fijo', llave: 'comun:anio' })
    expect(leerId(idDeCasilla('campo:color'))).toEqual({ tipo: 'casilla', llave: 'campo:color' })
    expect(leerId(idDeCasillaLibre(2))).toEqual({ tipo: 'libre', posicion: 2 })
  })

  it('lo que no conoce es null', () => {
    expect(leerId('otro:1')).toBeNull()
    expect(leerId('sin-prefijo')).toBeNull()
    expect(leerId('casilla-libre:-1')).toBeNull()
  })
})

describe('queHaceLaSoltada: campos', () => {
  it('un campo sobre otro de su grupo se mueve', () => {
    expect(soltar(idDeFila('c1'), idDeFila('c2'))).toEqual({
      tipo: 'mover-campo',
      id: 'c1',
      despuesDe: 'c2',
    })
  })

  it('sobre otro grupo no hace nada y dice por qué', () => {
    expect(soltar(idDeFila('c1'), idDeFila('c3'))).toEqual({
      tipo: 'nada',
      motivo: MOTIVO_OTRO_GRUPO,
    })
  })

  it('soltar en su lugar o fuera de todo no hace nada, sin motivo', () => {
    expect(soltar(idDeFila('c1'), idDeFila('c1'))).toEqual({ tipo: 'nada', motivo: null })
    expect(soltar(idDeFila('c1'), null)).toEqual({ tipo: 'nada', motivo: null })
  })

  it('un dato común o una casilla sobre un campo no hacen nada', () => {
    expect(soltar(idDeFijo('comun:anio'), idDeFila('c1'))).toEqual({ tipo: 'nada', motivo: null })
    expect(soltar(idDeCasilla('comun:anio'), idDeFila('c1'), ['comun:anio'])).toEqual({
      tipo: 'nada',
      motivo: null,
    })
  })
})

describe('queHaceLaSoltada: casillas', () => {
  it('un campo o un común sobre un lugar libre entra en el primero libre', () => {
    expect(soltar(idDeFila('c1'), idDeCasillaLibre(3), ['comun:anio'])).toEqual({
      tipo: 'poner-en-casilla',
      llave: 'campo:c1',
      posicion: 1,
    })
    expect(soltar(idDeFijo('comun:vin'), idDeCasillaLibre(0))).toEqual({
      tipo: 'poner-en-casilla',
      llave: 'comun:vin',
      posicion: 0,
    })
  })

  it('sobre una casilla llena entra en su lugar y corre a las demás', () => {
    expect(soltar(idDeFila('c1'), idDeCasilla('comun:vin'), ['comun:anio', 'comun:vin'])).toEqual({
      tipo: 'poner-en-casilla',
      llave: 'campo:c1',
      posicion: 1,
    })
  })

  it('con el tope lleno no entra y dice por qué', () => {
    const llenas = ['comun:anio', 'comun:vin', 'comun:marca', 'comun:modelo']
    expect(soltar(idDeFila('c1'), idDeCasilla('comun:vin'), llenas)).toEqual({
      tipo: 'nada',
      motivo: TOPE,
    })
  })

  it('una casilla sobre otra se reordena; sobre un libre va al final', () => {
    const llaves = ['comun:anio', 'comun:vin', 'comun:marca']
    expect(soltar(idDeCasilla('comun:anio'), idDeCasilla('comun:marca'), llaves)).toEqual({
      tipo: 'mover-casilla',
      desde: 0,
      hasta: 2,
    })
    expect(soltar(idDeCasilla('comun:vin'), idDeCasillaLibre(3), llaves)).toEqual({
      tipo: 'mover-casilla',
      desde: 1,
      hasta: 2,
    })
    expect(soltar(idDeCasilla('comun:vin'), idDeCasilla('comun:vin'), llaves)).toEqual({
      tipo: 'nada',
      motivo: null,
    })
  })

  it('algo que ya es dato clave cambia de lugar, aunque el tope esté lleno', () => {
    const llenas = ['comun:anio', 'comun:vin', 'campo:c1', 'comun:modelo']
    expect(soltar(idDeFila('c1'), idDeCasilla('comun:anio'), llenas)).toEqual({
      tipo: 'mover-casilla',
      desde: 2,
      hasta: 0,
    })
  })

  it('un desactivado no entra; sin casillas, nada', () => {
    expect(soltar(idDeFila('c4'), idDeCasillaLibre(0))).toEqual({ tipo: 'nada', motivo: null })
    expect(
      queHaceLaSoltada({
        activo: idDeFila('c1'),
        sobre: idDeCasillaLibre(0),
        campos,
        casillas: null,
      }),
    ).toEqual({ tipo: 'nada', motivo: null })
  })
})
