import { Skeleton } from '../skeleton'

// Patrón «editor de un artículo»: la barra de arriba, el título grande y las líneas del texto, con el panel a la derecha desde la pantalla ancha.
export function EsqueletoDeEditorDeArticulo() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando el editor" className="grid gap-6">
      <div className="flex h-14 items-center gap-2 border-b border-(--color-line)">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="ms-auto h-8 w-20" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex gap-6">
        <div className="mx-auto grid w-full max-w-3xl content-start gap-4 px-4 pb-8">
          <Skeleton className="h-10 w-3/4" />
          {Array.from({ length: 6 }, (_, n) => (
            <Skeleton key={n} className={n % 3 === 2 ? 'h-4 w-2/3' : 'h-4 w-full'} />
          ))}
        </div>
        <div className="hidden w-80 shrink-0 gap-3 border-s border-(--color-line) ps-4 lg:grid lg:content-start">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  )
}
