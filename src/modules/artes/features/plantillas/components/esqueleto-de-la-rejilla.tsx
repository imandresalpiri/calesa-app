import { Skeleton } from '@/shared/ui/skeleton'

// La rejilla de Artes que todavía no llegó (las dos pestañas): la barra de arriba y tarjetas con la misma caja que las de verdad (la miniatura
// de alto fijo y sus renglones), en las mismas columnas. Al llegar, nada se mueve.
export function EsqueletoDeLaRejilla() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando"
      className="grid grid-cols-[minmax(0,1fr)] gap-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-11 w-36 rounded-full md:h-9" />
        <Skeleton className="h-11 w-36 rounded-full md:h-9" />
        <Skeleton className="ml-auto h-11 w-40 md:h-9" />
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-3">
        {Array.from({ length: 8 }, (_, i) => (
          <li
            key={i}
            className="grid min-w-0 gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
          >
            <Skeleton className="h-40 w-full rounded-(--radius-md)" />
            <div className="grid gap-1">
              <Skeleton className="my-1 h-4 w-3/4" />
              <Skeleton className="my-0.5 h-4 w-1/2" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="my-0.5 h-3 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
