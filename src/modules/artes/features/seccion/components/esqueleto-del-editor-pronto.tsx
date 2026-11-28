import { Skeleton } from '@/shared/ui/skeleton'

// `/artes/<id>` que todavía no llegó: la misma caja que `EditorPronto` (el título, la línea y el botón).
export function EsqueletoDelEditorPronto() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando" className="grid max-w-prose gap-3">
      <Skeleton className="my-1 h-6 w-64 max-w-full" />
      <Skeleton className="my-1 h-4 w-56 max-w-full" />
      <Skeleton className="h-11 w-36 md:h-9" />
    </div>
  )
}
