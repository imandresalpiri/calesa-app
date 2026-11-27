import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { EsqueletoDeLaBarra } from '../esqueleto-de-la-barra'

export default function CargandoEmbarques() {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <EsqueletoDeLaBarra />
      <EsqueletoListado filas={8} columnas={7} />
    </div>
  )
}
