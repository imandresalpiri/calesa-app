// Lo que dibuja Configuración › Modo Live: una tarjeta por rol con sus ajustes del Live y, en «Ajustes por persona», las personas con lo
// propio (docs/GLOSARIO.md › Ajuste propio). Las filas de la base (`live_ajustes_roles` y `live_personas()`) se validan acá.
import { z } from 'zod'
import { cumpleElMinimo } from '@/shared/lib/filtros'
import { ajustesDesdeLaBase, type AjustesParcialesDelLive } from './live'
import { LARGO_MAXIMO_DE_BUSQUEDA, MINIMO_DE_BUSQUEDA_DEL_EQUIPO } from './lista-equipo'

export const MOTIVO_SIN_PERMISO_DEL_LIVE = 'Te falta el permiso «Configurar el Modo Live».'

// Los paneles de la página, cada uno con su URL: el modal de un rol (`?panel=rol&rol=<id>`), el de una persona (`?panel=persona&persona=<id>`) y las
// dos confirmaciones.
export const CLAVE_DEL_ROL = 'rol'
export const CLAVE_DE_LA_PERSONA = 'persona'
export const PANEL_DEL_ROL = 'rol'
export const PANEL_DE_LA_PERSONA = 'persona'
export const PANEL_ROL_POR_DEFECTO = 'rol-por-defecto'
export const PANEL_PERSONA_A_SU_ROL = 'persona-a-su-rol'

export type AjustesDeUnRol = {
  rol: { id: string; nombre: string }
  // `null`: el rol no tiene fila (se ve «Por defecto»).
  ajustes: AjustesParcialesDelLive | null
  actualizadoEn: string | null
}

export type AjustesDeLosRoles = { roles: AjustesDeUnRol[]; hayMas: boolean }

export type PersonaDelLive = {
  id: string
  nombre: string
  email: string
  // Su rol principal, con lo que ese rol pisa (lo que se ve «Como su rol»); `null`: sin rol (sigue lo por defecto).
  rol: { id: string; nombre: string; ajustes: AjustesParcialesDelLive | null } | null
  // Lo propio (`null`: sigue a su rol) y su versión.
  ajustes: AjustesParcialesDelLive | null
  actualizadoEn: string | null
}

export type PaginaDePersonasDelLive = { personas: PersonaDelLive[]; hayMas: boolean }

// Sin texto, la lista va por `(actualizado_en, usuario_id)` de lo propio: el cursor es la última de la página.
export type CursorDePersonasDelLive = { en: string; id: string }

// Un origen para elegir en «Orígenes» (la página los lee de `origenes`: `equipo` no depende de ese módulo).
export type OrigenDelLive = { id: string; nombre: string; activo: boolean }

const esquemaDeLaFilaDelRol = z.object({
  rol_id: z.guid(),
  ajustes: z.unknown(),
  actualizado_en: z.string(),
})

// Los roles en su orden (los primeros `tope`, pedidos con uno de más) con su fila de `live_ajustes_roles`, si la tienen.
export function ajustesDeLosRolesDesde(
  roles: readonly { id: string; nombre: string }[],
  filas: readonly unknown[],
  tope: number,
): AjustesDeLosRoles {
  const porRol = new Map(
    filas.map((fila) => {
      const f = esquemaDeLaFilaDelRol.parse(fila)
      return [f.rol_id, { ajustes: ajustesDesdeLaBase(f.ajustes), actualizadoEn: f.actualizado_en }]
    }),
  )
  return {
    roles: roles.slice(0, tope).map(({ id, nombre }) => {
      const fila = porRol.get(id)
      return {
        rol: { id, nombre },
        ajustes: fila?.ajustes ?? null,
        actualizadoEn: fila?.actualizadoEn ?? null,
      }
    }),
    hayMas: roles.length > tope,
  }
}

const esquemaDeLaPersona = z.object({
  id: z.guid(),
  nombre: z.string(),
  email: z.string(),
  rol: z.object({ id: z.guid(), nombre: z.string(), ajustes: z.unknown() }).nullable(),
  ajustes: z.unknown(),
  actualizado_en: z.string().nullable(),
})

const esquemaDeLaPagina = z.object({
  personas: z.array(esquemaDeLaPersona),
  hay_mas: z.boolean(),
})

// Lo que devuelve `live_personas()`.
export function personasDelLiveDesde(json: unknown): PaginaDePersonasDelLive {
  const pagina = esquemaDeLaPagina.parse(json)
  return {
    personas: pagina.personas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      email: p.email,
      rol: p.rol && {
        id: p.rol.id,
        nombre: p.rol.nombre,
        ajustes: ajustesDesdeLaBase(p.rol.ajustes),
      },
      ajustes: ajustesDesdeLaBase(p.ajustes),
      actualizadoEn: p.actualizado_en,
    })),
    hayMas: pagina.hay_mas,
  }
}

// El cursor para «Ver más»: la última de la página, si tiene lo propio (sin texto, todas lo tienen).
export function cursorDeLaPagina(pagina: PaginaDePersonasDelLive): CursorDePersonasDelLive | null {
  const ultima = pagina.personas.at(-1)
  if (!pagina.hayMas || ultima?.actualizadoEn == null) {
    return null
  }
  return { en: ultima.actualizadoEn, id: ultima.id }
}

// Suma una página leída con «Ver más» sin repetir a nadie (alguien pudo cambiar sus ajustes entre una y otra).
export function sumarPagina(
  antes: PaginaDePersonasDelLive,
  nueva: PaginaDePersonasDelLive,
): PaginaDePersonasDelLive {
  const vistas = new Set(antes.personas.map((p) => p.id))
  return {
    personas: [...antes.personas, ...nueva.personas.filter((p) => !vistas.has(p.id))],
    hayMas: nueva.hayMas,
  }
}

// El `?q=` de «Ajustes por persona»: lo que se busca (recortado, como en Equipo) o `null` si no hay o no alcanza las 3 letras (la lista vuelve a
// quienes tienen lo propio).
export function textoDeLaBusquedaDelLive(q: string | undefined): string | null {
  const texto = [...(q ?? '').trim()].slice(0, LARGO_MAXIMO_DE_BUSQUEDA).join('')
  return texto !== '' && cumpleElMinimo(texto, MINIMO_DE_BUSQUEDA_DEL_EQUIPO) ? texto : null
}
