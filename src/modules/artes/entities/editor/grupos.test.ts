import { describe, expect, it } from 'vitest'
import type { PaginaDeArte } from '../documento'
import {
  agrupar,
  desagrupar,
  estaBloqueada,
  estaOculta,
  idsParaElegir,
  limpiarGrupos,
  posicionSinPartirGrupos,
} from './grupos'
import { pagina, rect } from './capas-de-prueba.soporte'

const orden = (p: PaginaDeArte) => p.capas.map((c) => `${c.id}${c.grupoId ? `:${c.grupoId}` : ''}`)

describe('agrupar', () => {
  it('junta las elegidas donde estaba la de más arriba', () => {
    const p = agrupar(pagina([rect('a'), rect('b'), rect('c'), rect('d')]), ['a', 'c'], 'g')
    expect(orden(p)).toEqual(['b', 'a:g', 'c:g', 'd'])
    expect(p.grupos).toEqual([{ id: 'g', nombre: 'Grupo 1', oculto: false, bloqueado: false }])
  })

  it('no parte otro grupo al insertar', () => {
    const p = pagina([rect('z'), rect('a', 'G'), rect('b', 'G'), rect('c', 'G')], ['G'])
    expect(orden(agrupar(p, ['z', 'b'], 'n'))).toEqual(['a:G', 'c:G', 'z:n', 'b:n'])
  })

  it('saca a las elegidas de su grupo y borra el que queda vacío', () => {
    const p = pagina([rect('a', 'G'), rect('b', 'G'), rect('c')], ['G'])
    const juntas = agrupar(p, ['a', 'b', 'c'], 'n')
    expect(orden(juntas)).toEqual(['a:n', 'b:n', 'c:n'])
    expect(juntas.grupos.map((g) => g.id)).toEqual(['n'])
  })

  it('con menos de dos capas, nada', () => {
    const p = pagina([rect('a'), rect('b')])
    expect(agrupar(p, ['a'], 'g')).toBe(p)
    expect(agrupar(p, ['x', 'y'], 'g')).toBe(p)
  })

  it('numera el grupo nuevo después del mayor', () => {
    const p = pagina([rect('a'), rect('b'), rect('c', 'G')], ['G'])
    const conNombre = {
      ...p,
      grupos: [{ id: 'G', nombre: 'Grupo 4', oculto: false, bloqueado: false }],
    }
    expect(agrupar(conNombre, ['a', 'b'], 'n').grupos.at(-1)?.nombre).toBe('Grupo 5')
  })
})

describe('desagrupar y limpiar', () => {
  it('deja sueltos a todos los miembros del grupo de una elegida', () => {
    const p = pagina([rect('a', 'G'), rect('b', 'G'), rect('c')], ['G'])
    const sueltas = desagrupar(p, ['a'])
    expect(orden(sueltas)).toEqual(['a', 'b', 'c'])
    expect(sueltas.grupos).toEqual([])
    expect(desagrupar(p, ['c'])).toBe(p)
  })

  it('limpiar borra sólo los grupos sin miembros', () => {
    const p = pagina([rect('a', 'G')], ['G', 'H'])
    expect(limpiarGrupos(p).grupos.map((g) => g.id)).toEqual(['G'])
    expect(limpiarGrupos(limpiarGrupos(p))).toEqual(limpiarGrupos(p))
  })

  it('una posición entre dos miembros va al final del grupo', () => {
    const capas = [rect('a', 'G'), rect('b', 'G'), rect('c')]
    expect(posicionSinPartirGrupos(capas, 1)).toBe(2)
    expect(posicionSinPartirGrupos(capas, 0)).toBe(0)
    expect(posicionSinPartirGrupos(capas, 3)).toBe(3)
  })
})

describe('elegir, bloquear y ocultar con grupos', () => {
  it('un clic elige el grupo entero; adentro, sólo la capa', () => {
    const p = pagina([rect('a', 'G'), rect('b', 'G'), rect('c')], ['G'])
    expect(idsParaElegir(p, 'a', false)).toEqual(['a', 'b'])
    expect(idsParaElegir(p, 'a', true)).toEqual(['a'])
    expect(idsParaElegir(p, 'c', false)).toEqual(['c'])
    expect(idsParaElegir(p, 'x', false)).toEqual([])
  })

  it('el grupo bloquea y oculta a sus miembros', () => {
    const p = pagina([rect('a', 'G'), rect('b')], ['G'])
    const cerrado = { ...p, grupos: [{ id: 'G', nombre: 'G', oculto: true, bloqueado: true }] }
    const [a, b] = cerrado.capas
    expect(a && estaBloqueada(cerrado, a)).toBe(true)
    expect(a && estaOculta(cerrado, a)).toBe(true)
    expect(b && estaBloqueada(cerrado, b)).toBe(false)
    expect(b && estaOculta(cerrado, { ...b, oculta: true })).toBe(true)
  })
})
