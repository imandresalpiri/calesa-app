// Los catálogos de logística de Logística › Configuración (6.01). Cada área llena los suyos en su archivo de `pantallas/` (`CATALOGOS_DE_TRANSPORTE`, 6.08; `CATALOGOS_DE_DINERO`, 6.11)
// y se juntan aquí, así este archivo no se vuelve a editar. Un catálogo no existe hasta que su paso lo llena: nunca una sub-ruta muerta. Una clave repetida deja el primero.
import { CATALOGOS_DE_DINERO } from '@/modules/logistica/pantallas/dinero-catalogos'
import { CATALOGOS_DE_TRANSPORTE } from '@/modules/logistica/pantallas/transporte-catalogos'
import type { CatalogoDeLogistica } from '@/modules/logistica'

export const CATALOGOS_DE_LOGISTICA: readonly CatalogoDeLogistica[] = [
  ...new Map(
    [...CATALOGOS_DE_TRANSPORTE, ...CATALOGOS_DE_DINERO].map((catalogo) => [
      catalogo.clave,
      catalogo,
    ]),
  ).values(),
]
