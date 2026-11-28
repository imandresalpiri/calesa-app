import { describe, expect, it } from 'vitest'
import {
  documentoVacio,
  VERSION_DEL_DOCUMENTO,
  type CapaDe,
  type CapaDeArte,
  type DocumentoDeArte,
} from '../documento'
import { FORMATOS_DE_ARTE, type Medidas } from '../formatos'
import { formatosDestino, motivoDelFormatoDestino, reacomodarEnOtroFormato } from './otro-formato'

const BASE = {
  nombre: null,
  grupoId: null,
  sombra: null,
  rotacion: 12,
  opacidad: 0.9,
  bloqueada: false,
  oculta: false,
}

function texto(id: string, x: number, y: number, grupoId: string | null = null): CapaDe<'texto'> {
  return {
    ...BASE,
    id,
    grupoId,
    x,
    y,
    ancho: 400,
    alto: 58,
    tipo: 'texto',
    texto: 'Toyota Hilux',
    fuente: 'geist',
    tamano: 48,
    peso: 700,
    interlineado: 1.2,
    color: '#111111',
    alineacion: 'centro',
    borde: '#ffffff',
    grosor: 2,
    sombra: { color: '#000000', desenfoque: 8, x: 2, y: 4 },
  }
}

function forma(id: string, x: number, y: number, grupoId: string | null = null): CapaDe<'forma'> {
  return {
    ...BASE,
    id,
    grupoId,
    x,
    y,
    ancho: 200,
    alto: 100,
    tipo: 'forma',
    forma: 'rectangulo',
    lados: null,
    relleno: '#ff0000',
    borde: '#000000',
    grosor: 4,
    radio: 16,
    sombra: { color: '#00000080', desenfoque: 20, x: 10, y: 6 },
  }
}

function imagen(id: string, x: number, y: number): CapaDe<'imagen'> {
  return {
    ...BASE,
    id,
    x,
    y,
    ancho: 300,
    alto: 200,
    tipo: 'imagen',
    imagenId: '00000000-0000-0000-0000-0000000000a1',
    ajuste: 'cubrir',
    radio: 24,
    borde: '#cccccc',
    grosor: 3,
  }
}

function con(capas: CapaDeArte[], grupos: string[] = []): DocumentoDeArte {
  const [pagina] = documentoVacio().paginas
  if (!pagina) {
    throw new Error('sin página')
  }
  const delGrupo = grupos.map((id) => ({ id, nombre: 'Grupo', oculto: false, bloqueado: false }))
  return { version: VERSION_DEL_DOCUMENTO, paginas: [{ ...pagina, capas, grupos: delGrupo }] }
}

const capasDe = (documento: DocumentoDeArte): CapaDeArte[] => documento.paginas[0]?.capas ?? []
const centro = (c: CapaDeArte) => ({ x: c.x + c.ancho / 2, y: c.y + c.alto / 2 })

const FIJOS = FORMATOS_DE_ARTE.filter(
  (f): f is typeof f & Medidas => f.ancho !== null && f.alto !== null,
)
const PARES = FIJOS.flatMap((desde) =>
  FIJOS.filter((hacia) => hacia.tipo === desde.tipo && hacia.clave !== desde.clave).map(
    (hacia) => [desde, hacia] as const,
  ),
)

const DOCUMENTO = con(
  [
    texto('suelto', 340, 100),
    forma('rect', 50, 600),
    imagen('img', 500, 400),
    texto('del-grupo', 100, 900, 'g'),
    forma('forma-del-grupo', 200, 980, 'g'),
  ],
  ['g'],
)

