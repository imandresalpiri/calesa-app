'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useComprasDelItem } from '../hooks/use-compras-del-item'

type Compras = ReturnType<typeof useComprasDelItem>

const ContextoDeLasCompras = createContext<Compras | null>(null)

/** Las compras que leyó el panel del ítem (una sola lectura para la tarjeta «Compras» y el proveedor); nulo fuera del panel. */
export function useComprasDelPanel(): Compras | null {
  return useContext(ContextoDeLasCompras)
}

// Lee las compras del ítem una vez, al montarse el panel (hasta `TAMANO_DE_VER_MAS` + 1, la más reciente primero), y las comparte con la tarjeta «Compras» y con el proveedor de la columna
// izquierda. Sólo se monta con `repuestos.costos.ver` (la action lo exige también).
export function ComprasDelItemProveedor({
  itemId,
  children,
}: {
  itemId: string
  children: ReactNode
}) {
  const compras = useComprasDelItem(itemId)
  return <ContextoDeLasCompras value={compras}>{children}</ContextoDeLasCompras>
}
