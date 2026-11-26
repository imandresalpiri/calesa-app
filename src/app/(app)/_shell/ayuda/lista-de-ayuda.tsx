import { ExternalLinkIcon } from 'lucide-react'
import type { EnlaceDeAyudaDelMenu } from '@/modules/empresa/shell.client'

// Un renglón de 44 px como mínimo (cómodo para el dedo); con el texto al 200 % crece en alto y no se sale de lo ancho.
const FILA =
  'flex min-h-[44px] min-w-0 items-start gap-3 rounded-(--radius-md) px-2 py-2 outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus)'

// Los enlaces de ayuda de quien mira, en su orden: el título, la descripción (si tiene) y el dominio. Cada uno abre en otra pestaña, sin
// darle a la página de afuera acceso a esta (`noopener noreferrer`), y su nombre accesible lo dice.
export function ListaDeAyuda({ enlaces }: { enlaces: readonly EnlaceDeAyudaDelMenu[] }) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-0.5" aria-label="Enlaces de ayuda">
      {enlaces.map((enlace) => {
        const idDeLaDescripcion = `ayuda-${enlace.clave}-descripcion`
        return (
          <li key={enlace.clave} className="min-w-0">
            <a
              href={enlace.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${enlace.titulo}, en ${enlace.dominio} (se abre en otra pestaña)`}
              aria-describedby={enlace.descripcion ? idDeLaDescripcion : undefined}
              className={FILA}
              data-enlace-de-ayuda={enlace.clave}
            >
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-(length:--text-sm) font-medium break-words text-(--color-ink)">
                  {enlace.titulo}
                </span>
                {enlace.descripcion ? (
                  <span
                    id={idDeLaDescripcion}
                    className="text-(length:--text-xs) break-words text-(--color-ink-soft)"
                  >
                    {enlace.descripcion}
                  </span>
                ) : null}
                <span className="truncate text-(length:--text-xs) text-(--color-ink-faint)">
                  {enlace.dominio}
                </span>
              </span>
              <ExternalLinkIcon
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-(--color-ink-faint)"
              />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
