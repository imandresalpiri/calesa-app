import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import { nombreDelProposito, type CategoriaDeGasto } from '../../../entities/dinero/categoria'
import {
  accionesDelCatalogo,
  insigniasDelCatalogo,
  type ContextoDeLasFilas,
  type QuehaceresDelCatalogo,
} from '../../nucleo/components/acciones-del-catalogo'

// Las categorías como filas de la lista de catálogo, ya en su orden (`orden`, luego `nombre`). El orden se cambia en «Editar» (un número), no con botones:
// intercambiar dos serían dos escrituras sin transacción. El «⋯» es el de todo catálogo de logística: Editar · Activar o Desactivar (no se eliminan).
export function filasDeCategorias(
  categorias: readonly CategoriaDeGasto[],
  quehaceres: QuehaceresDelCatalogo<CategoriaDeGasto>,
  contexto: ContextoDeLasFilas,
): FilaDeCatalogo[] {
  return categorias.map((categoria) => ({
    id: categoria.id,
    nombre: categoria.nombre,
    icono: null,
    activo: categoria.activo,
    insignias: insigniasDelCatalogo(categoria, contexto),
    uso: nombreDelProposito(categoria.proposito),
    acciones: accionesDelCatalogo(categoria, quehaceres, contexto.sinPermiso),
    puedeSubir: false,
    puedeBajar: false,
  }))
}
