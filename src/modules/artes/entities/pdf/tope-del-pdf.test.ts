import { describe, expect, it } from 'vitest'
import type { PaginaDelPdf, PrimitivaDelPdf } from './primitivas-del-pdf'
import {
  lineasDeLaPagina,
  MAXIMO_DE_LINEAS_POR_PAGINA,
  MENSAJE_DEMASIADAS_LINEAS,
  pasaDelTope,
} from './tope-del-pdf'

const NEGRO = { color: '#000000', opacidad: 1 }

const CAJA = { x: 0, y: 0, ancho: 10, alto: 10 }

const texto = (lineas: number): PrimitivaDelPdf => ({
  tipo: 'texto',
  id: 't',
  caja: CAJA,
  rotacion: 0,
  peso: 400,
  tamano: 6,
  color: NEGRO,
  lineas: Array.from({ length: lineas }, (_, i) => ({
    texto: String(i),
    x: 0,
    base: i,
    arriba: i,
    ancho: 1,
  })),
})

const rect: PrimitivaDelPdf = {
  tipo: 'rect',
  id: 'r',
  caja: CAJA,
  marco: CAJA,
  rotacion: 0,
  radio: 0,
  relleno: NEGRO,
  borde: null,
}

const pagina = (primitivas: PrimitivaDelPdf[]): PaginaDelPdf => ({
  medidas: { ancho: 595, alto: 842 },
  fondo: { tipo: 'color', color: { color: '#ffffff', opacidad: 1 } },
  primitivas,
})

describe('el tope de líneas de una página del PDF', () => {
  it('suma las líneas de todos los textos, y nada más', () => {
    expect(lineasDeLaPagina(pagina([]))).toBe(0)
    expect(lineasDeLaPagina(pagina([texto(3), rect, texto(4)]))).toBe(7)
  })

  it('el tope justo pasa; una línea más, no', () => {
    expect(pasaDelTope(pagina([texto(MAXIMO_DE_LINEAS_POR_PAGINA - 1), texto(1), rect]))).toBe(
      false,
    )
    expect(pasaDelTope(pagina([texto(MAXIMO_DE_LINEAS_POR_PAGINA), texto(1)]))).toBe(true)
  })

  it('el mensaje dice el tope y qué hacer', () => {
    expect(MENSAJE_DEMASIADAS_LINEAS).toBe(
      'Una página de un PDF lleva hasta 500 líneas de texto. Ensancha las cajas de texto o reparte el texto en más páginas.',
    )
  })
})
