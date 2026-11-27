import type { HuecoDelGrupo } from '@/modules/logistica'
import { HUECOS_DE_DINERO_EN_EL_GRUPO } from '@/modules/logistica/pantallas/dinero-grupo'
import { HUECOS_DE_DOCUMENTOS_EN_EL_GRUPO } from '@/modules/logistica/pantallas/documentos-grupo'
import { HUECOS_DE_MOVER_EN_EL_GRUPO } from '@/modules/logistica/pantallas/mover-grupo'
import { puede, type Permisos } from '@/shared/lib/permisos'

// Lo que las áreas `mover`, `documentos` y `dinero` llenan en un embarque o un contenedor (6.01). Cada una declara los suyos en `pantallas/<área>-grupo.ts`; acá se unen, en este orden:
// mover, documentos y gastos. Cuáles van en cada entidad y para quién lo dice `huecosPara` de `@/modules/logistica`.
export const HUECOS_DEL_GRUPO: readonly HuecoDelGrupo[] = [
  ...HUECOS_DE_MOVER_EN_EL_GRUPO,
  ...HUECOS_DE_DOCUMENTOS_EN_EL_GRUPO,
  ...HUECOS_DE_DINERO_EN_EL_GRUPO,
]

/**
 * Quien puede editar el transporte de algún origen (o repuestos): es lo que `transporte_grupo_aplicar` pide antes de mirar unidad por unidad. Sirve sólo para dibujar «Editar grupo» y abrir su
 * panel; la base vuelve a exigirlo por cada unidad (D37).
 */
export function puedeEditarTransporte(permisos: Permisos): boolean {
  return puede(permisos, 'logistica.transporte.editar') || puede(permisos, 'repuestos.editar')
}
