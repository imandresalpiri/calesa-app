import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type ErrorPostgrest } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { createClient } from '@/shared/lib/supabase/server'

// El texto base de cada origen (docs/GLOSARIO.md › «Texto base del origen»): se lee con la sesión de quien mira (lo ve quien ve cotizaciones del
// origen) y se escribe sólo por `artes_texto_base_guardar`, que repite el permiso (`cotizaciones.configurar` del origen), normaliza, valida las
// variables con el catálogo del origen y exige la versión (`PT409` con quién y cuándo lo cambió). Un error vuelve como valor: 22023 con el
// campo en el `hint` (`texto`, `variables`, `origen`) va junto al campo.

export type TextoBaseLeido = { texto: string; actualizadoEn: string }

const esquemaDeLaFila = z.object({ texto: z.string(), actualizado_en: z.string() })

// El de un origen; nulo si no hay fila (nace con el origen: no debería faltar), no se ve o no se pudo leer. Por la PK (`origen_id`).
export async function getTextoBase(origenId: string): Promise<TextoBaseLeido | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artes_textos_base')
    .select('texto, actualizado_en')
    .eq('origen_id', origenId)
    .limit(1)
    .maybeSingle()
  if (error || data === null) {
    return null
  }
  const leida = esquemaDeLaFila.safeParse(data)
  return leida.success
    ? { texto: leida.data.texto, actualizadoEn: leida.data.actualizado_en }
    : null
}

// Los `hint` de la RPC que nombran un campo: el motivo va junto a él.
const CAMPOS_DEL_HINT = new Set(['texto', 'variables', 'origen'])

type ErrorDeLaRpc = ErrorPostgrest & { hint?: string | null }

export function falloDelTextoBase(error: ErrorDeLaRpc): ResultadoDeAccion<never> {
  const base = errorDePostgrest(error)
  const campo =
    error.code === '22023' && error.hint && CAMPOS_DEL_HINT.has(error.hint) ? error.hint : null
  return { ok: false, error: base, ...(campo ? { porCampo: { [campo]: base.mensaje } } : {}) }
}

export type TextoBaseGuardado = { actualizadoEn: string }

// Guarda el texto (ya normalizado y validado por quien llama) sobre la versión que se editó; nula = la fila no se pudo leer (si existe, `PT409`).
// Devuelve la versión nueva (o la de ahora si el texto no cambió).
export async function guardarTextoBase(pedido: {
  origenId: string
  texto: string
  actualizadoEnEsperado: string | null
}): Promise<ResultadoDeAccion<TextoBaseGuardado>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('artes_texto_base_guardar', {
    p_origen_id: pedido.origenId,
    p_texto: pedido.texto,
    // Los tipos generados no conocen el nulo: la RPC lo acepta (la fila que no se pudo leer).
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado as string,
  })
  if (error) {
    return falloDelTextoBase(error)
  }
  const version = z.string().min(1).safeParse(data)
  return version.success
    ? ok({ actualizadoEn: version.data })
    : fallo('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
}
