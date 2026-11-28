import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { PedidoDePlantillas } from '../entities/filtros'
import { CLAVES_DE_FORMATO, type TipoDeArte } from '../entities/formatos'
import { queSeComparte, type QueSeComparte } from '../entities/por-defecto'
import { leerImagenes, leerPlantillas, leerPorDefecto } from './consultas'

// Lo que lee el servidor con la sesión de quien mira: cada página de las pestañas de `/artes` (la primera, con la página; las que siguen, por
// la action de «Ver más»: así supabase-js no viaja al navegador con la rejilla), sus plantillas por defecto, el nombre de una plantilla de arte
// para `/artes/[id]` y qué se comparte de una cotización.

export async function getPaginaDePlantillas(
  pedido: PedidoDePlantillas,
  yo: string,
  cursor: string | null = null,
) {
  return leerPlantillas(await createClient(), { pedido, yo, cursor })
}

export async function getPaginaDeImagenes(cursor: string | null = null) {
  return leerImagenes(await createClient(), { cursor })
}

export async function getMisPorDefecto() {
  return leerPorDefecto(await createClient())
}

const esquemaDelNombre = z.object({ id: z.guid(), nombre: z.string() })

// El nombre de una plantilla de arte que quien mira ve (RLS), o nulo si no existe o no se ve.
export async function getNombreDeLaPlantilla(
  id: string,
): Promise<Resultado<{ id: string; nombre: string } | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artes_plantillas')
    .select('id, nombre')
    .eq('id', id)
    .limit(1)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (data === null) {
    return ok(null)
  }
  const leida = esquemaDelNombre.safeParse(data)
  return leida.success
    ? ok(leida.data)
    : fallo('inesperado', 'No se pudo leer la plantilla de arte.')
}

const esquemaParaCompartir = z.object({
  origen_id: z.guid(),
  tipo: z.enum(['imagen', 'pdf']),
  plantilla_id: z.guid(),
  actualizado_en: z.string(),
  // Embebida por la FK: nula si la RLS ya no la deja ver.
  plantilla: z
    .object({ id: z.guid(), formato: z.enum(CLAVES_DE_FORMATO), origen_id: z.guid() })
    .nullable(),
})

// Qué se comparte de una cotización de `origenId` como `tipo` (la plantilla por defecto de quien mira, si todavía la ve; si no, lo de hoy). Por
// la PK de `artes_por_defecto` (la RLS acota a la fila propia).
export async function leerArteParaCompartir(
  origenId: string,
  tipo: TipoDeArte,
): Promise<Resultado<QueSeComparte>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artes_por_defecto')
    .select(
      'origen_id, tipo, plantilla_id, actualizado_en, plantilla:artes_plantillas!artes_por_defecto_plantilla_id_fkey(id, formato, origen_id)',
    )
    .eq('origen_id', origenId)
    .eq('tipo', tipo)
    .limit(1)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leida = data === null ? null : esquemaParaCompartir.safeParse(data)
  if (leida !== null && !leida.success) {
    return fallo('inesperado', 'No se pudo leer la plantilla por defecto.')
  }
  const fila = leida?.data ?? null
  return ok(
    queSeComparte({
      porDefecto:
        fila === null
          ? null
          : {
              origenId: fila.origen_id,
              tipo: fila.tipo,
              plantillaId: fila.plantilla_id,
              actualizadoEn: fila.actualizado_en,
            },
      plantillaVisible:
        fila?.plantilla === null || fila?.plantilla === undefined
          ? null
          : {
              id: fila.plantilla.id,
              formato: fila.plantilla.formato,
              origenId: fila.plantilla.origen_id,
            },
      origenId,
      tipo,
    }),
  )
}
