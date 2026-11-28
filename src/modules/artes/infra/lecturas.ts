import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { leerDocumento } from '../entities/documento'
import type { PedidoDePlantillas } from '../entities/filtros'
import { CLAVES_DE_FORMATO, type TipoDeArte } from '../entities/formatos'
import { queSeComparte, type QueSeComparte } from '../entities/por-defecto'
import type { PlantillaParaEditar } from '../entities/tipos'
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

const esquemaParaEditar = z.object({
  id: z.guid(),
  nombre: z.string(),
  formato: z.enum(CLAVES_DE_FORMATO),
  ancho: z.number().int(),
  alto: z.number().int(),
  origen_id: z.guid(),
  visibilidad: z.enum(['privada', 'empresa']),
  autor_id: z.guid(),
  documento: z.unknown(),
  actualizado_en: z.string(),
})

// La plantilla de arte que abre el editor, si quien mira la ve (RLS), con su documento leído; nula si no existe o no se ve. Por la PK.
export async function getPlantillaParaEditar(
  id: string,
): Promise<Resultado<PlantillaParaEditar | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artes_plantillas')
    .select(
      'id, nombre, formato, ancho, alto, origen_id, visibilidad, autor_id, documento, actualizado_en',
    )
    .eq('id', id)
    .limit(1)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (data === null) {
    return ok(null)
  }
  const leida = esquemaParaEditar.safeParse(data)
  if (!leida.success) {
    return fallo('inesperado', 'No se pudo leer la plantilla de arte.')
  }
  const fila = leida.data
  return ok({
    id: fila.id,
    nombre: fila.nombre,
    formato: fila.formato,
    ancho: fila.ancho,
    alto: fila.alto,
    origenId: fila.origen_id,
    visibilidad: fila.visibilidad,
    autorId: fila.autor_id,
    actualizadoEn: fila.actualizado_en,
    documento: leerDocumento(fila.documento),
  })
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
