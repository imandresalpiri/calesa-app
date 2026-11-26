import { describe, expect, it } from 'vitest'
import { cambiosDeLaRevision } from './cambios-de-la-revision'

const etiquetas = new Map([
  ['pub', 'Precio publicado'],
  ['fob', 'FOB'],
  ['flete', 'Flete'],
  ['seguro', 'Seguro'],
  ['zeta', 'Zeta'],
])

const cambios = (diff: Record<string, unknown>) => cambiosDeLaRevision(diff, etiquetas)

describe('cambiosDeLaRevision: qué cambió en una revisión', () => {
  it('nombra los nodos de valores y de fuentes sin repetir, por etiqueta', () => {
    const r = cambios({
      valores: { de: { pub: 1, fob: 2 }, a: { pub: 3, fob: 4 } },
      fuentes: { de: { fob: 'a' }, a: { fob: 'b', flete: 'c' } },
    })
    expect(r.vistos).toEqual(['Cambió «Flete»', 'Cambió «FOB»', 'Cambió «Precio publicado»'])
    expect(r.masN).toBe(0)
  })

  it('un nodo que sólo cambió su fuente también se nombra', () => {
    const r = cambios({ fuentes: { de: { fob: 'a' }, a: { fob: 'b' } } })
    expect(r.vistos).toEqual(['Cambió «FOB»'])
  })

  it('sin etiqueta, el id', () => {
    expect(cambios({ valores: { de: { raro: 1 }, a: { raro: 2 } } }).vistos).toEqual([
      'Cambió «raro»',
    ])
  })

  it('a la vista las primeras 3 y «y N más» con el resto', () => {
    const r = cambios({
      valores: { de: { pub: 1, fob: 2, flete: 3, seguro: 4, zeta: 5 }, a: {} },
    })
    expect(r.vistos).toHaveLength(3)
    expect(r.masN).toBe(2)
  })

  it('las columnas que se nombran, cada una con su texto', () => {
    const texto = (diff: Record<string, unknown>) => cambios(diff).vistos
    expect(texto({ clase: { de: 'preventa', a: 'final' } })).toEqual(['Pasó a final'])
    expect(texto({ clase: { de: 'final', a: 'preventa' } })).toEqual(['Volvió a preventa'])
    expect(texto({ modo_tc: { de: 'a', a: 'b' } })).toEqual(['Cambió el modo de tipo de cambio'])
    expect(texto({ ver_total_bs: { de: false, a: true } })).toEqual(['Encendió «Ver total Bs»'])
    expect(texto({ ver_total_bs: { de: true, a: false } })).toEqual(['Apagó «Ver total Bs»'])
    expect(texto({ vehiculo_id: { de: 'x', a: 'y' } })).toEqual(['Cambió el vehículo'])
    expect(texto({ lead_id: { de: null, a: 'y' } })).toEqual(['Cambió el cliente'])
    expect(texto({ titulo: { de: 'a', a: 'b' } })).toEqual(['Cambió el título'])
    expect(texto({ notas: { de: 'a', a: 'b' } })).toEqual(['Cambió las notas'])
    expect(texto({ tipos_cambio: { de: {}, a: {} } })).toEqual(['Cambió un tipo de cambio'])
    expect(texto({ eliminado_en: { de: null, a: '2026-11-01T00:00:00Z' } })).toEqual([
      'Fue a la papelera',
    ])
    expect(texto({ eliminado_en: { de: '2026-11-01T00:00:00Z', a: null } })).toEqual([
      'Volvió de la papelera',
    ])
  })

  it('total_base y las demás columnas no se nombran', () => {
    const r = cambios({
      total_base: { de: 1, a: 2 },
      formula_id: { de: 'a', a: 'b' },
      estado: { de: 'x', a: 'y' },
      plantilla_id: { de: null, a: 'z' },
      moneda_mostrar: { de: 'USD', a: 'BOB' },
    })
    expect(r.vistos).toEqual([])
    expect(r.sinCambios).toBe(true)
  })

  it('sin nada que nombrar ni total: sin cambios que se puedan ver', () => {
    expect(cambios({}).sinCambios).toBe(true)
    expect(cambios({ totales: { de: { grupos: {} }, a: { grupos: {} } } }).sinCambios).toBe(true)
  })

  it('el total sólo con dos números', () => {
    expect(cambios({ totales: { de: { usd: 105 }, a: { usd: 110 } } }).total).toEqual({
      de: 105,
      a: 110,
    })
    expect(cambios({ totales: { de: { usd: 105 }, a: {} } }).total).toBeNull()
    expect(cambios({ totales: { de: { usd: null }, a: { usd: 110 } } }).total).toBeNull()
    expect(cambios({ totales: { de: { usd: '105' }, a: { usd: 110 } } }).total).toBeNull()
  })

  it('con el total y sin más, no está «sin cambios»', () => {
    const r = cambios({ totales: { de: { usd: 1 }, a: { usd: 2 } } })
    expect(r.vistos).toEqual([])
    expect(r.sinCambios).toBe(false)
  })

  it('un diff que no es un objeto no rompe', () => {
    expect(
      cambiosDeLaRevision({ valores: 3, fuentes: { de: 1, a: null } }, etiquetas).sinCambios,
    ).toBe(true)
  })
})

