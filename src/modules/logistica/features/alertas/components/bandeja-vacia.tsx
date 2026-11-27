import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { enElOrigen } from '../../../entities/nucleo/enlaces'

// Nada pendiente hoy en el origen: todos los grupos que ve quien mira están vacíos. Con el camino a la cadena del mismo origen.
export function BandejaVacia({ origenId }: { origenId: string }) {
  return (
    <EstadoVacio
      compacto
      titulo="Nada pendiente hoy"
      descripcion="No hay vehículos demorados ni documentos esperando."
      accion={
        <Link
          href={enElOrigen(RUTAS.logistica, origenId) as Route}
          className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}
        >
          Ver la cadena
        </Link>
      }
    />
  )
}
