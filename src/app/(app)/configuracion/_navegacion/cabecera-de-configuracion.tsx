import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import type { DestinoFueraDelNavegador } from '../destinos-de-busqueda'
import type { GrupoDelNavegador } from '../secciones'
import { BuscadorDeConfiguracion } from './buscador-de-configuracion'
import { EnUnaSeccion } from './en-una-seccion'
import { SelectorDeSeccion } from './selector-de-seccion'

// Arriba de cada página de Configuración: «‹ Configuración» (la vuelta al inicio, sólo dentro de una sección) y, donde no se ve el menú, el
// selector de sección y el buscador (en el inicio, el buscador es el de la página). Una sola fila que se parte en dos si no cabe (texto al
// 200 %): el título de la página no baja más de lo necesario.
export function CabeceraDeConfiguracion({
  grupos,
  fuera,
}: {
  grupos: readonly GrupoDelNavegador[]
  fuera: readonly DestinoFueraDelNavegador[]
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <EnUnaSeccion inicio={RUTAS.inicioDeConfiguracion}>
          <Link
            href={RUTAS.inicioDeConfiguracion}
            className="-ml-1 inline-flex min-h-[44px] items-center gap-1 rounded-(--radius-md) pr-2 pl-1 text-(length:--text-sm) text-(--color-ink-soft) outline-none hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) md:min-h-9"
          >
            <ChevronLeftIcon aria-hidden className="size-4 shrink-0" />
            Configuración
          </Link>
        </EnUnaSeccion>
        <div className="max-w-full min-w-0 lg:@min-[44rem]/configuracion:hidden">
          <SelectorDeSeccion grupos={grupos} />
        </div>
      </div>
      <EnUnaSeccion inicio={RUTAS.inicioDeConfiguracion}>
        <div className="lg:@min-[44rem]/configuracion:hidden">
          <BuscadorDeConfiguracion grupos={grupos} fuera={fuera} variante="panel" />
        </div>
      </EnUnaSeccion>
    </>
  )
}
