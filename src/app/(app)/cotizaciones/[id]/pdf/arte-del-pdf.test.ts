// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Qué formato es de PDF es lo de verdad (`entities/`); lo que se lee con la sesión, simulado.
const leerArteParaCompartir = vi.fn()
const leerPlantillaParaEditar = vi.fn()
vi.mock('@/modules/artes', async () => ({
  ...(await vi.importActual<object>('@/modules/artes/entities/formatos')),
  leerArteParaCompartir: (...args: unknown[]) => leerArteParaCompartir(...args),
  leerPlantillaParaEditar: (...args: unknown[]) => leerPlantillaParaEditar(...args),
}))
const armar = vi.fn()
vi.mock('../../../_arte/pdf/pdf-del-arte', () => ({
  armarElPdfDeLaCotizacion: (...args: unknown[]) => armar(...args),
}))

import { pdfConElArte } from './arte-del-pdf'

const ORIGEN = '00000000-0000-4000-8000-0000000000b1'
const OTRO_ORIGEN = '00000000-0000-4000-8000-0000000000b2'
const PLANTILLA = '00000000-0000-4000-8000-0000000000a1'
const POR_DEFECTO = '00000000-0000-4000-8000-0000000000a2'
const sesion = { usuarioId: 'yo', permisos: [], live: { encendido: false } } as never
const lectura = { hoja: { cotizacion: { origenId: ORIGEN } } } as never
const DOCUMENTO = { version: 1, paginas: [] }

const plantilla = (cambios: Record<string, unknown> = {}) => ({
  ok: true,
  data: {
    id: PLANTILLA,
    nombre: 'Ficha',
    formato: 'a4',
    ancho: 595,
    alto: 842,
    origenId: ORIGEN,
    documento: { ok: true, data: DOCUMENTO },
    ...cambios,
  },
})
const PDF = { ok: true, data: { bytes: new Uint8Array([1]), faltan: 0 } }

beforeEach(() => {
  vi.clearAllMocks()
  leerArteParaCompartir.mockResolvedValue({ ok: true, data: { tipo: 'de-hoy', cual: 'pdf' } })
  leerPlantillaParaEditar.mockResolvedValue(plantilla())
  armar.mockResolvedValue(PDF)
})

describe('pdfConElArte', () => {
  it('con ?plantilla= válida, del origen y de PDF, arma ésa con la guardada', async () => {
    expect(await pdfConElArte(sesion, lectura, PLANTILLA)).toEqual({
      plantillaId: PLANTILLA,
      pdf: PDF,
    })
    expect(leerArteParaCompartir).not.toHaveBeenCalled()
    expect(armar).toHaveBeenCalledWith(sesion, {
      plantilla: plantilla().data,
      documento: DOCUMENTO,
      lectura,
    })
  })

  it('sin el parámetro, la por defecto de PDF del origen; sin ella, el de hoy', async () => {
    leerArteParaCompartir.mockResolvedValue({
      ok: true,
      data: { tipo: 'plantilla', plantillaId: POR_DEFECTO },
    })
    leerPlantillaParaEditar.mockResolvedValue(plantilla({ id: POR_DEFECTO }))
    expect((await pdfConElArte(sesion, lectura, null))?.plantillaId).toBe(POR_DEFECTO)
    expect(leerArteParaCompartir).toHaveBeenCalledWith(ORIGEN, 'pdf')
    expect(leerPlantillaParaEditar).toHaveBeenCalledWith(POR_DEFECTO)

    leerArteParaCompartir.mockResolvedValue({ ok: true, data: { tipo: 'de-hoy', cual: 'pdf' } })
    expect(await pdfConElArte(sesion, lectura, null)).toBeNull()
    leerArteParaCompartir.mockResolvedValue({ ok: false, error: { codigo: 'inesperado' } })
    expect(await pdfConElArte(sesion, lectura, null)).toBeNull()
  })

  it.each([
    ['un parámetro que no es un id', 'abc', plantilla()],
    ['una plantilla que no se ve o se borró', PLANTILLA, { ok: true, data: null }],
    ['un error al leerla', PLANTILLA, { ok: false, error: { codigo: 'inesperado' } }],
    ['una de otro origen', PLANTILLA, plantilla({ origenId: OTRO_ORIGEN })],
    ['una de imagen', PLANTILLA, plantilla({ formato: 'cuadrado', ancho: 1080, alto: 1080 })],
    ['un documento que no se lee', PLANTILLA, plantilla({ documento: { ok: false } })],
  ])('con %s sale el PDF de hoy', async (_caso, pedida, leida) => {
    leerPlantillaParaEditar.mockResolvedValue(leida)
    expect(await pdfConElArte(sesion, lectura, pedida)).toBeNull()
    expect(armar).not.toHaveBeenCalled()
  })

  it('el fallo del arte sube tal cual: no se tapa con el PDF de hoy', async () => {
    const fallo = { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } }
    armar.mockResolvedValue(fallo)
    expect(await pdfConElArte(sesion, lectura, PLANTILLA)).toEqual({
      plantillaId: PLANTILLA,
      pdf: fallo,
    })
  })
})
