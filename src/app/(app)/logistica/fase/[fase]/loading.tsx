import { EsqueletoDeLaFase } from '@/modules/logistica/pantallas/cadena-esqueletos'
import { EsqueletoDeLaBarra } from '../../esqueleto-de-la-barra'

export default function CargandoLaFase() {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <EsqueletoDeLaBarra />
      <EsqueletoDeLaFase />
    </div>
  )
}
