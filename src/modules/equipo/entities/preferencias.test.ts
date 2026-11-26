import { describe, expect, it } from 'vitest'
import { esquemaPreferencia, preferenciasDesde } from './preferencias'
import { VISTOS_POR_DEFECTO } from './vistos'

const SIN_ELEGIR = {
  densidad: null,
  tema: null,
  porPagina: null,
  widgetsDelTablero: null,
  vistos: VISTOS_POR_DEFECTO,
  zonaHoraria: null,
  vistaDeVehiculos: null,
  vistaDeCotizaciones: null,
  agruparCotizaciones: null,
  embudoDeLaFicha: null,
  menuPlegado: null,
  ultimoOrigenDeLogistica: null,
}

describe('preferenciasDesde', () => {
  it('lee lo que la persona eligió', () => {
    expect(
      preferenciasDesde({ densidad: 'comoda', tema: 'dark', 'listas.por_pagina': 25 }),
    ).toEqual({ ...SIN_ELEGIR, densidad: 'comoda', tema: 'dark', porPagina: 25 })
  })

  it('sin elección, todo queda en automático', () => {
    expect(preferenciasDesde({})).toEqual(SIN_ELEGIR)
    expect(preferenciasDesde(null)).toEqual(SIN_ELEGIR)
  })

  it('un valor desconocido no rompe: esa preferencia queda sin elegir', () => {
    expect(preferenciasDesde({ densidad: 'enorme', tema: 'dark', tablero: { a: 1 } })).toEqual({
      ...SIN_ELEGIR,
      tema: 'dark',
    })
  })

  it('«tablero.widgets» se lee si tiene la forma y, si no, queda sin elegir sin dañar lo demás', () => {
    const valida = { orden: ['a', 'b'], ocultos: ['b'] }
    expect(preferenciasDesde({ 'tablero.widgets': valida }).widgetsDelTablero).toEqual(valida)
    // Las claves de más dentro del objeto se descartan.
    expect(
      preferenciasDesde({ 'tablero.widgets': { ...valida, otra: 1 } }).widgetsDelTablero,
    ).toEqual(valida)
    const malos = [
      null,
      'texto',
      7,
      { orden: 'a' },
      { orden: ['a'] },
      { orden: Array(61).fill('a'), ocultos: [] },
    ]
    for (const malo of malos) {
      const leidas = preferenciasDesde({ tema: 'dark', 'tablero.widgets': malo })
      expect(leidas.widgetsDelTablero).toBeNull()
      expect(leidas.tema).toBe('dark')
    }
    expect(preferenciasDesde({ tema: 'dark' }).widgetsDelTablero).toBeNull()
  })

  it('«ítems por página» sólo vale con uno de los cuatro tamaños, como número', () => {
    for (const bueno of [10, 25, 50, 100]) {
      expect(preferenciasDesde({ 'listas.por_pagina': bueno }).porPagina).toBe(bueno)
    }
    for (const malo of [7, 0, -1, 1000, '50', '"50"', null, true, {}, [50], 50.5, NaN]) {
      expect(preferenciasDesde({ 'listas.por_pagina': malo }).porPagina).toBeNull()
    }
  })

  it('una persona sin fila de esa preferencia queda sin elegir (manda el tamaño de fábrica)', () => {
    expect(preferenciasDesde({ densidad: 'compacta' }).porPagina).toBeNull()
  })
})

