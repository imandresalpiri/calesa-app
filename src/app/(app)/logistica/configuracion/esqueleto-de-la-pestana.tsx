import { Skeleton } from '@/shared/ui/skeleton'

// La forma de una pestaña de Logística › Configuración: «Nuevo …» arriba a la derecha y la lista. Sin tope de ancho. No importa `@/modules/logistica`: el esqueleto no carga el barril de pantallas.
export function EsqueletoDeLaPestana({ etiqueta }: { etiqueta: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={etiqueta} className="grid gap-3">
      <div className="flex justify-end">
        <Skeleton className="h-11 w-36 md:h-8" />
      </div>
      {Array.from({ length: 4 }, (_, fila) => (
        <Skeleton key={fila} className="h-12 w-full" />
      ))}
    </div>
  )
}
