import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { CLASE_DEL_ALTO_DEL_DETALLE } from './alto-del-detalle'
import { UnidadEnSuPagina } from './unidad-en-su-pagina'

export const metadata: Metadata = { title: 'Unidad de logística' }

// La unidad de logística en su propia página (6.01): a ella apunta la notificación de demora, la bandeja del día, la lista de una fase y «dónde está». En escritorio todo lo importante entra sin desplazar la página
// (la unidad ocupa el alto de la pantalla); con `?hueco=documentos` abre el drawer de esa tarjeta (lo lee la tarjeta en el navegador, no esta página).
export default async function PaginaDeLaUnidad({ params }: PageProps<'/logistica/vehiculo/[id]'>) {
  const [sesion, { id }] = await Promise.all([requerirSesion(), params])
  return (
    <div className={`grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 ${CLASE_DEL_ALTO_DEL_DETALLE}`}>
      {/* Sin cabecera visible: la unidad abre con su propia tarjeta (9.12-5, R3); arriba, la barra de Logística con el origen del vehículo. */}
      <h1 className="sr-only">Unidad de logística</h1>
      <UnidadEnSuPagina id={id} permisos={sesion.permisos} />
    </div>
  )
}
