'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from 'cn'
import { nombreDelEnlaceAlVehiculo } from '../../../entities/listado/ruta-del-vehiculo'

// El título o el dato «Vehículo» de una cotización como enlace a la ficha del vehículo (`/vehiculos/<id>`), en la misma pestaña (Ctrl, Cmd y el botón del medio abren otra). Es un
// enlace propio: su clic no abre el resumen (`esClicPropio`). Sin prefetch: una página son cincuenta enlaces a una ruta dinámica.
export function EnlaceAlVehiculo({
  ruta,
  titulo,
  className,
  children,
}: {
  ruta: string
  // Con él, el nombre accesible «Ver <título> en Vehículos»; sin él, el del texto que envuelve.
  titulo?: string
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      href={ruta as Route}
      prefetch={false}
      aria-label={titulo === undefined ? undefined : nombreDelEnlaceAlVehiculo(titulo)}
      data-enlace-al-vehiculo=""
      className={cn(
        'underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus)',
        className,
      )}
    >
      {children}
    </Link>
  )
}
