import { CLAVE_DE_SECCION_DEL_ITEM } from '@/shared/lib/filtros'
import type { HuecoDeLaUnidad } from '../../../entities/nucleo/hueco'
import { accionDeVer, type ResumenDeTarjeta } from '../../../entities/nucleo/tarjeta'
import type { ClaveDeTarjeta } from '../../../entities/nucleo/tarjetas'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { ContenidoDeLaTarjeta, ResumenDeLaTarjeta, TarjetaDeLaUnidad } from './tarjeta-de-la-unidad'

type ClaveDelItem = Extract<ClaveDeTarjeta, 'documentos' | 'notas' | 'historial'>

// Lo que dice cada tarjeta de lo que hay adentro. Una línea, siempre la misma: leerlo costaría una consulta por tarjeta.
const RESUMEN: Readonly<Record<ClaveDelItem, string>> = {
  documentos: 'Subir, revisar y aprobar los documentos del ítem.',
  notas: 'Lo que se anotó sobre el ítem.',
  historial: 'Los cambios de fase y de lo que se hizo.',
}

const resumenFijo = (clave: ClaveDelItem): ResumenDeTarjeta => ({
  lineas: [RESUMEN[clave]],
  aviso: null,
  acciones: [accionDeVer(clave)],
})

type Props = {
  unidad: UnidadAbierta
  // Los huecos visibles (`huecosVisibles`): la tarjeta sólo existe si la persona ve el hueco.
  huecos: readonly HuecoDeLaUnidad[]
  clave: ClaveDelItem
}

// La tarjeta de un hueco de logística (Documentos, Notas o Historial) en el panel de un ítem: la misma tarjeta de la unidad, con su resumen fijo (no lee nada) y su drawer en
// `?seccion=<clave>` (un `?panel=` cerraría el panel del ítem). Nula si el hueco no se ve o no tiene qué dibujar para un ítem.
export function TarjetaDelHuecoDelItem({ unidad, huecos, clave }: Props) {
  const hueco = huecos.find((h) => h.clave === clave)
  if (hueco === undefined || hueco.repuesto?.componente === undefined) return null
  const resumen = resumenFijo(clave)
  return (
    <TarjetaDeLaUnidad
      unidadId={unidad.id}
      clave={clave}
      titulo={hueco.titulo}
      etiqueta={resumen.acciones[0]?.etiqueta ?? hueco.titulo}
      huecos={[clave]}
      claveDeLaUrl={CLAVE_DE_SECCION_DEL_ITEM}
      contenido={<ContenidoDeLaTarjeta unidad={unidad} huecos={[hueco]} />}
    >
      <ResumenDeLaTarjeta titulo={hueco.titulo} resumen={resumen} />
    </TarjetaDeLaUnidad>
  )
}
