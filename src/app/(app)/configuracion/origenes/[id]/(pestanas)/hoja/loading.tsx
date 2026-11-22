import { Skeleton } from '@/shared/ui/skeleton'

// El editor de la hoja mientras se lee: la línea de guardar y las vistas, el lienzo con dos secciones y, desde 1.024 px, el inspector a la derecha.
export default function Cargando() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando la hoja"
      className="grid min-w-0 gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-4 w-48 max-w-full" />
        <Skeleton className="h-8 w-72 max-w-full" />
      </div>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="grid min-w-0 gap-4 rounded-(--radius-card) border border-(--color-line) p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full rounded-(--radius-card)" />
          <Skeleton className="h-28 w-full rounded-(--radius-card)" />
        </div>
        <div className="hidden min-w-0 gap-3 rounded-(--radius-card) border border-(--color-line) p-4 lg:grid">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      </div>
    </div>
  )
}
