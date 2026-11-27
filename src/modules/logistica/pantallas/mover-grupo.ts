// Los huecos del resumen de un grupo del área `mover` de `logistica` (6.01, llenada en 6.04): «Mover el contenedor», con «Marcar que llegó». Sólo `src/app` importa este archivo
// (`.claude/rules/modulos.md`).
import type { HuecoDelGrupo } from '../entities/nucleo/grupo'
import { HuecoMoverElGrupoDiferido } from '../features/mover/components/diferidos'

export const HUECOS_DE_MOVER_EN_EL_GRUPO: readonly HuecoDelGrupo[] = [
  {
    clave: 'mover',
    titulo: 'Mover el contenedor',
    // Mover lo decide cada cuenta con `flujos.mover` y la base; ver el grupo basta para ver el hueco.
    permisos: ['flujos.mover'],
    regla: 'transporte',
    // Un embarque no se mueve entero: se mueve cada contenedor.
    en: ['contenedor'],
    componente: HuecoMoverElGrupoDiferido,
  },
]
