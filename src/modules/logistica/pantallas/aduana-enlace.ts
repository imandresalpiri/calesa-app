// La pestaña del área `aduana` de `logistica` en la barra de cada origen (6.09-1): «Aduana», las declaraciones de ese origen. Va si su flujo usa la regla `aduana` y
// la persona ve la logística del origen o gestiona la aduana (`logistica.aduana.gestionar`, global). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import { RUTAS } from '@/shared/lib/rutas'
import type { EnlaceDeLogistica } from '../entities/nucleo/enlaces'

export const ENLACE_DE_ADUANA: EnlaceDeLogistica | null = {
  clave: 'aduana',
  titulo: 'Aduana',
  ruta: RUTAS.aduana,
  reglas: ['aduana'],
  permisos: ['logistica.ver', 'logistica.aduana.gestionar'],
}
