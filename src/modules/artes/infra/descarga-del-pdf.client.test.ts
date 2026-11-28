import { afterEach, describe, expect, it, vi } from 'vitest'
import { MENSAJE_SIN_EL_PDF } from '../entities/pdf/pedido-del-pdf'
import { pedirElPdfDelArte } from './descarga-del-pdf.client'

const ID = '00000000-0000-4000-8000-0000000000aa'
const PEDIDO = { documento: { version: 3 }, eleccion: null }

function responder(respuesta: Response | Error) {
  const espia = vi.fn<typeof fetch>(() =>
    respuesta instanceof Error ? Promise.reject(respuesta) : Promise.resolve(respuesta),
  )
  vi.stubGlobal('fetch', espia)
  return espia
}

const pdf = (faltan?: string) =>
  new Response(new Uint8Array([37, 80, 68, 70]), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      ...(faltan === undefined ? {} : { 'X-Imagenes-Que-Faltan': faltan }),
    },
  })

const texto = (cuerpo: string, status: number) =>
  new Response(cuerpo, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

// Lo que el navegador da con `redirect: 'manual'` ante un 307: una respuesta opaca, de estado 0.
const redireccionOpaca = () => {
  const r = new Response(null, { status: 200 })
  Object.defineProperty(r, 'type', { value: 'opaqueredirect' })
  Object.defineProperty(r, 'status', { value: 0 })
  Object.defineProperty(r, 'ok', { value: false })
  return r
}

const fallo = async (respuesta: Response | Error) => {
  responder(respuesta)
  const r = await pedirElPdfDelArte(ID, PEDIDO)
  return r.ok ? null : r.error
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pedirElPdfDelArte', () => {
  it('manda el pedido por POST en JSON, sin seguir la redirección ni guardar en caché', async () => {
    const espia = responder(pdf())
    await pedirElPdfDelArte(ID, PEDIDO)
    expect(espia).toHaveBeenCalledWith(`/artes/${ID}/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PEDIDO),
      redirect: 'manual',
      cache: 'no-store',
    })
  })

  it('un 200 con un PDF da sus bytes y cuántas imágenes faltan', async () => {
    responder(pdf('2'))
    const r = await pedirElPdfDelArte(ID, PEDIDO)
    if (!r.ok) {
      throw new Error('falló')
    }
    expect(new Uint8Array(await r.data.blob.arrayBuffer())).toEqual(
      new Uint8Array([37, 80, 68, 70]),
    )
    expect(r.data.faltan).toBe(2)
    responder(pdf())
    expect(await pedirElPdfDelArte(ID, PEDIDO)).toMatchObject({ ok: true, data: { faltan: 0 } })
  })

  it('cada rechazo con su código y el texto corto de la ruta', async () => {
    expect(await fallo(texto('No encontramos esta plantilla de arte.', 404))).toEqual({
      codigo: 'no_encontrado',
      mensaje: 'No encontramos esta plantilla de arte.',
    })
    expect((await fallo(texto('La plantilla de arte pesa más de 512 KB.', 413)))?.codigo).toBe(
      'validacion',
    )
    expect((await fallo(texto('El documento no es válido.', 422)))?.codigo).toBe('validacion')
    expect((await fallo(texto('Pide el PDF desde el editor de artes.', 403)))?.codigo).toBe(
      'sin_permiso',
    )
  })

  it('un 500, un cuerpo que no es texto o uno largo no se muestran', async () => {
    expect(await fallo(texto('detalle interno', 500))).toEqual({
      codigo: 'inesperado',
      mensaje: MENSAJE_SIN_EL_PDF,
    })
    const html = new Response('<html>', { status: 404, headers: { 'Content-Type': 'text/html' } })
    expect((await fallo(html))?.mensaje).toBe(MENSAJE_SIN_EL_PDF)
    expect((await fallo(texto('x'.repeat(500), 422)))?.mensaje).toBe(MENSAJE_SIN_EL_PDF)
  })

  it('la redirección al ingreso es no_autenticado; un 200 que no es un PDF, inesperado; sin red, sin_red', async () => {
    expect((await fallo(redireccionOpaca()))?.codigo).toBe('no_autenticado')
    const html = new Response('<html>', { status: 200, headers: { 'Content-Type': 'text/html' } })
    expect((await fallo(html))?.codigo).toBe('inesperado')
    expect(await fallo(new TypeError('Failed to fetch'))).toMatchObject({
      codigo: 'inesperado',
      causa: 'sin_red',
    })
  })
})