describe('esquemaPreferencia', () => {
  it('acepta cada clave con sus valores y null para borrarla', () => {
    expect(esquemaPreferencia.safeParse({ clave: 'densidad', valor: 'compacta' }).success).toBe(
      true,
    )
    expect(esquemaPreferencia.safeParse({ clave: 'densidad', valor: null }).success).toBe(true)
    expect(esquemaPreferencia.safeParse({ clave: 'tema', valor: 'system' }).success).toBe(true)
    expect(esquemaPreferencia.safeParse({ clave: 'listas.por_pagina', valor: 100 }).success).toBe(
      true,
    )
    expect(esquemaPreferencia.safeParse({ clave: 'listas.por_pagina', valor: null }).success).toBe(
      true,
    )
  })

  it('rechaza un tamaño que el selector no ofrece, antes de llegar a la base', () => {
    for (const valor of [7, 0, -10, 101, 1000, '50', 25.5]) {
      expect(esquemaPreferencia.safeParse({ clave: 'listas.por_pagina', valor }).success).toBe(
        false,
      )
    }
  })

  it('rechaza un valor de otra clave o una clave que no existe', () => {
    expect(esquemaPreferencia.safeParse({ clave: 'densidad', valor: 'dark' }).success).toBe(false)
    expect(esquemaPreferencia.safeParse({ clave: 'idioma', valor: 'es' }).success).toBe(false)
  })
})

describe('esquemaPreferencia de «tablero.widgets»', () => {
  it('acepta una disposición válida y null para restablecerla', () => {
    const valor = { orden: ['a', 'b'], ocultos: ['a'] }
    expect(esquemaPreferencia.safeParse({ clave: 'tablero.widgets', valor }).success).toBe(true)
    expect(esquemaPreferencia.safeParse({ clave: 'tablero.widgets', valor: null }).success).toBe(
      true,
    )
  })

  it('rechaza lo malformado antes de llegar a la base', () => {
    const malos = [
      { orden: [1], ocultos: [] },
      { orden: ['x'.repeat(61)], ocultos: [] },
      { orden: [], ocultos: Array(61).fill('a') },
      { orden: [] },
      'texto',
    ]
    for (const valor of malos) {
      expect(esquemaPreferencia.safeParse({ clave: 'tablero.widgets', valor }).success).toBe(false)
    }
  })
  it('la zona horaria sólo si Intl la conoce', () => {
    expect(preferenciasDesde({ zona_horaria: 'America/New_York' }).zonaHoraria).toBe(
      'America/New_York',
    )
    expect(preferenciasDesde({ zona_horaria: 'Marte/Olimpo' }).zonaHoraria).toBeNull()
  })
})

describe('la vista del inventario', () => {
  it('«vehiculos.vista» se lee si es tabla o tarjetas; otra cosa queda sin elegir', () => {
    expect(preferenciasDesde({ 'vehiculos.vista': 'tarjetas' }).vistaDeVehiculos).toBe('tarjetas')
    expect(preferenciasDesde({ 'vehiculos.vista': 'mosaico' }).vistaDeVehiculos).toBeNull()
    expect(esquemaPreferencia.safeParse({ clave: 'vehiculos.vista', valor: 'tabla' }).success).toBe(
      true,
    )
    expect(esquemaPreferencia.safeParse({ clave: 'vehiculos.vista', valor: 'lista' }).success).toBe(
      false,
    )
  })
})

describe('la lista de cotizaciones', () => {
  it('«cotizaciones.vista» se lee si es tabla o tarjetas; otra cosa queda sin elegir', () => {
    expect(preferenciasDesde({ 'cotizaciones.vista': 'tabla' }).vistaDeCotizaciones).toBe('tabla')
    expect(preferenciasDesde({ 'cotizaciones.vista': 'lista' }).vistaDeCotizaciones).toBeNull()
    expect(
      esquemaPreferencia.safeParse({ clave: 'cotizaciones.vista', valor: 'tarjetas' }).success,
    ).toBe(true)
    expect(
      esquemaPreferencia.safeParse({ clave: 'cotizaciones.vista', valor: 'Tabla' }).success,
    ).toBe(false)
  })

  it('«cotizaciones.agrupar» sólo como booleano; «si» o 1 quedan sin elegir', () => {
    expect(preferenciasDesde({ 'cotizaciones.agrupar': false }).agruparCotizaciones).toBe(false)
    expect(preferenciasDesde({ 'cotizaciones.agrupar': true }).agruparCotizaciones).toBe(true)
    expect(preferenciasDesde({ 'cotizaciones.agrupar': 'si' }).agruparCotizaciones).toBeNull()
    expect(preferenciasDesde({ 'cotizaciones.agrupar': 1 }).agruparCotizaciones).toBeNull()
    expect(
      esquemaPreferencia.safeParse({ clave: 'cotizaciones.agrupar', valor: false }).success,
    ).toBe(true)
    expect(
      esquemaPreferencia.safeParse({ clave: 'cotizaciones.agrupar', valor: null }).success,
    ).toBe(true)
    expect(
      esquemaPreferencia.safeParse({ clave: 'cotizaciones.agrupar', valor: 'no' }).success,
    ).toBe(false)
  })
})

