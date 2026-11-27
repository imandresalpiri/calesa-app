import { z } from 'zod'
import { RUTAS } from '@/shared/lib/rutas'
import { CLAVE_DE_ORIGEN_DE_LOGISTICA } from '../nucleo/enlaces'
import { cadenaFiltrada, type FiltrosDeLaCadena } from './filtros'

// Lo puro de la lista de una fase de la cadena (`/logistica/fase/[fase]`): su clave en la URL, la ruta que lleva a ella con los filtros y el cursor por el que se pide la página siguiente.

/** La clave de la fase «Sin fase» en la URL: las demás llevan el id de su fase. */
export const CLAVE_DE_SIN_FASE = 'sin_fase'

export function claveDeFase(faseId: string | null): string {
  return faseId ?? CLAVE_DE_SIN_FASE
}

const esquemaDeFaseId = z.guid()

/**
 * La fase que pide `[fase]`: `{ faseId }` con el id de una fase, `{ faseId: null }` para «Sin fase», o nulo si la clave no es ninguna de las dos (una URL a mano nunca llega a la base).
 */
export function faseDeLaClave(clave: string | null | undefined): { faseId: string | null } | null {
  if (clave === CLAVE_DE_SIN_FASE) return { faseId: null }
  const id = esquemaDeFaseId.safeParse(clave)
  return id.success ? { faseId: id.data } : null
}

// En la URL, `demoradas` y `por_aprobar` son una elección («si»); el resto, su texto.
function consultaDeLosFiltros(filtros: FiltrosDeLaCadena): URLSearchParams {
  const consulta = new URLSearchParams()
  if (filtros.q !== undefined) consulta.set('q', filtros.q)
  if (filtros.demoradas) consulta.set('demoradas', 'si')
  if (filtros.por_aprobar) consulta.set('por_aprobar', 'si')
  if (filtros.contenedor !== undefined) consulta.set('contenedor', filtros.contenedor)
  if (filtros.embarque !== undefined) consulta.set('embarque', filtros.embarque)
  if (filtros.naviera !== undefined) consulta.set('naviera', filtros.naviera)
  return consulta
}

/**
 * La lista de una fase de un origen, con los filtros que ya estaban puestos: `/logistica/fase/<clave>?origen=<id>&…`. Sin origen (una URL vieja que no lo traía) la lista elige el primero
 * de la persona.
 */
export function rutaDeLaFase(
  origenId: string | null,
  clave: string,
  filtros: FiltrosDeLaCadena = {},
): string {
  const consulta = new URLSearchParams()
  if (origenId !== null) consulta.set(CLAVE_DE_ORIGEN_DE_LOGISTICA, origenId)
  for (const [k, v] of consultaDeLosFiltros(filtros)) consulta.set(k, v)
  const texto = consulta.toString()
  return `${RUTAS.logistica}/fase/${encodeURIComponent(clave)}${texto === '' ? '' : `?${texto}`}`
}

/** ¿Hay algún filtro puesto? Para decir «ningún vehículo coincide con los filtros» y no «no hay vehículos en esta fase». */
export const faseFiltrada = cadenaFiltrada

// El cursor de la siguiente página de una fase: el último vehículo leído. En una fase es `(fase_desde, id)` y la base exige los dos; «Sin fase» no tiene `fase_desde` (la restricción
// `vehiculos_fase_desde_coherente`) y va sólo por `id`.
export type CursorDeLaFase = { desde: string | null; id: string }

const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/

const esquemaDelCursor = z.object({
  desde: z.string().regex(INSTANTE).nullable(),
  id: z.guid(),
})

// base64url: un `+` en la URL llegaría como un espacio.
function aBase64Url(texto: string): string {
  return btoa(texto).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function deBase64Url(texto: string): string | null {
  try {
    return atob(texto.replaceAll('-', '+').replaceAll('_', '/'))
  } catch {
    return null
  }
}

/** El texto que viaja en `?cursor=`: `<desde>|<id>` (`desde` vacío en «Sin fase»), en base64url. */
export function codificarCursorDeLaFase(cursor: CursorDeLaFase): string {
  return aBase64Url(`${cursor.desde ?? ''}|${cursor.id}`)
}

/**
 * El cursor de `?cursor=`, o nulo si no sirve (la primera página): uno ilegible, con un id que no es guid, sin fecha en una fase o con fecha en «Sin fase». Una URL a mano nunca produce
 * un 22023.
 */
export function leerCursorDeLaFase(
  texto: string | null | undefined,
  { sinFase }: { sinFase: boolean },
): CursorDeLaFase | null {
  if (!texto || !/^[A-Za-z0-9_-]{10,200}$/.test(texto)) return null
  const crudo = deBase64Url(texto)
  if (crudo === null) return null
  const partes = crudo.split('|')
  if (partes.length !== 2) return null
  const leido = esquemaDelCursor.safeParse({
    desde: partes[0] === '' ? null : partes[0],
    id: partes[1],
  })
  if (!leido.success) return null
  if (sinFase ? leido.data.desde !== null : leido.data.desde === null) return null
  return leido.data
}
