import { cn } from 'cn'
import type { ReactNode } from 'react'

type Props = {
  id: string
  titulo: ReactNode
  // La acción principal del bloque, a la derecha de su título (en el celular, debajo).
  accion?: ReactNode
  className?: string
  children: ReactNode
}

// Un bloque de la página de la cola («Sin asignar», «En la rueda»): su título (`h2`), su acción principal si la tiene y su cuerpo. Sin frase debajo del título:
// el título ya dice qué hay.
export function SeccionDeLaCola({ id, titulo, accion, className, children }: Props) {
  return (
    <section aria-labelledby={id} className={cn('grid gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id={id} className="min-w-0 text-(length:--text-lg) font-semibold text-(--color-ink)">
          {titulo}
        </h2>
        {accion}
      </div>
      {children}
    </section>
  )
}
