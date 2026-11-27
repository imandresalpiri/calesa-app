import type { Route } from 'next'
import Link from 'next/link'
import { EyeOffIcon } from 'lucide-react'
import { seOcultaEnElLive, type EstadoDelLive } from '@/modules/equipo'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'

// Inicio con el Modo Live: la bandeja es el trabajo del día de quien mira (tareas, leads, turnos) y no se lee. Lleva a lo que el Live muestra.
export function InicioEnElLive({ live, permisos }: { live: EstadoDelLive; permisos: Permisos }) {
  const destinos = [
    !seOcultaEnElLive(live, 'vehiculos') && puede(permisos, 'vehiculos.ver')
      ? { ruta: RUTAS.vehiculos, titulo: 'Ver vehículos' }
      : null,
    !seOcultaEnElLive(live, 'cotizaciones') && puede(permisos, 'cotizaciones.ver')
      ? { ruta: RUTAS.cotizaciones, titulo: 'Ver cotizaciones' }
      : null,
  ].filter((destino) => destino !== null)

  return (
    <div className="grid gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Inicio</h1>
      <EstadoVacio
        Icono={EyeOffIcon}
        titulo="En el Modo Live, Inicio no muestra tu trabajo del día."
        accion={
          destinos.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {destinos.map(({ ruta, titulo }) => (
                <Link
                  key={ruta}
                  href={ruta as Route}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  {titulo}
                </Link>
              ))}
            </div>
          ) : undefined
        }
      />
    </div>
  )
}
