import { EsqueletoDelHueco } from '../../nucleo/components/esqueleto-del-hueco'
import { LineaDelAviso } from './linea-del-aviso'

// El esqueleto del hueco «Transporte» (mientras llega su código y mientras lee): la línea del aviso en su lugar y las de cualquier hueco. Compatible con servidor.
export function EsqueletoDelTransporte() {
  return (
    <div className="grid gap-3" data-esqueleto-del-transporte="">
      <LineaDelAviso texto={null} />
      <EsqueletoDelHueco />
    </div>
  )
}
