// Los catálogos de logística del área `dinero` (6.11-4) que se configuran arriba del diagrama, en la pestaña Fases de cada origen: «Categorías de gasto».
// Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import type { CatalogoDeLogistica } from '../entities/nucleo/enlaces'
import { CategoriasDelOrigenDiferido } from '../features/dinero/components/diferidos-del-catalogo'

export const CATALOGOS_DE_DINERO: readonly CatalogoDeLogistica[] = [
  {
    clave: 'categorias-de-gasto',
    titulo: 'Categorías de gasto',
    permiso: 'logistica.catalogos.gestionar',
    componente: CategoriasDelOrigenDiferido,
  },
]
