import { describe, expect, it } from 'vitest'
import {
  anuncioDeLaMovida,
  LA_ULTIMA_FILA,
  nombrarEnLaHoja,
  noEntra,
  porQueNoSeMovio,
} from './anuncios-de-la-rejilla'
import { celda, disenoDe, disenoDeRejillaDePrueba, seccion } from './diseno-de-prueba.soporte'
import {
  intercambiarAvanzadas,
  moverElBloque,
  moverPiezaA,
  moverSeccionA,
} from './mover-en-la-rejilla'

const a = { pieza: 'nodo', nodo: 'a' } as const
const etiquetas = new Map([
  ['a', 'Precio'],
  ['b', 'Flete'],
])

const conTitulos = () => {
  const d = disenoDeRejillaDePrueba()
  return {
    ...d,
    secciones: d.secciones.map((s) => (s.id === 'extra' ? { ...s, titulo: 'Extras' } : s)),
  }
}
const hecho = (m: { ok: boolean; diseno?: unknown }) => {
  if (!m.ok || m.diseno === undefined) throw new Error('no se movió')
  return m.diseno as ReturnType<typeof disenoDeRejillaDePrueba>
}

describe('cómo se nombra cada pieza', () => {
  it('con sus comillas, salvo la tarjeta del total; una sección sin título lo dice', () => {
    const nombre = nombrarEnLaHoja(conTitulos(), etiquetas)
    expect(nombre(a)).toBe('«Precio»')
    expect(nombre({ pieza: 'nodo', nodo: 'c' })).toBe('«c»')
    expect(nombre({ pieza: 'total' })).toBe('la tarjeta del total')
    expect(nombre({ pieza: 'seccion', seccion: 'extra' })).toBe('«Extras»')
    expect(nombre({ pieza: 'seccion', seccion: 'base' })).toBe('«Sección sin título»')
    expect(nombre({ pieza: 'bloque-avanzado' })).toBe('«Avanzado»')
  })
})

describe('lo que no entra', () => {
  it('por el ancho dice cuántas columnas quedan; por abajo, la última fila', () => {
    expect(noEntra('«Precio»', { columna: 9, fila: 1 }, { ancho: 6, alto: 1 })).toBe(
      'No entra: «Precio» mide 6 columnas y desde la 9 quedan 4.',
    )
    expect(noEntra('«Precio»', { columna: 12, fila: 1 }, { ancho: 2, alto: 1 })).toBe(
      'No entra: «Precio» mide 2 columnas y desde la 12 queda 1.',
    )
    expect(noEntra('«Precio»', { columna: 1, fila: 200 }, { ancho: 6, alto: 2 })).toBe(
      LA_ULTIMA_FILA,
    )
  })
})

