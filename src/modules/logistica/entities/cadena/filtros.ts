import { z } from 'zod'
import {
  cumpleElMinimo,
  type EsquemaDeFiltros,
  type MinimoDeBusqueda,
  type ValoresDeFiltros,
} from '@/shared/lib/filtros'
import { RUTAS } from '@/shared/lib/rutas'
import { CLAVE_DE_ORIGEN_DE_LOGISTICA } from '../nucleo/enlaces'

// Los filtros de la cadena (6.03-1): la URL de `/logistica` los lleva y este archivo los vuelve lo que entiende `logistica_cadena()`. Puro: ninguna lectura. La URL conserva
// aparte `origen`, `fase` y `vehiculo`; `FilterShell` sólo toca las claves de este esquema.

export const CLAVE_DE_FASE_DE_LA_CADENA = 'fase'
export const CLAVE_DE_BUSQUEDA_DE_LA_CADENA = 'q'
export const CLAVE_DE_DEMORADAS = 'demoradas'
export const CLAVE_DE_POR_APROBAR = 'por_aprobar'
export const CLAVE_DE_CONTENEDOR = 'contenedor'
export const CLAVE_DE_EMBARQUE = 'embarque'
export const CLAVE_DE_NAVIERA = 'naviera'
/** «Buscar en todos los orígenes» de «Dónde está»: `?en=todos` busca sin el origen elegido (la barra sigue en él). */
export const CLAVE_DE_DONDE_BUSCAR = 'en'
const EN_TODOS = 'todos'

/** Si «Dónde está» busca en todos los orígenes de la persona (`?en=todos`); cualquier otro valor, en el elegido. */
export function buscaEnTodos(valor: string | undefined): boolean {
  return valor === EN_TODOS
}

/** La Cadena de un origen con «Dónde está» buscando `q`, en ese origen o en todos (`?en=todos`). */
export function rutaDeDondeEsta(origenId: string, q: string, enTodos: boolean): string {
  const parametros = new URLSearchParams({
    [CLAVE_DE_ORIGEN_DE_LOGISTICA]: origenId,
    [CLAVE_DE_BUSQUEDA_DE_LA_CADENA]: q,
  })
  if (enTodos) parametros.set(CLAVE_DE_DONDE_BUSCAR, EN_TODOS)
  return `${RUTAS.logistica}?${parametros.toString()}`
}

const TODAS = 'todas'
const TODOS = 'todos'
const SI = 'si'

// Espejo de `_logistica_filtros` (`[[:alnum:]]{3}`): con menos de tres letras o dígitos seguidos la base ignora la búsqueda, así que la interfaz ni la manda.
export const MINIMO_DE_BUSQUEDA_DE_LA_CADENA: MinimoDeBusqueda = {
  letras: 3,
  numerosLibres: false,
  aviso: 'Escribe al menos 3 letras o números para buscar.',
}

// Lo mismo que acepta la RPC y nada más (con una clave de más responde 22023). `demoradas` y `por_aprobar` sólo existen con `true`: «no» no filtra.
export type FiltrosDeLaCadena = {
  q?: string
  demoradas?: true
  por_aprobar?: true
  // El id del contenedor o del embarque (un uuid): la base lee las unidades de esa entidad.
  contenedor?: string
  embarque?: string
  naviera?: string
}

export type NavieraParaFiltrar = { id: string; nombre: string }

export type TipoDeEntidadDelFiltro = typeof CLAVE_DE_CONTENEDOR | typeof CLAVE_DE_EMBARQUE

/** El contenedor o el embarque que filtra la fase, ya nombrado (su número o su booking, leído bajo la RLS de quien mira). */
export type EntidadDelFiltro = { tipo: TipoDeEntidadDelFiltro; id: string; nombre: string }

/** Lo que la URL pide filtrar por entidad: un id para nombrar, o `valido: false` si no es un uuid (una URL vieja, `?contenedor=MSCU1234`). Nulo si no pide ninguna. */
export type EntidadPedida =
  | { tipo: TipoDeEntidadDelFiltro; id: string; valido: true }
  | { tipo: TipoDeEntidadDelFiltro; valido: false }

const esquemaDeId = z.guid()

/** El contenedor o el embarque que nombra la URL de la fase (el contenedor manda sobre el embarque, como en el lote). */
export function entidadPedida(
  parametros: Record<string, string | string[] | undefined>,
): EntidadPedida | null {
  for (const tipo of [CLAVE_DE_CONTENEDOR, CLAVE_DE_EMBARQUE] as const) {
    const crudo = parametros[tipo]
    const valor = (Array.isArray(crudo) ? crudo[0] : crudo)?.trim()
    if (valor === undefined || valor === '') continue
    const id = esquemaDeId.safeParse(valor)
    return id.success ? { tipo, id: id.data, valido: true } : { tipo, valido: false }
  }
  return null
}

const ETIQUETA_DE_LA_ENTIDAD: Record<TipoDeEntidadDelFiltro, string> = {
  contenedor: 'Contenedor',
  embarque: 'Embarque',
}

