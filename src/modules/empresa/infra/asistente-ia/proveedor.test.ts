// @vitest-environment node
// Un servidor HTTP real en 127.0.0.1 hace de proveedor (`proveedor-falso.soporte.ts`): el `fetch` de verdad, con su cabecera y su cuerpo.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { conTexto, levantarProveedorFalso } from './proveedor-falso.soporte'

vi.mock('server-only', () => ({}))

const CLAVE = 'sk-clave-que-no-sale-de-aca'

// Lo que ve el cliente de quien pide: su sesión, su permiso y la fila del asistente.
let conSesion = true
let tienePermiso = true
let fila: { activa: boolean; config: unknown; secreto_guardado_en: string | null } | null = null
let urlDeLaBase = 'http://127.0.0.1:54621'
const llamadasRpc: string[] = []
const llamadasDelAdmin: [string, unknown][] = []

const crearAdmin = vi.fn(() => ({
  rpc: (nombre: string, argumentos: unknown) => {
    llamadasDelAdmin.push([nombre, argumentos])
    return Promise.resolve({ data: CLAVE, error: null })
  },
}))

vi.mock('@/shared/lib/supabase/admin', () => ({ createAdminClient: crearAdmin }))

vi.mock('@/shared/config/entorno', () => ({
  entornoPublico: () => ({ NEXT_PUBLIC_SUPABASE_URL: urlDeLaBase }),
}))

const EMPRESA = { nombre: 'Autos del Sur', pais: 'Chile' }

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getClaims: () =>
          Promise.resolve({ data: conSesion ? { claims: { sub: 'quien' } } : null, error: null }),
      },
      rpc: (nombre: string) => {
        llamadasRpc.push(nombre)
        return Promise.resolve({ data: nombre === 'tiene_permiso' ? tienePermiso : 1, error: null })
      },
      from: (tabla: string) => ({
        select: () => ({
          eq: () =>
            tabla === 'integraciones'
              ? { maybeSingle: () => Promise.resolve({ data: fila, error: null }) }
              : { single: () => Promise.resolve({ data: EMPRESA, error: null }) },
        }),
      }),
    }),
}))

const ATAJO = 'a5157e00-0000-4000-8000-000000000001'
const APAGADO = 'a5157e00-0000-4000-8000-000000000004'
const configCon = (url_base: string) => ({
  preajuste: 'otro',
  url_base,
  modelo: 'modelo-x',
  prompt_base: 'Sé breve.',
  atajos: [
    { id: ATAJO, nombre: 'Para WhatsApp', instruccion: 'Corto.', activo: true, max_tokens: 260 },
    { id: APAGADO, nombre: 'Más corto', instruccion: 'Corto.', activo: false, max_tokens: 300 },
  ],
  clave_termina_en: 'aca',
})

const proveedor = await levantarProveedorFalso()
const espias = [vi.spyOn(console, 'warn'), vi.spyOn(console, 'error'), vi.spyOn(console, 'log')]
const { probarElAsistente, redactarConElAsistente } = await import('./proveedor')

const generar = (puedeConfigurar = true, atajoId = ATAJO) =>
  redactarConElAsistente({
    tipo: 'generar',
    atajoId,
    texto: 'Toyota Hilux 2020',
    firma: 'Wanda Web',
    puedeConfigurar,
  })
const usosContados = () => llamadasRpc.filter((n) => n === 'asistente_ia_contar_uso').length

beforeEach(() => {
  conSesion = true
  tienePermiso = true
  urlDeLaBase = 'http://127.0.0.1:54621'
  fila = {
    activa: true,
    config: configCon(`${proveedor.base}/v1`),
    secreto_guardado_en: '2026-11-26T12:00:00+00:00',
  }
  proveedor.reiniciar()
  llamadasRpc.length = 0
  llamadasDelAdmin.length = 0
  crearAdmin.mockClear()
  for (const espia of espias) espia.mockClear().mockImplementation(() => undefined)
})

afterEach(() => {
  // La clave no aparece en ningún log.
  for (const espia of espias) expect(JSON.stringify(espia.mock.calls)).not.toContain(CLAVE)
})

afterAll(() => proveedor.cerrar())

describe('redactarConElAsistente: lo que se comprueba antes del admin', () => {
  it('sin sesión no crea el admin ni llama al proveedor', async () => {
    conSesion = false
    expect(await generar()).toMatchObject({ ok: false, error: { codigo: 'no_autenticado' } })
    expect(crearAdmin).not.toHaveBeenCalled()
    expect(proveedor.pedidos).toHaveLength(0)
  })

  it('apagado, sin clave, ilegible o sin la fila es «no configurado»; ofrece configurar sólo a quien puede', async () => {
    const guardada = fila!
    for (const caso of [
      { ...guardada, activa: false },
      { ...guardada, secreto_guardado_en: null },
      { ...guardada, config: { preajuste: 'otro' } },
      null,
    ]) {
      fila = caso
      expect(await generar()).toEqual({
        ok: false,
        error: {
          codigo: 'regla',
          mensaje: 'El asistente no está configurado.',
          causa: 'configurar',
        },
      })
    }
    expect(await generar(false)).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'El asistente no está configurado.' },
    })
    expect(crearAdmin).not.toHaveBeenCalled()
    expect(proveedor.pedidos).toHaveLength(0)
  })

  it('una red interna, o el loopback con la base en la nube, no se llaman', async () => {
    fila = { ...fila!, config: configCon('https://10.0.0.5/v1') }
    expect(await generar()).toMatchObject({ ok: false, error: { causa: 'configurar' } })
    urlDeLaBase = 'https://abc.supabase.co'
    fila = { ...fila, config: configCon(`${proveedor.base}/v1`) }
    expect(await generar()).toMatchObject({ ok: false, error: { causa: 'configurar' } })
    expect(crearAdmin).not.toHaveBeenCalled()
    expect(proveedor.pedidos).toHaveLength(0)
  })

  it('un atajo apagado no crea el admin', async () => {
    expect(await generar(true, APAGADO)).toMatchObject({
      ok: false,
      error: { mensaje: 'Ese atajo ya no está disponible.' },
    })
    expect(crearAdmin).not.toHaveBeenCalled()
  })
})

