// El nodo de cada tipo de celda (D10 del cambio de la planilla): conserva el id, la etiqueta, la descripción, la salida, si el nodo nuevo puede sumar, la banda
// y, si se muestra como número, los decimales. Lo demás del nodo de antes (su texto, su variante o su interruptor) no pasa. Puro.
import { aceptaDecimales } from '../decimales-de-celda'
import type { Formato, Nodo } from '../nodos'
import { puedeSumarAlGrupo } from './grupos'

export type OpcionDeLaVariante = { clave: string; etiqueta: string; titulo: string }

// Lo que pide cambiar el tipo. «Cálculo» no se pide: se escribe con «=» en la celda (D11).
export type PedidoDeTipo =
  | { readonly tipo: 'valor_fijo'; readonly valor: number }
  | { readonly tipo: 'lo_escribe_el_asesor' }
  | { readonly tipo: 'dato_del_vehiculo'; readonly campo: string }
  | { readonly tipo: 'tipo_de_cambio'; readonly clave: string }
  | { readonly tipo: 'interruptor' }
  | {
      readonly tipo: 'de_una_tabla'
      readonly tabla: string
      readonly match: Readonly<Record<string, string>>
      readonly columna: string
    }
  | {
      readonly tipo: 'variante'
      readonly opciones: readonly OpcionDeLaVariante[]
      readonly porDefecto?: string
      readonly enPar?: boolean
    }

const DE_VALOR = new Set<Nodo['tipo']>(['constante', 'input', 'tabla', 'tramo', 'calculo'])

// El formato de un valor: el de antes si era un valor (un monto sigue siendo monto, un % sigue siendo %), si no el de siempre.
const formatoDeValor = (viejo: Nodo): { formato?: Formato } =>
  DE_VALOR.has(viejo.tipo) && viejo.formato !== undefined ? { formato: viejo.formato } : {}

function cuerpoDelTipo(viejo: Nodo, pedido: PedidoDeTipo): Record<string, unknown> {
  switch (pedido.tipo) {
    case 'valor_fijo':
      return { tipo: 'constante', ...formatoDeValor(viejo) }
    case 'lo_escribe_el_asesor':
      return { tipo: 'input', ...formatoDeValor(viejo) }
    case 'dato_del_vehiculo':
      return { tipo: 'campo_vehiculo', campo: pedido.campo, formato: 'raw' }
    case 'tipo_de_cambio':
      return { tipo: 'tipo_cambio', clave: pedido.clave, formato: 'raw' }
    case 'interruptor':
      return { tipo: 'bandera' }
    case 'de_una_tabla':
      return {
        tipo: 'tabla',
        tabla: pedido.tabla,
        match: { ...pedido.match },
        columna: pedido.columna,
        ...formatoDeValor(viejo),
      }
    case 'variante':
      return {
        tipo: 'opcion',
        opciones: pedido.opciones.map((o) => ({ ...o })),
        ...(pedido.porDefecto === undefined ? {} : { por_defecto: pedido.porDefecto }),
        ...(pedido.enPar === true ? { en_par: true } : {}),
      }
  }
}

export function nodoDelTipo(viejo: Nodo, pedido: PedidoDeTipo): Nodo {
  const nodo = {
    id: viejo.id,
    etiqueta: viejo.etiqueta,
    ...(viejo.descripcion === undefined ? {} : { descripcion: viejo.descripcion }),
    ...(viejo.salida === undefined ? {} : { salida: viejo.salida }),
    ...cuerpoDelTipo(viejo, pedido),
  } as Nodo
  const conDecimales =
    viejo.decimales !== undefined && aceptaDecimales(nodo)
      ? ({ ...nodo, decimales: viejo.decimales } as Nodo)
      : nodo
  return viejo.grupo !== undefined && puedeSumarAlGrupo(conDecimales)
    ? { ...conDecimales, grupo: viejo.grupo }
    : conDecimales
}
