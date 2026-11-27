import type { EntidadesDeLaUnidad } from './lectura-de-la-unidad'

// «Dónde viaja» del hueco «Transporte» (`docs/GLOSARIO.md` › «Dónde viaja»): el contenedor o el embarque en que va el vehículo, con lo que eso decide en el formulario. Con embarque,
// la naviera, los puertos y las fechas son del embarque (la base no deja que el vehículo tenga propios: `transportes_embarque_sin_propios`) y se muestran, no se editan aquí; sin
// embarque, son del vehículo. Elegir otro destino cuando ya va en uno lo saca de donde está: se confirma antes. Sin I/O.

export type TipoDeDestino = 'contenedor' | 'embarque'

export const TEXTO_SIN_DESTINO = 'Todavía no va en ningún contenedor.'
export const TEXTO_SIN_DESTINO_NI_EMBARQUE = 'Todavía no va en ningún embarque.'

/** La ruta y las fechas son del vehículo (se editan en el hueco) sólo si no va en un embarque, directo o por su contenedor. */
export function rutaYFechasPropias(entidades: EntidadesDeLaUnidad): boolean {
  return entidades.embarque === null
}

/** «Todavía no va en ningún contenedor.» si el flujo usa contenedores; si no, el del embarque. */
export function textoSinDestino(usaContenedores: boolean): string {
  return usaContenedores ? TEXTO_SIN_DESTINO : TEXTO_SIN_DESTINO_NI_EMBARQUE
}

/** Lo que se puede elegir: contenedores sólo si el flujo del origen usa la regla `contenedor`; embarques siempre (el hueco existe con la regla `transporte`). */
export function destinosParaElegir(usaContenedores: boolean): readonly TipoDeDestino[] {
  return usaContenedores ? ['contenedor', 'embarque'] : ['embarque']
}

/** Ya va ahí: elegirlo no cambia nada. En un embarque también va el que viaja en uno de sus contenedores. */
export function yaVaEn(
  entidades: EntidadesDeLaUnidad,
  destino: { tipo: TipoDeDestino; id: string },
): boolean {
  return destino.tipo === 'contenedor'
    ? entidades.contenedorDeLaUnidad?.id === destino.id
    : entidades.embarque?.id === destino.id
}

/**
 * Lo que dice la confirmación antes de moverlo («Hoy va en el contenedor MSCU1.»); nulo si no va en ninguno o si ya va en el elegido (no se pregunta). Conservador: pregunta
 * siempre que el vehículo ya va en algo, aunque la base lo dejaría pasar sin `mover` (un contenedor del mismo embarque).
 */
export function avisoDeMover(
  entidades: EntidadesDeLaUnidad,
  destino: { tipo: TipoDeDestino; id: string },
): string | null {
  if (yaVaEn(entidades, destino)) return null
  const { contenedorDeLaUnidad: contenedor, embarque } = entidades
  if (contenedor) return `Hoy va en el contenedor ${contenedor.numero}. Se mueve al elegido.`
  if (embarque) return `Hoy va en el embarque ${embarque.booking}. Se mueve al elegido.`
  return null
}
