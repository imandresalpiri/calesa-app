// Los paneles del hueco «Gastos» en la URL de la pantalla que lo muestra (6.11-1): `?panel=gasto&gasto=<id|nuevo>` abre el formulario y `?panel=eliminar-gasto&gasto=<id>`, la
// confirmación de eliminar. Van aparte del `?vehiculo=` del panel de la unidad.
export const PANEL_GASTO = 'gasto'
export const PANEL_ELIMINAR_GASTO = 'eliminar-gasto'
/** Todos los `?panel=` del hueco «Gastos»: con uno en la URL, la página de la unidad abre sola la tarjeta Dinero (el hueco atiende su panel adentro). */
export const PANELES_DEL_GASTO = [PANEL_GASTO, PANEL_ELIMINAR_GASTO] as const
// El desglose del margen (`?panel=desglose-del-margen`): un modal de sólo lectura sobre la vista «Margen».
export const PANEL_DESGLOSE_DEL_MARGEN = 'desglose-del-margen'
export const PANELES_DEL_MARGEN = [PANEL_DESGLOSE_DEL_MARGEN] as const
// La vista del drawer de la tarjeta «Dinero» (`?dinero=gastos|pagos|margen`): la clave es la de la tarjeta (`VistasDeLaTarjeta`).
export const CLAVE_DE_LA_VISTA_DE_DINERO = 'dinero'
// El diálogo de «Prorratear» del resumen de un grupo (`?panel=prorratear`, 6.11-4): nombra el reparto antes de escribir nada.
export const PANEL_PRORRATEAR = 'prorratear'
// Los modales de «Categorías de gasto» dentro de su drawer (`?panel=categorias-de-gasto`, 6.11-4): `?accion=nueva-categoria&de=origen|compartido` y
// `?accion=editar-categoria&categoria=<id>`. No se eliminan: se desactivan.
export const ACCION_NUEVA_CATEGORIA = 'nueva-categoria'
export const ACCION_EDITAR_CATEGORIA = 'editar-categoria'
export const CLAVE_DE_CATEGORIA = 'categoria'
export const MENSAJE_CATEGORIA_YA_NO_ESTA = 'Esa categoría ya no está.'
export const CLAVE_DE_GASTO = 'gasto'
export const GASTO_NUEVO = 'nuevo'

export const MENSAJE_GASTO_YA_NO_ESTA = 'Ese gasto ya no está.'

type ConGasto = { id: string }

/** El gasto que nombra la URL: nulo si falta, si es `nuevo` o si ya no está en la lista. */
export function gastoDeLaUrl<G extends ConGasto>(
  gastos: readonly G[] | null,
  valor: string | null,
): G | null {
  if (valor === null || valor === GASTO_NUEVO) {
    return null
  }
  return gastos?.find((g) => g.id === valor) ?? null
}

/**
 * Por qué una URL de gasto no se abre (nulo = se abre): sin permiso de editar, o con un id que ya no está. `nuevo` sólo pide el permiso; `eliminar` nunca admite `nuevo`.
 */
export function motivoParaNoAbrirGasto(args: {
  valor: string | null
  encontrado: unknown
  puedeEditar: boolean | null
  admiteNuevo: boolean
}): string | null {
  const { valor, encontrado, puedeEditar, admiteNuevo } = args
  if (!puedeEditar) {
    return MENSAJE_GASTO_YA_NO_ESTA
  }
  if (admiteNuevo && valor === GASTO_NUEVO) {
    return null
  }
  return encontrado === null ? MENSAJE_GASTO_YA_NO_ESTA : null
}
