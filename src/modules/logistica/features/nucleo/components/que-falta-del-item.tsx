import type { HuecoDeLaUnidad } from '../../../entities/nucleo/hueco'
import { ATRIBUTO_DEL_BLOQUE } from '../../../entities/nucleo/paneles-de-la-unidad'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { ProveedorDelDestinoInicial } from '../destino-inicial'
import { ContenidoDelHueco } from './contenido-del-hueco'

type Props = {
  unidad: UnidadAbierta
  // Los huecos visibles (`huecosVisibles`): el panel no decide permisos; busca el de «Qué falta».
  huecos: readonly HuecoDeLaUnidad[]
  // El destino que «Qué falta» abre solo (`?destino=`); nulo, ninguno.
  destinoInicial?: string | null
}

const QUE_FALTA = 'que-falta'

// «Qué falta» de un ítem de repuesto, para el lugar que le dé `repuestos` (el bloque «Estado» de la columna del ítem): el hueco con su `?destino=` ya abierto y su atributo
// `data-bloque-del-hueco`, que es lo que buscan los atajos. No dibuja título: lo pone quien lo aloja. Nulo si la persona no ve el hueco. No lee nada.
export function QueFaltaDelItem({ unidad, huecos, destinoInicial = null }: Props) {
  const hueco = huecos.find((h) => h.clave === QUE_FALTA)
  if (hueco === undefined) return null
  return (
    <ProveedorDelDestinoInicial destino={destinoInicial}>
      <div {...{ [ATRIBUTO_DEL_BLOQUE]: QUE_FALTA }} className="min-w-0">
        <ContenidoDelHueco hueco={hueco} unidad={unidad} />
      </div>
    </ProveedorDelDestinoInicial>
  )
}
