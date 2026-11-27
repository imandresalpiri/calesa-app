import { describe, expect, it } from 'vitest'
import { nombreVisible, sesionDesde, sesionSinPerfil, sinRol } from './sesion'
import { VISTOS_POR_DEFECTO } from './vistos'

const ID = '00000000-0000-0000-0000-000000000001'
const ROL = '00000000-0000-0000-0000-0000000000aa'

const json = {
  estado: 'activa',
  perfil: {
    id: ID,
    nombre: 'Sofía Ramos',
    email: 'sofia@ejemplo.com',
    avatar_ruta: null,
    actualizado_en: '2026-10-11T15:00:00+00:00',
  },
  roles: [{ id: ROL, clave: 'dueno', nombre: 'Dueño', color: '#465fff', es_principal: true }],
  permisos: [
    { clave: 'leads.ver', origen_id: null, alcance: 'todos' },
    { clave: 'permiso.que.no.existe', origen_id: null, alcance: 'todos' },
  ],
  perspectiva: {
    disponible: true,
    rol: null,
    roles: [{ id: ROL, nombre: 'Dueño', color: '#465fff' }],
  },
  preferencias: { densidad: 'comoda' },
  live: {
    rol: { id: ROL, nombre: 'Dueño', ajustes: { clientes: 'completo' } },
    persona: null,
  },
}

describe('sesionDesde', () => {
  it('da forma a la respuesta de mi_sesion()', () => {
    expect(sesionDesde(json)).toEqual({
      usuarioId: ID,
      estado: 'activa',
      nombre: 'Sofía Ramos',
      email: 'sofia@ejemplo.com',
      avatarRuta: null,
      perfilActualizadoEn: '2026-10-11T15:00:00+00:00',
      roles: [{ id: ROL, clave: 'dueno', nombre: 'Dueño', color: '#465fff', esPrincipal: true }],
      // La clave que este código no conoce se descarta.
      permisos: [{ clave: 'leads.ver', origenId: null, alcance: 'todos' }],
      perspectiva: {
        disponible: true,
        rol: null,
        roles: [{ id: ROL, nombre: 'Dueño', color: '#465fff' }],
      },
      preferencias: {
        densidad: 'comoda',
        tema: null,
        porPagina: null,
        widgetsDelTablero: null,
        vistos: VISTOS_POR_DEFECTO,
        zonaHoraria: null,
        vistaDeVehiculos: null,
        vistaDeCotizaciones: null,
        vistaDeEmbarques: null,
        agruparCotizaciones: null,
        embudoDeLaFicha: null,
        menuPlegado: null,
        ultimoOrigenDeLogistica: null,
      },
      // Sin la cookie `modo-live`: apagado.
      live: { encendido: false, puedeEncender: true },
    })
  })
})

describe('sesionDesde con el Modo Live', () => {
  it('con la cookie del Live recorta los permisos que dibujan y lleva los ajustes combinados', () => {
    const sesion = sesionDesde(
      {
        ...json,
        permisos: [
          { clave: 'leads.ver', origen_id: null, alcance: 'todos' },
          { clave: 'chat.participar', origen_id: null, alcance: 'todos' },
          { clave: 'vehiculos.ver', origen_id: null, alcance: 'todos' },
        ],
      },
      { cookieDelLive: true },
    )
    expect(sesion?.permisos).toEqual([
      { clave: 'leads.ver', origenId: null, alcance: 'todos' },
      { clave: 'vehiculos.ver', origenId: null, alcance: 'todos' },
    ])
    expect(sesion?.live).toMatchObject({ encendido: true, ajustes: { clientes: 'completo' } })
  })

  it('si su rol no puede encender el Live, la cookie no lo enciende', () => {
    const sesion = sesionDesde(
      {
        ...json,
        live: {
          rol: { id: ROL, nombre: 'Dueño', ajustes: { puede_encender: false } },
          persona: null,
        },
      },
      { cookieDelLive: true },
    )
    expect(sesion?.live).toEqual({ encendido: false, puedeEncender: false })
    expect(sesion?.permisos).toEqual([{ clave: 'leads.ver', origenId: null, alcance: 'todos' }])
  })
})

describe('sesionDesde con niveles', () => {
  it('trae los permisos de un nivel de acceso de la sesión', () => {
    const sesion = sesionDesde({
      ...json,
      permisos: [
        { clave: 'cotizaciones.nivel.costos.ver', origen_id: null, alcance: 'todos' },
        { clave: 'cotizaciones.nivel.todos.ver', origen_id: null, alcance: 'todos' },
      ],
    })
    expect(sesion?.permisos).toEqual([
      { clave: 'cotizaciones.nivel.costos.ver', origenId: null, alcance: 'todos' },
    ])
  })

  it('devuelve null si no hay perfil', () => {
    expect(sesionDesde(null)).toBeNull()
  })

  it('lanza si la respuesta no tiene la forma esperada', () => {
    expect(() => sesionDesde({ ...json, estado: 'suspendida' })).toThrow()
  })
})

describe('sesionSinPerfil', () => {
  it('es una baja sin permisos', () => {
    const sesion = sesionSinPerfil(ID, 'x@ejemplo.com')
    expect(sesion.estado).toBe('baja')
    expect(sesion.permisos).toEqual([])
    expect(sesion.live).toEqual({ encendido: false, puedeEncender: false })
  })
})

describe('sinRol', () => {
  it('distingue a quien todavía no tiene rol', () => {
    expect(sinRol({ roles: [] })).toBe(true)
    expect(sinRol({ roles: sesionDesde(json)?.roles ?? [] })).toBe(false)
  })
})

describe('nombreVisible', () => {
  it('usa el nombre, y si falta, la parte local del correo', () => {
    expect(nombreVisible({ nombre: 'Rosa Mamani', email: 'rosa@ejemplo.com' })).toBe('Rosa Mamani')
    expect(nombreVisible({ nombre: '  ', email: 'rosa@ejemplo.com' })).toBe('rosa')
    expect(nombreVisible({ nombre: '', email: '' })).toBe('Sin nombre')
  })
})
