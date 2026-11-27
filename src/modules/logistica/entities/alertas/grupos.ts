import { puede, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { CLAVE_DE_ORIGEN_DE_LOGISTICA } from '../nucleo/enlaces'

// Los siete grupos de la bandeja del día de `/logistica` (`logistica_bandeja_grupo`): su orden, su título, su nombre en la URL y quién los ve. Puro: ninguna lectura.

export const GRUPOS_DE_LA_BANDEJA = [
  'demorados',
  'trabados',
  'por_aprobar',
  'por_vencer',
  'llegadas',
  'salidas',
  'sin_resolver',
] as const

export type GrupoDeLaBandeja = (typeof GRUPOS_DE_LA_BANDEJA)[number]

export const TITULO_DE_LOS_GRUPOS: Readonly<Record<GrupoDeLaBandeja, string>> = {
  demorados: 'Demorados',
  trabados: 'Trabados',
  por_aprobar: 'Documentos por aprobar',
  por_vencer: 'Documentos por vencer',
  llegadas: 'Llegadas esperadas',
  salidas: 'Salen hoy',
  sin_resolver: 'Subastas sin resolver',
}

// Lo que se escribe en la URL: igual que el grupo, con guion en vez de guion bajo.
const SLUG_DE_LOS_GRUPOS: Readonly<Record<GrupoDeLaBandeja, string>> = {
  demorados: 'demorados',
  trabados: 'trabados',
  por_aprobar: 'por-aprobar',
  por_vencer: 'por-vencer',
  llegadas: 'llegadas',
  salidas: 'salidas',
  sin_resolver: 'sin-resolver',
}

export function slugDelGrupo(grupo: GrupoDeLaBandeja): string {
  return SLUG_DE_LOS_GRUPOS[grupo]
}

/** El grupo de `/logistica/bandeja/[grupo]`, o nulo si el texto no es el de ninguno (una URL a mano nunca llega a la base). */
export function grupoDelSlug(slug: string | null | undefined): GrupoDeLaBandeja | null {
  return GRUPOS_DE_LA_BANDEJA.find((grupo) => SLUG_DE_LOS_GRUPOS[grupo] === slug) ?? null
}

/**
 * A dónde lleva «Ver todos»: la página del grupo en el origen elegido, con su cursor si es una página que no es la primera. Sin origen (el «Ver todas» de Inicio, que junta todos)
 * va sin `?origen=` y la página abre el último origen que usó la persona.
 */
export function rutaDelGrupoDeLaBandeja(
  grupo: GrupoDeLaBandeja,
  { origenId = null, cursor = null }: { origenId?: string | null; cursor?: string | null } = {},
): string {
  const base = `${RUTAS.bandejaDeLogistica}/${slugDelGrupo(grupo)}`
  const parametros = new URLSearchParams()
  if (origenId) parametros.set(CLAVE_DE_ORIGEN_DE_LOGISTICA, origenId)
  if (cursor) parametros.set('cursor', cursor)
  const consulta = parametros.toString()
  return consulta ? `${base}?${consulta}` : base
}

/**
 * Los grupos que ve quien mira, en su orden, en un origen (nulo: en alguno, para Inicio). Con `logistica.ver` están los que no piden más; «por aprobar» pide además `logistica.documentos.aprobar` y «por vencer»
 * `logistica.documentos.subir` (como el job que avisa). La base vuelve a decidir por origen y por alcance: aquí sólo se esconde lo que ni se pediría.
 */
export function gruposVisibles(
  permisos: Permisos,
  origenId: string | null = null,
): GrupoDeLaBandeja[] {
  const en = origenId ?? undefined
  if (!puede(permisos, 'logistica.ver', en)) return []
  return GRUPOS_DE_LA_BANDEJA.filter((grupo) => {
    if (grupo === 'por_aprobar') return puede(permisos, 'logistica.documentos.aprobar', en)
    if (grupo === 'por_vencer') return puede(permisos, 'logistica.documentos.subir', en)
    return true
  })
}
