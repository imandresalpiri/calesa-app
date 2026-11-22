import { EsqueletoDeUnaTarjeta } from '@/shared/ui/esqueletos'
import { Skeleton } from '@/shared/ui/skeleton'

// La forma del inicio: el título y las tarjetas de cada grupo en las mismas columnas automáticas que la página.
export default function CargandoInicioDeConfiguracion() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando el inicio" className="grid gap-4">
      <Skeleton className="h-7 w-48" />
      <div className="columns-[20rem] gap-4">
        {Array.from({ length: 6 }, (_, tarjeta) => (
          <EsqueletoDeUnaTarjeta key={tarjeta} />
        ))}
      </div>
    </div>
  )
}
