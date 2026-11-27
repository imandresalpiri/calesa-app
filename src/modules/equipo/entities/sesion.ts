// La persona que está usando la app en este request: su cuenta, sus roles y lo que puede hacer.
// Sale de la RPC `mi_sesion()` (una sola ida a la base). Acá sólo se le da forma.
import { z } from 'zod'
import { concesionesDe, type Permisos } from '@/shared/lib/permisos'
import {
  LIVE_APAGADO,
  estadoDelLive,
  liveDeLaSesionDesde,
  type EstadoDelLive,
} from './live-combinar'
import { permisosDelLive } from './live-permisos'
import { SIN_PERSPECTIVA, perspectivaDesde, type Perspectiva } from './perspectiva'
import { preferenciasDesde, type Preferencias } from './preferencias'
import { VISTOS_POR_DEFECTO } from './vistos'

export const ESTADOS_CUENTA = ['activa', 'bloqueada', 'baja'] as const
// bloqueada = no puede operar, no pierde nada; baja = salió del equipo (sus leads van al limbo).
export type EstadoCuenta = (typeof ESTADOS_CUENTA)[number]

export type RolDeLaPersona = {
  id: string
  clave: string
  nombre: string
  color: string | null
  esPrincipal: boolean
}

export type Sesion = {
  usuarioId: string
  estado: EstadoCuenta
  nombre: string
  email: string
  // Ruta dentro del bucket público `avatares`.
  avatarRuta: string | null
  // ISO. Lo manda de vuelta el formulario de perfil para detectar un cambio ajeno.
  perfilActualizadoEn: string
  // Los nombres salen de la base: sirven para mostrarlos, nunca para decidir qué se puede hacer.
  roles: RolDeLaPersona[]
  // Los EFECTIVOS: con una perspectiva «ver como» activa, los que la interfaz debe dibujar
  // (nunca más que los reales); con el Modo Live encendido, además recortados a lo que dejan ver sus
  // ajustes (`permisosDelLive`). Vacío si la cuenta no está activa o no tiene ningún rol.
  permisos: Permisos
  perspectiva: Perspectiva
  preferencias: Preferencias
  // El Modo Live de este request: la cookie `modo-live` y los ajustes del rol y de la persona.
  live: EstadoDelLive
}

const esquemaSesion = z.object({
  estado: z.enum(ESTADOS_CUENTA),
  perfil: z.object({
    // guid y no uuid: `z.uuid()` exige versión y variante RFC, y Postgres acepta cualquier uuid.
    id: z.guid(),
    nombre: z.string(),
    email: z.string().nullable(),
    avatar_ruta: z.string().nullable(),
    actualizado_en: z.string(),
  }),
  roles: z.array(
    z.object({
      id: z.guid(),
      clave: z.string(),
      nombre: z.string(),
      color: z.string().nullable(),
      es_principal: z.boolean(),
    }),
  ),
  permisos: z.unknown(),
  perspectiva: z.unknown(),
  preferencias: z.unknown(),
  live: z.unknown(),
})

// `null` cuando la RPC no devolvió nada: hay sesión de Auth pero no hay perfil (la cuenta se
// eliminó con la sesión abierta). Una forma inesperada sí es un error: lanza. `cookieDelLive`: la
// cookie `modo-live` dice que está encendido.
export function sesionDesde(
  json: unknown,
  { cookieDelLive = false }: { cookieDelLive?: boolean } = {},
): Sesion | null {
  if (json === null || json === undefined) {
    return null
  }
  const { estado, perfil, roles, permisos, perspectiva, preferencias, live } =
    esquemaSesion.parse(json)
  const efectivos = concesionesDe(permisos)
  const estadoLive = estadoDelLive({
    cookie: cookieDelLive,
    live: liveDeLaSesionDesde(live),
    permisos: efectivos,
  })
  return {
    usuarioId: perfil.id,
    estado,
    nombre: perfil.nombre,
    email: perfil.email ?? '',
    avatarRuta: perfil.avatar_ruta,
    perfilActualizadoEn: perfil.actualizado_en,
    roles: roles.map((rol) => ({
      id: rol.id,
      clave: rol.clave,
      nombre: rol.nombre,
      color: rol.color,
      esPrincipal: rol.es_principal,
    })),
    permisos: estadoLive.encendido ? permisosDelLive(efectivos, estadoLive.ajustes) : efectivos,
    perspectiva: perspectivaDesde(perspectiva),
    preferencias: preferenciasDesde(preferencias),
    live: estadoLive,
  }
}

// Lo que se arma cuando hay sesión de Auth sin perfil: se trata como una baja, que es lo que es.
export function sesionSinPerfil(usuarioId: string, email: string): Sesion {
  return {
    usuarioId,
    estado: 'baja',
    nombre: '',
    email,
    avatarRuta: null,
    perfilActualizadoEn: '',
    roles: [],
    permisos: [],
    perspectiva: SIN_PERSPECTIVA,
    preferencias: {
      densidad: null,
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
    live: LIVE_APAGADO,
  }
}

// Una persona recién registrada (que no es la primera) o recién invitada puede no tener rol
// todavía: entra, pero no ve nada hasta que alguien se lo asigne.
export function sinRol(sesion: Pick<Sesion, 'roles'>): boolean {
  return sesion.roles.length === 0
}

// Cómo llamarla en pantalla: su nombre o, si todavía no lo cargó, la parte local de su correo.
export function nombreVisible(sesion: Pick<Sesion, 'nombre' | 'email'>): string {
  return sesion.nombre.trim() || sesion.email.split('@')[0] || 'Sin nombre'
}
