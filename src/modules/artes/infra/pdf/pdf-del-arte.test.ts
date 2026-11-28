// @vitest-environment node
import { Font } from '@react-pdf/renderer'
import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { textoDelPdf, trozosDelPdf } from '../../../../../scripts/pdf/texto-del-pdf'
import {
  capaDeFoto,
  capaDeForma,
  capaDeTexto,
  catalogoDe,
  datosReales,
  paginaCon,
} from '../../entities/datos/datos-de-prueba.soporte'
import type { ParaResolver } from '../../entities/datos/capas-con-datos'
import { valoresDelArte } from '../../entities/datos/valores-del-arte'
import {
  PESOS_DE_TEXTO,
  VERSION_DEL_DOCUMENTO,
  type CapaDe,
  type DocumentoDeArte,
} from '../../entities/documento'
import { METRICAS_DE_GEIST } from '../../entities/editor/fuentes'
import { imagenesDelPdf, paginasConDatos } from '../../entities/pdf/paginas-con-datos'
import {
  MAXIMO_DE_LINEAS_POR_PAGINA,
  MENSAJE_DEMASIADAS_LINEAS,
} from '../../entities/pdf/tope-del-pdf'
import { disposicionDelTexto } from '../../entities/texto/disposicion-del-texto'

vi.mock('server-only', () => ({}))

import { FAMILIA_DEL_ARTE } from './fuentes-del-arte'
import { medidasDeGeist } from './medidas-de-geist'
import { pdfDelArte } from './pdf-del-arte'

// El PDF de un arte con el renderer real, leído con el lector de las pruebas: el texto real de cada página en su lugar y las imágenes que llegan.
const A4 = { ancho: 595, alto: 842 }
const catalogo = catalogoDe('subasta')

const TITULO: CapaDe<'texto'> = {
  ...capaDeTexto('t1', '{marca} {modelo}\nVIN: {vin}\nTotal: {total}'),
  x: 40,
  y: 60,
  ancho: 500,
  alto: 100,
  tamano: 24,
  peso: 700,
}

const documento: DocumentoDeArte = {
  version: VERSION_DEL_DOCUMENTO,
  paginas: [
    paginaCon([
      TITULO,
      { ...capaDeForma('r'), x: 40, y: 180, ancho: 200, alto: 10 },
      { ...capaDeFoto('f', 0), x: 40, y: 220, ancho: 300, alto: 200 },
      // Cruza el borde de abajo: sigue en su hoja, no abre otra.
      { ...capaDeForma('abajo'), x: 0, y: 800, ancho: 100, alto: 100 },
    ]),
    {
      ...paginaCon([{ ...capaDeTexto('t2', 'Página dos'), x: 40, y: 40, ancho: 400, tamano: 32 }]),
      id: 'p2',
    },
  ],
}

// Un vehículo sin VIN, con su cotización: la línea del VIN se quita y el total va con su moneda.
const datos = datosReales()
const sinVin = { ...datos, vehiculo: datos.vehiculo ? { ...datos.vehiculo, vin: null } : null }
const para: ParaResolver = { catalogo, logos: [], datos: sinVin, sinMoneda: false }
const paginas = paginasConDatos(
  documento,
  valoresDelArte(sinVin, { sinMoneda: false, catalogo }),
  para,
)

const foto = () =>
  sharp({ create: { width: 160, height: 120, channels: 3, background: '#c0392b' } })
    .jpeg()
    .toBuffer()

async function elPdf(conFoto: boolean) {
  const imagenes = new Map<string, Uint8Array>()
  if (conFoto) {
    for (const src of imagenesDelPdf(paginas)) {
      imagenes.set(src, await foto())
    }
  }
  const hecho = await pdfDelArte({
    paginas,
    medidas: A4,
    imagenes,
    titulo: 'Ficha',
    autor: 'Calesa Motors',
  })
  if (!hecho.ok) {
    throw new Error(hecho.error.mensaje)
  }
  return hecho.data
}