describe('el embudo de la ficha del lead', () => {
  const ID = '6f1d8f0e-3b52-4c1e-9a53-0d2a1d3c9b11'

  it('«leads.embudo_de_la_ficha» se lee si es un id; otra cosa queda sin elegir', () => {
    expect(preferenciasDesde({ 'leads.embudo_de_la_ficha': ID }).embudoDeLaFicha).toBe(ID)
    expect(preferenciasDesde({ 'leads.embudo_de_la_ficha': 'ventas' }).embudoDeLaFicha).toBeNull()
    expect(preferenciasDesde({ 'leads.embudo_de_la_ficha': 7 }).embudoDeLaFicha).toBeNull()
    expect(preferenciasDesde({}).embudoDeLaFicha).toBeNull()
  })

  it('se guarda sólo un id (o null, que borra la elección)', () => {
    const clave = 'leads.embudo_de_la_ficha'
    expect(esquemaPreferencia.safeParse({ clave, valor: ID }).success).toBe(true)
    expect(esquemaPreferencia.safeParse({ clave, valor: null }).success).toBe(true)
    expect(esquemaPreferencia.safeParse({ clave, valor: 'ventas' }).success).toBe(false)
  })
})

describe('«menu.plegado»', () => {
  it('se lee si es un booleano y, si no, queda sin elegir', () => {
    expect(preferenciasDesde({ 'menu.plegado': true }).menuPlegado).toBe(true)
    expect(preferenciasDesde({ 'menu.plegado': false }).menuPlegado).toBe(false)
    expect(preferenciasDesde({ 'menu.plegado': 'si' }).menuPlegado).toBeNull()
    expect(preferenciasDesde({ 'menu.plegado': 1 }).menuPlegado).toBeNull()
    expect(preferenciasDesde({}).menuPlegado).toBeNull()
  })

  it('se guarda como booleano o se borra con null', () => {
    expect(esquemaPreferencia.safeParse({ clave: 'menu.plegado', valor: true }).success).toBe(true)
    expect(esquemaPreferencia.safeParse({ clave: 'menu.plegado', valor: null }).success).toBe(true)
    expect(esquemaPreferencia.safeParse({ clave: 'menu.plegado', valor: 'si' }).success).toBe(false)
  })
})

describe('«logistica.ultimo_origen»', () => {
  const ID = '0b7a3c5e-1d2f-4a6b-8c9d-1e2f3a4b5c6d'
  const clave = 'logistica.ultimo_origen'

  it('se lee si es un id; otra cosa queda sin elegir', () => {
    expect(preferenciasDesde({ [clave]: ID }).ultimoOrigenDeLogistica).toBe(ID)
    expect(preferenciasDesde({ [clave]: 'subasta' }).ultimoOrigenDeLogistica).toBeNull()
    expect(preferenciasDesde({ [clave]: 3 }).ultimoOrigenDeLogistica).toBeNull()
    expect(preferenciasDesde({}).ultimoOrigenDeLogistica).toBeNull()
  })

  it('se guarda sólo un id (o null, que borra la elección)', () => {
    expect(esquemaPreferencia.safeParse({ clave, valor: ID }).success).toBe(true)
    expect(esquemaPreferencia.safeParse({ clave, valor: null }).success).toBe(true)
    expect(esquemaPreferencia.safeParse({ clave, valor: 'subasta' }).success).toBe(false)
    expect(esquemaPreferencia.safeParse({ clave, valor: 7 }).success).toBe(false)
  })
})
