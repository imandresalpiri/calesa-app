import { EsqueletoDeUnaTarjeta, EsqueletoTabla } from '@/shared/ui/esqueletos'
import { Skeleton } from '@/shared/ui/skeleton'
// Del archivo, no del barril: el barril trae Client Components (la tarjeta tocable, su límite de error) y este esqueleto viaja en todas las páginas
// de debajo, también en las pestañas de cada origen (`docs/LECCIONES.md`).
import { TarjetasDeAjustes } from '@/shared/ui/tarjetas-de-ajustes/tarjetas-de-ajustes'

// La forma de la página: el bloque «Para todos los orígenes» (su título y dos tarjetas) y la lista de orígenes.
export default function CargandoOrigenes() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Skeleton className="h-6 w-56" />
        <TarjetasDeAjustes etiqueta="Cargando">
          <EsqueletoDeUnaTarjeta />
          <EsqueletoDeUnaTarjeta />
        </TarjetasDeAjustes>
      </div>
      <EsqueletoTabla filas={4} columnas={2} />
    </div>
  )
}
