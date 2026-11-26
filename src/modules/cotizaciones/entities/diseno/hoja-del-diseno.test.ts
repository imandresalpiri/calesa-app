import { describe, expect, it } from 'vitest'
import { esquemaDefinicion } from '../formula'
import { celda, disenoDe, formulaDePrueba, seccion } from './diseno-de-prueba.soporte'
import { hojaDeLaVistaPrevia } from './hoja-del-diseno'

const ORIGEN = { id: '11111111-1111-4111-8111-111111111111', nombre: 'Miami' }
const claro = { fondo: '#ffffff', borde: '#000000', tinta: '#111111' }
const tonos = [
  { clave: 'costos', claro, oscuro: claro },
  { clave: 'sobra', claro, oscuro: claro },
]
const conGrupo = esquemaDefinicion.parse({
  ...formulaDePrueba,
  nodos: formulaDePrueba.nodos.map((n) =>
    n.id === 'a' || n.id === 'b' ? { ...n, grupo: 'g1' } : n,
  ),
  buckets: { oficial: 'tc' },
  grupos: [{ id: 'g1', etiqueta: 'Grupo', tono: 'costos', bucket: 'oficial' }],
})

describe('hojaDeLaVistaPrevia', () => {
  const diseno = disenoDe([
    seccion('s', [
      { tipo: 'variante', nodo: 'variante' },
      celda('a', { ancho: 'mitad', ayuda: { texto: 'Una ayuda' } }),
      celda('comision', { secundario: 'porcentaje' }),
      { tipo: 'interruptor', nodo: 'libre', efecto: 'muestra' },
      { tipo: 'subtotal', nodo: 'neto' },
      celda('nodo_que_ya_no_existe'),
    ]),
    seccion('t', [celda('c')], { presentacion: 'avanzado', titulo: 'Aparte' }),
  ])

  it('T1 · trae los ítems, etiquetas y formatos de la fórmula y omite un nodo que no existe', () => {
    const hoja = hojaDeLaVistaPrevia(ORIGEN, diseno, formulaDePrueba, [])
    expect(hoja.estado).toBe('lista')
    expect(hoja.secciones.map((s) => [s.id, s.presentacion, s.titulo])).toStrictEqual([
      ['s', 'principal', null],
      ['t', 'avanzado', 'Aparte'],
    ])
    const items = hoja.secciones[0]?.items ?? []
    expect(items.map((i) => `${i.tipo}:${i.nodo}`)).toStrictEqual([
      'variante:variante',
      'celda:a',
      'celda:comision',
      'interruptor:libre',
      'subtotal:neto',
    ])
    const a = items[1]
    expect(a).toMatchObject({
      etiqueta: 'A',
      formato: 'usd',
      ancho: 'mitad',
      ayuda: [{ tipo: 'texto', texto: 'Una ayuda' }],
      editable: true,
      motivo: null,
      ajustes: false,
    })
    expect(items[0]).toMatchObject({ porDefecto: null, opciones: [{ clave: 'x' }, { clave: 'y' }] })
    expect(items[2]).toMatchObject({
      secundario: { nodo: 'tasa', como: 'porcentaje', formato: 'pct' },
    })
    expect(items[3]).toMatchObject({ efecto: 'muestra' })
    expect(items[4]).toMatchObject({ etiqueta: 'Neto', formato: 'usd' })
    expect(hoja.tarjetaTotal).toMatchObject({ nodo: 'total', etiqueta: 'Total', secundarios: [] })
  })

  it('T1 · toma el tono sólo si el catálogo lo tiene y sólo los que el diseño usa', () => {
    const d = disenoDe([seccion('s', [celda('a'), celda('c')])])
    const hoja = hojaDeLaVistaPrevia(ORIGEN, d, conGrupo, tonos)
    expect(hoja.tonos.map((t) => t.clave)).toStrictEqual(['costos'])
    expect(hoja.secciones[0]?.items[0]).toMatchObject({ tono: 'costos' })
    expect(hoja.secciones[0]?.items[1]).toMatchObject({ tono: null })
    // Sin ese tono en el catálogo, la celda sigue con su clave y la hoja no manda un tono que no existe.
    expect(hojaDeLaVistaPrevia(ORIGEN, d, conGrupo, []).tonos).toStrictEqual([])
  })
})

