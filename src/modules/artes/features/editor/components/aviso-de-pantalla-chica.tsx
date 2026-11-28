'use client'

import { MonitorIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados/estado-vacio'
import { useVolverAArtes } from '../hooks/use-volver-a-artes'

export const MENSAJE_DE_PANTALLA_CHICA = 'El editor de artes se usa en una computadora.'

// Debajo de 1024 px el editor no se dibuja ni se pide su código: lo dice y ofrece volver a la lista como se dejó.
export function AvisoDePantallaChica({ nombre }: { nombre: string }) {
  const volver = useVolverAArtes()
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <h1 className="sr-only">{nombre}</h1>
      <EstadoVacio
        Icono={MonitorIcon}
        titulo={MENSAJE_DE_PANTALLA_CHICA}
        accion={
          <Link
            href={volver as Route}
            className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-9' })}
          >
            Volver
          </Link>
        }
      />
    </div>
  )
}
