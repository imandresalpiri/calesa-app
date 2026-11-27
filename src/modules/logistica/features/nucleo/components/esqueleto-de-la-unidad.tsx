import { Skeleton } from '@/shared/ui/skeleton'
import { EsqueletoDeLaTarjeta } from './tarjeta-de-la-unidad/esqueletos'

const TARJETAS = 6

// El lugar de la unidad mientras llega (`loading.tsx`): la misma forma que `PaginaDeLaUnidad`, sólo con CSS y sin saber el ancho. Desde 56 rem del contenedor, la cabecera y la
// cadena arriba, las tarjetas a la izquierda y «Qué falta» a la derecha; por debajo, una columna. Compatible con servidor.
export function EsqueletoDeLaUnidad() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando la unidad"
      className="@container/unidad min-w-0"
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 @min-[56rem]/unidad:h-(--alto-del-detalle) @min-[56rem]/unidad:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] @min-[56rem]/unidad:grid-rows-[auto_auto_minmax(0,1fr)]">
        <Skeleton className="h-20 rounded-(--radius-card) @min-[56rem]/unidad:col-span-2" />
        <Skeleton className="h-14 rounded-(--radius-card) @min-[56rem]/unidad:col-span-2" />
        <Skeleton className="h-40 rounded-(--radius-card) @min-[56rem]/unidad:col-start-2 @min-[56rem]/unidad:row-start-3 @min-[56rem]/unidad:h-full" />
        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)] content-start gap-3 overflow-hidden @min-[40rem]/unidad:grid-cols-2 @min-[56rem]/unidad:col-start-1 @min-[56rem]/unidad:row-start-3">
          {Array.from({ length: TARJETAS }, (_, i) => (
            <EsqueletoDeLaTarjeta key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

// La portada de la cabecera mientras llega: del mismo tamaño (4:3, 5 rem de ancho), para que la cabecera no salte.
export function EsqueletoDeLaFoto() {
  return <Skeleton className="aspect-4/3 w-20 shrink-0 rounded-(--radius-sm)" />
}
