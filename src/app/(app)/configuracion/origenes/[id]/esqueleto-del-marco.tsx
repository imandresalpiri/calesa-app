import { Skeleton } from '@/shared/ui/skeleton'

// Lo que se ve mientras llega la cabecera de un origen: las migas, el nombre (con un `h1` para el lector) con sus botones y las pestañas.
export function EsqueletoDelMarco() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando el origen"
      className="grid min-w-0 gap-3"
    >
      <h1 className="sr-only">Origen</h1>
      <Skeleton className="h-5 w-64 max-w-full" />
      <div className="flex min-w-0 items-center justify-between gap-3">
        <Skeleton className="h-7 w-56 max-w-full" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-11 w-full md:h-8 md:w-[32rem] md:max-w-full" />
    </div>
  )
}
