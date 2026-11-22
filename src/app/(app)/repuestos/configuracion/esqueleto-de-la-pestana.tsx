import { Skeleton } from '@/shared/ui/skeleton'

// La forma de una pestaña de Repuestos › Configuración mientras llega: una acción arriba a la derecha y `bloques` bloques de la lista. Sin tope de ancho. No importa `@/modules/repuestos`:
// el esqueleto no carga el barril de pantallas.
export function EsqueletoDeLaPestana({
  etiqueta,
  bloques = 3,
}: {
  etiqueta: string
  bloques?: number
}) {
  return (
    <div role="status" aria-busy="true" aria-label={etiqueta} className="grid gap-3">
      <div className="flex justify-end">
        <Skeleton className="h-11 w-36 md:h-8" />
      </div>
      {Array.from({ length: bloques }, (_, bloque) => (
        <Skeleton key={bloque} className="h-24 w-full" />
      ))}
    </div>
  )
}
