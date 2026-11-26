'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { TarjetaTocable } from '@/shared/ui/tarjetas-de-ajustes'
import { rutaDelStockDelItem } from '../../../entities/stock/vista'

type Props = {
  proyectoId: string
  itemId: string
  cantidad: number
  stockCantidad: number
}

// La tarjeta «Stock» del panel del ítem: cuánto de lo pedido está en el stock («En stock: N de M» o «Nada en stock.») y, tocándola, el panel del stock. Sin lectura propia: usa lo que ya leyó el panel.
export function TarjetaDeStockDelItem(props: Props) {
  const router = useRouter()
  const { cantidad, stockCantidad } = props
  return (
    <TarjetaTocable
      densidad="compacta"
      titulo="Stock"
      accion="Abrir el stock"
      etiquetaDelMenu="Abrir el stock…"
      motivo={null}
      abrir={() => {
        router.push(
          rutaDelStockDelItem({ id: props.itemId, proyectoId: props.proyectoId }) as Route,
        )
      }}
    >
      <div className="min-h-10" data-bloque="stock-del-item">
        <p className="text-(length:--text-sm)">
          {stockCantidad > 0
            ? `En stock: ${String(stockCantidad)} de ${String(cantidad)}`
            : 'Nada en stock.'}
        </p>
      </div>
    </TarjetaTocable>
  )
}
