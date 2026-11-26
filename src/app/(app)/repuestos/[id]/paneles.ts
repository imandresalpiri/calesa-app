// Las pestañas de `/repuestos/[id]` que no son la hoja (`?pestana=`; Ítems es la hoja, sin clave o con `items`). Cotizaciones pide `repuestos.cotizar`
// (quien sólo tiene `repuestos.costos.ver`, que la RLS deja leer, no lo ve); Pagos y Compras, `repuestos.costos.ver`. Sin la clave, el valor de la URL no abre nada ni
// lee nada. Esconder un panel es comodidad, no seguridad: la autoridad es la RLS y el `assert_permiso` de cada lectura.
import {
  CLAVE_DE_COMPRA,
  CLAVE_DEL_ITEM_DE_COMPRA,
  COMPRA_NUEVA,
  PANEL_COMPRA,
  PANELES_DEL_PASO,
  type PanelDelPaso,
} from '@/modules/repuestos'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'

import { CLAVE_DEL_PANEL_DEL_PASO } from './clave-del-panel'

export { CLAVE_DEL_PANEL_DEL_PASO }

const PERMISO_DEL_PANEL: Readonly<Record<PanelDelPaso, ClavePermiso>> = {
  cotizaciones: 'repuestos.cotizar',
  pagos: 'repuestos.costos.ver',
  compras: 'repuestos.costos.ver',
}

/** Los paneles que quien mira puede abrir, en su orden. */
export function panelesDisponibles(permisos: Permisos): PanelDelPaso[] {
  return PANELES_DEL_PASO.filter((panel) => puede(permisos, PERMISO_DEL_PANEL[panel]))
}

/** El panel abierto: el de la URL si quien mira puede abrirlo; `items`, otro valor o ninguno, nulo (sólo la hoja). */
export function panelAbiertoDe(
  valor: string | undefined,
  disponibles: readonly PanelDelPaso[],
): PanelDelPaso | null {
  return disponibles.find((panel) => panel === valor) ?? null
}

/** La URL del proyecto con ese panel abierto (y lo que se le sume: el formulario de una compra con su ítem ya elegido). */
export function rutaDelPanel(
  proyectoId: string,
  panel: PanelDelPaso,
  extra: Readonly<Record<string, string>> = {},
): string {
  const parametros = new URLSearchParams({ [CLAVE_DEL_PANEL_DEL_PASO]: panel, ...extra })
  return `${RUTAS.repuestos}/${proyectoId}?${parametros.toString()}`
}

/** «Registrar compra» desde el panel del ítem: el panel Compras con el formulario abierto y el ítem ya elegido. */
export function rutaDeRegistrarCompra(proyectoId: string, itemId: string): string {
  return rutaDelPanel(proyectoId, 'compras', {
    panel: PANEL_COMPRA,
    [CLAVE_DE_COMPRA]: COMPRA_NUEVA,
    [CLAVE_DEL_ITEM_DE_COMPRA]: itemId,
  })
}
