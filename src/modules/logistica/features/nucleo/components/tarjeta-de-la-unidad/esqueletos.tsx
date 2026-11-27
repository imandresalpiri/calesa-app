import { Skeleton } from '@/shared/ui/skeleton'

// El resumen de una tarjeta mientras llega del servidor: dos líneas (el renglón de una tercera queda en el alto fijo) y el renglón del aviso, del mismo alto que `ResumenDeLaTarjeta` (la tarjeta tiene alto fijo y no
// salta). Compatible con servidor.
export function EsqueletoDelResumen() {
  return (
    <>
      <div className="grid min-h-10 content-start gap-1.5 pt-0.5">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-3/5" />
      </div>
      <div className="h-5" />
    </>
  )
}

// Una tarjeta entera mientras llega la página (`loading.tsx`): el mismo alto fijo que `TarjetaDeLaUnidad`.
export function EsqueletoDeLaTarjeta() {
  return <Skeleton className="h-36 rounded-(--radius-card)" />
}
