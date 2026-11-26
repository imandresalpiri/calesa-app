// Pantalla del área `compras` de `repuestos`: lo del panel de un ítem (`?item=<id>`) que viene de las compras, sólo con `repuestos.costos.ver`: la lectura que comparten, la tarjeta «Compras» y el
// proveedor de la columna izquierda; y el motivo para no registrar una compra. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
export {
  ComprasDelItemProveedorDiferido,
  ProveedorDelItemDiferido,
  TarjetaDeComprasDelItemDiferida,
} from '../features/compras/components/diferidos'
