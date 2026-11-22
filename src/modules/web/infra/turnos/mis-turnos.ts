import 'server-only'
import { cache } from 'react'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeMisTurnos } from '../../entities/turnos/turnos'
import { leerMisTurnosCon } from './consulta-de-mis-turnos'

// Mis turnos de la web sin confirmar (8.05-1) para el bloque de Inicio: la primera página, `limit 6` (`consulta-de-mis-turnos.ts`: el filtro por `usuario_id` a
// mano, los índices, el título de cada vehículo). Sin `count` ni `offset`.
export const getMisTurnos: LectorDeMisTurnos = cache(async (pedido) =>
  leerMisTurnosCon(await createClient())(pedido),
)
