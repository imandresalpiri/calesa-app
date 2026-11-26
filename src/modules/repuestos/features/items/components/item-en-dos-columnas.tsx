'use client'

import type { ReactNode } from 'react'
import { ImagenesDelItemProveedor } from './imagenes-del-item-proveedor'

type Props = {
  itemId: string
  // Lo del ítem (la columna izquierda) y sus tarjetas (la derecha), ya compuestas por `src/app`.
  izquierda: ReactNode
  derecha: ReactNode
}

// El marco del panel del ítem: dos columnas desde 56 rem de ancho (una columna debajo, en el mismo orden: primero lo del ítem y luego las tarjetas) y, para quienes lo necesitan, la lectura de las
// imágenes que comparten la portada de «Qué es» y la tarjeta «Imágenes». El ancho lo mide el propio panel (`@container`), no la ventana: en la Cadena, que es un panel al costado, queda en una columna.
export function ItemEnDosColumnas({ itemId, izquierda, derecha }: Props) {
  return (
    <ImagenesDelItemProveedor itemId={itemId}>
      <div className="@container min-w-0">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-3 @4xl:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
          {izquierda}
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 @xl:grid-cols-2">
            {derecha}
          </div>
        </div>
      </div>
    </ImagenesDelItemProveedor>
  )
}
