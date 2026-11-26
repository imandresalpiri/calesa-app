import type { HuecoDeLaUnidad } from '../../../entities/nucleo/hueco'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { ContenidoDelHueco } from './contenido-del-hueco'
import { TarjetaDelHueco } from './tarjeta-del-hueco'

// Lo que dice cada tarjeta de lo que hay adentro. Una línea, siempre la misma: leerlo costaría una consulta por tarjeta.
const RESUMEN: Readonly<Record<string, string>> = {
  documentos: 'Subir, revisar y aprobar los documentos del ítem.',
  notas: 'Lo que se anotó sobre el ítem.',
  historial: 'Los cambios de fase y de lo que se hizo.',
}

type Props = {
  unidad: UnidadAbierta
  // Los huecos visibles (`huecosVisibles`): la tarjeta sólo existe si la persona ve el hueco.
  huecos: readonly HuecoDeLaUnidad[]
  clave: string
}

// La tarjeta de un hueco de logística (Documentos, Notas o Historial) para el panel de un ítem; nula si el hueco no se ve o no tiene qué dibujar. No lee nada.
export function TarjetaDelHuecoDelItem({ unidad, huecos, clave }: Props) {
  const hueco = huecos.find((h) => h.clave === clave)
  const resumen = RESUMEN[clave]
  if (hueco === undefined || resumen === undefined || hueco.repuesto?.componente === undefined)
    return null
  return (
    <TarjetaDelHueco
      clave={clave}
      titulo={hueco.titulo}
      resumen={resumen}
      contenido={<ContenidoDelHueco hueco={hueco} unidad={unidad} />}
    />
  )
}