describe('hojaDeLaVistaPrevia: la ayuda', () => {
  it('T1 · la ayuda en bloques, sin recortes: una tabla sin cómo casa ni id de la viva, y sin ayuda, nula', () => {
    const d = disenoDe([
      seccion('s', [
        celda('a', {
          ayuda: [
            { tipo: 'titulo', texto: 'Fletes' },
            {
              tipo: 'tabla',
              tabla: 'fletes',
              columnas: [{ columna: 'monto', llena: 'a' }, { columna: 'zona' }],
              resaltar: true,
            },
            { tipo: 'tabla', tabla: 'otra' },
          ],
        }),
        celda('c'),
      ]),
    ])
    const [a, c] = hojaDeLaVistaPrevia(ORIGEN, d, formulaDePrueba, []).secciones[0]?.items ?? []
    expect(a).toMatchObject({
      ayuda: [
        { tipo: 'titulo', texto: 'Fletes' },
        {
          tipo: 'tabla',
          tabla: 'fletes',
          columnas: [
            { columna: 'monto', llena: 'a' },
            { columna: 'zona', llena: null },
          ],
          resaltar: true,
          casa: null,
          id: null,
        },
        { tipo: 'tabla', tabla: 'otra', columnas: null, resaltar: false, casa: null, id: null },
      ],
    })
    expect(c).toMatchObject({ ayuda: null })
  })
})

describe('hojaDeLaVistaPrevia: el aspecto', () => {
  it('T1 · copia el aspecto sin escribir claves vacías y pinta los tonos de las secciones que dibuja y de la cabecera', () => {
    const sinAspecto = hojaDeLaVistaPrevia(
      ORIGEN,
      disenoDe([seccion('s', [celda('a')])]),
      conGrupo,
      tonos,
    )
    expect(Object.keys(sinAspecto.secciones[0] ?? {}).sort()).toStrictEqual([
      'id',
      'items',
      'presentacion',
      'titulo',
    ])
    expect(Object.keys(sinAspecto.cabecera).sort()).toStrictEqual([
      'ajustes',
      'modoPorDefecto',
      'modos',
      'modosVisibles',
      'monedaBs',
      'verTotalBs',
      'verTotalBsPorDefecto',
    ])
    const base = disenoDe([
      seccion('s', [celda('c', { ancho: 8, alto: 2, letra: 'chica' })], {
        tono: 'sobra',
        densidad: 'compacta',
      }),
      seccion('vacia', [celda('nodo_que_ya_no_existe')], { tono: 'otro' }),
    ])
    const d = {
      ...base,
      cabecera: { ...base.cabecera, tono: 'costos', relleno: 'grande' as const },
    }
    const hoja = hojaDeLaVistaPrevia(ORIGEN, d, conGrupo, tonos)
    expect(hoja.secciones.map((s) => s.id)).toStrictEqual(['s'])
    expect(hoja.secciones[0]).toMatchObject({ tono: 'sobra', densidad: 'compacta' })
    expect(hoja.secciones[0]?.items[0]).toMatchObject({ ancho: 8, alto: 2, letra: 'chica' })
    expect(hoja.cabecera).toMatchObject({ tono: 'costos', relleno: 'grande' })
    // La sección que no se dibuja no pinta su tono; los del catálogo que se usan, sí.
    expect(hoja.tonos.map((t) => t.clave)).toStrictEqual(['costos', 'sobra'])
  })
})

describe('hojaDeLaVistaPrevia: los «Decimales» de cada celda', () => {
  it('T1 · copia los del nodo a la celda, su porcentaje, el subtotal, el total y la tarjeta; sin ellos, ninguna clave', () => {
    const conDecimales = esquemaDefinicion.parse({
      ...formulaDePrueba,
      nodos: formulaDePrueba.nodos.map((n) =>
        n.id === 'a' || n.id === 'neto'
          ? { ...n, decimales: 0 }
          : n.id === 'tasa'
            ? { ...n, decimales: 1 }
            : n.id === 'total'
              ? { ...n, decimales: 3 }
              : n,
      ),
    })
    const diseno = disenoDe([
      seccion('s', [
        celda('a'),
        celda('b'),
        celda('comision', { secundario: 'porcentaje' }),
        { tipo: 'subtotal', nodo: 'neto' },
        { tipo: 'total' },
      ]),
    ])
    const hoja = hojaDeLaVistaPrevia(ORIGEN, diseno, conDecimales, [])
    const items = hoja.secciones[0]?.items ?? []
    const porNodo = new Map(items.map((i) => [i.nodo, i]))
    expect(porNodo.get('a')).toMatchObject({ decimales: 0 })
    expect(porNodo.get('b')).not.toHaveProperty('decimales')
    expect(porNodo.get('comision')).not.toHaveProperty('decimales')
    expect(porNodo.get('comision')).toMatchObject({ secundario: { nodo: 'tasa', decimales: 1 } })
    expect(porNodo.get('neto')).toMatchObject({ tipo: 'subtotal', decimales: 0 })
    expect(porNodo.get('total')).toMatchObject({ tipo: 'total', decimales: 3 })
    expect(hoja.tarjetaTotal).toMatchObject({ nodo: 'total', decimales: 3 })
    expect(
      hojaDeLaVistaPrevia(ORIGEN, diseno, formulaDePrueba, []).tarjetaTotal,
    ).not.toHaveProperty('decimales')
  })
})
