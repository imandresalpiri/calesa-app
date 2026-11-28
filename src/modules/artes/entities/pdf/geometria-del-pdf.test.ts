import { describe, expect, it } from 'vitest'
import type { CapaResuelta, CapasConDatos } from '../datos/capas-con-datos'
import type { CapaDe, CapaDeArte } from '../documento'
import { pagina, rect } from '../editor/capas-de-prueba.soporte'
import type { Medidas } from '../formatos'
import { geometriaDelPdf, imagenesDeLaPagina, type ParaLaGeometria } from './geometria-del-pdf'
import type { PrimitivaDelPdf } from './primitivas-del-pdf'

const MEDIDAS: Medidas = { ancho: 595, alto: 842 }

// Cada letra mide medio tamaño: así el corte y la alineación son de cuenta.
const medir = (texto: string, _peso: number, tamano: number) => texto.length * tamano * 0.5

function con(resueltas: [string, CapaResuelta][] = [], escondidas: string[] = []): CapasConDatos {
  return { resueltas: new Map(resueltas), escondidas: new Set(escondidas), faltan: [] }
}

function para(conDatos = con(), imagenes: [string, Medidas][] = []): ParaLaGeometria {
  return { medidas: MEDIDAS, conDatos, imagenes: new Map(imagenes), medir }
}

const BASE = {
  nombre: null,
  grupoId: null,
  rotacion: 0,
  opacidad: 1,
  bloqueada: false,
  oculta: false,
  sombra: null,
}

function texto(id: string, cambios: Partial<CapaDe<'texto'>> = {}): CapaDeArte {
  return {
    ...BASE,
    id,
    tipo: 'texto',
    x: 10,
    y: 20,
    ancho: 100,
    alto: 30,
    texto: 'Hola',
    fuente: 'geist',
    tamano: 20,
    peso: 700,
    interlineado: 1.2,
    color: '#111111',
    alineacion: 'izquierda',
    borde: null,
    grosor: 0,
    ...cambios,
  }
}

function foto(id: string, cambios: Partial<CapaDe<'foto'>> = {}): CapaDeArte {
  return {
    ...BASE,
    id,
    tipo: 'foto',
    x: 0,
    y: 0,
    ancho: 200,
    alto: 100,
    radio: 0,
    borde: null,
    grosor: 0,
    indice: 0,
    ajuste: 'cubrir',
    foco: { x: 0.5, y: 0.5 },
    ...cambios,
  }
}

const deFoto = (src: string): [string, CapaResuelta] => [
  'f',
  { tipo: 'imagen', fuente: { src, medidas: null } },
]

function primitivas(capas: CapaDeArte[], p = para()): readonly PrimitivaDelPdf[] {
  return geometriaDelPdf(pagina(capas), p).primitivas
}

function unaDe<T extends PrimitivaDelPdf['tipo']>(
  lista: readonly PrimitivaDelPdf[],
  tipo: T,
): Extract<PrimitivaDelPdf, { tipo: T }> {
  const primitiva = lista.find((p): p is Extract<PrimitivaDelPdf, { tipo: T }> => p.tipo === tipo)
  if (!primitiva) {
    throw new Error(`sin ${tipo}`)
  }
  return primitiva
}

describe('las formas del PDF', () => {
  it('sigue el orden de las capas y deja fuera la oculta, la de un grupo oculto y la escondida', () => {
    const capas = [rect('a'), { ...rect('b'), oculta: true }, rect('c', 'g'), rect('d'), rect('e')]
    const hoja = pagina(capas, ['g'])
    const conGrupoOculto = { ...hoja, grupos: hoja.grupos.map((g) => ({ ...g, oculto: true })) }
    const ids = geometriaDelPdf(conGrupoOculto, para(con([], ['d']))).primitivas.map((p) => p.id)
    expect(ids).toEqual(['a', 'e'])
  })

  it('un rectángulo lleva su caja, su giro, la esquina limitada y la opacidad de la capa en cada pintura', () => {
    const capa = {
      ...rect('r', null, { x: 5, y: 6, ancho: 40, alto: 10 }),
      rotacion: 30,
      radio: 50,
      opacidad: 0.5,
      relleno: '#ff000080',
      borde: '#00ff00',
      grosor: 4,
    }
    const r = unaDe(primitivas([capa]), 'rect')
    expect(r.caja).toEqual({ x: 5, y: 6, ancho: 40, alto: 10 })
    expect(r.rotacion).toBe(30)
    expect(r.radio).toBe(5)
    expect(r.relleno).toEqual({ color: '#ff0000', opacidad: (128 / 255) * 0.5 })
    expect(r.borde).toEqual({ color: '#00ff00', opacidad: 0.5, grosor: 4 })
    // El marco del <Svg> cubre el borde centrado y el suavizado.
    expect(r.marco).toEqual({ x: -5, y: -5, ancho: 50, alto: 20 })
  })

  it('un borde sin grosor no se dibuja y una línea sin grosor no sale', () => {
    const r = unaDe(primitivas([{ ...rect('r'), borde: '#000000', grosor: 0 }]), 'rect')
    expect(r.borde).toBeNull()
    const linea: CapaDeArte = {
      ...BASE,
      id: 'l',
      tipo: 'linea',
      x: 0,
      y: 0,
      ancho: 10,
      alto: 10,
      puntos: [
        { x: 0, y: 0 },
        { x: 10, y: 4 },
      ],
      borde: '#000000',
      grosor: 0,
    }
    expect(primitivas([linea])).toEqual([])
    const conGrosor = unaDe(primitivas([{ ...linea, grosor: 2 }]), 'linea')
    expect(conGrosor.marco).toEqual({ x: -3, y: -3, ancho: 16, alto: 10 })
  })

  it('la elipse y el polígono llenan la caja', () => {
    const elipse = { ...rect('e', null, { ancho: 30, alto: 20 }), forma: 'elipse' as const }
    const poligono = {
      ...rect('p', null, { ancho: 30, alto: 20 }),
      forma: 'poligono' as const,
      lados: 4,
    }
    const lista = primitivas([elipse, poligono])
    expect(unaDe(lista, 'elipse').marco).toEqual({ x: -1, y: -1, ancho: 32, alto: 22 })
    expect(unaDe(lista, 'poligono').puntos).toHaveLength(8)
  })
})

