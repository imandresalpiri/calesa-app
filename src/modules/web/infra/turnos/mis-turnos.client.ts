// «Ver más» del panel de turnos de Inicio, leído en el navegador con la sesión de quien mira (`consulta-de-mis-turnos.ts`): de a `TAMANO_DE_VER_MAS`, por el cursor
// del último turno visto. La RLS decide qué filas hay y la consulta filtra las mías a mano.
import { createClient } from '@/shared/lib/supabase/browser'
import type { LectorDeMisTurnos } from '../../entities/turnos/turnos'
import { leerMisTurnosCon } from './consulta-de-mis-turnos'

export const leerMisTurnosEnElNavegador: LectorDeMisTurnos = (pedido) =>
  leerMisTurnosCon(createClient())(pedido)
