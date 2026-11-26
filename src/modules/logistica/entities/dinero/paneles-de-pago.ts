// Los paneles del hueco «Pagos» en la URL de la pantalla que lo muestra (6.11-2): `?panel=pago&pago=<id|nuevo>` abre el formulario; `?panel=confirmar-pago`, `?panel=eliminar-pago` y
// `?panel=anular-pago` con `&pago=<id>`, sus diálogos. Van aparte del `?vehiculo=` del panel de la unidad. Las del formulario viven en el núcleo («Qué falta» abre
// «Registrar pago»).
import { CLAVE_DE_PAGO, PAGO_NUEVO, PANEL_PAGO } from '../nucleo/paneles-de-la-unidad'

export { CLAVE_DE_PAGO, PAGO_NUEVO, PANEL_PAGO }
export const PANEL_CONFIRMAR_PAGO = 'confirmar-pago'
export const PANEL_ELIMINAR_PAGO = 'eliminar-pago'
export const PANEL_ANULAR_PAGO = 'anular-pago'

/** Todos los `?panel=` del hueco «Pagos»: una pantalla que lo muestra en una sección propia (los pagos de un proyecto) sabe con ellos que debe abrirla. */
export const PANELES_DEL_PAGO = [
  PANEL_PAGO,
  PANEL_CONFIRMAR_PAGO,
  PANEL_ELIMINAR_PAGO,
  PANEL_ANULAR_PAGO,
] as const

/** Lo que se escribe en la URL para abrir «Registrar pago». */
export const PARAMETROS_DE_REGISTRAR_PAGO = {
  panel: PANEL_PAGO,
  [CLAVE_DE_PAGO]: PAGO_NUEVO,
} as const

export const MENSAJE_PAGO_YA_NO_ESTA = 'Ese pago ya no está.'

type PanelDePago =
  | typeof PANEL_PAGO
  | typeof PANEL_CONFIRMAR_PAGO
  | typeof PANEL_ELIMINAR_PAGO
  | typeof PANEL_ANULAR_PAGO

/** El pago que nombra la URL: nulo si falta, si es `nuevo` o si ya no está en la lista. */
export function pagoDeLaUrl<P extends { id: string }>(
  pagos: readonly P[] | null,
  valor: string | null,
): P | null {
  if (valor === null || valor === PAGO_NUEVO) {
    return null
  }
  return pagos?.find((p) => p.id === valor) ?? null
}

/**
 * Por qué una URL de pago no se abre (nulo = se abre): falta el permiso que pide el panel, el id ya no está o el pago no está en el estado que el panel pide (confirmar y eliminar piden sin
 * confirmar; anular pide confirmado). `pago` con un id abre siempre que el pago esté: el formulario si se puede editar y, si no (confirmado, o sin permiso de editar), su lectura. `nuevo` sólo
 * es de `pago` y pide editar. Una URL escrita a mano no abre lo que el permiso o el estado no dejan.
 */
export function motivoParaNoAbrirPago(args: {
  panel: PanelDePago
  valor: string | null
  encontrado: { confirmado: boolean } | null
  permisos: { puedeEditar: boolean | null; puedeConfirmar: boolean | null }
}): string | null {
  const { panel, valor, encontrado, permisos } = args
  if (panel === PANEL_PAGO) {
    // `nuevo` pide editar; uno existente se abre (en lectura si no se puede editar) mientras esté en la lista.
    if (valor === PAGO_NUEVO) {
      return permisos.puedeEditar ? null : MENSAJE_PAGO_YA_NO_ESTA
    }
    return encontrado === null ? MENSAJE_PAGO_YA_NO_ESTA : null
  }
  const permitido = panel === PANEL_ELIMINAR_PAGO ? permisos.puedeEditar : permisos.puedeConfirmar
  if (!permitido || encontrado === null) {
    return MENSAJE_PAGO_YA_NO_ESTA
  }
  const pideConfirmado = panel === PANEL_ANULAR_PAGO
  return encontrado.confirmado === pideConfirmado ? null : MENSAJE_PAGO_YA_NO_ESTA
}
