import type { AccionDeMenu } from '../lista'
import type { Direccion, FilaDeCatalogo } from './tipos'

const MOTIVO_PRIMERO = 'Ya es el primero de la lista.'
const MOTIVO_ULTIMO = 'Ya es el último de la lista.'

// Las líneas del «⋯» de una fila con «Subir» y «Bajar» (ordenar sin arrastrar, con el teclado): van justo después de la acción principal de la fila (y de
// la nota de su motivo, si la tiene). Apagadas en los extremos, con su motivo: «Ya es el primero» o, si la fila es de sólo lectura, `motivoSinOrden`.
export function accionesConOrden(
  fila: FilaDeCatalogo,
  alMover: (direccion: Direccion) => void,
): AccionDeMenu[] {
  const motivoDeSubir = fila.puedeSubir ? null : (fila.motivoSinOrden ?? MOTIVO_PRIMERO)
  const motivoDeBajar = fila.puedeBajar ? null : (fila.motivoSinOrden ?? MOTIVO_ULTIMO)
  const orden: AccionDeMenu[] = [
    {
      tipo: 'accion',
      clave: 'orden-subir',
      etiqueta: 'Subir',
      deshabilitada: motivoDeSubir !== null,
      alElegir: () => {
        alMover('subir')
      },
    },
    {
      tipo: 'accion',
      clave: 'orden-bajar',
      etiqueta: 'Bajar',
      deshabilitada: motivoDeBajar !== null,
      alElegir: () => {
        alMover('bajar')
      },
    },
    ...(motivoDeSubir === null
      ? []
      : [{ tipo: 'nota', clave: 'orden-motivo-subir', texto: motivoDeSubir } as const]),
    ...(motivoDeBajar === null || motivoDeBajar === motivoDeSubir
      ? []
      : [{ tipo: 'nota', clave: 'orden-motivo-bajar', texto: motivoDeBajar } as const]),
  ]
  const primera = fila.acciones.findIndex((linea) => linea.tipo === 'accion')
  if (primera === -1) {
    return [...orden, ...fila.acciones]
  }
  let corte = primera + 1
  while (fila.acciones[corte]?.tipo === 'nota') {
    corte += 1
  }
  return [...fila.acciones.slice(0, corte), ...orden, ...fila.acciones.slice(corte)]
}
