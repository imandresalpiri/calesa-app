import { EsqueletoDeLaUnidad } from '@/modules/logistica/pantallas/unidad-esqueletos'
import { EsqueletoDeLaBarra } from '../../esqueleto-de-la-barra'
import { CLASE_DEL_ALTO_DEL_DETALLE } from './alto-del-detalle'

export default function CargandoUnidad() {
  return (
    <div className={`grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 ${CLASE_DEL_ALTO_DEL_DETALLE}`}>
      <EsqueletoDeLaBarra />
      <EsqueletoDeLaUnidad />
    </div>
  )
}
