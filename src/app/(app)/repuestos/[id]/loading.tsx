import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { Skeleton } from '@/shared/ui/skeleton'
import { EsqueletoDelVehiculo } from './vehiculo-del-proyecto'

// Lo que se ve mientras llega el proyecto: la cabecera (el título y el recuadro del vehículo), la barra de progreso, las pestañas y la hoja.
export function CargandoUnProyectoCuerpo() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <Skeleton className="h-8 w-48" />
        <div className="max-w-xl rounded-(--radius-card) border border-(--color-line) p-3">
          <EsqueletoDelVehiculo />
        </div>
      </div>
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-9 w-80 max-w-full" />
      <EsqueletoListado filas={6} columnas={6} />
    </div>
  )
}

export default function CargandoUnProyecto() {
  return <CargandoUnProyectoCuerpo />
}
