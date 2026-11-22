import { Skeleton } from '@/shared/ui/skeleton'

// Lo que se ve mientras llega la pestaña «Tarjeta»: el encabezado con sus botones, la barra del lienzo, el lienzo (de alto fijo, como el del `diferido()` del editor) y,
// desde 64 rem, el panel a la derecha. Lo usan `loading.tsx` y el `<Suspense>` de la página.
export function EsqueletoDeLaTarjeta() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando la tarjeta"
      className="@container grid min-w-0 gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-64 max-w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="grid min-w-0 gap-4 @[64rem]:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-96 rounded-(--radius-card)" />
        <Skeleton className="h-96 rounded-(--radius-card)" />
      </div>
    </div>
  )
}
