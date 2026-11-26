// Buscar un campo por su nombre en el editor: sin tildes ni mayúsculas, sobre lo que ya llegó (el layout entero viaja con la página).
import { sinTildes } from '../catalogo/nombre'

// Si la etiqueta contiene lo buscado; una consulta vacía (o de espacios) coincide con todo.
export function coincide(etiqueta: string, consulta: string): boolean {
  const buscada = sinTildes(consulta.trim())
  return buscada === '' || sinTildes(etiqueta).includes(buscada)
}

export function camposQueCoinciden<Campo extends { etiqueta: string }>(
  campos: readonly Campo[],
  consulta: string,
): Campo[] {
  return campos.filter((campo) => coincide(campo.etiqueta, consulta))
}
