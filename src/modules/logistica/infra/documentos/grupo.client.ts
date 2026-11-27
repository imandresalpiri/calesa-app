// Las unidades de un grupo (embarque, contenedor o declaración) para subirles un documento, leídas desde el navegador con la sesión de quien mira (6.06-3). Un embarque o un contenedor, por
// la lectura del núcleo (`transporte_unidades()`, sólo lo que quien mira ve); una declaración, por la clave de `declaraciones_vehiculos` bajo la RLS de `vehiculos` (lo que no deja ver no llega
// ni se delata). El tope es 101: uno más que lo que `documento_registrar` acepta por pedido, para saber si el grupo se pasa.
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { z } from 'zod'
import { MAXIMO_DE_UNIDADES_POR_DOCUMENTO } from '../../entities/documentos/destino'
import type { GrupoDeLogistica } from '../../entities/nucleo/grupo'
import { leerVehiculosDelGrupo } from '../nucleo/unidades-del-grupo.client'

export const NO_SE_CARGARON_LAS_UNIDADES_DEL_GRUPO = 'No se pudieron cargar las unidades del grupo.'

const esquemaDeFilas = z.array(
  z.object({ vehiculos: z.object({ id: z.guid(), origen_id: z.guid() }).nullable() }),
)

export type UnidadDelGrupo = { id: string; origenId: string }
export type UnidadesDelGrupo = { unidades: UnidadDelGrupo[]; hayMas: boolean }

// Sin repetidas, por id, cortadas en 100.
function hasta100(unidades: readonly UnidadDelGrupo[], habiaMas: boolean): UnidadesDelGrupo {
  const vistas = new Map(unidades.map((u) => [u.id, u]))
  const ordenadas = [...vistas.values()].sort((a, b) => a.id.localeCompare(b.id))
  const { filas, hayMas } = cortarAlTope(ordenadas, MAXIMO_DE_UNIDADES_POR_DOCUMENTO)
  return { unidades: filas, hayMas: hayMas || habiaMas }
}

async function deLaDeclaracion(id: string): Promise<Resultado<UnidadesDelGrupo>> {
  const tope = MAXIMO_DE_UNIDADES_POR_DOCUMENTO + 1
  const { data, error } = await createClient()
    .from('declaraciones_vehiculos')
    .select('vehiculos(id, origen_id)')
    .eq('declaracion_id', id)
    .is('removido_en', null)
    .limit(tope)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = esquemaDeFilas.safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', NO_SE_CARGARON_LAS_UNIDADES_DEL_GRUPO)
  }
  const unidades = filas.data.flatMap((f) =>
    f.vehiculos ? [{ id: f.vehiculos.id, origenId: f.vehiculos.origen_id }] : [],
  )
  return ok(hasta100(unidades, filas.data.length > MAXIMO_DE_UNIDADES_POR_DOCUMENTO))
}

/** Las unidades del grupo sin repetidas, por id; `hayMas` si pasan de 100. */
export async function leerUnidadesDelGrupo(
  grupo: GrupoDeLogistica,
): Promise<Resultado<UnidadesDelGrupo>> {
  if (grupo.tipo === 'declaracion') {
    return deLaDeclaracion(grupo.id)
  }
  const leido = await leerVehiculosDelGrupo({ tipo: grupo.tipo, id: grupo.id })
  if (!leido.ok) {
    return leido
  }
  const unidades = leido.data.vehiculos.map((v) => ({ id: v.vehiculoId, origenId: v.origenId }))
  return ok(hasta100(unidades, leido.data.hayMas))
}
