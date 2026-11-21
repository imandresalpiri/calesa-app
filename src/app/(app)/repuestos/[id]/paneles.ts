// Las pestañas de `/repuestos/[id]` que no son la hoja (`?pestana=`, el nombre de siempre: los enlaces viejos abren lo mismo; Ítems es la hoja, sin clave o con `items`). Cotizaciones pide `repuestos.cotizar`
// (quien sólo tiene `repuestos.costos.ver`, que la RLS deja leer, no lo ve); Pagos y Compras, `repuestos.costos.ver`. Sin la clave, el valor de la URL no abre nada ni
// lee nada. Esconder un panel es comodidad, no seguridad: la autoridad es la RLS y el `assert_permiso` de cada lectura.
import { PANELES_DEL_PAGO } from '@/modules/logistica'
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

type Parametros = Readonly<Record<string, string | string[] | undefined>>

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

// El panel que pide un enlace viejo sin `?pestana=`: un formulario de compra o un panel de pagos.
function panelDelEnlaceViejo(panel: string | undefined): PanelDelPaso | null {
  if (panel === PANEL_COMPRA) return 'compras'
  return (PANELES_DEL_PAGO as readonly string[]).includes(panel ?? '') ? 'pagos' : null
}

/**
 * A dónde redirigir un enlace viejo: `?panel=compra&compra=…` o `?panel=pago|confirmar-pago|eliminar-pago|anular-pago&pago=…` sin `?pestana=` va a la misma URL con su
 * `pestana` (sin ella, el formulario no tendría su panel montado). Nulo si no hace falta o si quien mira no puede abrir ese panel.
 */
export function redireccionDeEnlaceViejo(
  proyectoId: string,
  parametros: Parametros,
  disponibles: readonly PanelDelPaso[],
): string | null {
  if (parametros[CLAVE_DEL_PANEL_DEL_PASO] !== undefined) return null
  const panel = parametros['panel']
  const destino = panelDelEnlaceViejo(typeof panel === 'string' ? panel : undefined)
  if (destino === null || !disponibles.includes(destino)) return null
  const nuevos = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros)) {
    for (const uno of typeof valor === 'string' ? [valor] : (valor ?? [])) nuevos.append(clave, uno)
  }
  nuevos.set(CLAVE_DEL_PANEL_DEL_PASO, destino)
  return `${RUTAS.repuestos}/${proyectoId}?${nuevos.toString()}`
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
