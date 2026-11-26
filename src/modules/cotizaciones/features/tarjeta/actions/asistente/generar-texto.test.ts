import { beforeEach, describe, expect, it, vi } from 'vitest'

const COTIZACION = '22222222-2222-4222-8222-222222222222'
const ATAJO = 'a5157e00-0000-4000-8000-000000000001'
const PERSONA = '55555555-5555-4555-8555-555555555555'

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  visible: { ok: true, data: true } as { ok: true; data: boolean } | { ok: false; error: unknown },
  asesor: { ok: true, data: { nombre: 'Ana Pérez' } } as {
    ok: boolean
    data?: { nombre: string } | null
  },
  redactar: vi.fn(),
  leerVisible: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getClaims: () => Promise.resolve({ data: { claims: { sub: PERSONA } } }) },
      rpc: (nombre: string) =>
        Promise.resolve(
          nombre === 'mis_permisos'
            ? { data: h.permisos, error: null }
            : { data: null, error: null },
        ),
    }),
}))
vi.mock('@/modules/empresa', () => ({ redactarConElAsistente: h.redactar }))
vi.mock('../../../../areas/tarjeta/composicion', () => ({
  leerCotizacionVisible: h.leerVisible,
  leerAsesorQueMira: () => Promise.resolve(h.asesor),
}))

const { generarTextoConElAsistente } = await import('./generar-texto')
const { reescribirTextoConElAsistente } = await import('./reescribir-texto')

beforeEach(() => {
  h.permisos = [{ clave: 'cotizaciones.ver', origen_id: null, alcance: 'todos' }]
  h.visible = { ok: true, data: true }
  h.asesor = { ok: true, data: { nombre: 'Ana Pérez' } }
  h.redactar.mockReset().mockResolvedValue({ ok: true, data: { texto: 'Texto redactado' } })
  h.leerVisible.mockReset().mockImplementation(() => Promise.resolve(h.visible))
})

describe('generarTextoConElAsistente', () => {
  it('sin acceso a la cotización no llama al asistente', async () => {
    h.visible = { ok: true, data: false }
    const respuesta = await generarTextoConElAsistente({
      cotizacionId: COTIZACION,
      atajoId: ATAJO,
      texto: 'Toyota Hilux 2021',
    })
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: 'No tienes acceso a esta cotización.' },
    })
    expect(h.leerVisible).toHaveBeenCalledWith(COTIZACION)
    expect(h.redactar).not.toHaveBeenCalled()
  })

  it('si no se pudo leer la cotización, devuelve ese error y no llama al asistente', async () => {
    const error = { codigo: 'inesperado', mensaje: 'No pudimos leer la cotización.' }
    h.visible = { ok: false, error }
    const respuesta = await generarTextoConElAsistente({
      cotizacionId: COTIZACION,
      atajoId: ATAJO,
      texto: 'Toyota Hilux 2021',
    })
    expect(respuesta.data).toEqual({ ok: false, error })
    expect(h.redactar).not.toHaveBeenCalled()
  })

  it('con acceso, pide con el atajo, el texto recortado, la firma y sin ofrecer Integraciones', async () => {
    const respuesta = await generarTextoConElAsistente({
      cotizacionId: COTIZACION,
      atajoId: ATAJO,
      texto: '  Toyota Hilux 2021  ',
    })
    expect(respuesta.data).toEqual({ ok: true, data: { texto: 'Texto redactado' } })
    expect(h.redactar).toHaveBeenCalledWith({
      tipo: 'generar',
      atajoId: ATAJO,
      texto: 'Toyota Hilux 2021',
      firma: 'Ana Pérez',
      puedeConfigurar: false,
    })
  })

  it('con el permiso de ajustes, el error podrá ofrecer Integraciones; sin nombre legible, sin firma', async () => {
    h.permisos.push({ clave: 'empresa.ajustes.gestionar', origen_id: null, alcance: 'todos' })
    h.asesor = { ok: false }
    await generarTextoConElAsistente({ cotizacionId: COTIZACION, atajoId: ATAJO, texto: 'Hilux' })
    expect(h.redactar).toHaveBeenCalledWith(
      expect.objectContaining({ firma: null, puedeConfigurar: true }),
    )
  })

  it('los topes de la entrada rechazan antes de leer nada', async () => {
    for (const entrada of [
      { cotizacionId: 'no-es-un-id', atajoId: ATAJO, texto: 'Hilux' },
      { cotizacionId: COTIZACION, atajoId: ATAJO, texto: '   ' },
      { cotizacionId: COTIZACION, atajoId: ATAJO, texto: 'a'.repeat(8001) },
    ]) {
      const respuesta = await generarTextoConElAsistente(entrada)
      expect(respuesta.validationErrors).toBeDefined()
    }
    expect(h.leerVisible).not.toHaveBeenCalled()
    expect(h.redactar).not.toHaveBeenCalled()
  })
})

describe('reescribirTextoConElAsistente', () => {
  it('con acceso, pide con la instrucción recortada', async () => {
    await reescribirTextoConElAsistente({
      cotizacionId: COTIZACION,
      texto: 'Hilux',
      instruccion: '  Más corto  ',
    })
    expect(h.redactar).toHaveBeenCalledWith({
      tipo: 'reescribir',
      instruccion: 'Más corto',
      texto: 'Hilux',
      firma: 'Ana Pérez',
      puedeConfigurar: false,
    })
  })

  it('una instrucción vacía o de más de 500 caracteres se rechaza', async () => {
    for (const instruccion of ['  ', 'a'.repeat(501)]) {
      const respuesta = await reescribirTextoConElAsistente({
        cotizacionId: COTIZACION,
        texto: 'Hilux',
        instruccion,
      })
      expect(respuesta.validationErrors).toBeDefined()
    }
    expect(h.redactar).not.toHaveBeenCalled()
  })
})
