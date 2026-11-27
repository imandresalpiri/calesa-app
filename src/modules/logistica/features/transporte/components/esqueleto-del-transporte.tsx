import { Skeleton } from '@/shared/ui/skeleton'
import { EsqueletoDelHueco } from '../../nucleo/components/esqueleto-del-hueco'
import { LineaDelAviso } from './linea-del-aviso'

// El esqueleto del hueco «Transporte» (mientras llega su código y mientras lee): «Dónde viaja» con sus renglones en el mismo lugar (el título, la línea del destino, la del aviso y la de
// «Elegir o crear») y, debajo, las líneas de cualquier hueco. Compatible con servidor.
export function EsqueletoDelTransporte() {
  return (
    <div className="grid gap-4" data-esqueleto-del-transporte="">
      <div className="grid gap-2">
        <p className="min-h-[1lh] text-(length:--text-sm) font-medium">Dónde viaja</p>
        <Skeleton className="h-[1lh] w-1/2" />
        <LineaDelAviso texto={null} />
        <Skeleton className="h-11 w-36 md:h-9" />
      </div>
      <EsqueletoDelHueco />
    </div>
  )
}
