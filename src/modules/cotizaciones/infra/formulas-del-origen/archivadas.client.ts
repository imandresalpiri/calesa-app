// Las archivadas de un origen (la sección «Archivadas» de la barra de la fórmula, al abrirse), desde el navegador con la sesión de quien mira: de a
// `TAMANO_DE_VER_MAS`, las más recién archivadas primero, por el cursor `(archivada_en desc, id desc)`. Son decenas: no se miden con volumen.
import { z } from 'zod'
import { citar } from '@/shared/lib/supabase/consultas'
import { errorDePostgrest, fallo, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import type { FormulaDeLaLista } from '../../entities/formulas-del-origen/lista'
import { COLUMNAS_DE_LA_FILA, conSusPiezas } from './piezas'

export type CursorDeArchivadas = { archivadaEn: string; id: string }

export type PaginaDeArchivadas = {
  formulas: FormulaDeLaLista[]
  siguiente: CursorDeArchivadas | null
}

const esquemaDelPedido = z.object({
  origenId: z.guid(),
  cursor: z.object({ archivadaEn: z.string().min(1), id: z.guid() }).nullable(),
})

export async function leerArchivadas(
  origenId: string,
  cursor: CursorDeArchivadas | null,
): Promise<Resultado<PaginaDeArchivadas>> {
  const pedido = esquemaDelPedido.safeParse({ origenId, cursor })
  if (!pedido.success) return fallo('validacion', 'Ese pedido de archivadas no es válido.')
  const cliente = createClient()
  // Por `formulas_del_origen_origen_idx (origen_id, archivada_en, …)`.
  let consulta = cliente
    .from('formulas_del_origen')
    .select(COLUMNAS_DE_LA_FILA)
    .eq('origen_id', pedido.data.origenId)
    .not('archivada_en', 'is', null)
  const desde = pedido.data.cursor
  if (desde) {
    const hora = citar(desde.archivadaEn)
    consulta = consulta.or(`archivada_en.lt.${hora},and(archivada_en.eq.${hora},id.lt.${desde.id})`)
  }
  const { data, error } = await consulta
    .order('archivada_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(TAMANO_DE_VER_MAS + 1)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const leidas = await conSusPiezas(cliente, data.slice(0, TAMANO_DE_VER_MAS))
  if (!leidas.ok) return leidas
  const ultima = leidas.data.at(-1)
  const siguiente =
    data.length > TAMANO_DE_VER_MAS && ultima?.archivadaEn
      ? { archivadaEn: ultima.archivadaEn, id: ultima.id }
      : null
  return { ok: true, data: { formulas: leidas.data, siguiente } }
}
