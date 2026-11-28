import { describe, expect, it } from 'vitest'
import type { CapaDe, CapaDeArte } from '../documento'
import { pagina, rect } from './capas-de-prueba.soporte'
import {
  anclasDeLaSeleccion,
  cajaDeArrastre,
  cajaMovida,
  cajasParaAjustar,
  capaDibujada,
  capaTransformada,
  esClic,
  esDeDibujo,
  idsQueSeMueven,
  TODAS_LAS_ANCLAS,
  trazoNuevo,
} from './lienzo'

const BASE = {
  nombre: null,
  grupoId: null,
  x: 100,
  y: 50,
  ancho: 200,
  alto: 60,
  rotacion: 0,
  opacidad: 1,
  bloqueada: false,
  oculta: false,
  sombra: null,
}

const TEXTO: CapaDe<'texto'> = {
  ...BASE,
  id: 't',
  tipo: 'texto',
  texto: 'Hola',
  fuente: 'geist',
  tamano: 48,
  peso: 400,
  interlineado: 1.2,
  color: '#000000',
  alineacion: 'izquierda',
  borde: null,
  grosor: 0,
}

const LINEA: CapaDe<'linea'> = {
  ...BASE,
  id: 'l',
  tipo: 'linea',
  puntos: [
    { x: 0, y: 60 },
    { x: 200, y: 0 },
  ],
  borde: '#000000',
  grosor: 2,
}

describe('el clic y la caja que se arrastra', () => {
  it('menos de 3 px de pantalla es un clic', () => {
    expect(esClic({ x: 10, y: 10 }, { x: 12, y: 11 })).toBe(true)
    expect(esClic({ x: 10, y: 10 }, { x: 13, y: 10 })).toBe(false)
  })

  it('la caja sale de dos puntos en cualquier dirección', () => {
    expect(cajaDeArrastre({ x: 50, y: 40 }, { x: 10, y: 100 })).toEqual({
      x: 10,
      y: 40,
      ancho: 40,
      alto: 60,
    })
  })

  it('con Mayús, cuadrada del lado mayor hacia el puntero', () => {
    expect(cajaDeArrastre({ x: 50, y: 50 }, { x: 10, y: 70 }, true)).toEqual({
      x: 10,
      y: 50,
      ancho: 40,
      alto: 40,
    })
  })
})

describe('lo que dibujan las herramientas', () => {
  const donde = { id: 'n', medidas: { ancho: 1000, alto: 500 } }

  it('las de dibujo; la pluma, la mano, mover e imagen no', () => {
    expect(
      ['texto', 'rectangulo', 'elipse', 'poligono', 'linea'].every((h) => esDeDibujo(h as never)),
    ).toBe(true)
    expect(
      esDeDibujo('pluma') || esDeDibujo('mano') || esDeDibujo('mover') || esDeDibujo('imagen'),
    ).toBe(false)
  })

  it('un clic deja la forma de siempre centrada en el punto', () => {
    const capa = capaDibujada(
      'elipse',
      { desde: { x: 300, y: 200 }, hasta: null, cuadrada: false },
      donde,
    )
    expect(capa).toMatchObject({
      id: 'n',
      tipo: 'forma',
      forma: 'elipse',
      ancho: 150,
      alto: 150,
      x: 225,
      y: 125,
    })
  })

  it('arrastrando, la caja; con Mayús, cuadrada', () => {
    const gesto = { desde: { x: 100, y: 100 }, hasta: { x: 40, y: 300 }, cuadrada: false }
    expect(capaDibujada('rectangulo', gesto, donde)).toMatchObject({
      x: 40,
      y: 100,
      ancho: 60,
      alto: 200,
    })
    expect(capaDibujada('poligono', { ...gesto, cuadrada: true }, donde)).toMatchObject({
      x: -100,
      y: 100,
      ancho: 200,
      alto: 200,
      lados: 3,
    })
  })

  it('la línea va de un punto al otro', () => {
    const capa = capaDibujada(
      'linea',
      { desde: { x: 10, y: 90 }, hasta: { x: 110, y: 40 }, cuadrada: false },
      donde,
    )
    expect(capa).toMatchObject({
      x: 10,
      y: 40,
      ancho: 100,
      alto: 50,
      puntos: [
        { x: 0, y: 50 },
        { x: 100, y: 0 },
      ],
    })
  })

  it('el texto con un clic empieza en él (el medio del renglón) y, arrastrando, tiene el ancho de la caja', () => {
    const clic = capaDibujada(
      'texto',
      { desde: { x: 500, y: 250 }, hasta: null, cuadrada: false },
      donde,
    )
    expect(clic).toMatchObject({ tipo: 'texto', texto: 'Texto', x: 500, ancho: 300 })
    expect(clic.y + clic.alto / 2).toBe(250)
    const caja = capaDibujada(
      'texto',
      { desde: { x: 0, y: 0 }, hasta: { x: 400, y: 30 }, cuadrada: false },
      donde,
    )
    expect(caja).toMatchObject({ x: 0, y: 0, ancho: 400 })
  })
})

