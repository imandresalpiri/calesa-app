'use client'

import { Skeleton } from '@/shared/ui/skeleton'
import { proveedorDeLaUltimaCompra } from '../../../entities/compras/proveedor-del-item'
import { useComprasDelPanel } from './compras-del-item-proveedor'

// El proveedor del ítem para la columna izquierda: el de su última compra («x (última compra)»), de la lectura que ya hizo el panel; «Sin dato» si no hay compras o la última no lo dice.
// Mientras lee, un renglón del mismo alto; si la lectura falla, lo dice la tarjeta «Compras» (con su «Reintentar») y aquí queda «Sin dato».
export function ProveedorDelItem() {
  const compras = useComprasDelPanel()
  const lectura = compras?.lectura
  if (lectura === undefined || lectura.estado === 'leyendo') {
    return <Skeleton role="status" aria-label="Cargando el proveedor" className="h-5 w-2/3" />
  }
  const proveedor =
    lectura.estado === 'leido' ? proveedorDeLaUltimaCompra(lectura.dato.filas) : null
  return (
    <p className="text-(length:--text-sm) [overflow-wrap:anywhere]" data-proveedor-del-item>
      {proveedor === null ? (
        <span className="text-(--color-ink-faint)">Sin dato</span>
      ) : (
        <>
          {proveedor} <span className="text-(--color-ink-faint)">(última compra)</span>
        </>
      )}
    </p>
  )
}
