import { Skeleton } from '@/shared/ui/skeleton'

function Bloque() {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <ul className="grid gap-2">
        {Array.from({ length: 3 }, (_, n) => (
          <li key={n}>
            <Skeleton className="h-14 w-full" />
          </li>
        ))}
      </ul>
    </div>
  )
}

// La forma de los tipos de documento en el panel del flujo: sus dos grupos (los del flujo y los compartidos), cada uno con su encabezado y unas filas.
export function EsqueletoDeTipos() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Cargando los tipos de documento">
      <Bloque />
      <Bloque />
    </div>
  )
}