describe('cambiosDeLaRevision › el título de la cotización (T307)', () => {
  it('los retoques de la tarjeta: «Retocó la tarjeta», también al volver a la plantilla (a nulo)', () => {
    const texto = (diff: Record<string, unknown>) => cambiosDeLaRevision(diff, new Map()).vistos
    expect(texto({ tarjeta_retoques: { de: null, a: { celdas: 1, filas_ocultas: 0 } } })).toEqual([
      'Retocó la tarjeta',
    ])
    expect(texto({ tarjeta_retoques: { de: { celdas: 2, filas_ocultas: 1 }, a: null } })).toEqual([
      'Retocó la tarjeta',
    ])
    expect(
      cambiosDeLaRevision({ tarjeta_retoques: { de: null, a: null } }, new Map()).sinCambios,
    ).toBe(false)
  })

  it('pasar de automático a manual, solo o junto al texto, se dice una vez', () => {
    const texto = (diff: Record<string, unknown>) => cambiosDeLaRevision(diff, new Map()).vistos
    expect(texto({ titulo_manual: { de: false, a: true } })).toEqual(['Cambió el título'])
    expect(texto({ titulo: { de: 'a', a: 'b' }, titulo_manual: { de: true, a: false } })).toEqual([
      'Cambió el título',
    ])
  })
})

describe('cambiosDeLaRevision › el cambio de vehículo con sus nombres (T315)', () => {
  const diff = {
    vehiculo_id: { de: 'a', a: 'b' },
    valores: { de: { pub: 1, fob: 2, flete: 3 }, a: { pub: 4, fob: 5, flete: 6 } },
  }

  it('con los dos nombrados: «Cambió el vehículo: A → B», primero y en lugar de «Cambió el vehículo»', () => {
    const r = cambiosDeLaRevision(diff, etiquetas, {
      de: { titulo: 'Toyota Corolla' },
      a: { titulo: 'Mazda 3' },
    })
    expect(r.vistos[0]).toBe('Cambió el vehículo: Toyota Corolla → Mazda 3')
    expect(r.vistos).not.toContain('Cambió el vehículo')
    expect(r.masN).toBe(1)
  })

  it('un lado que quien mira no ve: «un vehículo que no puedes ver»', () => {
    const r = cambiosDeLaRevision(diff, etiquetas, { de: 'oculto', a: { titulo: 'Mazda 3' } })
    expect(r.vistos[0]).toBe('Cambió el vehículo: un vehículo que no puedes ver → Mazda 3')
  })

  it('sin vehículo antes: «sin vehículo»', () => {
    const r = cambiosDeLaRevision({ vehiculo_id: { de: null, a: 'b' } }, etiquetas, {
      de: 'sin',
      a: { titulo: 'Mazda 3' },
    })
    expect(r.vistos).toEqual(['Cambió el vehículo: sin vehículo → Mazda 3'])
  })

  it('sin la lectura de los nombres: «Cambió el vehículo», después de los nodos', () => {
    const r = cambiosDeLaRevision(
      { vehiculo_id: { de: 'a', a: 'b' }, valores: diff.valores },
      etiquetas,
    )
    expect(r.vistos).toEqual(['Cambió «Flete»', 'Cambió «FOB»', 'Cambió «Precio publicado»'])
    expect(r.masN).toBe(1)
    expect(cambiosDeLaRevision({ vehiculo_id: { de: 'a', a: 'b' } }, etiquetas).vistos).toEqual([
      'Cambió el vehículo',
    ])
  })
})

describe('cambiosDeLaRevision › la marca de privada', () => {
  it('«La hizo privada» o «La hizo pública», según cómo quedó', () => {
    expect(cambios({ privada: { de: false, a: true } }).vistos).toEqual(['La hizo privada'])
    expect(cambios({ privada: { de: true, a: false } }).vistos).toEqual(['La hizo pública'])
  })

  it('aprobarla la hace pública: la revisión dice las dos cosas que cambiaron', () => {
    expect(
      cambios({ privada: { de: true, a: false }, clase: { de: 'preventa', a: 'final' } }).vistos,
    ).toEqual(['Pasó a final', 'La hizo pública'])
  })
})

