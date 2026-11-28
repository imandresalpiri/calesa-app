import { describe, expect, it } from 'vitest'
import {
  documentoVacio,
  imagenesDelDocumento,
  leerDocumento,
  type CapaDeArte,
  type DocumentoDeArte,
} from './documento'

const BASE = {
  nombre: null,
  grupoId: null,
  sombra: null,
  x: 0,
  y: 0,
  ancho: 100,
  alto: 100,
  rotacion: 0,
  opacidad: 1,
  bloqueada: false,
  oculta: false,
}

const IMAGEN_A = '00000000-0000-0000-0000-0000000000a1'
const IMAGEN_B = '00000000-0000-0000-0000-0000000000b2'

function imagen(id: string, imagenId: string): CapaDeArte {
  return {
    ...BASE,
    id,
    tipo: 'imagen',
    imagenId,
    ajuste: 'cubrir',
    radio: 0,
    borde: null,
    grosor: 0,
  }
}

function texto(id: string, contenido: string): CapaDeArte {
  return {
    ...BASE,
    id,
    tipo: 'texto',
    texto: contenido,
    fuente: 'Arial',
    tamano: 48,
    peso: 400,
    interlineado: 1.2,
    color: '#111111',
    alineacion: 'centro',
    borde: null,
    grosor: 0,
  }
}

function con(capas: CapaDeArte[]): DocumentoDeArte {
  const vacio = documentoVacio()
  const [pagina] = vacio.paginas
  if (!pagina) {
    throw new Error('sin página')
  }
  return { ...vacio, paginas: [{ ...pagina, capas }] }
}

function conGrupos(capas: CapaDeArte[], grupos: string[]): DocumentoDeArte {
  const documento = con(capas)
  const [pagina] = documento.paginas
  if (!pagina) {
    throw new Error('sin página')
  }
  return {
    ...documento,
    paginas: [
      {
        ...pagina,
        grupos: grupos.map((id) => ({ id, nombre: 'Grupo', oculto: false, bloqueado: false })),
      },
    ],
  }
}

const enGrupo = (capa: CapaDeArte, grupoId: string | null): CapaDeArte => ({ ...capa, grupoId })

describe('grupos de capas', () => {
  it('los miembros de un grupo van seguidos', () => {
    const juntos = conGrupos(
      [
        texto('a', 'a'),
        enGrupo(texto('b', 'b'), 'g'),
        enGrupo(texto('c', 'c'), 'g'),
        texto('d', 'd'),
      ],
      ['g'],
    )
    expect(leerDocumento(juntos).ok).toBe(true)
    const separados = conGrupos(
      [enGrupo(texto('b', 'b'), 'g'), texto('a', 'a'), enGrupo(texto('c', 'c'), 'g')],
      ['g'],
    )
    expect(leerDocumento(separados).ok).toBe(false)
  })

  it('un grupoId que no está en la página, o un id repetido, es inválido', () => {
    expect(leerDocumento(conGrupos([enGrupo(texto('a', 'a'), 'x')], [])).ok).toBe(false)
    expect(leerDocumento(con([texto('a', 'a'), texto('a', 'b')])).ok).toBe(false)
    expect(leerDocumento(conGrupos([texto('g', 'a')], ['g'])).ok).toBe(false)
  })

  it('cuenta también las imágenes que van dentro de un grupo', () => {
    const documento = conGrupos(
      [enGrupo(imagen('i1', IMAGEN_A), 'g'), enGrupo(imagen('i2', IMAGEN_B), 'g')],
      ['g'],
    )
    expect(leerDocumento(documento).ok).toBe(true)
    expect(imagenesDelDocumento(documento)).toEqual([IMAGEN_A, IMAGEN_B])
  })

  it('un polígono lleva sus lados y las demás formas no', () => {
    const forma = {
      ...BASE,
      id: 'f',
      tipo: 'forma' as const,
      relleno: null,
      borde: null,
      grosor: 0,
      radio: 0,
    }
    expect(leerDocumento(con([{ ...forma, forma: 'poligono', lados: 5 }])).ok).toBe(true)
    expect(leerDocumento(con([{ ...forma, forma: 'poligono', lados: null }])).ok).toBe(false)
    expect(leerDocumento(con([{ ...forma, forma: 'rectangulo', lados: 4 }])).ok).toBe(false)
  })
})
