import { describe, expect, it } from 'vitest'
import type { PaginaDeArte } from '../documento'
import { pagina, rect } from './capas-de-prueba.soporte'
import { filasDeCapas, moverEnCapas, ordenar } from './orden'

const orden = (p: PaginaDeArte) => p.capas.map((c) => `${c.id}${c.grupoId ? `:${c.grupoId}` : ''}`)
const sueltas = pagina([rect('a'), rect('b'), rect('c'), rect('d')])
const conGrupo = pagina([rect('a'), rect('b', 'G'), rect('c', 'G'), rect('d')], ['G'])

describe('ordenar', () => {
  it('al frente y al fondo, en su orden', () => {
    expect(orden(ordenar(sueltas, ['a', 'c'], 'frente'))).toEqual(['b', 'd', 'a', 'c'])
    expect(orden(ordenar(sueltas, ['b', 'd'], 'atras'))).toEqual(['b', 'd', 'a', 'c'])
  })

  it('un paso hacia arriba o abajo', () => {
    expect(orden(ordenar(sueltas, ['a', 'b'], 'subir'))).toEqual(['c', 'a', 'b', 'd'])
    expect(orden(ordenar(sueltas, ['c'], 'bajar'))).toEqual(['a', 'c', 'b', 'd'])
  })

  it('sin cambio, la misma página', () => {
    expect(ordenar(sueltas, ['d'], 'frente')).toBe(sueltas)
    expect(ordenar(sueltas, ['a'], 'bajar')).toBe(sueltas)
    expect(ordenar(sueltas, ['x'], 'subir')).toBe(sueltas)
  })

  it('un grupo se ordena entero', () => {
    expect(orden(ordenar(conGrupo, ['a'], 'subir'))).toEqual(['b:G', 'c:G', 'a', 'd'])
    expect(orden(ordenar(conGrupo, ['b', 'c'], 'frente'))).toEqual(['a', 'd', 'b:G', 'c:G'])
    expect(orden(ordenar(conGrupo, ['b', 'd'], 'atras'))).toEqual(['b:G', 'c:G', 'd', 'a'])
  })

  it('algunos miembros se ordenan dentro de su grupo', () => {
    expect(orden(ordenar(conGrupo, ['b'], 'frente'))).toEqual(['a', 'c:G', 'b:G', 'd'])
    expect(orden(ordenar(conGrupo, ['c'], 'atras'))).toEqual(['a', 'c:G', 'b:G', 'd'])
  })
})

describe('moverEnCapas', () => {
  it('queda encima si subía y debajo si bajaba', () => {
    expect(orden(moverEnCapas(sueltas, 'a', 'c'))).toEqual(['b', 'c', 'a', 'd'])
    expect(orden(moverEnCapas(sueltas, 'd', 'b'))).toEqual(['a', 'd', 'b', 'c'])
  })

  it('sobre un miembro entra al grupo', () => {
    expect(orden(moverEnCapas(conGrupo, 'd', 'b'))).toEqual(['a', 'd:G', 'b:G', 'c:G'])
  })

  it('sobre la fila de un grupo o una suelta, queda suelta', () => {
    expect(orden(moverEnCapas(conGrupo, 'a', 'G'))).toEqual(['b:G', 'c:G', 'a', 'd'])
    expect(orden(moverEnCapas(conGrupo, 'c', 'd'))).toEqual(['a', 'b:G', 'd', 'c'])
  })

  it('un grupo se mueve entero y nunca entra a otro', () => {
    expect(orden(moverEnCapas(conGrupo, 'G', 'a'))).toEqual(['b:G', 'c:G', 'a', 'd'])
    const dos = pagina([rect('a', 'H'), rect('b', 'H'), rect('c', 'G'), rect('d', 'G')], ['G', 'H'])
    expect(orden(moverEnCapas(dos, 'H', 'c'))).toEqual(['c:G', 'd:G', 'a:H', 'b:H'])
  })

  it('el último miembro que sale borra el grupo', () => {
    const uno = pagina([rect('a', 'G'), rect('b')], ['G'])
    const movida = moverEnCapas(uno, 'a', 'b')
    expect(orden(movida)).toEqual(['b', 'a'])
    expect(movida.grupos).toEqual([])
  })

  it('sobre sí mismo o algo que no está, la misma página', () => {
    expect(moverEnCapas(conGrupo, 'a', 'a')).toBe(conGrupo)
    expect(moverEnCapas(conGrupo, 'G', 'b')).toBe(conGrupo)
    expect(moverEnCapas(conGrupo, 'x', 'a')).toBe(conGrupo)
    expect(moverEnCapas(conGrupo, 'a', 'x')).toBe(conGrupo)
  })
})

describe('filasDeCapas', () => {
  it('de arriba hacia abajo, con la fila del grupo sobre sus miembros', () => {
    const filas = filasDeCapas(conGrupo).map((f) =>
      f.tipo === 'grupo'
        ? `grupo ${f.grupo.id} (${String(f.miembros)})`
        : `${f.enGrupo ? '  ' : ''}${f.capa.id}`,
    )
    expect(filas).toEqual(['d', 'grupo G (2)', '  c', '  b', 'a'])
  })
})
