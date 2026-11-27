import type { HuecoDeLaUnidad } from '../../../../entities/nucleo/hueco'
import { ATRIBUTO_DEL_BLOQUE } from '../../../../entities/nucleo/paneles-de-la-unidad'
import type { UnidadAbierta } from '../../../../entities/nucleo/unidad'
import { ContenidoDelHueco } from '../contenido-del-hueco'
import { VistasDeLaTarjetaDiferidas } from './diferidos'

type Props = {
  // La clave de la tarjeta: con varios huecos, la de la URL de su vista (`?dinero=`).
  clave: string
  unidad: UnidadAbierta
  // Los huecos visibles de la tarjeta, en el orden del panel (`tarjetasDeLaUnidad`).
  huecos: readonly HuecoDeLaUnidad[]
}

// Lo que abre el drawer de una tarjeta: su hueco tal cual o, si junta varios (Dinero: gastos, pagos y margen), una vista por cada uno (`VistasDeLaTarjeta`, diferidas: pestañas
// en la URL): un solo nivel, y sólo se monta la que se ve. Cada hueco lleva su ancla (`data-bloque-del-hueco`): «Revisar» y «Completar» buscan adentro lo que enfocan.
// Compatible con servidor: el contenido de cada hueco viaja ya armado.
export function ContenidoDeLaTarjeta({ clave, unidad, huecos }: Props) {
  if (huecos.length === 1 && huecos[0] !== undefined) {
    const hueco = huecos[0]
    return (
      <div {...{ [ATRIBUTO_DEL_BLOQUE]: hueco.clave }} className="min-w-0">
        <ContenidoDelHueco hueco={hueco} unidad={unidad} />
      </div>
    )
  }
  return (
    <VistasDeLaTarjetaDiferidas
      clave={clave}
      vistas={huecos.map((hueco) => ({
        clave: hueco.clave,
        titulo: hueco.titulo,
        paneles: hueco.paneles ?? [],
        contenido: <ContenidoDelHueco hueco={hueco} unidad={unidad} />,
      }))}
    />
  )
}
