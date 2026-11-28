import { describe, expect, it } from 'vitest'
import type { DocumentoDeArte, PaginaDeArte } from '../documento'
import { pagina, rect } from './capas-de-prueba.soporte'
import {
  estadoInicial,
  paginaDe,
  portapapelesDeLaSeleccion,
  puedeDeshacer,
  reducirEditor,
  type AccionDelEstado,
} from './estado'

const documento = (p: PaginaDeArte): DocumentoDeArte => ({ version: 2, paginas: [p] })
const ids = (d: DocumentoDeArte) => paginaDe(d)?.capas.map((c) => c.id)
const correr = (inicio: DocumentoDeArte, acciones: AccionDelEstado[]) =>
  acciones.reduce(reducirEditor, estadoInicial(inicio))

describe('reducirEditor: el documento y el historial', () => {
  const base = documento(pagina([rect('a'), rect('b')]))

  it('agregar elige lo agregado y se deshace', () => {
    const e = correr(base, [{ tipo: 'agregar', capas: [rect('c')] }])
    expect(ids(e.documento)).toEqual(['a', 'b', 'c'])
    expect(e.seleccion).toEqual(['c'])
    const atras = reducirEditor(e, { tipo: 'deshacer' })
    expect(atras.documento).toBe(base)
    expect(atras.seleccion).toEqual([])
    expect(reducirEditor(atras, { tipo: 'rehacer' }).documento).toBe(e.documento)
  })

  it('lo que no cambia nada devuelve el mismo estado', () => {
    const e = estadoInicial(base)
    expect(reducirEditor(e, { tipo: 'ordenar', hacia: 'frente' })).toBe(e)
    expect(reducirEditor(e, { tipo: 'quitar' })).toBe(e)
    expect(reducirEditor(e, { tipo: 'deshacer' })).toBe(e)
    expect(reducirEditor(e, { tipo: 'mover', ids: ['a'], dx: 0, dy: 0 })).toBe(e)
  })

  it('un arrastre seguido es un solo paso', () => {
    const e = correr(base, [
      { tipo: 'mover', ids: ['a'], dx: 1, dy: 0, fusion: { clave: 'arrastre', en: 0 } },
      { tipo: 'mover', ids: ['a'], dx: 1, dy: 0, fusion: { clave: 'arrastre', en: 100 } },
      { tipo: 'mover', ids: ['a'], dx: 1, dy: 0, fusion: { clave: 'arrastre', en: 200 } },
    ])
    expect(paginaDe(e.documento)?.capas[0]?.x).toBe(3)
    expect(e.historial.pasado).toHaveLength(1)
    expect(reducirEditor(e, { tipo: 'deshacer' }).documento).toBe(base)
  })

  it('medir un texto no es un paso', () => {
    const conTexto = documento(
      pagina([
        {
          ...rect('t'),
          tipo: 'texto',
          texto: 'Hola',
          fuente: 'geist',
          tamano: 24,
          peso: 400,
          interlineado: 1.2,
          color: '#000000',
          alineacion: 'izquierda',
          borde: null,
          grosor: 0,
        } as never,
      ]),
    )
    const e = reducirEditor(estadoInicial(conTexto), { tipo: 'medirTexto', id: 't', alto: 29 })
    expect(paginaDe(e.documento)?.capas[0]?.alto).toBe(29)
    expect(puedeDeshacer(e)).toBe(false)
  })

  it('reemplazar se deshace; reiniciar empieza de cero', () => {
    const otro = documento(pagina([rect('z')]))
    const e = reducirEditor(estadoInicial(base), { tipo: 'reemplazar', documento: otro })
    expect(reducirEditor(e, { tipo: 'deshacer' }).documento).toBe(base)
    expect(puedeDeshacer(reducirEditor(e, { tipo: 'reiniciar', documento: base }))).toBe(false)
  })
})

describe('reducirEditor: la selección', () => {
  const base = documento(pagina([rect('a'), rect('b', 'G'), rect('c', 'G')], ['G']))

  it('elige, suma y alterna en el orden de la página', () => {
    let e = reducirEditor(estadoInicial(base), { tipo: 'elegir', ids: ['c'], modo: 'reemplazar' })
    e = reducirEditor(e, { tipo: 'elegir', ids: ['a'], modo: 'sumar' })
    expect(e.seleccion).toEqual(['a', 'c'])
    e = reducirEditor(e, { tipo: 'elegir', ids: ['a'], modo: 'alternar' })
    expect(e.seleccion).toEqual(['c'])
    expect(reducirEditor(e, { tipo: 'elegir', ids: ['x'], modo: 'reemplazar' }).seleccion).toEqual(
      [],
    )
  })

  it('quitar vacía la selección y agrupar la conserva', () => {
    let e = reducirEditor(estadoInicial(base), {
      tipo: 'elegir',
      ids: ['a', 'b'],
      modo: 'reemplazar',
    })
    e = reducirEditor(e, { tipo: 'agrupar', nuevoId: 'N' })
    expect(e.seleccion).toEqual(['a', 'b'])
    expect(paginaDe(e.documento)?.capas.map((c) => c.grupoId)).toEqual(['N', 'N', 'G'])
    e = reducirEditor(e, { tipo: 'quitar' })
    expect(ids(e.documento)).toEqual(['c'])
    expect(e.seleccion).toEqual([])
  })

  it('duplicar y pegar eligen las copias', () => {
    let n = 0
    const nuevoId = () => `n${String(++n)}`
    let e = reducirEditor(estadoInicial(base), { tipo: 'elegir', ids: ['a'], modo: 'reemplazar' })
    const copia = portapapelesDeLaSeleccion(e)
    e = reducirEditor(e, { tipo: 'duplicar', nuevoId })
    expect(e.seleccion).toEqual(['n1'])
    expect(paginaDe(e.documento)?.capas.at(-1)?.x).toBe(16)
    e = copia ? reducirEditor(e, { tipo: 'pegar', portapapeles: copia, nuevoId, vez: 2 }) : e
    expect(e.seleccion).toEqual(['n2'])
    expect(paginaDe(e.documento)?.capas.at(-1)?.x).toBe(32)
  })

  it('deshacer deja elegido sólo lo que sigue existiendo', () => {
    let e = reducirEditor(estadoInicial(base), { tipo: 'agregar', capas: [rect('d')] })
    e = reducirEditor(e, { tipo: 'elegir', ids: ['a', 'd'], modo: 'reemplazar' })
    expect(reducirEditor(e, { tipo: 'deshacer' }).seleccion).toEqual(['a'])
  })
})
