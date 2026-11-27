// Composición de el área `mover` de `logistica` en el servidor (6.01): la llena el paso 6.04. Sale por la `composicion.ts` de la raíz.
import 'server-only'
export {}
import type { RepositorioDeNotas } from '../../entities/mover/repositorio-de-notas'
import { notasSupabase } from '../../infra/mover/notas'

// Crear y corregir las notas de una unidad (6.04-2). Las actions de `features/mover/` lo usan.
export const repositorioDeNotas: RepositorioDeNotas = notasSupabase

// Las pasadas de la cadena de la unidad, en el servidor (`historial_fases_vehiculo_idx`, tope 50 + 1).
export { leerPasadasDeLaUnidad } from '../../infra/mover/historial'
export { leerResumenDeNotas } from '../../infra/mover/resumen'
