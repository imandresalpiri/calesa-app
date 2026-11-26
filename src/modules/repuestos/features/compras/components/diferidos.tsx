'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega el código de un panel: unas líneas en su lugar.
function EsqueletoDelPanel() {
  return (
    <div role="status" aria-label="Cargando" className="grid gap-2">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

// El formulario de una compra se pide al abrirse (`useAbiertoAlgunaVez()`): nada de su código viaja con la lista (8.11-3, C12).
export const DrawerDeCompraDiferido = diferido(() =>
  import('./drawer-de-compra').then((modulo) => modulo.DrawerDeCompra),
)

// Lo del panel del ítem que viene de las compras (sólo con `repuestos.costos.ver`): la lectura que comparten, la tarjeta «Compras» y el proveedor de la columna izquierda. Se piden al abrir el
// panel, no viajan con la hoja ni con la Cadena.
export const ComprasDelItemProveedorDiferido = diferido(
  () => import('./compras-del-item-proveedor').then((modulo) => modulo.ComprasDelItemProveedor),
  { aviso: 'aqui', esqueleto: <EsqueletoListado filas={4} columnas={2} /> },
)
export const TarjetaDeComprasDelItemDiferida = diferido(
  () => import('./tarjeta-de-compras-del-item').then((modulo) => modulo.TarjetaDeComprasDelItem),
  { aviso: 'aqui', esqueleto: <EsqueletoDelPanel /> },
)
export const ProveedorDelItemDiferido = diferido(
  () => import('./proveedor-del-item').then((modulo) => modulo.ProveedorDelItem),
  { aviso: 'aqui', esqueleto: <Skeleton className="h-5 w-2/3" /> },
)

// El panel «Compras» bajo los pasos de `/repuestos/[id]`: el margen y la lista se piden al elegirlo, no viajan con la hoja.
export const ComprasDelProyectoDiferido = diferido(
  () => import('./compras-del-proyecto').then((modulo) => modulo.ComprasDelProyecto),
  { aviso: 'aqui', esqueleto: <EsqueletoDelPanel /> },
)

export const MargenDelProyectoDiferido = diferido(
  () => import('./margen-del-proyecto').then((modulo) => modulo.MargenDelProyecto),
  { aviso: 'aqui', esqueleto: <EsqueletoDelPanel /> },
)
