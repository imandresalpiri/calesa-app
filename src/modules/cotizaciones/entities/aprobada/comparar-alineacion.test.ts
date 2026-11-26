import { describe, expect, it } from 'vitest'
import type { ItemDeHoja, SeccionDeHoja } from '../hoja'
import { ROTULO_DE_AVANZADO, ROTULO_DE_TOTALES, filasAlineadas } from './comparar-alineacion'
import { A, B, C, PRECIO, celda, hoja, seccion, texto } from './comparar-de-prueba'

describe('filasAlineadas', () => {
  it('alinea por nodo con el rótulo de la primera columna que lo tiene; lo distinto contra la primera', () => {
    const a = hoja({ id: A, numero: 1, secciones: [PRECIO], valores: { fob: 100, flete: 50 } })
    const b = hoja({
      id: B,
      numero: 2,
      secciones: [
        seccion('precio', 'Otro título', [celda('fob', 'FOB nuevo'), celda('flete', 'Flete')]),
      ],
      valores: { fob: 120, flete: 40 },
    })
    const c = hoja({ id: C, numero: 3, secciones: [PRECIO], valores: { fob: 100, flete: null } })
    expect(texto(filasAlineadas([a, b, c]))).toEqual([
      '# Precio',
      'fob FOB: 100 igual | 120 mas | 100 igual',
      'flete Flete: 50 igual | 40 menos | null distinta',
    ])
  })

  it('un nodo sólo de la versión B va en su sección tras el último suyo; «—» (falta) en la versión sin él', () => {
    const a = hoja({ id: A, numero: 1, secciones: [PRECIO], valores: { fob: 100, flete: 50 } })
    const b = hoja({
      id: B,
      numero: 2,
      secciones: [
        seccion('precio', 'Precio', [
          celda('fob', 'FOB'),
          celda('seguro', 'Seguro'),
          celda('flete', 'Flete'),
        ]),
      ],
      valores: { fob: 100, seguro: 9, flete: 50 },
    })
    expect(texto(filasAlineadas([a, b]))).toEqual([
      '# Precio',
      'fob FOB: 100 igual | 100 igual',
      'seguro Seguro: falta | 9 distinta',
      'flete Flete: 50 igual | 50 igual',
    ])
  })

  it('una sección sólo de B va tras la última suya ya ubicada; sin título, la avanzada dice «Avanzado»', () => {
    const a = hoja({
      id: A,
      numero: 1,
      secciones: [PRECIO, seccion('fin', null, [celda('margen', 'Margen')])],
      valores: { fob: 1, flete: 2, margen: 3 },
    })
    const extra: SeccionDeHoja = {
      ...seccion('aduana', null, [celda('arancel', 'Arancel')]),
      presentacion: 'avanzado',
    }
    const b = hoja({
      id: B,
      numero: 2,
      secciones: [PRECIO, extra, seccion('fin', null, [celda('margen', 'Margen')])],
      valores: { fob: 1, flete: 2, arancel: 4, margen: 3 },
    })
    expect(texto(filasAlineadas([a, b])).filter((f) => f.startsWith('#'))).toEqual([
      '# Precio',
      `# ${ROTULO_DE_AVANZADO}`,
      '# Sin título',
    ])
  })

  it('un nodo que el diseño trae pero cuyo valor no vino (oculto en esa versión) es «falta»; si no viene en ninguna, no hay fila', () => {
    const a = hoja({ id: A, numero: 1, secciones: [PRECIO], valores: { fob: 1 } })
    const b = hoja({ id: B, numero: 2, secciones: [PRECIO], valores: { fob: 1, flete: 2 } })
    expect(texto(filasAlineadas([a, b]))).toContain('flete Flete: falta | 2 distinta')
    expect(texto(filasAlineadas([a, a])).some((f) => f.startsWith('flete'))).toBe(false)
  })
})

describe('filasAlineadas por tipo de ítem', () => {
  it('la variante por la etiqueta de su opción y el interruptor «Sí» / «No»', () => {
    const items: ItemDeHoja[] = [
      {
        tipo: 'variante',
        nodo: 'v',
        etiqueta: 'Tipo',
        opciones: [
          { clave: 'a', etiqueta: 'Sedán', titulo: 'S' },
          { clave: 'b', etiqueta: 'SUV', titulo: 'U' },
        ],
        porDefecto: 'a',
        editable: false,
        motivo: null,
      },
      {
        tipo: 'interruptor',
        nodo: 'seg',
        etiqueta: 'Con seguro',
        efecto: 'habilita',
        soloEn: null,
        editable: false,
        motivo: null,
      },
      { tipo: 'atajos', nodo: 'fob', chips: [] },
    ]
    const a = hoja({
      id: A,
      numero: 1,
      secciones: [seccion('s', 'S', items)],
      valores: { v: 'a', seg: 1 },
    })
    const b = hoja({
      id: B,
      numero: 2,
      secciones: [seccion('s', 'S', items)],
      valores: { v: 'b', seg: 0 },
    })
    expect(texto(filasAlineadas([a, b]))).toEqual([
      '# S',
      'v Tipo: Sedán igual | SUV distinta',
      'seg Con seguro: Sí igual | No distinta',
    ])
  })
})

