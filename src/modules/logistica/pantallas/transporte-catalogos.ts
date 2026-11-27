// Los catálogos de logística del área `transporte` (6.08-1) que se configuran arriba del diagrama, en la pestaña Fases de cada origen: «Puertos» y «Navieras».
// Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import type { CatalogoDeLogistica } from '../entities/nucleo/enlaces'
import {
  NavierasDelOrigenDiferido,
  PuertosDelOrigenDiferido,
} from '../features/transporte/components/diferidos-del-catalogo'

export const CATALOGOS_DE_TRANSPORTE: readonly CatalogoDeLogistica[] = [
  {
    clave: 'puertos',
    titulo: 'Puertos',
    permiso: 'logistica.catalogos.gestionar',
    componente: PuertosDelOrigenDiferido,
  },
  {
    clave: 'navieras',
    titulo: 'Navieras',
    permiso: 'logistica.catalogos.gestionar',
    componente: NavierasDelOrigenDiferido,
  },
]
