import type { Permisos } from '@/shared/lib/permisos'
import { TOPE_DE_ORIGENES_DEL_MENU } from '@/shared/lib/paginacion'
import { rutaDeUnCatalogo, type PanelDeCatalogo } from '@/shared/lib/rutas'
import type { DestinoFueraDelNavegador } from '../destinos-de-busqueda'
import { puedeAbrirLaPestana } from '../origenes/acceso'

// Cada catálogo de logística con su título y lo que la persona escribiría para encontrarlo.
const CATALOGOS: readonly {
  clave: PanelDeCatalogo
  titulo: string
  palabras: readonly string[]
}[] = [
  {
    clave: 'puertos',
    titulo: 'Puertos',
    palabras: ['puerto', 'embarque', 'llegada', 'país', 'código', 'logística', 'catálogos'],
  },
  {
    clave: 'navieras',
    titulo: 'Navieras',
    palabras: ['naviera', 'barco', 'embarque', 'logística', 'catálogos'],
  },
  {
    clave: 'categorias-de-gasto',
    titulo: 'Categorías de gasto',
    palabras: ['gastos', 'gasto', 'categoría', 'propósito', 'tributos', 'logística', 'catálogos'],
  },
  {
    clave: 'tipos-de-documento',
    titulo: 'Tipos de documento',
    palabras: ['documentos', 'requisitos', 'archivos', 'logística', 'catálogos'],
  },
]

// Los catálogos de logística que el buscador de Configuración encuentra: los cuatro de cada origen cuya pestaña Fases la persona abre (`flujos.configurar`
// o los catálogos de logística ahí), con su camino «Orígenes › <origen> › Fases › Puertos», en el orden del catálogo y con el tope del menú. Cada uno abre
// su drawer en esa pestaña (`?panel=puertos`). Sin permiso para cambiarlo, el drawer lo muestra en lectura.
export function destinosDeLosCatalogos(
  origenes: readonly { id: string; nombre: string }[],
  permisos: Permisos,
): DestinoFueraDelNavegador[] {
  return origenes
    .filter((origen) => puedeAbrirLaPestana(permisos, origen.id, 'fases'))
    .slice(0, TOPE_DE_ORIGENES_DEL_MENU)
    .flatMap((origen) =>
      CATALOGOS.map((catalogo) => ({
        clave: `${origen.id}-${catalogo.clave}`,
        lugar: `Orígenes › ${origen.nombre} › Fases`,
        titulo: catalogo.titulo,
        ruta: rutaDeUnCatalogo(origen.id, catalogo.clave),
        palabras: catalogo.palabras,
      })),
    )
}
