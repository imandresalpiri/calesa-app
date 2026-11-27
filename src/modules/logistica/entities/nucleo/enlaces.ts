import type { ComponentType } from 'react'

import type { ClavePermiso } from '@/shared/lib/permisos'
import { unidadDeLogistica, type PanelDeCatalogo } from '@/shared/lib/rutas'
import type { PropsDelCatalogoDelOrigen } from './catalogo-del-origen'
import { esTarjetaConocida, tarjetaDelHueco } from './tarjetas'

/** La clave de la URL con el origen de toda página de Logística (`?origen=`): la barra de arriba, la cadena, la bandeja, las áreas y sus formularios. */
export const CLAVE_DE_ORIGEN_DE_LOGISTICA = 'origen'

/** Una ruta de Logística en un origen: `<ruta>?origen=<id>`. */
export function enElOrigen(ruta: string, origenId: string): string {
  return `${ruta}?${CLAVE_DE_ORIGEN_DE_LOGISTICA}=${encodeURIComponent(origenId)}`
}

// Una pestaña de un área en la barra de cada origen de Logística (Embarques, Aduana, Gastos). Nula hasta que existe la página. Va si el flujo del origen tiene
// encendida alguna de sus `reglas` (`flujos_reglas`) y la persona tiene alguno de sus `permisos` en ese origen. `clave` la nombra en la barra y en su página.
export type EnlaceDeLogistica = {
  clave: 'embarques' | 'aduana' | 'gastos'
  titulo: string
  ruta: string
  reglas: readonly string[]
  permisos: readonly ClavePermiso[]
}

// Un catálogo de logística en la pestaña Fases de cada origen: su `clave` es la de su drawer (`?panel=<clave>`), su `titulo` el del botón arriba del diagrama y
// del drawer, y su `componente` lo que el drawer dibuja con el origen de la pestaña.
export type CatalogoDeLogistica = {
  clave: PanelDeCatalogo
  titulo: string
  permiso: ClavePermiso
  componente: ComponentType<PropsDelCatalogoDelOrigen>
}

/** La clave de la URL con la que un enlace pide abrir una tarjeta de la unidad (`?hueco=documentos`, `?hueco=dinero`): la página abre su drawer de entrada. */
export const CLAVE_DEL_HUECO_ABIERTO = 'hueco'

/**
 * A dónde lleva el nombre de un vehículo en logística: su página `/logistica/vehiculo/<id>`. Con la clave de un hueco (`documentos`, `pagos`…) o de una tarjeta (`dinero`), la página abre
 * de entrada el drawer de la tarjeta que lo contiene (`pagos` → `?hueco=dinero`). «Qué falta» está siempre a la vista y una clave desconocida se descarta: ninguna llega a la URL.
 */
export function rutaDeLaUnidad(id: string, clave?: string | null): string {
  const base = unidadDeLogistica(id)
  const tarjeta = esTarjetaConocida(clave) ? clave : tarjetaDelHueco(clave)
  return tarjeta === null ? base : `${base}?${CLAVE_DEL_HUECO_ABIERTO}=${tarjeta}`
}
