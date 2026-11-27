import { Skeleton } from '@/shared/ui/skeleton'

// El lugar de la barra de Logística mientras se lee el origen: mide lo mismo que `BarraDeLogistica` (las dos filas de alto fijo), así nada salta al llegar.
export function EsqueletoDeLaBarra() {
  return (
    <div aria-hidden className="grid gap-1">
      <div className="flex h-11 items-center gap-3 border-b border-(--color-line) px-3 md:h-9">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex h-11 items-center gap-3 px-3 md:h-8">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}
