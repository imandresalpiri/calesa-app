// El proveedor que muestra el panel de un ítem: no es del ítem (`repuestos_items` no lo guarda) sino de su última compra, y sólo lo ve quien tiene `repuestos.costos.ver`.

/** El proveedor de la última compra del ítem (la lectura llega con la más reciente primero); nulo si no hay compras o la última no lo dice. */
export function proveedorDeLaUltimaCompra(
  compras: readonly { proveedor: string | null }[],
): string | null {
  const proveedor = compras[0]?.proveedor?.trim() ?? ''
  return proveedor === '' ? null : proveedor
}
