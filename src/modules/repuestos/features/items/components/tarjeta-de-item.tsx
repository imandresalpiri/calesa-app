'use client'

import type { ReactNode } from 'react'
import { formatearNumero } from '@/shared/lib/formato'
import { Badge } from '@/shared/ui/badge'
import { AbrirResumen, MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import { TarjetaDeLista } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import type { CatalogosDeLaHoja } from '../../../entities/items/hoja'
import { queEsElItem } from '../../../entities/items/que-es'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { FaseDelItemInsignia } from './fase-del-item'

type Props = {
  fila: FilaDeItem
  catalogos: CatalogosDeLaHoja
  // La moneda con que se muestra el precio de un ítem sin moneda.
  monedaPorDefecto: string | null
  // El «⋯» de la tarjeta, ya armado (`accionesDelItem`).
  acciones: readonly AccionDeMenu[]
  alAbrir: (id: string) => void
  // El botón del siguiente (lo pone el hueco); nulo, la fase del ítem.
  siguiente: ReactNode
}

// «2 × Bs 150» con precio o «2 · Sin precio»; el precio por `<Monto>` (respeta Modo Live).
function CantidadYPrecio({ fila, moneda }: { fila: FilaDeItem; moneda: string | null }) {
  const cantidad = formatearNumero(fila.cantidad)
  if (fila.precioCliente === null) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        <span className="tabular-nums">{cantidad}</span> · Sin precio
      </p>
    )
  }
  return (
    <p className="text-(length:--text-sm)">
      <span className="tabular-nums">{cantidad}</span> ×{' '}
      <Monto valor={fila.precioCliente} {...(moneda ? { moneda } : {})} />
    </p>
  )
}

// Un ítem como tarjeta de la lista (`docs/UX.md`: «Ítems del proyecto»): qué es («Bomba de agua · Usado», o su descripción si no tiene tipo ni condición), la descripción en una línea, cantidad
// y precio, lo que haya en stock y el botón del siguiente (o su fase). Un clic en la tarjeta abre su panel (`?item=`); el «⋯» arriba a la derecha lleva Imágenes, Stock, Mover a… y Eliminar.
// Sin imagen: serían 200 lecturas. Ninguna tarjeta dentro de otra.
export function TarjetaDeItem({
  fila,
  catalogos,
  monedaPorDefecto,
  acciones,
  alAbrir,
  siguiente,
}: Props) {
  const queEs = queEsElItem(fila, catalogos)
  const nombre = queEs ?? fila.descripcion
  return (
    <TarjetaDeLista
      alAbrir={() => {
        alAbrir(fila.id)
      }}
      estirada
      acciones={<MasAcciones nombre={fila.descripcion} acciones={acciones} id={fila.id} />}
    >
      <div data-tarjeta-de-item={fila.id} className="grid min-w-0 gap-1.5">
        <AbrirResumen nombre={nombre} className="min-w-0 font-medium [overflow-wrap:anywhere]">
          {nombre}
        </AbrirResumen>
        {queEs === null ? null : (
          <p
            title={fila.descripcion}
            className="truncate text-(length:--text-sm) text-(--color-ink-soft)"
          >
            {fila.descripcion}
          </p>
        )}
        <CantidadYPrecio fila={fila} moneda={fila.moneda ?? monedaPorDefecto} />
        {fila.stockCantidad > 0 ? (
          <Badge variant="outline" className="w-fit tabular-nums">
            En stock: {formatearNumero(fila.stockCantidad)}
          </Badge>
        ) : null}
        <div className="min-w-0">{siguiente ?? <FaseDelItemInsignia fase={fila.fase} />}</div>
      </div>
    </TarjetaDeLista>
  )
}
