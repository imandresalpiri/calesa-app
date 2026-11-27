'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { contenedorDeLogistica, embarqueDeLogistica } from '@/shared/lib/rutas'
import type { VehiculoDeDeclaracion } from '../../../entities/aduana/declaracion'

const ENLACE = 'underline underline-offset-2 hover:text-(--color-ink)'

// Dónde viaja el vehículo: su contenedor y su embarque, cada uno enlazado a su drawer o su página (en el origen del vehículo), o «Sin transporte».
function DondeViaja({ vehiculo }: { vehiculo: VehiculoDeDeclaracion }) {
  const { contenedor, embarque, origenId } = vehiculo
  if (contenedor === null && embarque === null) return <span>Sin transporte</span>
  return (
    <span className="flex min-w-0 flex-wrap gap-x-2">
      {contenedor ? (
        <Link href={contenedorDeLogistica(contenedor.id, origenId) as Route} className={ENLACE}>
          Contenedor {contenedor.numero}
        </Link>
      ) : null}
      {embarque ? (
        <Link href={embarqueDeLogistica(embarque.id, origenId) as Route} className={ENLACE}>
          Embarque {embarque.booking}
        </Link>
      ) : null}
    </span>
  )
}

// El título del vehículo y, debajo, dónde viaja: lo dibujan el resumen en lectura y la composición.
export function TituloYDondeViaja({ vehiculo }: { vehiculo: VehiculoDeDeclaracion }) {
  return (
    <span className="grid min-w-0 gap-0.5">
      <span className="font-medium [overflow-wrap:anywhere] text-(--color-ink)">
        {vehiculo.titulo}
      </span>
      <span className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
        <DondeViaja vehiculo={vehiculo} />
      </span>
    </span>
  )
}