describe('el trazo del PDF', () => {
  it('un trazo abierto no lleva relleno', () => {
    const trazo = (cerrado: boolean): CapaDeArte => ({
      ...BASE,
      id: 't',
      tipo: 'trazo',
      x: 0,
      y: 0,
      ancho: 10,
      alto: 10,
      nodos: [
        { x: 0, y: 0, entrada: null, salida: null },
        { x: 10, y: 0, entrada: null, salida: null },
        { x: 10, y: 10, entrada: null, salida: null },
      ],
      cerrado,
      relleno: '#123456',
      borde: null,
      grosor: 0,
    })
    expect(primitivas([trazo(false)])).toEqual([])
    const cerrado = unaDe(primitivas([trazo(true)]), 'trazo')
    expect(cerrado.relleno?.color).toBe('#123456')
    expect(cerrado.d).toMatch(/^M/)
  })
})

describe('el texto y las imágenes del PDF', () => {
  it('el texto lleva el resuelto, cada línea con su base y su borde de arriba (la base menos el ascenso de Geist)', () => {
    const capa = texto('t', { texto: '{x}', ancho: 60, alineacion: 'derecha' })
    const p = para(con([['t', { tipo: 'texto', texto: 'uno dos tres' }]]))
    const t = unaDe(primitivas([capa], p), 'texto')
    expect(t.lineas.map((l) => l.texto)).toEqual(['uno', 'dos', 'tres'])
    const [primera, segunda] = t.lineas
    expect(primera?.arriba).toBeCloseTo((primera?.base ?? 0) - 1.005 * 20)
    expect((segunda?.base ?? 0) - (primera?.base ?? 0)).toBeCloseTo(24)
    // Alineada a la derecha: cada línea termina en el borde de la caja.
    expect(t.lineas.map((l) => l.x + l.ancho)).toEqual([60, 60, 60])
    // El alto de la caja es el de las líneas: gira alrededor del mismo centro que en el lienzo.
    expect(t.caja).toEqual({ x: 10, y: 20, ancho: 60, alto: 72 })
  })

  it('un texto que queda en blanco no sale', () => {
    expect(primitivas([texto('t', { texto: '  \n ' })])).toEqual([])
  })

  it('una foto que cubre se recorta alrededor de su foco; una imagen que no llegó no sale', () => {
    const capa = foto('f', { foco: { x: 0, y: 0.5 } })
    const lista = primitivas(
      [capa],
      para(con([deFoto('/a.jpg')]), [['/a.jpg', { ancho: 400, alto: 400 }]]),
    )
    const f = unaDe(lista, 'imagen')
    expect(f.lugar).toEqual({ x: 0, y: 0, ancho: 200, alto: 100 })
    expect(f.recorte).toEqual({ x: 0, y: 100, ancho: 400, alto: 200 })
    expect(primitivas([capa], para(con([deFoto('/a.jpg')])))).toEqual([])
  })

  it('contenida, la imagen va entera en su lugar y la esquina se limita a ese lugar', () => {
    const capa = foto('f', { ajuste: 'contener', radio: 80, borde: '#000000', grosor: 2 })
    const lista = primitivas(
      [capa],
      para(con([deFoto('/a.jpg')]), [['/a.jpg', { ancho: 100, alto: 100 }]]),
    )
    const f = unaDe(lista, 'imagen')
    expect(f.recorte).toBeNull()
    expect(f.lugar).toEqual({ x: 50, y: 0, ancho: 100, alto: 100 })
    expect(f.radio).toBe(50)
    expect(f.marco).toEqual({ x: 47, y: -3, ancho: 106, alto: 106 })
  })
})

describe('el fondo', () => {
  it('un degradado va de un punto a otro con sus dos colores', () => {
    const hoja = {
      ...pagina([]),
      fondo: { tipo: 'degradado' as const, desde: '#000000', hasta: '#ffffff80', angulo: 90 },
    }
    const { fondo } = geometriaDelPdf(hoja, para())
    expect(fondo.tipo).toBe('degradado')
    if (fondo.tipo === 'degradado') {
      expect(fondo.hasta).toEqual({ color: '#ffffff', opacidad: 128 / 255 })
      expect(fondo.inicio.y).toBeCloseTo(fondo.fin.y)
    }
  })
})

describe('imagenesDeLaPagina', () => {
  it('pide cada imagen que se ve una sola vez', () => {
    const capas = [foto('f'), foto('g'), { ...foto('h'), oculta: true }]
    const conDatos = con([
      deFoto('/a.jpg'),
      ['g', { tipo: 'imagen', fuente: { src: '/a.jpg', medidas: null } }],
      ['h', { tipo: 'imagen', fuente: { src: '/b.jpg', medidas: null } }],
    ])
    expect(imagenesDeLaPagina(pagina(capas), conDatos)).toEqual(['/a.jpg'])
  })
})
