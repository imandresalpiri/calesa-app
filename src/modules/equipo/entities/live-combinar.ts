// Combinar los ajustes del Live: por cada campo manda lo propio de la persona; si no lo pisa, lo de su rol; si su rol tampoco, lo por defecto.
// Con «Ver como» la base no manda lo propio (se mira como el rol). Con el Live encendido, la sesión lleva lo combinado y los permisos que
// dibujan las pantallas recortados (`permisosDelLive`).
import { puede, type Permisos } from '@/shared/lib/permisos'
import {
  AJUSTES_POR_DEFECTO_DEL_LIVE,
  CAMPOS_DEL_LIVE,
  ajustesDesdeLaBase,
  type AjustesDelLive,
  type AjustesParcialesDelLive,
  type CampoDelLive,
} from './live'
import { z } from 'zod'

export type FuenteDelCampo = 'defecto' | 'rol' | 'propio'

export type AjustesCombinados = {
  ajustes: AjustesDelLive
  fuente: Record<CampoDelLive, FuenteDelCampo>
}

export function combinarAjustesDelLive({
  rol,
  persona,
}: {
  rol: AjustesParcialesDelLive | null
  persona: AjustesParcialesDelLive | null
}): AjustesCombinados {
  const ajustes: Record<string, unknown> = {}
  const fuente: Partial<Record<CampoDelLive, FuenteDelCampo>> = {}
  for (const campo of CAMPOS_DEL_LIVE) {
    const propio = persona?.[campo]
    const delRol = rol?.[campo]
    if (propio !== undefined) {
      ajustes[campo] = propio
      fuente[campo] = 'propio'
    } else if (delRol !== undefined) {
      ajustes[campo] = delRol
      fuente[campo] = 'rol'
    } else {
      ajustes[campo] = AJUSTES_POR_DEFECTO_DEL_LIVE[campo]
      fuente[campo] = 'defecto'
    }
  }
  // Cada campo salió de un parcial validado o de lo por defecto: la forma es la de `AjustesDelLive`.
  return {
    ajustes: ajustes as AjustesDelLive,
    fuente: fuente as Record<CampoDelLive, FuenteDelCampo>,
  }
}

// El rol que manda en el Live (el principal, o el de «Ver como») y lo propio, tal como lo trae `mi_sesion()` en la clave `live`.
export type LiveDeLaSesion = {
  rol: { id: string; nombre: string; ajustes: AjustesParcialesDelLive | null } | null
  persona: AjustesParcialesDelLive | null
}

export const SIN_LIVE_DE_LA_SESION: LiveDeLaSesion = { rol: null, persona: null }

const esquemaDelLiveDeLaSesion = z.object({
  rol: z.object({ id: z.guid(), nombre: z.string(), ajustes: z.unknown() }).nullable(),
  persona: z.unknown(),
})

// La parte `live` de `mi_sesion()`. Sin ella (una respuesta vieja), lo por defecto.
export function liveDeLaSesionDesde(json: unknown): LiveDeLaSesion {
  if (json === null || json === undefined) {
    return SIN_LIVE_DE_LA_SESION
  }
  const { rol, persona } = esquemaDelLiveDeLaSesion.parse(json)
  return {
    rol:
      rol === null
        ? null
        : { id: rol.id, nombre: rol.nombre, ajustes: ajustesDesdeLaBase(rol.ajustes) },
    persona: ajustesDesdeLaBase(persona),
  }
}

// Lo que el servidor sabe del Live en este request. Al navegador viajan sólo los dos booleanos.
export type EstadoDelLive =
  | { encendido: false; puedeEncender: boolean }
  | {
      encendido: true
      puedeEncender: true
      ajustes: AjustesDelLive
      // «Sólo nombres» y quien mira ve leads de verdad: se leen los nombres (sólo `id, nombre`).
      nombresDeClientes: boolean
    }

export const LIVE_APAGADO: EstadoDelLive = { encendido: false, puedeEncender: false }

// La cookie dice si está encendido; los ajustes, si se puede. Encendido sin poder = apagado (la interfaz lo apaga con su aviso).
export function estadoDelLive({
  cookie,
  live,
  permisos,
}: {
  cookie: boolean
  live: LiveDeLaSesion
  // Los efectivos, antes del recorte del Live.
  permisos: Permisos
}): EstadoDelLive {
  const { ajustes } = combinarAjustesDelLive({
    rol: live.rol?.ajustes ?? null,
    persona: live.persona,
  })
  if (!ajustes.puedeEncender) {
    return { encendido: false, puedeEncender: false }
  }
  if (!cookie) {
    return { encendido: false, puedeEncender: true }
  }
  return {
    encendido: true,
    puedeEncender: true,
    ajustes,
    nombresDeClientes: ajustes.clientes === 'nombres' && puede(permisos, 'leads.ver'),
  }
}
