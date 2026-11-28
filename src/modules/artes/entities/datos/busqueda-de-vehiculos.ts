// Qué busca el campo del vehículo de ejemplo (docs/GLOSARIO.md › «Vehículo de ejemplo»): el título, el VIN o el lote, con 3 letras o números
// seguidos (`MINIMO_DE_BUSQUEDA` de `.claude/rules/escala.md`: con menos, el trigrama no tiene qué buscar y la base recorrería el origen). Lo
// repite la ruta `GET /artes/ejemplo/vehiculos`, que ignora un texto más corto. Puro.
import { cumpleElMinimo, LARGO_MAXIMO_DE_TEXTO, type MinimoDeBusqueda } from '@/shared/lib/filtros'

export const MINIMO_DE_BUSQUEDA_DEL_EJEMPLO: MinimoDeBusqueda = {
  letras: 3,
  numerosLibres: false,
  aviso: 'Escribe al menos 3 letras o números.',
}

// Lo que se busca: `null` = sin texto (la lista, lo más nuevo primero); `corto` = escrito pero sin alcanzar el mínimo (no se pide nada).
export type BusquedaDelEjemplo =
  { tipo: 'todos' } | { tipo: 'corta' } | { tipo: 'texto'; texto: string }

export function busquedaDelEjemplo(escrito: string): BusquedaDelEjemplo {
  const limpio = escrito.trim().slice(0, LARGO_MAXIMO_DE_TEXTO)
  if (limpio === '') {
    return { tipo: 'todos' }
  }
  return cumpleElMinimo(limpio, MINIMO_DE_BUSQUEDA_DEL_EJEMPLO)
    ? { tipo: 'texto', texto: limpio }
    : { tipo: 'corta' }
}
