import { ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { SelectorDeOrigen, type OrigenDelSelector } from './selector-de-origen'

const ENLACE =
  'inline-flex min-h-11 items-center rounded-(--radius-md) px-1 text-(--color-ink-soft) outline-none hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) md:min-h-8'

// El único camino de vuelta de la página de un origen: «Configuración › Orígenes › ● <Origen> ▾». Cada tramo es un enlace; el último, el selector de origen.
export function MigasDelOrigen({
  actual,
  origenes,
}: {
  actual: OrigenDelSelector
  origenes: readonly OrigenDelSelector[]
}) {
  const separador = (
    <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-(--color-ink-faint)" />
  )
  return (
    <nav aria-label="Migas" className="min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-0.5 text-(length:--text-sm)">
        <li>
          <Link href={RUTAS.inicioDeConfiguracion} className={`-ml-1 ${ENLACE}`}>
            Configuración
          </Link>
        </li>
        <li aria-hidden>{separador}</li>
        <li>
          <Link href={RUTAS.origenes} className={ENLACE}>
            Orígenes
          </Link>
        </li>
        <li aria-hidden>{separador}</li>
        {/* `flex`: el selector se achica (y corta el nombre) sólo si no cabe; con `max-w-full` en un `li` de bloque, Chrome lo cortaba con lugar de sobra. */}
        <li className="flex min-w-0">
          <SelectorDeOrigen actual={actual} origenes={origenes} />
        </li>
      </ol>
    </nav>
  )
}
