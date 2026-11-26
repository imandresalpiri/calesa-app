import { describe, expect, it } from 'vitest'
import {
  corteConPosicion,
  estiloDeLaRejillaDeCeldas,
  estiloDeLaRejillaDeSecciones,
  estiloDeLaSeccion,
  estiloDelBloque,
  estiloDelItem,
  FILAS_DE_LA_REJILLA_DE_CELDAS,
  FILAS_DE_LA_REJILLA_DE_SECCIONES,
  POSICION_DE_LA_SECCION,
  POSICION_DEL_ITEM,
} from './clases-de-la-posicion'
import {
  claseDeLaRejillaDeCeldas,
  claseDeLaRejillaDeSecciones,
  claseDeLaSeccionEnLaRejilla,
  claseDelBloque,
  claseDelItem,
  REJILLA_DE_SECCIONES,
} from './clases-de-la-rejilla'

const posicion = { columna: 7, fila: 2 }

describe('las tablas de la posición, escritas enteras por corte', () => {
  it('cada clase lleva el prefijo de su corte (y el contenedor de las secciones en las suyas)', () => {
    for (const [corte, clases] of Object.entries(POSICION_DEL_ITEM)) {
      const prefijo = corte === 'siempre' ? '' : `@${corte}:`
      expect(clases).toBe(
        `${prefijo}col-start-(--pieza-columna) ${prefijo}row-start-(--pieza-fila) ${prefijo}row-span-(--pieza-alto)`,
      )
      expect(FILAS_DE_LA_REJILLA_DE_CELDAS[corte as keyof typeof POSICION_DEL_ITEM]).toBe(
        `${prefijo}grid-rows-(--filas-de-la-seccion)`,
      )
    }
    for (const [corte, clases] of Object.entries(POSICION_DE_LA_SECCION)) {
      const prefijo = corte === 'siempre' ? '' : `@${corte}/secciones:`
      expect(clases).toBe(
        `${prefijo}col-start-(--seccion-columna) ${prefijo}row-start-(--seccion-fila) ${prefijo}row-span-(--seccion-alto)`,
      )
      expect(FILAS_DE_LA_REJILLA_DE_SECCIONES[corte as keyof typeof POSICION_DE_LA_SECCION]).toBe(
        `${prefijo}grid-rows-(--filas-de-las-secciones)`,
      )
    }
  })

  it('un corte que `corteDe()` no da va al siguiente que sí', () => {
    expect(corteConPosicion('xl')).toBe('2xl')
    expect(corteConPosicion('4xl')).toBe('5xl')
    expect(corteConPosicion('6xl')).toBe('7xl')
    expect(corteConPosicion('lg')).toBe('lg')
    expect(corteConPosicion('siempre')).toBe('siempre')
  })
})

describe('las clases con posición', () => {
  it('sin el corte de su rejilla, la clase de siempre aunque la pieza traiga posición', () => {
    expect(claseDelItem({ tipo: 'celda', ancho: 'mitad', posicion })).toBe(
      'col-span-12 @lg:col-span-6',
    )
    expect(claseDeLaSeccionEnLaRejilla({ ancho: 12, posicion })).toBe('col-span-12')
    expect(claseDeLaRejillaDeSecciones()).toBe(REJILLA_DE_SECCIONES)
    expect(claseDelBloque()).toBe('col-span-12 grid min-w-0 grid-cols-12 gap-y-4')
  })

  it('con el corte, el ancho de siempre y la posición desde ese corte', () => {
    expect(claseDelItem({ tipo: 'celda', ancho: 'mitad', posicion }, 'lg')).toBe(
      `col-span-12 @lg:col-span-6 ${POSICION_DEL_ITEM.lg}`,
    )
    // Una mitad en una rejilla que llega a `3xl` por un tercio: su posición, desde `3xl`.
    expect(claseDelItem({ tipo: 'celda', ancho: 'mitad', posicion }, '3xl')).toBe(
      `col-span-12 @lg:col-span-6 ${POSICION_DEL_ITEM['3xl']}`,
    )
    expect(claseDelItem({ tipo: 'celda', ancho: 5, posicion }, 'xl')).toContain(
      POSICION_DEL_ITEM['2xl'],
    )
    // Sin posición en la pieza (el lienzo con una pieza nueva), nada de la posición.
    expect(claseDelItem({ tipo: 'variante' }, 'lg')).toBe('col-span-12')
  })

  it('el alto vale también a 12 columnas: estira lo de adentro (el ítem) o la sección', () => {
    expect(claseDelItem({ tipo: 'celda', ancho: 'completo', alto: 2, posicion }, 'siempre')).toBe(
      `col-span-12 ${POSICION_DEL_ITEM.siempre} [&>*]:h-full`,
    )
    expect(claseDeLaSeccionEnLaRejilla({ ancho: 12, alto: 3, posicion }, 'siempre')).toBe(
      `col-span-12 ${POSICION_DE_LA_SECCION.siempre} self-stretch`,
    )
  })

  it('una sección «Automática» y las rejillas desde `5xl`', () => {
    expect(claseDeLaSeccionEnLaRejilla({ posicion }, '5xl')).toBe(
      `col-span-12 @5xl/secciones:col-span-6 ${POSICION_DE_LA_SECCION['5xl']}`,
    )
    expect(claseDeLaRejillaDeSecciones('5xl')).toBe(
      `${REJILLA_DE_SECCIONES} @5xl/secciones:grid-rows-(--filas-de-las-secciones)`,
    )
    expect(claseDeLaRejillaDeCeldas({}, 'lg')).toBe(
      'grid grid-cols-12 gap-x-0 gap-y-3 @lg:gap-x-3 @lg:grid-rows-(--filas-de-la-seccion)',
    )
    expect(claseDelBloque('5xl')).toBe(
      `col-span-12 grid min-w-0 grid-cols-12 gap-y-4 ${POSICION_DE_LA_SECCION['5xl']}`,
    )
  })
})

describe('los estilos: las variables en texto, sólo con el corte y la posición', () => {
  it('ítem, sección y bloque', () => {
    expect(estiloDelItem({ posicion })).toBeUndefined()
    expect(estiloDelItem({}, 'lg')).toBeUndefined()
    expect(estiloDelItem({ posicion, alto: 2 }, 'lg')).toEqual({
      '--pieza-columna': '7',
      '--pieza-fila': '2',
      '--pieza-alto': '2',
    })
    expect(estiloDeLaSeccion({ posicion }, '5xl')).toEqual({
      '--seccion-columna': '7',
      '--seccion-fila': '2',
      '--seccion-alto': '1',
    })
    expect(estiloDelBloque(4, 'siempre')).toEqual({
      '--seccion-columna': '1',
      '--seccion-fila': '4',
      '--seccion-alto': '1',
    })
    expect(estiloDelBloque(4)).toBeUndefined()
  })

  it('las filas de cada rejilla', () => {
    expect(estiloDeLaRejillaDeCeldas()).toBeUndefined()
    expect(estiloDeLaRejillaDeCeldas('auto 2.5rem')).toEqual({
      '--filas-de-la-seccion': 'auto 2.5rem',
    })
    expect(estiloDeLaRejillaDeSecciones('auto')).toEqual({ '--filas-de-las-secciones': 'auto' })
  })
})
