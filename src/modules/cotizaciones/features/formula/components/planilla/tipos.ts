// Lo que la sesión le pasa a la planilla de la fórmula (sin código: lo importan la sesión y la planilla, que va por `diferido()`).
import type { ComponentType, Dispatch, SetStateAction } from 'react'
import type { EstadoDeLaEdicion } from '../../../../entities/estado-de-la-edicion'
import type { Diseno } from '../../../../entities/diseno'
import type { UnidadDeEjemplo } from '../../../../entities/formula/unidad-de-ejemplo'
import type {
  LecturaDeLaTarjetaEnVivo,
  PropsDeLaTarjetaEnVivo,
} from '../../../../entities/tarjeta-en-vivo'
import type { PropsDelNuevoColor } from '../../../../entities/nuevo-color'
import type { EditorDeLaFormula } from '../../hooks/use-editor-de-la-formula'

// Un tipo de cambio de la empresa (`getTiposCambio()`): lo que ofrece «Tipo de celda › Tipo de cambio».
export type TipoDeCambioDeLaEmpresa = { readonly clave: string; readonly nombre: string }

export type PropsDeLaPlanilla = {
  editor: EditorDeLaFormula
  // El diseño de la versión leída: los modos de tipo de cambio y «Ver total» por defecto.
  diseno: Diseno | null
  origen: { id: string; nombre: string }
  // La fórmula del origen que se edita: «La imagen que recibe el cliente» lleva a su tarjeta.
  formulaDelOrigenId: string
  // «Sobre el borrador de <persona>.» o «Sobre la versión N publicada.»
  sobre: string
  // El estado de lo guardado (Borrador · Publicada vN) que dice la barra de la fórmula; sin ella, nada.
  estadoGuardado: EstadoDeLaEdicion
  // La unidad de ejemplo y el modo elegido viven en la sesión: se pierden al recargar.
  unidad: UnidadDeEjemplo
  alCambiarUnidad: Dispatch<SetStateAction<UnidadDeEjemplo>>
  modo: string | null
  alElegirModo: (clave: string) => void
  recargando: boolean
  alRecargar: () => void
  tarjeta: LecturaDeLaTarjetaEnVivo
  TarjetaEnVivo: ComponentType<PropsDeLaTarjetaEnVivo>
  // «+ Nuevo color» del panel de una banda: lo llena el área `diseno` (este módulo no la importa); sin `cotizaciones.configurar`, no llega y no se ofrece.
  NuevoColor: ComponentType<PropsDelNuevoColor> | null
  puedeCambiarTiposDeCambio: boolean
  tiposDeCambio: readonly TipoDeCambioDeLaEmpresa[]
}
