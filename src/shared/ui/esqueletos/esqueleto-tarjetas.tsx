import { Skeleton } from '../skeleton'

type Props = { tarjetas?: number }

// Una tarjeta de ajustes que todavía no llegó: para el `fallback` de un `<Suspense>` dentro de `<TarjetasDeAjustes>` (la misma caja que la de verdad).
export function EsqueletoDeUnaTarjeta() {
  return (
    <div className="mb-4 grid break-inside-avoid gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="h-3.5 w-3/5" />
    </div>
  )
}

// Patrón «tarjetas de ajustes»: el título de la página y las tarjetas en la misma grilla de columnas que las de verdad.
export function EsqueletoTarjetas({ tarjetas = 4 }: Props) {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando los ajustes" className="grid gap-4">
      <Skeleton className="h-7 w-48" />
      <div className="@container/ajustes min-w-0">
        <div className="columns-[20rem] gap-4">
          {Array.from({ length: tarjetas }, (_, tarjeta) => (
            <EsqueletoDeUnaTarjeta key={tarjeta} />
          ))}
        </div>
      </div>
    </div>
  )
}
