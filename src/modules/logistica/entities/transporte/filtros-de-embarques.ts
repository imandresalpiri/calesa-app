import { z } from 'zod'
import {
  cumpleElMinimo,
  type DefFiltro,
  type EsquemaDeFiltros,
  type MinimoDeBusqueda,
  type OpcionDeFiltro,
  type ValoresDeFiltros,
} from '@/shared/lib/filtros'
import {
  ESTADOS_DEL_CONTENEDOR,
  ESTADOS_DEL_EMBARQUE,
  TEXTO_DEL_ESTADO,
  type EstadoDelContenedor,
} from './estado'
import type { VistaDeGrupos } from './paneles'

// Los filtros de `/logistica/embarques`: la URL los lleva y este archivo los vuelve el pedido que entiende `embarques_listar()` o `contenedores_listar()`. Puro: ninguna lectura. La URL
// conserva aparte `grupo` (la vista), `contenedor` (el drawer abierto), `panel` y `cursor`; `FilterShell` sólo toca las claves de este esquema.

export const CLAVE_DE_ESTADO = 'estado'
export const CLAVE_DE_NAVIERA_DEL_FILTRO = 'naviera'
export const CLAVE_DE_PUERTO_DE_ORIGEN = 'puerto_origen'
export const CLAVE_DE_PUERTO_DE_DESTINO = 'puerto_destino'
export const CLAVE_DE_BUSQUEDA_DE_EMBARQUES = 'q'

const TODOS = 'todos'

// Espejo de `_embarques_filtros` (`[A-Z0-9]{3}` tras quitar los espacios y pasar a mayúsculas): con menos la base responde 22023, así que la interfaz ni la manda.
export const MINIMO_DE_BUSQUEDA_DE_EMBARQUES: MinimoDeBusqueda = {
  letras: 3,
  numerosLibres: false,
  aviso: 'Escribe al menos 3 letras o números para buscar.',
}

// Lo que trae un selector de embarques o de contenedores (diez de a una vez: es un selector, no una lista; con más, se busca). `_acotar_pagina` lo acepta tal cual.
export const TOPE_PARA_ELEGIR = 10

const TRES_SEGUIDOS = /[A-Za-z0-9]{3}/
const LARGO_MAXIMO = 40

// Lo mismo que acepta la RPC y nada más (con una clave de más responde 22023). Naviera y puertos, sólo en embarques: en contenedores son del embarque.
export type FiltrosDeEmbarques = {
  estado?: EstadoDelContenedor
  naviera?: string
  puerto_origen?: string
  puerto_destino?: string
  prefijo?: string
}

export type PedidoDeEmbarques = {
  origenId: string
  vista: VistaDeGrupos
  filtros: FiltrosDeEmbarques
  // El `siguiente` opaco de la página anterior (un uuid); nulo = la primera página.
  desde: string | null
}

export type ElementoDelFiltro = { id: string; nombre: string; activo: boolean }

function eleccionDe(
  clave: string,
  etiqueta: string,
  todos: string,
  elementos: readonly ElementoDelFiltro[],
): DefFiltro[] {
  const opciones: OpcionDeFiltro[] = elementos
    .filter((e) => e.activo)
    .map((e) => ({ valor: e.id, etiqueta: e.nombre }))
  // Sin opciones el filtro no se dibuja: un selector que sólo dice «Todas» no filtra nada.
  return opciones.length === 0
    ? []
    : [
        {
          tipo: 'eleccion',
          clave,
          etiqueta,
          porDefecto: TODOS,
          opciones: [{ valor: TODOS, etiqueta: todos }, ...opciones],
        },
      ]
}

const estadosDeLaVista = (vista: VistaDeGrupos): readonly EstadoDelContenedor[] =>
  vista === 'contenedores' ? ESTADOS_DEL_CONTENEDOR : ESTADOS_DEL_EMBARQUE

/**
 * El esquema de los filtros de la lista: el estado (los del embarque; en contenedores, también «Sin embarque»), naviera y puertos (sólo embarques, de los catálogos) y la
 * búsqueda por booking o por número.
 */
