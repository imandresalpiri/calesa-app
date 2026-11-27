import { EsqueletoDeLaBandeja } from '@/modules/logistica/pantallas/alertas-esqueletos'
import { EsqueletoDeLaBarra } from '../../esqueleto-de-la-barra'

export default function CargandoElGrupo() {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <EsqueletoDeLaBarra />
      <EsqueletoDeLaBandeja />
    </div>
  )
}