describe('por qué no se movió', () => {
  const d = conTitulos()
  const hoja = { diseno: d, nombre: nombrarEnLaHoja(d, etiquetas) }

  it('lo que pisa, lo que no entra y la tarjeta del total donde no va', () => {
    expect(
      porQueNoSeMovio(
        hoja,
        a,
        { motivo: 'pisa', con: { pieza: 'nodo', nodo: 'b' } },
        {
          destino: { columna: 7, fila: 1 },
        },
      ),
    ).toBe('No se movió: ahí está «Flete».')
    // Alt+→ desde la columna 1 con 6 de ancho: no se sale; desde la 7, sí.
    const b = { pieza: 'nodo', nodo: 'b' } as const
    expect(porQueNoSeMovio(hoja, b, { motivo: 'se_sale' }, { direccion: 'derecha' })).toBe(
      'No entra: «Flete» mide 6 columnas y desde la 8 quedan 5.',
    )
    expect(
      porQueNoSeMovio(
        hoja,
        { pieza: 'total' },
        { motivo: 'total' },
        { destino: { columna: 1, fila: 1 }, motivoDelTotal: 'No va ahí.' },
      ),
    ).toBeNull()
    expect(
      porQueNoSeMovio(
        hoja,
        a,
        { motivo: 'total' },
        {
          destino: { columna: 1, fila: 1 },
          motivoDelTotal: 'No va ahí.',
        },
      ),
    ).toBe('No va ahí.')
  })

  it('el extremo con Alt+flechas: la primera columna o fila, la lista de «Avanzado» y el bloque', () => {
    expect(porQueNoSeMovio(hoja, a, { motivo: 'extremo' }, { direccion: 'izquierda' })).toBe(
      'Ya está en la primera columna.',
    )
    expect(porQueNoSeMovio(hoja, a, { motivo: 'extremo' }, { direccion: 'arriba' })).toBe(
      'Ya está en la primera fila.',
    )
    const av = { pieza: 'seccion', seccion: 'av' } as const
    expect(porQueNoSeMovio(hoja, av, { motivo: 'extremo' }, { direccion: 'arriba' })).toBe(
      'Ya es la primera de «Avanzado».',
    )
    expect(porQueNoSeMovio(hoja, av, { motivo: 'extremo' }, { direccion: 'abajo' })).toBe(
      'Ya es la última de «Avanzado».',
    )
    const bloque = { pieza: 'bloque-avanzado' } as const
    expect(porQueNoSeMovio(hoja, bloque, { motivo: 'extremo' }, { direccion: 'derecha' })).toBe(
      '«Avanzado» ocupa la fila entera.',
    )
    expect(porQueNoSeMovio(hoja, a, { motivo: 'no_esta' }, { direccion: 'abajo' })).toBeNull()
  })
})

describe('lo que se anuncia al mover', () => {
  const d = conTitulos()
  const nombre = nombrarEnLaHoja(d, etiquetas)

  it('una pieza en su sección o a otra', () => {
    const enSuSeccion = hecho(
      moverPiezaA(d, a, { seccion: 'base', posicion: { columna: 1, fila: 3 } }),
    )
    expect(anuncioDeLaMovida(d, enSuSeccion, a, nombre)).toBe(
      'Moviste «Precio» a la columna 1, fila 3.',
    )
    const aOtra = hecho(moverPiezaA(d, a, { seccion: 'extra', posicion: { columna: 1, fila: 2 } }))
    expect(anuncioDeLaMovida(d, aOtra, a, nombre)).toBe(
      'Moviste «Precio» a «Extras», columna 1, fila 2.',
    )
    expect(anuncioDeLaMovida(d, d, a, nombre)).toBeNull()
  })

  it('una sección, una avanzada en su lista y el bloque', () => {
    const extra = { pieza: 'seccion', seccion: 'extra' } as const
    const movida = hecho(moverSeccionA(d, 'extra', { columna: 7, fila: 3 }))
    expect(anuncioDeLaMovida(d, movida, extra, nombre)).toBe(
      'Moviste la sección «Extras» a la columna 7, fila 3.',
    )
    const conDos = disenoDe([
      seccion('base', [celda('a')]),
      seccion('av', [celda('comision')], { presentacion: 'avanzado', titulo: 'Costos' }),
      seccion('av2', [celda('neto')], { presentacion: 'avanzado' }),
    ])
    const av = { pieza: 'seccion', seccion: 'av' } as const
    const cambiadas = hecho(intercambiarAvanzadas(conDos, 'av', 'av2'))
    expect(anuncioDeLaMovida(conDos, cambiadas, av, nombrarEnLaHoja(conDos, etiquetas))).toBe(
      'Moviste la sección «Costos» a la posición 2 de 2 de «Avanzado».',
    )
    const bloque = { pieza: 'bloque-avanzado' } as const
    expect(anuncioDeLaMovida(d, hecho(moverElBloque(d, 5)), bloque, nombre)).toBe(
      'Moviste «Avanzado» a la fila 5.',
    )
  })
})
