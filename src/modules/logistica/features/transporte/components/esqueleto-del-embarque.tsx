import { Skeleton } from '@/shared/ui/skeleton'

// El lugar de la página de un embarque mientras llega (`loading.tsx`): la cabecera (título, la línea de qué es, los cuatro datos y el conteo) y dos secciones de contenedor, con los altos
// de `CabeceraDelEmbarque` y `SeccionDelContenedor` para que nada salte al llegar. Compatible con servidor.
export function EsqueletoDelEmbarque() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando el embarque"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4"
    >
      <div className="grid min-w-0 gap-3">
        <div className="grid gap-1">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid gap-0.5">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-6 w-32 max-w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-11 w-64 max-w-full md:h-5" />
      </div>
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-48 rounded-(--radius-card)" />
      ))}
    </div>
  )
}
