// El filtro «Sin seguimiento» del listado de leads: los leads sin ningún seguimiento y creados hace más de 24 h. Es la misma definición que el bloque
// «Leads sin seguimiento» de Inicio (`creadoAntesDe()`, `ultimo_seguimiento_en is null`), para que «Ver todos» abra la lista de lo que el bloque cuenta.
// «Míos» lo da el alcance del listado: el enlace de Inicio no lleva `alcance`, así que abre la cartera de quien mira; con «Todos» elegido a mano el filtro
// vale sobre lo que esa persona ve.
import type { DefFiltro, ValoresDeFiltros } from '@/shared/lib/filtros'
import { RUTAS } from '@/shared/lib/rutas'
import { creadoAntesDe } from './bandeja'
import { SECCION_DATOS } from './filtros-de-marcas'

// La clave en la URL (`?sin_seguimiento=si`): no choca con `tipo`, `origen`, `alcance`, `cursor`, `lead`, `q` ni el prefijo `a.`.
export const FILTRO_SIN_SEGUIMIENTO = 'sin_seguimiento'

// La lista de leads con el filtro puesto, sin `alcance`: abre «míos», la cartera de quien mira, que es lo que cuenta el bloque de Inicio.
export function rutaDeLeadsSinSeguimiento(): string {
  return `${RUTAS.leads}?${FILTRO_SIN_SEGUIMIENTO}=si`
}

export const DEF_SIN_SEGUIMIENTO: DefFiltro = {
  tipo: 'booleano',
  clave: FILTRO_SIN_SEGUIMIENTO,
  etiqueta: 'Sin seguimiento',
  seccion: SECCION_DATOS,
  ayuda: 'Sin ningún seguimiento y creados hace más de 24 horas.',
}

// `creadosAntesDe`: el instante que separa «recién creado» de «sin seguimiento» (`creadoAntesDe(ahora)`); lo fija quien arma la consulta, en el servidor.
// `valor: false` es lo contrario: con algún seguimiento o creado hace menos de 24 horas.
export type CondicionDeSeguimiento = {
  tipo: 'sin_seguimiento'
  valor: boolean
  creadosAntesDe: string
}

export function condicionesDeSeguimiento(
  valores: ValoresDeFiltros,
  ahora: string,
): CondicionDeSeguimiento[] {
  const valor = valores.porClave[FILTRO_SIN_SEGUIMIENTO]
  return valor?.tipo === 'booleano'
    ? [{ tipo: 'sin_seguimiento', valor: valor.valor, creadosAntesDe: creadoAntesDe(ahora) }]
    : []
}
