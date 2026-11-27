import { describe, expect, it } from 'vitest'
import { SIN_ACCIONES, type AccionesDelRequisito } from './accion-de-requisito'
import { avisosDeQueFalta, destinoPrincipal } from './avisos-de-que-falta'

const req = (
  requisitoId: string,
  etiqueta: string,
  extra: { cumplido?: boolean; bloqueante?: boolean } = {},
) => ({
  requisitoId,
  etiqueta,
  cumplido: extra.cumplido ?? false,
  bloqueante: extra.bloqueante ?? true,
})

const en = (hueco: AccionesDelRequisito['hueco']): AccionesDelRequisito => ({
  ...SIN_ACCIONES,
  hueco,
})

describe('avisos de «Qué falta» en las tarjetas', () => {
  it('un documento que falta: «Falta «BL»» en Documentos', () => {
    const destino = { faseId: 'f', requisitos: [req('r1', 'BL')] }
    expect(avisosDeQueFalta(destino, { r1: en('documentos') })).toEqual({
      documentos: 'Falta «BL»',
    })
  })

  it('dos documentos: «Faltan 2 documentos»; lo cumplido o no bloqueante no cuenta', () => {
    const destino = {
      faseId: 'f',
      requisitos: [
        req('r1', 'BL'),
        req('r2', 'Factura'),
        req('r3', 'DUI', { cumplido: true }),
        req('r4', 'Fotos', { bloqueante: false }),
      ],
    }
    const acciones = {
      r1: en('documentos'),
      r2: en('documentos'),
      r3: en('documentos'),
      r4: en('documentos'),
    }
    expect(avisosDeQueFalta(destino, acciones)).toEqual({ documentos: 'Faltan 2 documentos' })
  })

  it('un pago va a Dinero y un dato a la tarjeta de su hueco', () => {
    const destino = { faseId: 'f', requisitos: [req('r1', 'Anticipo'), req('r2', 'Contenedor')] }
    expect(avisosDeQueFalta(destino, { r1: en('pagos'), r2: en('transporte') })).toEqual({
      dinero: 'Falta «Anticipo»',
      transporte: 'Falta «Contenedor»',
    })
  })

  it('sin hueco (un dato del vehículo, una espera sin hueco) o sin faltas: nada', () => {
    expect(
      avisosDeQueFalta({ faseId: 'f', requisitos: [req('r1', 'VIN')] }, { r1: en(null) }),
    ).toEqual({})
    expect(avisosDeQueFalta({ faseId: 'f', requisitos: [] }, {})).toEqual({})
    expect(avisosDeQueFalta(null, {})).toEqual({})
  })

  it('el destino principal es la siguiente del camino si es una salida; si no, el primero', () => {
    const destinos = [
      { faseId: 'a', requisitos: [] },
      { faseId: 'b', requisitos: [] },
    ]
    expect(destinoPrincipal(destinos, 'b')?.faseId).toBe('b')
    expect(destinoPrincipal(destinos, 'z')?.faseId).toBe('a')
    expect(destinoPrincipal([], null)).toBeNull()
  })
})
