import { describe, expect, it, vi } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import type { ParaCompartir } from '../../entities/compartir-tipos-cambio'
import { responderParaCompartir } from './responder'

const A = '0b1f4b00-0000-4000-8000-000000000001'

const datos: ParaCompartir = {
  empresa: 'Importadora Andina',
  logoUrl: null,
  colorAcento: null,
  locale: 'es-BO',
  zonaHoraria: 'America/La_Paz',
  ahora: '2026-11-17T18:30:00.000Z',
  leyenda: 'Valores referenciales',
  tipos: [{ id: A, nombre: 'Oficial', monedaDe: 'USD', monedaA: 'BOB', valor: 6.96 }],
}

function puertos(lectura = ok(datos)) {
  return {
    leer: vi.fn(() => Promise.resolve(lectura)),
    dibujar: vi.fn(() => Promise.resolve(ok(new Uint8Array([137, 80, 78, 71])))),
  }
}

describe('responderParaCompartir', () => {
  it('el texto sale en text/plain, sin caché, con los tipos y la leyenda', async () => {
    const p = puertos()
    const respuesta = await responderParaCompartir('texto', A, p)
    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get('content-type')).toContain('text/plain')
    expect(respuesta.headers.get('cache-control')).toBe('private, no-store')
    const cuerpo = await respuesta.text()
    expect(cuerpo).toContain('Oficial: 1 USD = ')
    expect(cuerpo).toContain('Valores referenciales')
    expect(p.leer).toHaveBeenCalledWith([A])
    expect(p.dibujar).not.toHaveBeenCalled()
  })

  it('con `sinMoneda` arma los valores sin su moneda, en el texto y en la imagen', async () => {
    const p = puertos()
    const texto = await responderParaCompartir('texto', A, p, { sinMoneda: true })
    expect(await texto.text()).toContain('Oficial: 1 USD = 6,96')
    await responderParaCompartir('imagen', A, p, { sinMoneda: true })
    expect(p.dibujar).toHaveBeenCalledWith({ ...datos, sinMoneda: true })
  })

  it('la imagen sale en image/png', async () => {
    const respuesta = await responderParaCompartir('imagen', A, puertos())
    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get('content-type')).toBe('image/png')
    expect(new Uint8Array(await respuesta.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]))
  })

  it('unos ids inválidos son un 400 y no leen nada', async () => {
    const p = puertos()
    for (const ids of [null, '', 'x', `${A},x`]) {
      expect((await responderParaCompartir('texto', ids, p)).status).toBe(400)
    }
    expect(p.leer).not.toHaveBeenCalled()
  })

  it('si ya no están activos es un 404 con el motivo', async () => {
    const respuesta = await responderParaCompartir(
      'texto',
      A,
      puertos(fallo('no_encontrado', 'Esos tipos de cambio ya no están activos.')),
    )
    expect(respuesta.status).toBe(404)
    expect(await respuesta.text()).toBe('Esos tipos de cambio ya no están activos.')
  })

  it('un fallo de la base es un 500 sin el detalle', async () => {
    const respuesta = await responderParaCompartir(
      'imagen',
      A,
      puertos(fallo('inesperado', 'detalle técnico')),
    )
    expect(respuesta.status).toBe(500)
    expect(await respuesta.text()).not.toContain('técnico')
  })

  it('si la imagen no se dibuja es un 500 y el texto sigue disponible', async () => {
    const p = puertos()
    p.dibujar.mockResolvedValueOnce(fallo('inesperado', 'x'))
    expect((await responderParaCompartir('imagen', A, p)).status).toBe(500)
    expect((await responderParaCompartir('texto', A, p)).status).toBe(200)
  })
})
