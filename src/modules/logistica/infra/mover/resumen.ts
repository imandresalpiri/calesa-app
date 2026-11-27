import 'server-only'
import { z } from 'zod'
import { createClient } from '@/shared/lib/supabase/server'
import { resumenDeNotas } from '../../entities/mover/resumen-de-notas'
import { resumenQueNoSeLeyo, type ResumenDeTarjeta } from '../../entities/nucleo/tarjeta'

const esquemaDeLaUltima = z
  .array(
    z.object({
      cuerpo: z.string(),
      creado_en: z.string(),
      autor: z.object({ nombre: z.string().nullable() }).nullable(),
    }),
  )
  .max(1)

// El resumen de la tarjeta «Notas»: la última nota viva de la unidad con su autor embebido, con la sesión de quien mira (la policy `notas: leer`). Por
// `notas_vehiculo_vivas_idx (vehiculo_id, creado_en desc, id desc)`, `limit 1`: una fila.
export async function leerResumenDeNotas(
  vehiculoId: string,
  { puedeEscribir }: { puedeEscribir: boolean },
): Promise<ResumenDeTarjeta> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notas')
    .select('cuerpo, creado_en, autor:perfiles!notas_autor_id_fkey(nombre)')
    .eq('vehiculo_id', vehiculoId)
    .is('eliminado_en', null)
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
  const leida = error ? null : esquemaDeLaUltima.safeParse(data)
  if (!leida?.success) return resumenQueNoSeLeyo('notas')
  const [ultima] = leida.data
  return resumenDeNotas({
    nota: ultima
      ? { cuerpo: ultima.cuerpo, autor: ultima.autor?.nombre ?? null, creadoEn: ultima.creado_en }
      : null,
    puedeEscribir,
  })
}
