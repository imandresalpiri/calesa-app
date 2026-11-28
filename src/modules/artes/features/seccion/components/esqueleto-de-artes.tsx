import { Skeleton } from '@/shared/ui/skeleton'
import { EsqueletoDeLaRejilla } from '../../plantillas/components/esqueleto-de-la-rejilla'

// `/artes` que todavía no llegó: la barra de pestañas con su alto (`min-h-11`, la de `PestanasDeArtes`) y la rejilla. Al llegar, nada se mueve.
export function EsqueletoDeArtes() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex min-h-11 items-center gap-4 border-b border-(--color-line)">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <EsqueletoDeLaRejilla />
    </div>
  )
}
