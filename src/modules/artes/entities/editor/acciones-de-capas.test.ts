import { describe, expect, it } from 'vitest'
import { MAXIMO_DE_CAPAS_POR_PAGINA } from '../documento'
import {
  agregarCapas,
  alinearCapas,
  alternar,
  copiasDe,
  distribuirCapas,
  hayLugar,
  idsEnRecuadro,
  MENSAJE_DEL_TOPE_DE_CAPAS,
  moverCapas,
  pegarCopias,
  portapapelesDe,
  quitarCapas,
  renombrar,
} from './acciones-de-capas'
import { pagina, rect } from './capas-de-prueba.soporte'

const cuadrado = { ancho: 100, alto: 100 }

describe('agregar, mover y quitar', () => {
  it('agrega encima y respeta el tope', () => {
    const p = pagina([rect('a')])
    expect(agregarCapas(p, [rect('b')])?.capas.map((c) => c.id)).toEqual(['a', 'b'])
    const llena = pagina(
      Array.from({ length: MAXIMO_DE_CAPAS_POR_PAGINA }, (_, i) => rect(`c${String(i)}`)),
    )
    expect(agregarCapas(llena, [rect('x')])).toBeNull()
  })

  it('mueve sólo las que no están bloqueadas', () => {
    const p = pagina([rect('a'), { ...rect('b'), bloqueada: true }, rect('c', 'G')], ['G'])
    const cerrado = { ...p, grupos: [{ id: 'G', nombre: 'G', oculto: false, bloqueado: true }] }
    const movida = moverCapas(cerrado, ['a', 'b', 'c'], { dx: 5, dy: -2 })
    expect(movida.capas.map((c) => [c.x, c.y])).toEqual([
      [5, -2],
      [0, 0],
      [0, 0],
    ])
    expect(moverCapas(p, ['a'], { dx: 0, dy: 0 })).toBe(p)
  })

  it('quitar borra el grupo que queda vacío', () => {
    const p = pagina([rect('a', 'G'), rect('b')], ['G'])
    const sin = quitarCapas(p, ['a'])
    expect(sin.capas.map((c) => c.id)).toEqual(['b'])
    expect(sin.grupos).toEqual([])
    expect(quitarCapas(p, ['x'])).toBe(p)
  })
})

describe('copiar y pegar', () => {
  const p = pagina([rect('a', 'G'), rect('b', 'G'), rect('c', 'H'), rect('d', 'H')], ['G', 'H'])

  it('copia los grupos enteros y suelta los miembros sueltos', () => {
    const copia = portapapelesDe(p, ['a', 'b', 'c'])
    expect(copia.grupos.map((g) => g.id)).toEqual(['G'])
    expect(copia.capas.map((c) => c.grupoId)).toEqual(['G', 'G', null])
  })

  it('las copias llevan ids nuevos, su grupo nuevo y van corridas', () => {
    let n = 0
    const nuevoId = () => `n${String(++n)}`
    const copias = copiasDe(portapapelesDe(p, ['a', 'b']), nuevoId, 16)
    expect(copias.grupos.map((g) => g.id)).toEqual(['n1'])
    expect(copias.capas.map((c) => [c.id, c.grupoId, c.x, c.y])).toEqual([
      ['n2', 'n1', 16, 16],
      ['n3', 'n1', 16, 16],
    ])
    const pegada = pegarCopias(p, copias)
    expect(pegada?.capas.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd', 'n2', 'n3'])
    expect(pegada?.grupos.map((g) => g.id)).toEqual(['G', 'H', 'n1'])
  })
})

describe('renombrar y alternar', () => {
  const p = pagina([rect('a'), rect('b', 'G')], ['G'])

  it('renombra capas y grupos; una capa sin nombre vuelve al suyo', () => {
    expect(renombrar(p, 'a', '  Precio ').capas[0]?.nombre).toBe('Precio')
    expect(renombrar(renombrar(p, 'a', 'X'), 'a', ' ').capas[0]?.nombre).toBeNull()
    expect(renombrar(p, 'G', 'Encabezado').grupos[0]?.nombre).toBe('Encabezado')
    expect(renombrar(p, 'G', '  ')).toBe(p)
    expect(renombrar(p, 'a', 'x'.repeat(100)).capas[0]?.nombre).toHaveLength(80)
  })

  it('oculta y bloquea capas y grupos', () => {
    expect(alternar(p, 'a', 'oculta').capas[0]?.oculta).toBe(true)
    expect(alternar(p, 'a', 'bloqueada').capas[0]?.bloqueada).toBe(true)
    expect(alternar(p, 'G', 'oculta').grupos[0]?.oculto).toBe(true)
    expect(alternar(alternar(p, 'G', 'bloqueada'), 'G', 'bloqueada').grupos[0]?.bloqueado).toBe(
      false,
    )
  })
})

describe('recuadro, alinear y distribuir', () => {
  it('el recuadro elige lo que toca, con su grupo entero, y no lo oculto ni lo bloqueado', () => {
    const p = pagina(
      [
        rect('a', null, { x: 0, y: 0 }),
        rect('b', 'G', { x: 50, y: 50 }),
        rect('c', 'G', { x: 90, y: 90 }),
        { ...rect('d', null, { x: 5, y: 5 }), oculta: true },
        { ...rect('e', null, { x: 5, y: 5 }), bloqueada: true },
      ],
      ['G'],
    )
    expect(idsEnRecuadro(p, { x: 0, y: 0, ancho: 55, alto: 55 })).toEqual(['a', 'b', 'c'])
    expect(idsEnRecuadro(p, { x: 200, y: 200, ancho: 5, alto: 5 })).toEqual([])
  })

  it('alinea un grupo entero como una sola caja', () => {
    const p = pagina(
      [rect('a', null, { x: 40 }), rect('b', 'G', { x: 10 }), rect('c', 'G', { x: 30 })],
      ['G'],
    )
    const izquierda = alinearCapas(p, ['a', 'b', 'c'], 'izquierda', cuadrado)
    expect(izquierda.capas.map((c) => c.x)).toEqual([10, 10, 30])
  })

  it('una sola capa se alinea contra el documento', () => {
    const p = pagina([rect('a', null, { x: 40 })])
    expect(alinearCapas(p, ['a'], 'derecha', cuadrado).capas[0]?.x).toBe(90)
  })

  it('distribuye con huecos iguales', () => {
    const p = pagina([
      rect('a', null, { x: 0 }),
      rect('b', null, { x: 20 }),
      rect('c', null, { x: 90 }),
    ])
    expect(distribuirCapas(p, ['a', 'b', 'c'], 'horizontal').capas.map((c) => c.x)).toEqual([
      0, 45, 90,
    ])
  })
})

describe('el tope de capas', () => {
  it('caben hasta 300, y el motivo lo dice', () => {
    const casiLlena = pagina(
      Array.from({ length: MAXIMO_DE_CAPAS_POR_PAGINA - 1 }, (_, i) => rect(`c${String(i)}`)),
    )
    expect(hayLugar(casiLlena)).toBe(true)
    expect(hayLugar(casiLlena, 2)).toBe(false)
    expect(MENSAJE_DEL_TOPE_DE_CAPAS).toBe('Una página lleva hasta 300 elementos.')
  })
})
