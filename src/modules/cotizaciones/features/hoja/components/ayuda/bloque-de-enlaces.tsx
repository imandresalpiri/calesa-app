import { ExternalLink } from 'lucide-react'
import { useId } from 'react'
import type { EnlaceDeLaAyuda } from '../../../../entities/hoja'

// Los enlaces de un bloque (hasta 5, `https://`), como las tarjetas de enlace de V1 con su «Consulta estas fuentes»: cada uno abre en otra pestaña, sin darle acceso a esta
// página (`noopener`) ni decirle de dónde viene (`noreferrer`), y su nombre accesible lo dice.
export function BloqueDeEnlaces({ enlaces }: { enlaces: readonly EnlaceDeLaAyuda[] }) {
  const titulo = useId()
  return (
    <section aria-labelledby={titulo} className="grid gap-2">
      <h3 id={titulo} className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Consulta estas fuentes
      </h3>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {enlaces.map((enlace, i) => (
          // Dos enlaces pueden ir a la misma URL: la posición los distingue.
          <li key={`${String(i)}:${enlace.url}`} className="min-w-0">
            <a
              href={enlace.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 py-2 text-(length:--text-sm) font-medium break-words text-(--color-primario) transition hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) focus-visible:outline-none"
            >
              <span className="min-w-0">
                {enlace.titulo}
                <span className="sr-only"> (abre en otra pestaña)</span>
              </span>
              <ExternalLink aria-hidden className="size-4 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