export function esquemaDeFiltrosDeEmbarques(
  vista: VistaDeGrupos,
  catalogos: { navieras: readonly ElementoDelFiltro[]; puertos: readonly ElementoDelFiltro[] },
): EsquemaDeFiltros {
  const contenedores = vista === 'contenedores'
  return {
    busqueda: {
      clave: CLAVE_DE_BUSQUEDA_DE_EMBARQUES,
      etiqueta: contenedores ? 'Buscar por número' : 'Buscar por booking',
      marcador: contenedores ? 'Número' : 'Booking',
      minimo: MINIMO_DE_BUSQUEDA_DE_EMBARQUES,
    },
    filtros: [
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_ESTADO,
        etiqueta: 'Estado',
        porDefecto: TODOS,
        opciones: [
          { valor: TODOS, etiqueta: 'Todos' },
          ...estadosDeLaVista(vista).map((e) => ({ valor: e, etiqueta: TEXTO_DEL_ESTADO[e] })),
        ],
      },
      ...(contenedores
        ? []
        : [
            ...eleccionDe(CLAVE_DE_NAVIERA_DEL_FILTRO, 'Naviera', 'Todas', catalogos.navieras),
            ...eleccionDe(
              CLAVE_DE_PUERTO_DE_ORIGEN,
              'Puerto de origen',
              'Todos',
              catalogos.puertos,
            ),
            ...eleccionDe(
              CLAVE_DE_PUERTO_DE_DESTINO,
              'Puerto de destino',
              'Todos',
              catalogos.puertos,
            ),
          ]),
    ],
  }
}

function eleccion(valores: ValoresDeFiltros, clave: string): string | null {
  const valor = valores.porClave[clave]
  return valor?.tipo === 'eleccion' ? valor.valor : null
}

function guid(valor: string | null): string | null {
  return valor !== null && z.guid().safeParse(valor).success ? valor : null
}

/**
 * Lo que la URL, ya leída con el esquema, pide a la base. Un estado que la vista no tiene, un id que no es un uuid, una búsqueda sin tres letras o números seguidos o un
 * cursor que no es un uuid se descartan: una URL escrita a mano nunca produce un 22023.
 */
export function pedidoDeEmbarques(
  valores: ValoresDeFiltros,
  { origenId, vista, desde }: { origenId: string; vista: VistaDeGrupos; desde: string | null },
): PedidoDeEmbarques {
  const q = valores.busqueda.trim()
  const estado = eleccion(valores, CLAVE_DE_ESTADO)
  const valido = estadosDeLaVista(vista).find((e) => e === estado)
  const contenedores = vista === 'contenedores'
  const naviera = contenedores ? null : guid(eleccion(valores, CLAVE_DE_NAVIERA_DEL_FILTRO))
  const origen = contenedores ? null : guid(eleccion(valores, CLAVE_DE_PUERTO_DE_ORIGEN))
  const destino = contenedores ? null : guid(eleccion(valores, CLAVE_DE_PUERTO_DE_DESTINO))
  const filtros: FiltrosDeEmbarques = {
    ...(valido !== undefined ? { estado: valido } : {}),
    ...(naviera !== null ? { naviera } : {}),
    ...(origen !== null ? { puerto_origen: origen } : {}),
    ...(destino !== null ? { puerto_destino: destino } : {}),
    ...(cumpleElMinimo(q, MINIMO_DE_BUSQUEDA_DE_EMBARQUES) && TRES_SEGUIDOS.test(q)
      ? { prefijo: q.slice(0, LARGO_MAXIMO) }
      : {}),
  }
  return { origenId, vista, filtros, desde: guid(desde) }
}

/** ¿Alguno de los filtros está filtrando? Para decir «ningún embarque con estos filtros» y no «todavía no hay». */
export function embarquesFiltrados(filtros: FiltrosDeEmbarques): boolean {
  return Object.keys(filtros).length > 0
}
