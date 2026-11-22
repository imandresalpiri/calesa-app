import { datosO } from '@/shared/lib/errores'
import { leerTablasDeReferencia } from '../../../areas/tablas/composicion'
import type { DestinoDeLasTablas } from '../../../entities/tablas/rutas'
import { ListaDeTablas } from './lista-de-tablas'
import { TablaAbierta } from './tabla-abierta'

type Props = {
  // El origen abierto (la página ya comprobó `cotizaciones.configurar` en él; este módulo no depende de `origenes`) y la pestaña donde se abre el drawer.
  destino: DestinoDeLasTablas
  // `?tabla=`: la tabla que se edita.
  tablaPedida: string | undefined
}

// Las tablas de referencia (4.23-3), leídas en el servidor con la sesión de quien mira y detrás de `<Suspense>`: en el drawer «Tablas» de un origen, las suyas y las
// compartidas que recibe, en dos grupos. La base vuelve a decidir (policy `tablas_referencia: leer`). Una lectura que falla sube al `error.tsx` de la ruta, que
// ofrece «Reintentar». Con `?tabla=`, el editor ocupa el lugar de la lista (como el de la fórmula).
export async function SeccionDeLasTablas({ destino, tablaPedida }: Props) {
  const lectura = datosO(await leerTablasDeReferencia(destino.origen.id))
  return (
    <div className="grid min-w-0 gap-4">
      {tablaPedida === undefined ? (
        <ListaDeTablas destino={destino} lectura={lectura} />
      ) : (
        <TablaAbierta
          destino={destino}
          item={lectura.tablas.find((tabla) => tabla.id === tablaPedida)}
        />
      )}
    </div>
  )
}
