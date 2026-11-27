import { huecosPara, type EntidadDelHueco, type HuecoDelGrupo } from '@/modules/logistica'
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

// «Mover el contenedor» no abre un drawer: es un enlace al lote de la Cadena (`loteDelContenedor`), que la ficha dibuja aparte con `flujos.mover` del origen.
const CLAVE_DE_MOVER = 'mover'

/** Los huecos que van en el «⋯» de un embarque o de un contenedor (cada uno abre su drawer, `?panel=grupo-<clave>`): sin «Mover el contenedor». */
export function huecosDelMenu(tipo: EntidadDelHueco, permisos: Permisos): HuecoDelGrupo[] {
  return huecosPara(tipo, HUECOS_DEL_GRUPO, permisos).filter((h) => h.clave !== CLAVE_DE_MOVER)
}

/** Lo que el «⋯» necesita de cada hueco (los componentes no viajan como props a un Client Component). */
export function paraElMenu(huecos: readonly HuecoDelGrupo[]): { clave: string; titulo: string }[] {
  return huecos.map(({ clave, titulo }) => ({ clave, titulo }))
}

/** «Mover el contenedor» (el enlace al lote): quien mueve en el origen del contenedor, con `flujos.mover` o `flujos.mover.cualquiera`. La base vuelve a decidir por cada vehículo. */
export function puedeMoverEn(permisos: Permisos, origenId: string): boolean {
  return (
    puede(permisos, 'flujos.mover', origenId) ||
    puede(permisos, 'flujos.mover.cualquiera', origenId)
  )
}
