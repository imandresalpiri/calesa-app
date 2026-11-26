// Qué lleva el «⋯» de la tarjeta de una cotización en la lista de un proyecto. Pura: sale de la fila y de lo que la página ya sabe de quien mira y del
// proyecto; el menú no lee nada al abrirse. Las mismas reglas que la hoja: «Aceptar» sólo en borrador, con total, con `repuestos.editar` y con el proyecto
// abierto (`motivoParaNoAceptar`; desde la lista no hay cambios sin guardar); «Anular» en borrador o aceptada con el proyecto abierto; una anulada, sólo «Abrir».
import type { EstadoDeCotizacion } from './cotizacion'
import { motivoParaNoAceptar } from './hoja-editable'

export type ClaveDeAccionDeTarjeta = 'abrir' | 'aceptar' | 'anular'

export type AccionDeTarjeta = {
  clave: ClaveDeAccionDeTarjeta
  etiqueta: string
  // Por qué está apagada (se dice bajo la línea del menú); nula si se puede.
  motivo: string | null
}

export const MOTIVO_SIN_CONEXION = 'Sin conexión. Vuelve a intentarlo cuando la recuperes.'

export const MOTIVO_DEL_PROYECTO_CERRADO =
  'El proyecto está cerrado: reábrelo para cambiar la cotización.'

type Entrada = {
  estado: EstadoDeCotizacion
  // El total guardado (texto exacto) o nulo.
  total: string | null
  puedeEditarItems: boolean
  cerrado: boolean
  // Sin red, «Aceptar» y «Anular» se apagan (la base no se alcanza); `abrir` no. Por defecto hay red.
  enLinea?: boolean
}

/** Las líneas del «⋯» de una cotización, en su orden: «Abrir» primero; «Aceptar» y «Anular» sólo donde caben (apagadas con su motivo si algo falta). */
export function accionesDeLaTarjeta({
  estado,
  total,
  puedeEditarItems,
  cerrado,
  enLinea = true,
}: Entrada): AccionDeTarjeta[] {
  const sinRed = enLinea ? null : MOTIVO_SIN_CONEXION
  const acciones: AccionDeTarjeta[] = [{ clave: 'abrir', etiqueta: 'Abrir', motivo: null }]
  if (estado === 'borrador') {
    acciones.push({
      clave: 'aceptar',
      etiqueta: 'Aceptar',
      motivo: cerrado
        ? MOTIVO_DEL_PROYECTO_CERRADO
        : (motivoParaNoAceptar({ puedeEditarItems, sinGuardar: false, totalGuardado: total }) ??
          sinRed),
    })
  }
  if (estado !== 'anulada') {
    acciones.push({
      clave: 'anular',
      etiqueta: 'Anular',
      motivo: cerrado ? MOTIVO_DEL_PROYECTO_CERRADO : sinRed,
    })
  }
  return acciones
}

/** Por qué una acción de la URL no se puede abrir ahora (la cotización ya no está, cambió de estado o falta algo), o nulo si se puede. */
export function motivoParaElegir(
  clave: 'aceptar' | 'anular',
  entrada: Entrada | null,
): string | null {
  if (entrada === null) return 'Esa cotización ya no está.'
  const accion = accionesDeLaTarjeta(entrada).find((a) => a.clave === clave)
  return accion === undefined ? 'Esa cotización ya no admite esta acción.' : accion.motivo
}
