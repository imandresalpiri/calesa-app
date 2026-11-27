// La pestaña del área `dinero` de `logistica` en la barra de cada origen (6.11-3): «Gastos», los gastos y los pagos de ese origen. Va si su flujo usa la regla `gastos`
// o `pagos` y la persona ve alguna de las dos listas en el origen. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import { RUTAS } from '@/shared/lib/rutas'
import type { EnlaceDeLogistica } from '../entities/nucleo/enlaces'

export const ENLACE_DE_DINERO: EnlaceDeLogistica | null = {
  clave: 'gastos',
  titulo: 'Gastos',
  ruta: RUTAS.gastosDeLogistica,
  reglas: ['gastos', 'pagos'],
  permisos: ['logistica.gastos.ver', 'logistica.pagos.ver'],
}
