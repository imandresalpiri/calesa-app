import { conteoCorto, type ConteoAcotado } from '@/shared/lib/conteo'

// Lo que dicen las pantallas de embarques y contenedores con los términos del glosario (`docs/GLOSARIO.md` › «Embarque», «Contenedor»): una línea, nunca un párrafo.
export const QUE_ES_EL_EMBARQUE = 'Un embarque es el viaje de la naviera con su booking.'
export const QUE_ES_EL_CONTENEDOR = 'La caja que viaja en un embarque, con sus vehículos.'
export const QUE_SON_LOS_SUELTOS = 'Vehículos del embarque que no van en un contenedor.'
export const SOLO_LECTURA_DE_EMBARQUES =
  'Sólo lectura: para cambiar embarques necesitas permiso para editar el transporte.'
export const TEXTO_DE_OCULTOS = 'y otros que no puedes ver'
export const SIN_DECLARACION = 'Sin declaración'
export const LE_FALTA_ALGO = 'Le falta algo'

/** «3 vehículos», «100+ contenedores», «1 vehículo». */
export function textoDeConteo(
  conteo: ConteoAcotado,
  sustantivo: { singular: string; plural: string },
): string {
  const palabra = conteo.n === 1 && !conteo.hayMas ? sustantivo.singular : sustantivo.plural
  return `${conteoCorto(conteo)} ${palabra}`
}

export const VEHICULOS = { singular: 'vehículo', plural: 'vehículos' }
export const CONTENEDORES = { singular: 'contenedor', plural: 'contenedores' }

/**
 * Cuántos vehículos tienen algo que falta para su fase siguiente: «2 con algo que falta», «10+ con algo que falta». Sin ninguno entre los evaluados pero con más sin evaluar, «Revisar qué
 * falta»; sin ninguno, nulo (no se dice nada).
 */
export function textoDeFaltan(faltan: ConteoAcotado): string | null {
  if (faltan.n > 0) return `${conteoCorto(faltan)} con algo que falta`
  return faltan.hayMas ? 'Revisar qué falta' : null
}

/** «Embarque BK123», «Contenedor MSCU1234». */
export const tituloDelEmbarque = (booking: string) => `Embarque ${booking}`
export const tituloDelContenedor = (numero: string) => `Contenedor ${numero}`

/** Lo que dice la página cuando el id no existe, no es un uuid o no se ve. */
export const EMBARQUE_QUE_NO_ESTA = 'Este embarque no existe o ya no lo ves.'
export const CONTENEDOR_QUE_NO_ESTA = 'Este contenedor no existe o ya no lo ves.'

/** «Revisamos 500 embarques.» */
export function textoDeLaCortada(vista: 'embarques' | 'contenedores'): string {
  return `Revisamos 500 ${vista}.`
}

/** El zarpe de la fila: el real o, sin él, el estimado («12 nov 2026 (estimado)»); nulo sin ninguno. `dia` formatea un `AAAA-MM-DD`. */
export function textoDelZarpe(
  e: { zarpeEl: string | null; zarpeEstimadoEl: string | null },
  dia: (fecha: string) => string,
): string | null {
  if (e.zarpeEl !== null) return dia(e.zarpeEl)
  return e.zarpeEstimadoEl === null ? null : `${dia(e.zarpeEstimadoEl)} (estimado)`
}

/** La llegada de la fila: «Llegó el …» con arribo; si no, «ETA …»; nulo sin ninguna. */
export function textoDeLaLlegada(
  e: { etaEl: string | null; arriboEl: string | null },
  dia: (fecha: string) => string,
): string | null {
  if (e.arriboEl !== null) return `Llegó el ${dia(e.arriboEl)}`
  return e.etaEl === null ? null : `ETA ${dia(e.etaEl)}`
}

/** «3 vehículos», «3 vehículos y otros que no puedes ver». */
export function textoDeVehiculos(vehiculos: ConteoAcotado, hayOcultos: boolean): string {
  const texto = textoDeConteo(vehiculos, VEHICULOS)
  return hayOcultos ? `${texto} ${TEXTO_DE_OCULTOS}` : texto
}

export const SIN_CONTENEDORES = 'Este embarque todavía no tiene contenedores.'
export const SIN_VEHICULOS_EN_EL_CONTENEDOR =
  'Este contenedor todavía no lleva vehículos que puedas ver.'
export const NINGUNO_LE_FALTA = 'A ninguno le falta nada para su fase siguiente.'
