import { EsqueletoDelEmbarque } from '@/modules/logistica/pantallas/transporte-esqueletos'
import { EsqueletoDeLaBarra } from '../../esqueleto-de-la-barra'

export default function CargandoElEmbarque() {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <h1 className="sr-only">Embarque</h1>
      <EsqueletoDeLaBarra />
      <EsqueletoDelEmbarque />
    </div>
  )
}
