import { describe, expect, it } from 'vitest'
import { nombrarEnLaHoja, porQueNoSeMovio } from './anuncios-de-la-rejilla'
import { celda, disenoDe, disenoDeRejillaDePrueba, seccion } from './diseno-de-prueba.soporte'
import { intentoDeLaCaida, marcaDeLaCaida, soltarEn } from './soltar-en-la-rejilla'
import { MOTIVO_DEL_TOTAL_EN_AVANZADO } from './total-de-la-hoja'

const a = { pieza: 'nodo', nodo: 'a' } as const
const etiquetas = new Map([
  ['a', 'Precio'],
  ['b', 'Flete'],
])
const hojaDe = (d: ReturnType<typeof disenoDeRejillaDePrueba>) => ({
  diseno: d,
  nombre: nombrarEnLaHoja(d, etiquetas),
})

describe('la marca de lo que se arrastra', () => {
  const hoja = hojaDe(disenoDeRejillaDePrueba())

  it('un lugar libre dice su columna y su fila, con el recuadro que ocuparía', () => {
    expect(
      marcaDeLaCaida(hoja, a, {
        espacio: 'seccion',
        seccion: 'base',
        posicion: { columna: 1, fila: 3 },
      }),
    ).toEqual({
      estado: 'libre',
      texto: 'Columna 1, fila 3',
      lugar: { posicion: { columna: 1, fila: 3 }, tamano: { ancho: 6, alto: 1 } },
    })
  })

  it('lo que pisa nombra a la otra; lo que se sale dice cuánto queda', () => {
    const sobreFlete = {
      espacio: 'seccion',
      seccion: 'base',
      posicion: { columna: 7, fila: 1 },
    } as const
    expect(marcaDeLaCaida(hoja, a, sobreFlete)).toMatchObject({
      estado: 'pisa',
      texto: 'Ahí está «Flete».',
    })
    expect(
      marcaDeLaCaida(hoja, a, {
        espacio: 'seccion',
        seccion: 'base',
        posicion: { columna: 9, fila: 3 },
      }),
    ).toMatchObject({
      estado: 'se_sale',
      texto: 'No entra: «Precio» mide 6 columnas y desde la 9 quedan 4.',
    })
  })
})

describe('la marca del total, el bloque y las avanzadas', () => {
  const hoja = hojaDe(disenoDeRejillaDePrueba())

  it('la tarjeta del total en una avanzada no va, con su motivo', () => {
    const conTotal = disenoDe([
      seccion('base', [celda('a'), { tipo: 'total', ancho: 6 }]),
      seccion('av', [celda('comision')], { presentacion: 'avanzado' }),
    ])
    expect(
      marcaDeLaCaida(
        hojaDe(conTotal),
        { pieza: 'total' },
        {
          espacio: 'seccion',
          seccion: 'av',
          posicion: { columna: 1, fila: 2 },
        },
      ),
    ).toMatchObject({ estado: 'no_admite', texto: MOTIVO_DEL_TOTAL_EN_AVANZADO })
  })

  it('el bloque cae en una fila entera; una avanzada, en el lugar de otra de la lista', () => {
    expect(
      marcaDeLaCaida(
        hoja,
        { pieza: 'bloque-avanzado' },
        {
          espacio: 'principales',
          posicion: { columna: 8, fila: 4 },
        },
      ),
    ).toEqual({
      estado: 'libre',
      texto: 'Fila 4',
      lugar: { posicion: { columna: 1, fila: 4 }, tamano: { ancho: 12, alto: 1 } },
    })
    const conDos = disenoDe([
      seccion('base', [celda('a')]),
      seccion('av', [celda('comision')], { presentacion: 'avanzado' }),
      seccion('av2', [celda('neto')], { presentacion: 'avanzado' }),
    ])
    expect(
      marcaDeLaCaida(
        hojaDe(conDos),
        { pieza: 'seccion', seccion: 'av' },
        {
          espacio: 'avanzada',
          seccion: 'av2',
        },
      ),
    ).toEqual({ estado: 'libre', texto: 'Posición 2 de 2 de «Avanzado»', lugar: null })
  })

  it('lo que no va en ese espacio no tiene marca', () => {
    const enLasPrincipales = { espacio: 'principales', posicion: { columna: 7, fila: 3 } } as const
    expect(marcaDeLaCaida(hoja, a, enLasPrincipales)).toBeNull()
    // Una avanzada va en su bloque: en la rejilla de las secciones, aunque el lugar esté libre, ni marca ni movida.
    const conAvanzada = disenoDe([
      seccion('base', [celda('a')]),
      seccion('av', [celda('comision')], { presentacion: 'avanzado' }),
    ])
    const av = { pieza: 'seccion', seccion: 'av' } as const
    expect(marcaDeLaCaida(hojaDe(conAvanzada), av, enLasPrincipales)).toBeNull()
    expect(soltarEn(conAvanzada, av, enLasPrincipales).ok).toBe(false)
  })
})

describe('soltar', () => {
  const d = disenoDeRejillaDePrueba()
  const hoja = hojaDe(d)

  it('lo libre se mueve; lo que pisa no cambia nada y dice por qué', () => {
    const libre = {
      espacio: 'seccion',
      seccion: 'base',
      posicion: { columna: 1, fila: 3 },
    } as const
    expect(soltarEn(d, a, libre).ok).toBe(true)
    const sobreFlete = {
      espacio: 'seccion',
      seccion: 'base',
      posicion: { columna: 7, fila: 1 },
    } as const
    const movida = soltarEn(d, a, sobreFlete)
    if (movida.ok) throw new Error('se movió')
    expect(porQueNoSeMovio(hoja, a, movida, intentoDeLaCaida(d, a, sobreFlete))).toBe(
      'No se movió: ahí está «Flete».',
    )
  })
})
