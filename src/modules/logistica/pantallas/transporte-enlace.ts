// La pestaña del área `transporte` de `logistica` en la barra de cada origen (6.08-3): «Embarques», los embarques y los contenedores de ese origen. Va si su flujo usa
// la regla `transporte` o `contenedor` y la persona ve la logística del origen. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import { RUTAS } from '@/shared/lib/rutas'
import type { EnlaceDeLogistica } from '../entities/nucleo/enlaces'

export const ENLACE_DE_TRANSPORTE: EnlaceDeLogistica | null = {
  clave: 'embarques',
  titulo: 'Embarques',
  ruta: RUTAS.embarques,
  reglas: ['transporte', 'contenedor'],
  permisos: ['logistica.ver'],
}