describe('redactarConElAsistente: lo que contesta el proveedor', () => {
  it('manda la clave sólo en la cabecera, el pedido armado al chat, y cuenta un uso', async () => {
    const resultado = await generar()
    expect(resultado).toEqual({ ok: true, data: { texto: 'Texto del servidor falso' } })
    expect(llamadasDelAdmin).toEqual([['integracion_secreto', { p_clave: 'asistente_ia' }]])
    expect(proveedor.pedidos).toHaveLength(1)
    const [pedido] = proveedor.pedidos
    expect(pedido).toMatchObject({
      metodo: 'POST',
      ruta: '/v1/chat/completions',
      autorizacion: `Bearer ${CLAVE}`,
      cuerpo: { model: 'modelo-x', max_tokens: 260, temperature: 1.1, stream: false },
    })
    const mensajes = pedido?.cuerpo['messages'] as { role: string; content: string }[]
    expect(mensajes.map((m) => m.role)).toEqual(['system', 'user'])
    expect(mensajes[0]?.content).toContain('Autos del Sur, una importadora de vehículos en Chile')
    expect(mensajes[1]?.content).toContain('Quien comparte: Wanda Web')
    expect(usosContados()).toBe(1)
    expect(JSON.stringify(resultado)).not.toContain(CLAVE)
  })

  it('reescribir lleva la instrucción libre con su temperatura', async () => {
    await redactarConElAsistente({
      tipo: 'reescribir',
      instruccion: 'Sin emojis.',
      texto: 'Hilux',
      firma: null,
      puedeConfigurar: true,
    })
    expect(proveedor.pedidos[0]?.cuerpo).toMatchObject({ max_tokens: 700, temperature: 1.3 })
  })

  it('un 401 es la clave, ofrece reemplazarla y no cuenta', async () => {
    proveedor.contestar(() => ({ status: 401, cuerpo: { error: { message: `mala ${CLAVE}` } } }))
    const resultado = await generar()
    expect(resultado).toEqual({
      ok: false,
      error: {
        codigo: 'regla',
        mensaje: 'La clave del asistente no es válida.',
        causa: 'reemplazar_la_clave',
      },
    })
    expect(JSON.stringify(resultado)).not.toContain(CLAVE)
    expect(usosContados()).toBe(0)
  })

  it('un 500 no está disponible y no cuenta; un 404 es un rechazo con su código', async () => {
    proveedor.contestar(() => ({ status: 500 }))
    expect(await generar()).toMatchObject({
      error: { mensaje: 'El asistente no está disponible ahora. Vuelve a intentar en un momento.' },
    })
    proveedor.contestar(() => ({ status: 404 }))
    expect(await generar()).toMatchObject({
      error: { mensaje: 'El asistente rechazó el pedido (404). Revisa la dirección y el modelo.' },
    })
    expect(usosContados()).toBe(0)
  })

  it('un 200 vacío dice «vacío» y cuenta: llegó y gastó', async () => {
    proveedor.contestar(() => conTexto('   '))
    expect(await generar()).toMatchObject({
      error: { mensaje: 'El asistente devolvió un texto vacío.' },
    })
    expect(usosContados()).toBe(1)
  })
})

describe('probarElAsistente', () => {
  it('sin permiso no crea el admin', async () => {
    tienePermiso = false
    expect(await probarElAsistente()).toMatchObject({ ok: false, error: { codigo: 'sin_permiso' } })
    expect(crearAdmin).not.toHaveBeenCalled()
  })

  it('sin clave lo dice, sin admin; apagado se prueba igual', async () => {
    fila = { ...fila!, secreto_guardado_en: null }
    expect(await probarElAsistente()).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'Carga la clave para probar.' },
    })
    expect(crearAdmin).not.toHaveBeenCalled()
    fila = { ...fila, activa: false, secreto_guardado_en: '2026-11-26T12:00:00+00:00' }
    expect(await probarElAsistente()).toEqual({ ok: true, data: { modelo: 'modelo-x' } })
  })

  it('cualquier 2xx anda, aunque venga vacío, y no cuenta como uso', async () => {
    proveedor.contestar(() => conTexto(''))
    expect(await probarElAsistente()).toEqual({ ok: true, data: { modelo: 'modelo-x' } })
    expect(proveedor.pedidos[0]?.cuerpo).toMatchObject({ max_tokens: 5, temperature: 0 })
    expect(usosContados()).toBe(0)
  })

  it('una clave inválida ofrece reemplazarla', async () => {
    proveedor.contestar(() => ({ status: 403 }))
    expect(await probarElAsistente()).toMatchObject({
      ok: false,
      error: { causa: 'reemplazar_la_clave' },
    })
  })
})