describe('el texto no cambia de tamaño al duplicar en otro formato', () => {
  it('recorre cada formato de imagen contra cada otro, y Carta contra A4', () => {
    expect(PARES.length).toBe(5 * 4 + 2)
  })

  it.each(PARES.map(([d, h]) => [d.clave, h.clave, d, h] as const))(
    '%s → %s conserva tamaño, caja, interlineado y borde',
    (_d, _h, desde, hacia) => {
      const antes = capasDe(DOCUMENTO).filter((c) => c.tipo === 'texto')
      const despues = capasDe(reacomodarEnOtroFormato(DOCUMENTO, desde, hacia)).filter(
        (c) => c.tipo === 'texto',
      )
      expect(despues.map((c) => [c.tamano, c.ancho, c.alto, c.interlineado, c.grosor])).toEqual(
        antes.map((c) => [c.tamano, c.ancho, c.alto, c.interlineado, c.grosor]),
      )
      expect(despues.map((c) => c.sombra)).toEqual(antes.map((c) => c.sombra))
    },
  )

  it.each(PARES.map(([d, h]) => [d.clave, h.clave, d, h] as const))(
    '%s → %s → de vuelta deja cada texto con su tamaño y el suelto en su centro',
    (_d, _h, desde, hacia) => {
      const vuelta = reacomodarEnOtroFormato(
        reacomodarEnOtroFormato(DOCUMENTO, desde, hacia),
        hacia,
        desde,
      )
      const textos = capasDe(vuelta).filter((c) => c.tipo === 'texto')
      for (const capa of textos) {
        expect(capa.tamano).toBe(48)
      }
      const suelto = capasDe(vuelta).find((c) => c.id === 'suelto')
      if (!suelto) {
        throw new Error('sin el texto suelto')
      }
      expect(centro(suelto).x).toBeCloseTo(540)
      expect(centro(suelto).y).toBeCloseTo(129)
    },
  )
})

describe('el reacomodo anclado al centro', () => {
  const desde = { ancho: 1080, alto: 1080 }
  const hacia = { ancho: 1080, alto: 1920 }
  const despues = capasDe(reacomodarEnOtroFormato(DOCUMENTO, desde, hacia))
  const de = (id: string) => {
    const capa = despues.find((c) => c.id === id)
    if (!capa) {
      throw new Error(`sin ${id}`)
    }
    return capa
  }

  it('el centro de cada capa suelta va × (sx, sy)', () => {
    expect(centro(de('suelto')).x).toBeCloseTo(540)
    expect(centro(de('suelto')).y).toBeCloseTo(129 * (1920 / 1080))
    expect(centro(de('rect')).x).toBeCloseTo(150)
    expect(centro(de('rect')).y).toBeCloseTo(650 * (1920 / 1080))
  })

  it('rotación, opacidad y lo demás quedan iguales', () => {
    expect(de('rect')).toMatchObject({ rotacion: 12, opacidad: 0.9, relleno: '#ff0000' })
  })

  it('no cambia el documento que recibe', () => {
    const copia = structuredClone(DOCUMENTO)
    reacomodarEnOtroFormato(DOCUMENTO, desde, hacia)
    expect(DOCUMENTO).toEqual(copia)
  })
})

describe('imágenes y formas escalan por el menor de los dos factores', () => {
  const desde = { ancho: 1080, alto: 1350 }
  const hacia = { ancho: 1200, alto: 630 }
  const k = Math.min(1200 / 1080, 630 / 1350)
  const despues = capasDe(reacomodarEnOtroFormato(DOCUMENTO, desde, hacia))

  it('la forma, con su borde, su radio y su sombra', () => {
    const rect = despues.find((c) => c.id === 'rect')
    expect(rect).toMatchObject({ ancho: 200 * k, alto: 100 * k, grosor: 4 * k, radio: 16 * k })
    expect(rect?.sombra).toEqual({ color: '#00000080', desenfoque: 20 * k, x: 10 * k, y: 6 * k })
  })

  it('la imagen, con su marco', () => {
    const img = despues.find((c) => c.id === 'img')
    expect(img).toMatchObject({ ancho: 300 * k, alto: 200 * k, grosor: 3 * k, radio: 24 * k })
    if (!img) {
      throw new Error('sin imagen')
    }
    expect(centro(img).x).toBeCloseTo(650 * (1200 / 1080))
    expect(centro(img).y).toBeCloseTo(500 * (630 / 1350))
  })
})

