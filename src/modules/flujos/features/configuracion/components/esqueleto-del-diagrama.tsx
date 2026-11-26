import { Skeleton } from '@/shared/ui/skeleton'

// El alto del lienzo del diagrama en el servidor y hasta medir (`MarcoDelLienzo`): el mismo para el esqueleto y el diagrama, así nada salta.
export const ALTO_DEL_LIENZO = 'h-[min(32rem,70dvh)]'

// Lo que se ve mientras llega el código del diagrama (`diferido()`), dentro del marco y llenándolo. Fuera de `diagrama/`: no importa `@xyflow/react`.
export function EsqueletoDelDiagrama() {
  return (
    <div role="status" aria-label="Cargando el diagrama del flujo" className="size-full">
      <Skeleton className="size-full rounded-(--radius-card)" />
    </div>
  )
}