describe('lo que se mueve y contra qué se ajusta', () => {
  const bloqueada = { ...rect('b'), bloqueada: true }
  const oculta = { ...rect('o', null, { x: 500 }), oculta: true }
  const p = pagina(
    [rect('a', null, { x: 10, y: 20 }), bloqueada, oculta, rect('c', 'g', { x: 40 })],
    ['g'],
  )

  it('sin las bloqueadas ni las ocultas, en el orden de la página', () => {
    expect(idsQueSeMueven(p, ['c', 'b', 'o', 'a'])).toEqual(['a', 'c'])
  })

  it('una capa de un grupo bloqueado no se mueve', () => {
    const conGrupo = { ...p, grupos: [{ id: 'g', nombre: 'G', oculto: false, bloqueado: true }] }
    expect(idsQueSeMueven(conGrupo, ['a', 'c'])).toEqual(['a'])
  })

  it('se ajusta a las otras visibles, también a las bloqueadas', () => {
    expect(cajasParaAjustar(p, ['a'])).toEqual([
      { x: 0, y: 0, ancho: 10, alto: 10 },
      { x: 40, y: 0, ancho: 10, alto: 10 },
    ])
  })

  it('la caja de lo que se mueve, corrida', () => {
    expect(cajaMovida(p, ['a', 'c'], { x: 5, y: -5 })).toEqual({
      x: 15,
      y: -5,
      ancho: 40,
      alto: 30,
    })
    expect(cajaMovida(p, [], { x: 0, y: 0 })).toBeNull()
  })
})

describe('la capa que deja el Transformer', () => {
  it('una forma cambia su caja alrededor del centro y gira', () => {
    const forma = rect('f', null, { x: 100, y: 100, ancho: 100, alto: 50 })
    const despues = capaTransformada(forma, {
      centro: { x: 150, y: 125 },
      sx: 2,
      sy: 0.5,
      rotacion: 30,
    })
    expect(despues).toMatchObject({ x: 50, y: 112.5, ancho: 200, alto: 25, rotacion: 30 })
  })

  it('un texto cambia sólo su ancho: ni el tamaño de letra ni el alto', () => {
    const despues = capaTransformada(TEXTO, {
      centro: { x: 200, y: 80 },
      sx: 1.5,
      sy: 3,
      rotacion: 0,
    })
    expect(despues).toMatchObject({ x: 50, y: 50, ancho: 300, alto: 60, tamano: 48 })
  })

  it('la línea escala sus puntos', () => {
    const despues = capaTransformada(LINEA, {
      centro: { x: 200, y: 80 },
      sx: 0.5,
      sy: 2,
      rotacion: 0,
    })
    expect(despues).toMatchObject({
      ancho: 100,
      alto: 120,
      puntos: [
        { x: 0, y: 120 },
        { x: 100, y: 0 },
      ],
    })
  })

  it('el trazo escala sus nodos y asas; un espejo no da lados negativos', () => {
    const trazo = trazoNuevo(
      'tr',
      [
        { x: 0, y: 0, entrada: null, salida: { x: 10, y: 0 } },
        { x: 20, y: 10, entrada: null, salida: null },
      ],
      false,
      { ancho: 500, alto: 500 },
    )
    const despues = capaTransformada(trazo, { centro: { x: 10, y: 5 }, sx: -2, sy: 1, rotacion: 0 })
    expect(despues).toMatchObject({ ancho: 40, alto: 10 })
    if (despues.tipo !== 'trazo') {
      throw new Error('no es un trazo')
    }
    expect(despues.nodos[1]).toEqual({ x: 40, y: 10, entrada: null, salida: null })
    expect(despues.nodos[0]?.salida).toEqual({ x: 20, y: 0 })
  })
})

describe('las asas del Transformer', () => {
  it('un texto sólo los costados; con otros, ninguna', () => {
    expect(anclasDeLaSeleccion([TEXTO])).toEqual(['middle-left', 'middle-right'])
    expect(anclasDeLaSeleccion([TEXTO, rect('a')])).toEqual([])
  })

  it('una línea recta sólo a lo largo', () => {
    const horizontal: CapaDeArte = { ...LINEA, alto: 0 }
    const vertical: CapaDeArte = { ...LINEA, ancho: 0 }
    expect(anclasDeLaSeleccion([horizontal])).toEqual(['middle-left', 'middle-right'])
    expect(anclasDeLaSeleccion([vertical])).toEqual(['top-center', 'bottom-center'])
    expect(anclasDeLaSeleccion([LINEA])).toBe(TODAS_LAS_ANCLAS)
  })

  it('formas e imágenes, todas; nada elegido, ninguna', () => {
    expect(anclasDeLaSeleccion([rect('a'), rect('b')])).toBe(TODAS_LAS_ANCLAS)
    expect(anclasDeLaSeleccion([])).toEqual([])
  })
})

describe('el trazo de la pluma', () => {
  it('rehace la caja y deja los nodos relativos a su esquina', () => {
    const trazo = trazoNuevo(
      'tr',
      [
        { x: 100, y: 200, entrada: null, salida: null },
        { x: 300, y: 250, entrada: null, salida: null },
      ],
      false,
      { ancho: 1080, alto: 1350 },
    )
    expect(trazo).toMatchObject({ x: 100, y: 200, ancho: 200, alto: 50, grosor: 4, relleno: null })
    expect(trazo.nodos.map((n) => [n.x, n.y])).toEqual([
      [0, 0],
      [200, 50],
    ])
  })
})
