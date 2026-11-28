// Los filtros de la pestaña Plantillas de `/artes` y el pedido que arman. Tres de una sola elección, en la URL: origen (los que quien mira puede
// elegir), formato y «Todas | Mías | De la empresa». Lo que no es una opción se descarta al leer (`leerFiltros()`). La pestaña Imágenes no
// filtra. El cursor de «Ver más» no va en la URL: lo cargado vive en la lista, y otro pedido es otra `key`. Puro.
import type { EsquemaDeFiltros, ParametrosDeUrl, ValoresDeFiltros } from '@/shared/lib/filtros'
import { esClaveDeFormato, FORMATOS_DE_ARTE, type ClaveDeFormato } from './formatos'
import type { OrigenDeArtes } from './tipos'

export const CLAVE_DE_PESTANA = 'pestana'
export const CLAVE_DE_ORIGEN = 'origen'
export const CLAVE_DE_FORMATO = 'formato'
export const CLAVE_DE_QUIENES = 'de'
export const TODAS = 'todas'

export const PESTANAS_DE_ARTES = ['plantillas', 'imagenes'] as const
export type PestanaDeArtes = (typeof PESTANAS_DE_ARTES)[number]

export type QuienesDeLasPlantillas = 'mias' | 'empresa'

export type PedidoDePlantillas = {
  origenId: string | null
  formato: ClaveDeFormato | null
  de: QuienesDeLasPlantillas | null
}

export function esquemaDeFiltrosDeArtes(origenes: readonly OrigenDeArtes[]): EsquemaDeFiltros {
  return {
    busqueda: null,
    filtros: [
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_ORIGEN,
        etiqueta: 'Origen',
        porDefecto: TODAS,
        opciones: [
          { valor: TODAS, etiqueta: 'Todos' },
          ...origenes.map((o) => ({ valor: o.id, etiqueta: o.nombre })),
        ],
      },
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_FORMATO,
        etiqueta: 'Formato',
        porDefecto: TODAS,
        opciones: [
          { valor: TODAS, etiqueta: 'Todos' },
          ...FORMATOS_DE_ARTE.map((f) => ({ valor: f.clave, etiqueta: f.nombre })),
        ],
      },
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_QUIENES,
        etiqueta: 'De quién',
        porDefecto: TODAS,
        opciones: [
          { valor: TODAS, etiqueta: 'Todas' },
          { valor: 'mias', etiqueta: 'Mías' },
          { valor: 'empresa', etiqueta: 'De la empresa' },
        ],
      },
    ],
  }
}

function eleccion(valores: ValoresDeFiltros, clave: string): string | null {
  const valor = valores.porClave[clave]
  return valor?.tipo === 'eleccion' && valor.valor !== TODAS ? valor.valor : null
}

export function pedidoDePlantillas(valores: ValoresDeFiltros): PedidoDePlantillas {
  const formato = eleccion(valores, CLAVE_DE_FORMATO)
  const de = eleccion(valores, CLAVE_DE_QUIENES)
  return {
    origenId: eleccion(valores, CLAVE_DE_ORIGEN),
    formato: formato !== null && esClaveDeFormato(formato) ? formato : null,
    de: de === 'mias' || de === 'empresa' ? de : null,
  }
}

export function hayFiltrosDePlantillas(pedido: PedidoDePlantillas): boolean {
  return pedido.origenId !== null || pedido.formato !== null || pedido.de !== null
}

// Lo que identifica a los filtros de una carga: con otro, lo cargado se descarta (la `key` de la lista).
export function claveDelPedido(pedido: PedidoDePlantillas): string {
  return `${pedido.origenId ?? ''}|${pedido.formato ?? ''}|${pedido.de ?? ''}`
}

// La pestaña abierta: Plantillas salvo `?pestana=imagenes`.
export function leerPestana(parametros: ParametrosDeUrl): PestanaDeArtes {
  const valor = parametros[CLAVE_DE_PESTANA]
  return valor === 'imagenes' ? 'imagenes' : 'plantillas'
}
