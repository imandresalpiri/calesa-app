import { describe, expect, it } from 'vitest'
import {
  documentoVacio,
  imagenesDelDocumento,
  leerDocumento,
  MAXIMO_DE_IMAGENES_POR_PLANTILLA,
  MENSAJE_DEMASIADAS_IMAGENES,
  MENSAJE_DOCUMENTO_INVALIDO,
  MENSAJE_DOCUMENTO_MAS_NUEVO,
  MENSAJE_DOCUMENTO_PESADO,
  pesoDelDocumento,
  TOPE_DEL_DOCUMENTO_EN_BYTES,
  validarDocumento,
  VERSION_DEL_DOCUMENTO,
  type CapaDeArte,
  type DocumentoDeArte,
} from './documento'

const BASE = {
  x: 0,
  y: 0,
  ancho: 100,
  alto: 100,
  rotacion: 0,
  opacidad: 1,
  bloqueada: false,
  oculta: false,
}

function imagen(id: string, imagenId: string): CapaDeArte {
  return { ...BASE, id, tipo: 'imagen', imagenId, ajuste: 'cubrir' }
}

function texto(id: string, contenido: string): CapaDeArte {
  return {
    ...BASE,
    id,
    tipo: 'texto',
    texto: contenido,
    fuente: 'Inter',
    tamano: 48,
    color: '#111111',
    alineacion: 'centro',
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

const IMAGEN_A = '00000000-0000-0000-0000-0000000000a1'
const IMAGEN_B = '00000000-0000-0000-0000-0000000000b2'

describe('documento de una plantilla de arte', () => {
  it('el vacío es válido, de la versión actual y con una página', () => {
    const vacio = documentoVacio()
    expect(vacio.version).toBe(VERSION_DEL_DOCUMENTO)
    expect(vacio.paginas).toHaveLength(1)
    expect(leerDocumento(vacio)).toEqual({ ok: true, data: vacio })
  })

  it('lee cada tipo de capa', () => {
    const documento = con([
      texto('t1', 'Hola'),
      imagen('i1', IMAGEN_A),
      {
        ...BASE,
        id: 'f1',
        tipo: 'forma',
        forma: 'elipse',
        relleno: '#ff0000',
        borde: null,
        grosor: 0,
      },
      { ...BASE, id: 'l1', tipo: 'logo', varianteId: null },
    ])
    expect(leerDocumento(documento)).toEqual({ ok: true, data: documento })
  })

  it('rechaza una capa inválida', () => {
    const malo = con([{ ...texto('t1', 'x'), color: 'rojo' } as CapaDeArte])
    expect(leerDocumento(malo)).toEqual({
      ok: false,
      error: { codigo: 'validacion', mensaje: MENSAJE_DOCUMENTO_INVALIDO },
    })
    const sinTipo = {
      version: 1,
      paginas: [{ id: 'p', fondo: { tipo: 'color', color: '#fff000' }, capas: [{ id: 'c' }] }],
    }
    expect(leerDocumento(sinTipo).ok).toBe(false)
  })

  it('sin versión o con versión menor que 1 es inválido', () => {
    const invalido = {
      ok: false,
      error: { codigo: 'validacion', mensaje: MENSAJE_DOCUMENTO_INVALIDO },
    }
    const { paginas } = documentoVacio()
    expect(leerDocumento({ paginas })).toEqual(invalido)
    expect(leerDocumento({ version: 0, paginas })).toEqual(invalido)
    expect(leerDocumento({ version: 1.5, paginas })).toEqual(invalido)
    expect(leerDocumento(null)).toEqual(invalido)
    expect(leerDocumento([])).toEqual(invalido)
  })

  it('una versión más nueva se rechaza con su texto', () => {
    expect(leerDocumento({ ...documentoVacio(), version: VERSION_DEL_DOCUMENTO + 1 })).toEqual({
      ok: false,
      error: { codigo: 'validacion', mensaje: MENSAJE_DOCUMENTO_MAS_NUEVO },
    })
  })

  it('pide entre 1 y 20 páginas', () => {
    expect(leerDocumento({ version: 1, paginas: [] }).ok).toBe(false)
    const [pagina] = documentoVacio().paginas
    const veinte = Array.from({ length: 20 }, (_, i) => ({ ...pagina, id: `p${String(i)}` }))
    expect(leerDocumento({ version: 1, paginas: veinte }).ok).toBe(true)
    expect(leerDocumento({ version: 1, paginas: [...veinte, pagina] }).ok).toBe(false)
  })
})

describe('topes del documento', () => {
  it('el tope de 512 KiB, justo por debajo y por encima', () => {
    const base = con([texto('t1', '')])
    const relleno = TOPE_DEL_DOCUMENTO_EN_BYTES - pesoDelDocumento(base)
    // El texto de una capa tiene tope de 5000: el peso se arma con muchas capas.
    const porCapa = 4000
    const capas: CapaDeArte[] = []
    let falta = relleno
    let i = 0
    while (falta > 0) {
      const largo = Math.min(porCapa, falta)
      capas.push(texto(`t${String(i)}`, 'a'.repeat(largo)))
      i += 1
      falta = TOPE_DEL_DOCUMENTO_EN_BYTES - pesoDelDocumento(con(capas))
      if (falta < 0) {
        const ultima = capas.pop()
        if (ultima?.tipo !== 'texto') {
          throw new Error('capa inesperada')
        }
        capas.push({ ...ultima, texto: ultima.texto.slice(0, ultima.texto.length + falta) })
        falta = 0
      }
    }
    const justo = con(capas)
    expect(pesoDelDocumento(justo)).toBe(TOPE_DEL_DOCUMENTO_EN_BYTES)
    expect(validarDocumento(justo).ok).toBe(true)
    const ultima = capas.at(-1)
    if (ultima?.tipo !== 'texto') {
      throw new Error('capa inesperada')
    }
    const pasado = con([...capas.slice(0, -1), { ...ultima, texto: `${ultima.texto}a` }])
    expect(pesoDelDocumento(pasado)).toBe(TOPE_DEL_DOCUMENTO_EN_BYTES + 1)
    expect(validarDocumento(pasado)).toEqual({
      ok: false,
      error: { codigo: 'validacion', mensaje: MENSAJE_DOCUMENTO_PESADO },
    })
  })

  it('el peso cuenta bytes, no letras', () => {
    const ascii = pesoDelDocumento(con([texto('t', 'a')]))
    expect(pesoDelDocumento(con([texto('t', 'ñ')]))).toBe(ascii + 1)
  })

  it('las imágenes que usa, sin repetir', () => {
    const documento = con([
      imagen('i1', IMAGEN_A),
      texto('t', 'x'),
      imagen('i2', IMAGEN_B),
      imagen('i3', IMAGEN_A),
      imagen('i4', IMAGEN_A.toUpperCase()),
    ])
    expect(imagenesDelDocumento(documento)).toEqual([IMAGEN_A, IMAGEN_B])
    expect(imagenesDelDocumento(documentoVacio())).toEqual([])
  })

  it('más de 100 imágenes distintas se rechaza', () => {
    const id = (n: number) => `00000000-0000-0000-0000-${n.toString(16).padStart(12, '0')}`
    const cien = Array.from({ length: MAXIMO_DE_IMAGENES_POR_PLANTILLA }, (_, n) =>
      imagen(`i${String(n)}`, id(n + 1)),
    )
    expect(validarDocumento(con(cien)).ok).toBe(true)
    expect(validarDocumento(con([...cien, imagen('i-otra', id(1000))]))).toEqual({
      ok: false,
      error: { codigo: 'validacion', mensaje: MENSAJE_DEMASIADAS_IMAGENES },
    })
    // Repetir una no suma.
    expect(validarDocumento(con([...cien, imagen('i-repetida', id(1))])).ok).toBe(true)
  })
})
