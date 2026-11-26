import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import {
  usoDelPuerto,
  type NavieraDeCatalogo,
  type PuertoDeCatalogo,
} from '../../../entities/transporte/catalogo'
import {
  accionesDelCatalogo,
  insigniasDelCatalogo,
  type ContextoDeLasFilas,
  type QuehaceresDelCatalogo,
} from '../../nucleo/components/acciones-del-catalogo'

// Los puertos como filas de la lista de catálogo, ya en su orden (`orden`, luego `nombre`). El orden se cambia en «Editar» (un número), no con botones: intercambiar dos serían dos escrituras sin transacción.
export function filasDePuertos(
  puertos: readonly PuertoDeCatalogo[],
  quehaceres: QuehaceresDelCatalogo<PuertoDeCatalogo>,
  contexto: ContextoDeLasFilas,
): FilaDeCatalogo[] {
  return puertos.map((puerto) => ({
    id: puerto.id,
    nombre: puerto.nombre,
    icono: null,
    activo: puerto.activo,
    insignias: insigniasDelCatalogo(puerto, contexto),
    uso: usoDelPuerto(puerto),
    acciones: accionesDelCatalogo(puerto, quehaceres, contexto.sinPermiso),
    puedeSubir: false,
    puedeBajar: false,
  }))
}

// Las navieras como filas, por nombre: no tienen orden propio. La columna de uso dice su estado con texto.
export function filasDeNavieras(
  navieras: readonly NavieraDeCatalogo[],
  quehaceres: QuehaceresDelCatalogo<NavieraDeCatalogo>,
  contexto: ContextoDeLasFilas,
): FilaDeCatalogo[] {
  return navieras.map((naviera) => ({
    id: naviera.id,
    nombre: naviera.nombre,
    icono: null,
    activo: naviera.activo,
    insignias: insigniasDelCatalogo(naviera, contexto),
    uso: naviera.activo ? 'Activa' : 'Inactiva',
    acciones: accionesDelCatalogo(naviera, quehaceres, contexto.sinPermiso),
    puedeSubir: false,
    puedeBajar: false,
  }))
}
