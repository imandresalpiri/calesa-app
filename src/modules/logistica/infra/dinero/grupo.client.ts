// Las unidades de un grupo (embarque, contenedor o declaración), leídas desde el navegador con la sesión de quien mira (6.11-4). Un embarque o un contenedor, por la lectura del núcleo
// (`transporte_unidades()`, sólo lo que quien mira ve, hasta 200: el máximo de un reparto); una declaración, por la clave de `declaraciones_vehiculos` bajo la RLS de `vehiculos` (lo que no
// deja ver no llega ni se delata), con tope 201: uno más que el máximo de un reparto.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { z } from 'zod'
import {
  MAXIMO_DE_UNIDADES_POR_REPARTO,
  type UnidadDelReparto,
} from '../../entities/dinero/reparto'
import type { GrupoDeLogistica } from '../../entities/nucleo/grupo'
import { porTitulo } from '../../entities/nucleo/unidades-del-grupo'
import { leerVehiculosDelGrupo } from '../nucleo/unidades-del-grupo.client'

export const NO_SE_CARGARON_LAS_UNIDADES = 'No se pudieron cargar las unidades del grupo.'

const esquemaDeFilas = z.array(
  z.object({
    vehiculos: z.object({ id: z.guid(), titulo: z.string(), origen_id: z.guid() }).nullable(),
  }),
)

// Con su origen: qué categorías pueden usar todas (`categoriasParaElegir`).
export type UnidadDeGrupoConOrigen = UnidadDelReparto & { origenId: string }
export type UnidadesDelGrupo = { unidades: UnidadDeGrupoConOrigen[]; hayMas: boolean }

async function deLaDeclaracion(id: string): Promise<Resultado<UnidadesDelGrupo>> {
  const { data, error } = await createClient()
    .from('declaraciones_vehiculos')
    .select('vehiculos(id, titulo, origen_id)')
    .eq('declaracion_id', id)
    .is('removido_en', null)
    .limit(MAXIMO_DE_UNIDADES_POR_REPARTO + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = esquemaDeFilas.safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', NO_SE_CARGARON_LAS_UNIDADES)
  }
  const vistas = new Map<string, UnidadDeGrupoConOrigen>()
  for (const { vehiculos: v } of filas.data) {
    if (v) vistas.set(v.id, { id: v.id, titulo: v.titulo, origenId: v.origen_id })
  }
  const unidades = [...vistas.values()].sort(
    (a, b) => a.titulo.localeCompare(b.titulo, 'es') || a.id.localeCompare(b.id),
  )
  return ok({
    unidades: unidades.slice(0, MAXIMO_DE_UNIDADES_POR_REPARTO),
    hayMas: filas.data.length > MAXIMO_DE_UNIDADES_POR_REPARTO,
  })
}

/** Las unidades del grupo por título y luego por id (así «a las primeras» no cambia entre aperturas), sin repetidas; `hayMas` si pasan de 200. */
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
  return ok({
    unidades: porTitulo(leido.data.vehiculos)
      .slice(0, MAXIMO_DE_UNIDADES_POR_REPARTO)
      .map((v) => ({ id: v.vehiculoId, titulo: v.titulo, origenId: v.origenId })),
    hayMas: leido.data.hayMas,
  })
}