describe('cambiosDeLaRevision › un cálculo pisado o devuelto al calculado', () => {
  // `flete` y `seguro` son cálculos que quien mira ve; `fob`, un dato.
  const calculos = {
    calculos: new Map([
      ['flete', 'usd'],
      ['seguro', 'pct'],
    ] as const),
    decimales: new Map<string, number>(),
  }
  const conCalculos = (diff: Record<string, unknown>, vehiculo = null) =>
    cambiosDeLaRevision(diff, etiquetas, vehiculo, calculos)

  it('pisado: la fuente pasó a override en un cálculo, con de cuánto a cuánto y su formato, en vez de «Cambió «X»»', () => {
    const r = conCalculos({
      valores: { de: { flete: 480, fob: 1 }, a: { flete: 500, fob: 2 } },
      fuentes: { de: {}, a: { flete: 'override', fob: 'input' } },
    })
    expect(r.vistos).toEqual([
      {
        tipo: 'pisado',
        etiqueta: 'Flete',
        valores: { de: 480, a: 500 },
        formato: 'usd',
      },
      'Cambió «FOB»',
    ])
    expect(r.masN).toBe(0)
  })

  it('devuelto: la fuente dejó de ser override; los dos van primero, por etiqueta', () => {
    const r = conCalculos({
      valores: { de: { seguro: 0.05, flete: 500 }, a: { seguro: 0.04, flete: 480 } },
      fuentes: { de: { flete: 'override' }, a: { seguro: 'override' } },
    })
    expect(r.vistos.map((c) => (typeof c === 'string' ? c : `${c.tipo} ${c.etiqueta}`))).toEqual([
      'devuelto Flete',
      'pisado Seguro',
    ])
  })

  it('pisado con lo mismo que daba: sin montos; un valor que falta, nulo', () => {
    const igual = conCalculos({ fuentes: { de: {}, a: { flete: 'override' } } })
    expect(igual.vistos).toEqual([
      { tipo: 'pisado', etiqueta: 'Flete', valores: null, formato: 'usd' },
    ])
    const sinValor = conCalculos({
      valores: { de: { flete: null }, a: { flete: 500 } },
      fuentes: { de: {}, a: { flete: 'override' } },
    })
    expect(sinValor.vistos[0]).toMatchObject({ valores: { de: null, a: 500 } })
  })

  it('un override sobre algo que no es un cálculo que quien mira ve, o que siguió pisado, es «Cambió «X»»', () => {
    const r = conCalculos({
      valores: { de: { fob: 1, flete: 500 }, a: { fob: 2, flete: 510 } },
      fuentes: { de: { flete: 'override' }, a: { fob: 'override', flete: 'override' } },
    })
    expect(r.vistos).toEqual(['Cambió «Flete»', 'Cambió «FOB»'])
    // Sin los cálculos (la lectura de antes), todo se dice como siempre.
    const sin = cambiosDeLaRevision({ fuentes: { de: {}, a: { flete: 'override' } } }, etiquetas)
    expect(sin.vistos).toEqual(['Cambió «Flete»'])
  })

  it('el vehículo nombrado sigue primero y lo pisado cuenta para «y N más»', () => {
    const r = cambiosDeLaRevision(
      {
        vehiculo_id: { de: 'x', a: 'y' },
        valores: { de: { flete: 480, pub: 1, zeta: 1 }, a: { flete: 500, pub: 2, zeta: 2 } },
        fuentes: { de: {}, a: { flete: 'override' } },
      },
      etiquetas,
      { de: { titulo: 'A' }, a: { titulo: 'B' } },
      calculos,
    )
    expect(r.vistos[0]).toBe('Cambió el vehículo: A → B')
    expect(r.vistos[1]).toMatchObject({ tipo: 'pisado', etiqueta: 'Flete' })
    expect(r.vistos[2]).toBe('Cambió «Precio publicado»')
    expect(r.masN).toBe(1)
  })
})

describe('cambiosDeLaRevision › los «Decimales» de lo pisado', () => {
  it('lo pisado lleva los «Decimales» del cálculo que los trae; sin ellos, ninguna clave', () => {
    const r = cambiosDeLaRevision(
      {
        valores: { de: { flete: 480, seguro: 0.05 }, a: { flete: 500, seguro: 0.04 } },
        fuentes: { de: {}, a: { flete: 'override', seguro: 'override' } },
      },
      etiquetas,
      null,
      {
        calculos: new Map([
          ['flete', 'usd'],
          ['seguro', 'pct'],
        ] as const),
        decimales: new Map([['flete', 0]]),
      },
    )
    expect(r.vistos[0]).toEqual({
      tipo: 'pisado',
      etiqueta: 'Flete',
      valores: { de: 480, a: 500 },
      formato: 'usd',
      decimales: 0,
    })
    expect(Object.keys(r.vistos[1] ?? {})).not.toContain('decimales')
  })
})
