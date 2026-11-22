// Mis turnos de la web sin confirmar, leídos con el cliente que le pasen: el del servidor (el bloque de Inicio, `mis-turnos.ts`) o el del navegador (el panel de
// «Ver todos», `mis-turnos.client.ts`). La RLS de `solicitudes_contacto_web` deja ver todas las filas a quien tiene `web.cola.gestionar`: por eso cada lectura
// filtra `usuario_id` a mano, con el id verificado de `getClaims()`. Dos lecturas `limit tope + 1` por `solicitudes_contacto_web_usuario_id_idx` (las vigentes
// por `vence_en`, las vencidas de la más reciente), con el cursor `(vence_en, id)` del último visto como condición de la consulta; y, si hay vehículos, una de
// `web.vehiculos` por ids para el título: la vista sólo trae los visibles y un turno de un vehículo que dejó de serlo se dibuja sin título. Sin `count` ni `offset`.
import type { SupabaseClient } from '@supabase/supabase-js'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import {
  ordenarTurnos,
  type CursorDeMisTurnos,
  type LectorDeMisTurnos,
  type Turno,
} from '../../entities/turnos/turnos'
import { filtroDelCursorDeTurnos } from './cursor-de-turnos'

const COLUMNAS = 'id, codigo, fuente, vehiculo_id, vence_en, estado'

type Cliente = SupabaseClient<Database>
type Fila = {
  id: string
  codigo: string
  fuente: Turno['fuente']
  vehiculo_id: string | null
  vence_en: string | null
  estado: string
}

// Un grupo de turnos de la persona (`asignada` o `vencida`), `tope + 1` por su índice, tras el cursor si el cursor es de ese grupo.
async function leerGrupo(
  supabase: Cliente,
  yo: string,
  grupo: Turno['estado'],
  { tope, cursor }: { tope: number; cursor: CursorDeMisTurnos | null },
): Promise<Resultado<Fila[]>> {
  const base = supabase
    .from('solicitudes_contacto_web')
    .select(COLUMNAS)
    .eq('usuario_id', yo)
    .eq('estado', grupo)
  const vigentes = grupo === 'asignada'
  const { data, error } = await (cursor ? base.or(filtroDelCursorDeTurnos(cursor)) : base)
    .order('vence_en', { ascending: vigentes, nullsFirst: false })
    .order('id')
    .limit(tope + 1)
  return error ? { ok: false, error: errorDePostgrest(error) } : ok(data)
}

// Los títulos de los vehículos de esas filas, por ids.
async function titulosDe(supabase: Cliente, filas: readonly Fila[]) {
  const ids = [...new Set(filas.flatMap((fila) => (fila.vehiculo_id ? [fila.vehiculo_id] : [])))]
  const titulos = new Map<string, string>()
  if (ids.length === 0) {
    return ok(titulos)
  }
  const { data, error } = await supabase
    .schema('web')
    .from('vehiculos')
    .select('id, titulo')
    .in('id', ids)
    .limit(ids.length)
  if (error) {
    return { ok: false as const, error: errorDePostgrest(error) }
  }
  for (const vehiculo of data) {
    if (vehiculo.id && vehiculo.titulo) titulos.set(vehiculo.id, vehiculo.titulo)
  }
  return ok(titulos)
}

export function leerMisTurnosCon(supabase: Cliente): LectorDeMisTurnos {
  return async ({ tope, desde = null }) => {
    const { data: sesion } = await supabase.auth.getClaims()
    const yo = sesion?.claims.sub
    if (!yo) {
      return ok({ filas: [], hayMas: false })
    }
    // De las vigentes se sigue por ellas; del grupo de las vencidas, ya no hay vigentes.
    const sigueEnLasVigentes = desde === null || desde.grupo === 'asignada'
    const [vigentes, vencidas] = await Promise.all([
      sigueEnLasVigentes
        ? leerGrupo(supabase, yo, 'asignada', { tope, cursor: desde })
        : Promise.resolve(ok<Fila[]>([])),
      leerGrupo(supabase, yo, 'vencida', { tope, cursor: sigueEnLasVigentes ? null : desde }),
    ])
    if (!vigentes.ok) return vigentes
    if (!vencidas.ok) return vencidas
    const titulos = await titulosDe(supabase, [...vigentes.data, ...vencidas.data])
    if (!titulos.ok) return titulos
    const aTurno = (fila: Fila): Turno => ({
      id: fila.id,
      codigo: fila.codigo,
      fuente: fila.fuente,
      vehiculoId: fila.vehiculo_id,
      titulo: fila.vehiculo_id ? (titulos.data.get(fila.vehiculo_id) ?? null) : null,
      venceEn: fila.vence_en,
      estado: fila.estado === 'vencida' ? 'vencida' : 'asignada',
    })
    return ok(
      cortarAlTope(ordenarTurnos(vigentes.data.map(aTurno), vencidas.data.map(aTurno)), tope),
    )
  }
}