describe('filasAlineadas con pares y lo aparte', () => {
  it('el porcentaje de un par es otra fila, y lo aparte de la tarjeta va en «Totales»', () => {
    const items: ItemDeHoja[] = [
      celda('com', 'Comisión', {
        secundario: {
          nodo: 'com_pct',
          tipoDeNodo: 'input',
          como: 'porcentaje',
          formato: 'pct',
          ajustes: false,
          editable: false,
          motivo: null,
        },
      }),
      { tipo: 'subtotal', nodo: 'sub', etiqueta: 'Subtotal', formato: 'usd', tono: null },
    ]
    const datos = {
      secciones: [seccion('s', 'S', items)],
      aparte: [{ nodo: 'bs', etiqueta: 'En bolivianos' }],
    }
    const a = hoja({
      id: A,
      numero: 1,
      ...datos,
      valores: { com: 10, com_pct: 0.1, sub: 10, bs: 69.6 },
    })
    const filas = filasAlineadas([a, a])
    expect(texto(filas)).toEqual([
      '# S',
      'com Comisión: 10 igual | 10 igual',
      'com_pct Comisión (%): 0.1 igual | 0.1 igual',
      'sub Subtotal: 10 igual | 10 igual',
      `# ${ROTULO_DE_TOTALES}`,
      'bs En bolivianos: 69.6 igual | 69.6 igual',
    ])
    expect(filas.find((f) => f.tipo === 'nodo' && f.nodo === 'com_pct')).toMatchObject({
      formato: 'pct',
    })
  })
})

describe('filasAlineadas con los decimales de cada celda', () => {
  it('cada fila lleva los «Decimales» de su nodo, los de la primera columna que lo trae; sin ellos, ninguna clave', () => {
    const items: ItemDeHoja[] = [
      celda('com', 'Comisión', {
        decimales: 0,
        secundario: {
          nodo: 'com_pct',
          tipoDeNodo: 'input',
          como: 'porcentaje',
          formato: 'pct',
          decimales: 1,
          ajustes: false,
          editable: false,
          motivo: null,
        },
      }),
      {
        tipo: 'subtotal',
        nodo: 'sub',
        etiqueta: 'Subtotal',
        formato: 'usd',
        decimales: 3,
        tono: null,
      },
      celda('flete', 'Flete'),
    ]
    const valores = { com: 10, com_pct: 0.1, sub: 10, flete: 5, bs: 69.6 }
    const a = hoja({ id: A, numero: 1, secciones: [seccion('s', 'S', items)], valores })
    const b = hoja({
      id: B,
      numero: 2,
      secciones: [seccion('s', 'S', [celda('com', 'Comisión', { decimales: 4 })])],
      valores,
    })
    const con = (d: number) => ({
      ...a.diseno.tarjetaTotal,
      secundarios: [{ nodo: 'bs', etiqueta: 'Bs', formato: 'usd' as const, decimales: d }],
    })
    const filas = filasAlineadas([
      { ...a, diseno: { ...a.diseno, tarjetaTotal: con(2) } },
      { ...b, diseno: { ...b.diseno, tarjetaTotal: con(0) } },
    ])
    const decimales = Object.fromEntries(
      filas.flatMap((f) => (f.tipo === 'nodo' ? [[f.nodo, f.decimales] as const] : [])),
    )
    expect(decimales).toEqual({ com: 0, com_pct: 1, sub: 3, flete: undefined, bs: 2 })
    const flete = filas.find((f) => f.tipo === 'nodo' && f.nodo === 'flete')
    expect(Object.keys(flete ?? {})).not.toContain('decimales')
  })
})

describe('filasAlineadas con una columna que falló', () => {
  it('una columna con error no aporta filas, sus celdas son de error y la referencia es la primera leída', () => {
    const b = hoja({ id: B, numero: 2, secciones: [PRECIO], valores: { fob: 1, flete: 2 } })
    const c = hoja({ id: C, numero: 3, secciones: [PRECIO], valores: { fob: 3, flete: 2 } })
    expect(texto(filasAlineadas([null, b, c]))).toEqual([
      '# Precio',
      'fob FOB: error | 1 igual | 3 mas',
      'flete Flete: error | 2 igual | 2 igual',
    ])
  })
})