// Una página con un texto de `lineas` líneas.
function conLineas(lineas: number) {
  const texto = Array.from({ length: lineas }, (_, i) => `Línea ${String(i + 1)}`).join('\n')
  const largo: DocumentoDeArte = {
    version: VERSION_DEL_DOCUMENTO,
    paginas: [paginaCon([{ ...capaDeTexto('t', texto), x: 20, y: 20, ancho: 555, tamano: 6 }])],
  }
  return paginasConDatos(largo, valoresDelArte(sinVin, { sinMoneda: false, catalogo }), para)
}

describe('pdfDelArte', () => {
  it('dibuja cada página con su texto resuelto, sin la línea vacía, con la moneda y la imagen', async () => {
    const { bytes, faltan } = await elPdf(true)
    const leido = textoDelPdf(bytes)
    expect(leido.paginas.map((p) => p.lineas)).toEqual([
      ['Nissan Frontier', 'Total: USD 21.300,00'],
      ['Página dos'],
    ])
    expect(leido.imagenes).toBe(1)
    expect(faltan).toBe(0)
  })

  it('la primera línea cae donde la pone la disposición del lienzo', async () => {
    const medir = await medidasDeGeist()
    const disposicion = disposicionDelTexto(
      { ...TITULO, texto: 'Nissan Frontier' },
      {
        medir: (t) => medir(t, TITULO.peso, TITULO.tamano),
        ascenso: METRICAS_DE_GEIST.ascenso * TITULO.tamano,
        descenso: METRICAS_DE_GEIST.descenso * TITULO.tamano,
      },
    )
    const [trozos = []] = trozosDelPdf((await elPdf(true)).bytes)
    const arriba = Math.max(...trozos.map((t) => t.y))
    const primera = trozos.filter((t) => Math.abs(t.y - arriba) < 1)
    const base = A4.alto - arriba
    expect(Math.abs(base - (TITULO.y + (disposicion.lineas[0]?.base ?? 0)))).toBeLessThan(0.5)
    expect(Math.abs(Math.min(...primera.map((t) => t.x)) - TITULO.x)).toBeLessThan(0.5)
  })

  it('una imagen que no llegó no se dibuja y se cuenta', async () => {
    const { bytes, faltan } = await elPdf(false)
    expect(textoDelPdf(bytes).imagenes).toBe(0)
    expect(faltan).toBe(1)
  })

  it('una página con más líneas que su tope no se dibuja: la regla, con su texto; en el tope, sí', async () => {
    const pedido = { medidas: A4, imagenes: new Map(), titulo: 'Ficha', autor: 'Calesa Motors' }
    expect(
      await pdfDelArte({ ...pedido, paginas: conLineas(MAXIMO_DE_LINEAS_POR_PAGINA + 1) }),
    ).toEqual({ ok: false, error: { codigo: 'regla', mensaje: MENSAJE_DEMASIADAS_LINEAS } })
    const enElTope = await pdfDelArte({
      ...pedido,
      paginas: conLineas(MAXIMO_DE_LINEAS_POR_PAGINA),
    })
    expect(enElTope.ok && textoDelPdf(enElTope.data.bytes).paginas[0]?.lineas.at(-1)).toBe(
      `Línea ${String(MAXIMO_DE_LINEAS_POR_PAGINA)}`,
    )
  })
})

const metricas = z.object({ ascent: z.number(), descent: z.number(), unitsPerEm: z.number() })

describe('medidasDeGeist', () => {
  it('mide con los TTF del PDF: el ascenso y el descenso del lienzo, un ancho conocido y el kerning', async () => {
    const medir = await medidasDeGeist()
    // «Hola» en Geist Regular 1.9.2: 2.089 unidades de 1.000.
    expect(medir('Hola', 400, 100)).toBeCloseTo(208.9)
    expect(medir('AV', 700, 10)).toBeLessThan(medir('A', 700, 10) + medir('V', 700, 10))
    for (const peso of PESOS_DE_TEXTO) {
      const fuente = Font.getFont({ fontFamily: FAMILIA_DEL_ARTE, fontWeight: peso })
      const { ascent, descent, unitsPerEm } = metricas.parse(fuente.data)
      expect(ascent / unitsPerEm).toBe(METRICAS_DE_GEIST.ascenso)
      expect(-descent / unitsPerEm).toBe(METRICAS_DE_GEIST.descenso)
    }
  })
})