describe('la línea y el trazo escalan lo que dibujan', () => {
  it('los puntos de la línea y los nodos y asas del trazo, × k', () => {
    const linea: CapaDe<'linea'> = {
      ...BASE,
      id: 'li',
      x: 0,
      y: 0,
      ancho: 100,
      alto: 10,
      tipo: 'linea',
      puntos: [
        { x: 0, y: 5 },
        { x: 100, y: 5 },
      ],
      borde: '#000000',
      grosor: 2,
    }
    const trazo: CapaDe<'trazo'> = {
      ...BASE,
      id: 'tr',
      x: 0,
      y: 0,
      ancho: 100,
      alto: 100,
      tipo: 'trazo',
      nodos: [
        { x: 0, y: 0, entrada: null, salida: { x: 40, y: 0 } },
        { x: 100, y: 100, entrada: { x: 100, y: 60 }, salida: null },
      ],
      cerrado: false,
      relleno: null,
      borde: '#000000',
      grosor: 2,
    }
    const [l, t] = capasDe(
      reacomodarEnOtroFormato(
        con([linea, trazo]),
        { ancho: 1000, alto: 1000 },
        { ancho: 500, alto: 2000 },
      ),
    )
    expect(l).toMatchObject({
      puntos: [
        { x: 0, y: 2.5 },
        { x: 50, y: 2.5 },
      ],
      grosor: 1,
    })
    expect(t).toMatchObject({
      nodos: [
        { x: 0, y: 0, entrada: null, salida: { x: 20, y: 0 } },
        { x: 50, y: 50, entrada: { x: 50, y: 30 }, salida: null },
      ],
      grosor: 1,
    })
  })
})

describe('un grupo se mueve como unidad', () => {
  it('el centro del grupo va × (sx, sy) y lo de adentro se acerca × k', () => {
    const grupo = con([forma('a', 100, 100, 'g'), forma('b', 500, 300, 'g')], ['g'])
    const desde = { ancho: 1000, alto: 1000 }
    const hacia = { ancho: 2000, alto: 1000 }
    const [a, b] = capasDe(reacomodarEnOtroFormato(grupo, desde, hacia))
    if (!a || !b) {
      throw new Error('sin el grupo')
    }
    // La caja del grupo va de (100, 100) a (700, 400): su centro (400, 250) pasa a (800, 250). k = 1.
    expect(centro(a)).toEqual({ x: 800 - 200, y: 250 - 100 })
    expect(centro(b)).toEqual({ x: 800 + 200, y: 250 + 100 })
    expect(a.ancho).toBe(200)
  })
})

describe('los formatos a los que se duplica', () => {
  it('sólo los del mismo tipo, sin el propio', () => {
    expect(formatosDestino('vertical').map((f) => f.clave)).toEqual([
      'cuadrado',
      'historia',
      'horizontal',
      'pantalla',
      'personalizado',
    ])
    expect(formatosDestino('carta').map((f) => f.clave)).toEqual(['a4'])
    expect(formatosDestino('a4').map((f) => f.clave)).toEqual(['carta'])
  })

  it('«Personalizado» puede volver a «Personalizado» con otras medidas', () => {
    expect(formatosDestino('personalizado').map((f) => f.clave)).toContain('personalizado')
    expect(formatosDestino('personalizado').every((f) => f.tipo === 'imagen')).toBe(true)
  })

  it('a otro tipo, el motivo', () => {
    expect(motivoDelFormatoDestino('vertical', 'cuadrado')).toBeNull()
    expect(motivoDelFormatoDestino('vertical', 'a4')).toBe('Elige un formato de imagen.')
    expect(motivoDelFormatoDestino('carta', 'historia')).toBe('Elige un formato de PDF.')
  })
})
