import { describe, expect, it } from 'vitest'
import type { LecturaDeLaTarjeta } from '../lectura-de-la-tarjeta'
import { aplicarRetoques, cuantosRetoques, lecturaRetocada } from './aplicar-retoques'
import { CUADRICULA_DE_RETOQUES as P } from './retoques.soporte'

const celda = (r: ReturnType<typeof aplicarRetoques>, id: string) =>
  r.plantilla.celdas.find((c) => c.id === id)

describe('aplicarRetoques', () => {
  it('sin retoques, la cuadrícula tal cual', () => {
    expect(aplicarRetoques(P, null)).toEqual({ plantilla: P, aplican: null, noAplican: 0 })
  })

  it('cambia el texto de las celdas de texto y no toca lo demás', () => {
    const r = aplicarRetoques(P, { celdas: { c_saludo: 'Para Juan', constructor: 'Chau' } })
    expect(celda(r, 'c_saludo')?.contenido).toEqual({ tipo: 'texto', texto: 'Para Juan' })
    expect(celda(r, 'constructor')?.contenido).toEqual({ tipo: 'texto', texto: 'Chau' })
    expect(celda(r, 'c_monto')).toEqual(P.celdas[3])
    expect(r.plantilla.filas).toEqual(P.filas)
    expect(r.aplican).toEqual({ celdas: { c_saludo: 'Para Juan', constructor: 'Chau' } })
    expect(r.noAplican).toBe(0)
  })

  it('cuenta los que no aplican: una celda que no está, una que no es de texto y una fila que no está', () => {
    const r = aplicarRetoques(P, {
      celdas: { c_otra: 'x', c_monto: 'y', c_logo: 'z', c_saludo: 'Sí' },
      filas_ocultas: ['f_otra', 'f_titulo'],
    })
    expect(r.noAplican).toBe(4)
    expect(r.aplican).toEqual({ celdas: { c_saludo: 'Sí' }, filas_ocultas: ['f_titulo'] })
    expect(cuantosRetoques({ celdas: { a: '1', b: '2' }, filas_ocultas: ['c'] })).toBe(3)
  })

  it('ninguno aplica: aplican es nulo', () => {
    const r = aplicarRetoques(P, { celdas: { c_otra: 'x' } })
    expect(r).toMatchObject({ aplican: null, noAplican: 1 })
  })

  it('quita las filas ocultas: la celda que empieza en una oculta pasa a la que queda y la que la cruza se acorta', () => {
    const r = aplicarRetoques(P, { filas_ocultas: ['f_flete'] })
    expect(r.plantilla.filas.map((f) => f.id)).toEqual(['f_titulo', 'constructor'])
    // c_grupo empezaba en f_flete y abarcaba dos: queda en constructor, de una fila.
    expect(celda(r, 'c_grupo')).toEqual({
      id: 'c_grupo',
      fila: 'constructor',
      columna: 'a',
      contenido: { tipo: 'texto', texto: 'Logística' },
    })
    // c_monto sólo estaba en f_flete: se va.
    expect(celda(r, 'c_monto')).toBeUndefined()
    const s = aplicarRetoques(P, { filas_ocultas: ['constructor'] })
    expect(celda(s, 'c_grupo')).toMatchObject({ fila: 'f_flete' })
    expect(celda(s, 'c_grupo')?.abarca_filas).toBeUndefined()
    expect(celda(s, 'constructor')).toBeUndefined()
  })

  it('una fila del medio de una combinación: la celda abarca las que le quedan', () => {
    const alta = {
      ...P,
      filas: [...P.filas, { id: 'f_pie', alto: 20, ocultar_si: 'nunca' as const }],
      celdas: [
        {
          id: 'c_lado',
          fila: 'f_titulo',
          columna: 'a',
          abarca_filas: 4,
          contenido: { tipo: 'texto' as const, texto: 'Lado' },
        },
      ],
    }
    const r = aplicarRetoques(alta, { filas_ocultas: ['f_flete'] })
    expect(celda(r, 'c_lado')).toMatchObject({ fila: 'f_titulo', abarca_filas: 3 })
  })

  it('con ocultarFilas falso (el modo «Retocar»), las filas ocultas quedan y se dicen', () => {
    const r = aplicarRetoques(
      P,
      { celdas: { c_saludo: 'Para Juan' }, filas_ocultas: ['f_flete'] },
      { ocultarFilas: false },
    )
    expect(r.plantilla.filas).toEqual(P.filas)
    expect(celda(r, 'c_monto')).toEqual(P.celdas[3])
    expect(celda(r, 'c_saludo')?.contenido).toEqual({ tipo: 'texto', texto: 'Para Juan' })
    expect(r.aplican).toEqual({ celdas: { c_saludo: 'Para Juan' }, filas_ocultas: ['f_flete'] })
  })

  it('las filas ocultas aplicadas van en el orden de la plantilla y una vez', () => {
    const r = aplicarRetoques(P, { filas_ocultas: ['constructor', 'f_titulo', 'constructor'] })
    expect(r.aplican).toEqual({ filas_ocultas: ['f_titulo', 'constructor'] })
  })
})

describe('lecturaRetocada', () => {
  const lista = { estado: 'lista', definicion: P } as unknown as LecturaDeLaTarjeta

  it('sin retoques, la misma lectura', () => {
    expect(lecturaRetocada(lista, null).lectura).toBe(lista)
  })

  it('con retoques, la definición retocada y lo demás igual', () => {
    const r = lecturaRetocada(lista, { filas_ocultas: ['constructor'] })
    expect(r.lectura.estado === 'lista' && r.lectura.definicion.filas.length).toBe(2)
    expect(r).toMatchObject({ aplican: { filas_ocultas: ['constructor'] }, noAplican: 0 })
  })

  it('la tarjeta por omisión no tiene textos ni filas: todos no aplican', () => {
    const sin: LecturaDeLaTarjeta = { estado: 'sin_plantilla' }
    expect(lecturaRetocada(sin, { celdas: { a: 'x' }, filas_ocultas: ['b'] })).toEqual({
      lectura: sin,
      aplican: null,
      noAplican: 2,
    })
  })
})

describe('aplicarRetoques sobre un texto con datos', () => {
  it('una celda con un texto con datos se retoca como un texto: el retoque la reemplaza por un texto fijo', () => {
    const conDatos = {
      ...P,
      celdas: P.celdas.map((c) =>
        c.id === 'c_saludo'
          ? {
              ...c,
              contenido: {
                tipo: 'texto' as const,
                partes: ['Hola ', { tipo: 'dato' as const, variable: 'cliente_nombre' }],
              },
            }
          : c,
      ),
    }
    const r = aplicarRetoques(conDatos, { celdas: { c_saludo: 'Hola Juan, con descuento' } })
    expect(celda(r, 'c_saludo')?.contenido).toEqual({
      tipo: 'texto',
      texto: 'Hola Juan, con descuento',
    })
    expect(r.noAplican).toBe(0)
  })
})
