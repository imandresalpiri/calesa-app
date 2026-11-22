import { Skeleton } from '@/shared/ui/skeleton'

// La misma rejilla que la de verdad (`REJILLA_DE_TARJETAS` de `@/modules/web`, que este esqueleto no importa: no carga el barril de pantallas).
const REJILLA = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-3'

function TarjetaQueLlega({ lineas }: { lineas: number }) {
  return (
    <div className="grid gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: lineas }, (_, i) => (
        <Skeleton key={i} className={i % 2 === 0 ? 'h-3.5 w-full' : 'h-3.5 w-3/5'} />
      ))}
    </div>
  )
}

function BloqueQueLlega({ tarjetas, accion }: { tarjetas: number; accion?: boolean }) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-40" />
        {accion ? <Skeleton className="h-8 w-36" /> : null}
      </div>
      <div className={REJILLA}>
        {Array.from({ length: tarjetas }, (_, i) => (
          <TarjetaQueLlega key={i} lineas={3} />
        ))}
      </div>
    </div>
  )
}

// El esqueleto de Cola web: «Sin asignar» y «En la rueda» con sus tarjetas en rejilla y la tarjeta de la política, a todo el ancho del área.
export function EsqueletoDeLaCola() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando la cola web" className="grid gap-6">
      <BloqueQueLlega tarjetas={2} />
      <BloqueQueLlega tarjetas={3} accion />
      <div className={REJILLA}>
        <TarjetaQueLlega lineas={5} />
      </div>
    </div>
  )
}
