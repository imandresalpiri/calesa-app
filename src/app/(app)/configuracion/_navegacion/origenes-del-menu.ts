import type { Permisos } from '@/shared/lib/permisos'
import { TOPE_DE_ORIGENES_DEL_MENU } from '@/shared/lib/paginacion'
import { RUTAS, rutaDelOrigen } from '@/shared/lib/rutas'
import { puedeAbrirElOrigen } from '../origenes/acceso'
import type { GrupoDelNavegador, SubseccionDelNavegador } from '../secciones'

// Los sub-ítems de Orígenes en el menú: uno por origen que la persona abre (alguno de los permisos de la sección en ese origen), en el orden
// del catálogo y con tope; con más, «Ver todos los orígenes» lleva a la lista. Cada uno abre la pestaña Datos (la primera, que abre todo el
// que abre el origen) y se marca en todas sus pestañas (`marca`). El registro (`secciones.ts`) no lee la base: los suma quien arma el menú.
export const VER_TODOS_LOS_ORIGENES = 'Ver todos los orígenes'

export function subseccionesDeOrigenes(
  origenes: readonly { id: string; nombre: string }[],
  permisos: Permisos,
): SubseccionDelNavegador[] {
  const abiertos = origenes.filter((origen) => puedeAbrirElOrigen(permisos, origen.id))
  const subs: SubseccionDelNavegador[] = abiertos
    .slice(0, TOPE_DE_ORIGENES_DEL_MENU)
    .map((origen) => ({
      clave: origen.id,
      titulo: origen.nombre,
      ruta: rutaDelOrigen(origen.id),
      marca: `${RUTAS.origenes}/${encodeURIComponent(origen.id)}`,
    }))
  if (abiertos.length > TOPE_DE_ORIGENES_DEL_MENU) {
    subs.push({ clave: 'todos', titulo: VER_TODOS_LOS_ORIGENES, ruta: RUTAS.origenes })
  }
  return subs
}

// Los grupos del menú con los orígenes dentro de su sección (si la persona la ve).
export function conOrigenesEnElMenu(
  grupos: readonly GrupoDelNavegador[],
  subsecciones: readonly SubseccionDelNavegador[],
): GrupoDelNavegador[] {
  return grupos.map((grupo) => ({
    ...grupo,
    secciones: grupo.secciones.map((seccion) =>
      seccion.clave === 'origenes' ? { ...seccion, subsecciones: [...subsecciones] } : seccion,
    ),
  }))
}