/** El aviso de una fase filtrada por un contenedor o un embarque que no existe, es de otro origen o quien mira no ve. */
export function avisoDeEntidadQueNoEsta(tipo: TipoDeEntidadDelFiltro): string {
  return tipo === CLAVE_DE_CONTENEDOR
    ? 'Ese contenedor ya no existe o no lo ves.'
    : 'Ese embarque ya no existe o no lo ves.'
}

// El filtro de la entidad no se escribe: llega por un enlace (la página del embarque, el drawer del contenedor) y se dibuja como chip con su número o su
// booking; una elección con una sola opción, que sólo existe mientras la URL la trae.
function filtroDeLaEntidad(entidad: EntidadDelFiltro | null): EsquemaDeFiltros['filtros'] {
  if (entidad === null) return []
  return [
    {
      tipo: 'eleccion',
      clave: entidad.tipo,
      etiqueta: ETIQUETA_DE_LA_ENTIDAD[entidad.tipo],
      porDefecto: TODOS,
      opciones: [
        { valor: TODOS, etiqueta: 'Todos' },
        { valor: entidad.id, etiqueta: entidad.nombre },
      ],
    },
  ]
}

const LARGO_MAXIMO = 100

/**
 * El esquema de los filtros de la cadena. «Demoradas» y «Por aprobar» son una elección de dos valores y no un booleano: un «No» tri-estado no filtra y el chip diría lo contrario. «Naviera» sólo
 * se ofrece si hay al menos una; el contenedor o el embarque, sólo si la URL lo trae y se pudo nombrar (`entidad`).
 */
export function esquemaDeFiltrosDeLaCadena({
  navieras,
  entidad = null,
}: {
  navieras: readonly NavieraParaFiltrar[]
  entidad?: EntidadDelFiltro | null
}): EsquemaDeFiltros {
  const deNaviera: EsquemaDeFiltros['filtros'] =
    navieras.length === 0
      ? []
      : [
          {
            tipo: 'eleccion',
            clave: CLAVE_DE_NAVIERA,
            etiqueta: 'Naviera',
            porDefecto: TODAS,
            opciones: [
              { valor: TODAS, etiqueta: 'Todas' },
              ...navieras.map((naviera) => ({ valor: naviera.id, etiqueta: naviera.nombre })),
            ],
          },
        ]
  return {
    busqueda: {
      clave: CLAVE_DE_BUSQUEDA_DE_LA_CADENA,
      etiqueta: 'Buscar por nombre, VIN o lote',
      marcador: 'Nombre, VIN o lote',
      minimo: MINIMO_DE_BUSQUEDA_DE_LA_CADENA,
    },
    filtros: [
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_DEMORADAS,
        etiqueta: 'Demora',
        porDefecto: TODAS,
        opciones: [
          { valor: TODAS, etiqueta: 'Todas' },
          { valor: SI, etiqueta: 'Sólo las demoradas' },
        ],
      },
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_POR_APROBAR,
        etiqueta: 'Documentos',
        porDefecto: TODAS,
        opciones: [
          { valor: TODAS, etiqueta: 'Todas' },
          { valor: SI, etiqueta: 'Sólo con documentos por aprobar' },
        ],
      },
      ...filtroDeLaEntidad(entidad),
      ...deNaviera,
    ],
  }
}

function eleccion(valores: ValoresDeFiltros, clave: string): string | null {
  const valor = valores.porClave[clave]
  return valor?.tipo === 'eleccion' ? valor.valor : null
}

// Una elección que sólo vale si es un guid (naviera, contenedor, embarque).
function guid(valores: ValoresDeFiltros, clave: string): string | null {
  const valor = eleccion(valores, clave)
  return valor !== null && esquemaDeId.safeParse(valor).success ? valor : null
}

/**
 * Lo que la URL, ya leída con el esquema, pide a `logistica_cadena()`: sólo lo que filtra. Una búsqueda que no alcanza el mínimo, un id que no es guid o un valor que no se ofrece se
 * descartan: una URL escrita a mano nunca produce un 22023.
 */
export function pedidoDeLaCadena(valores: ValoresDeFiltros): FiltrosDeLaCadena {
  const q = valores.busqueda.trim()
  const naviera = guid(valores, CLAVE_DE_NAVIERA)
  const contenedor = guid(valores, CLAVE_DE_CONTENEDOR)
  const embarque = guid(valores, CLAVE_DE_EMBARQUE)
  return {
    ...(cumpleElMinimo(q, MINIMO_DE_BUSQUEDA_DE_LA_CADENA) ? { q: q.slice(0, LARGO_MAXIMO) } : {}),
    ...(eleccion(valores, CLAVE_DE_DEMORADAS) === SI ? { demoradas: true as const } : {}),
    ...(eleccion(valores, CLAVE_DE_POR_APROBAR) === SI ? { por_aprobar: true as const } : {}),
    ...(contenedor === null ? {} : { contenedor }),
    ...(embarque === null ? {} : { embarque }),
    ...(naviera === null ? {} : { naviera }),
  }
}

/** ¿Alguno de los filtros de la cadena está filtrando? Para decir «ningún vehículo coincide con los filtros» y no «sin vehículos». */
export function cadenaFiltrada(filtros: FiltrosDeLaCadena): boolean {
  return Object.keys(filtros).length > 0
}
