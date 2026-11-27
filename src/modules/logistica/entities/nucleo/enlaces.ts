import type { ComponentType } from 'react'

import type { ClavePermiso } from '@/shared/lib/permisos'
import { unidadDeLogistica, type PanelDeCatalogo } from '@/shared/lib/rutas'
import type { PropsDelCatalogoDelOrigen } from './catalogo-del-origen'
import { ORDEN_DE_HUECOS } from './hueco'

// Un enlace de la sub-navegación de `/logistica` (Embarques, Aduana, Gastos) y un catálogo de logística de las fases de un origen (6.01). Nulo hasta que
// existe la página o el catálogo: el layout y la sección sólo dibujan lo que está lleno y que la persona puede ver.
export type EnlaceDeLogistica = {
  titulo: string
  ruta: string
  permiso: ClavePermiso
}

// Un catálogo de logística en la pestaña Fases de cada origen: su `clave` es la de su drawer (`?panel=<clave>`), su `titulo` el del botón arriba del diagrama y
// del drawer, y su `componente` lo que el drawer dibuja con el origen de la pestaña.
export type CatalogoDeLogistica = {
  clave: PanelDeCatalogo
  titulo: string
  permiso: ClavePermiso
  componente: ComponentType<PropsDelCatalogoDelOrigen>
}

/** La clave de la URL con la que un enlace pide abrir un hueco de la unidad (`?hueco=documentos`): la página lo dibuja abierto desde el principio. */
export const CLAVE_DEL_HUECO_ABIERTO = 'hueco'

/** ¿Es la clave de un hueco del panel? Lo que no lo es (una URL a mano) no abre nada. */
export function esHuecoConocido(
  clave: string | null | undefined,
): clave is (typeof ORDEN_DE_HUECOS)[number] {
  return (ORDEN_DE_HUECOS as readonly string[]).includes(clave ?? '')
}

/**
 * A dónde lleva el nombre de un vehículo en logística: su página `/logistica/vehiculo/<id>`. Con un hueco conocido (`documentos`…) la página lo abre de entrada; uno desconocido se descarta,
 * nunca llega a la URL.
 */
export function rutaDeLaUnidad(id: string, hueco?: string | null): string {
  const base = unidadDeLogistica(id)
  return esHuecoConocido(hueco) ? `${base}?${CLAVE_DEL_HUECO_ABIERTO}=${hueco}` : base
}
