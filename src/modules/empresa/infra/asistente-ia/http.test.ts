// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { conTexto, levantarProveedorFalso } from './proveedor-falso.soporte'

vi.mock('server-only', () => ({}))

const CLAVE = 'sk-clave-que-no-sale-de-aca'
const proveedor = await levantarProveedorFalso()
const { pedirAlProveedor } = await import('./http')
const avisos = vi.spyOn(console, 'warn')

const llamada = (urlBase: string, esperaMs?: number) =>
  pedirAlProveedor({
    urlBase,
    clave: CLAVE,
    modelo: 'modelo-x',
    pedido: { mensajes: [{ role: 'user', content: 'hola' }], maxTokens: 5, temperatura: 0 },
    ...(esperaMs === undefined ? {} : { esperaMs }),
  })

beforeAll(() => proveedor.reiniciar())
beforeEach(() => {
  proveedor.reiniciar()
  avisos.mockClear().mockImplementation(() => undefined)
})
afterEach(() => {
  expect(JSON.stringify(avisos.mock.calls)).not.toContain(CLAVE)
})
afterAll(() => proveedor.cerrar())

describe('pedirAlProveedor', () => {
  it('una redirección no se sigue: la clave no viaja a otro lado', async () => {
    proveedor.contestar((pedido) =>
      pedido.ruta === '/otro/chat/completions'
        ? conTexto('no debía llegar')
        : { status: 302, ubicacion: `${proveedor.base}/otro/chat/completions` },
    )
    expect(await llamada(proveedor.base)).toEqual({
      respuesta: { ok: false, falla: 'no_disponible' },
      respondio: false,
    })
    expect(proveedor.pedidos.map((p) => p.ruta)).toEqual(['/chat/completions'])
  })

  it('un error del proveedor se registra con su código, nunca con su texto', async () => {
    proveedor.contestar(() => ({ status: 401, cuerpo: { error: `mala ${CLAVE}` } }))
    expect(await llamada(proveedor.base)).toEqual({
      respuesta: { ok: false, falla: 'clave_invalida', codigo: 401 },
      respondio: false,
    })
    expect(avisos.mock.calls[0]?.[1]).toEqual({ host: new URL(proveedor.base).host, codigo: 401 })
  })

  it('la barra final de la dirección no se duplica', async () => {
    await llamada(`${proveedor.base}/v1/`)
    expect(proveedor.pedidos[0]?.ruta).toBe('/v1/chat/completions')
  })

  // Va última: el pedido abortado puede llegar al servidor después de abortarse (con la máquina cargada) y colarse en los pedidos del que sigue.
  it('si no contesta a tiempo, «no respondió a tiempo» y no cuenta; el log lleva sólo el host', async () => {
    proveedor.contestar(() => null)
    expect(await llamada(proveedor.base, 50)).toEqual({
      respuesta: { ok: false, falla: 'sin_tiempo' },
      respondio: false,
    })
    expect(avisos.mock.calls[0]?.[1]).toEqual({
      host: new URL(proveedor.base).host,
      motivo: 'tiempo',
    })
  })
})
