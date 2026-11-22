import type { ParteDelOrigen } from '@/shared/lib/rutas'

// Pasados cuántos orígenes el selector de las migas ofrece buscar.
export const CON_BUSQUEDA_DESDE = 10

type Origen = { id: string; nombre: string; abiertas: readonly ParteDelOrigen[] }

const sinTildes = (texto: string) =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

// Los orígenes cuyo nombre contiene lo buscado, sin mirar tildes ni mayúsculas; sin búsqueda, todos.
export function filtrarOrigenes<T extends Origen>(
  origenes: readonly T[],
  busqueda: string,
): readonly T[] {
  const buscado = sinTildes(busqueda)
  return buscado === ''
    ? origenes
    : origenes.filter((origen) => sinTildes(origen.nombre).includes(buscado))
}

// A dónde va el selector de las migas al elegir un origen: la misma pestaña si la persona la abre ahí; si no, la primera que abre; sin ninguna, la entrada
// del origen (que dice por qué no se abre). Sin `?formula=`: la de otro origen no sirve.
export function destinoAlCambiarDeOrigen(
  origen: Origen,
  pestanaActual: string | null,
  rutaDeParte: (origenId: string, parte: ParteDelOrigen) => string,
  rutaDeEntrada: (origenId: string) => string,
): string {
  const misma = origen.abiertas.find((parte) => parte === pestanaActual)
  const parte = misma ?? origen.abiertas[0]
  return parte === undefined ? rutaDeEntrada(origen.id) : rutaDeParte(origen.id, parte)
}
