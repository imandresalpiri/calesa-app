// La lista del selector de la barra de la fórmula de un origen: las no archivadas (a lo sumo 50, el tope de la base; se pide una más para decirlo si alguna vez pasa) y si
// hay alguna archivada (la sección «Archivadas» las lee al abrirse, desde el navegador).
import 'server-only'
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TOPE_DE_FORMULAS_DEL_ORIGEN } from '../../entities/formula-del-origen'
import type { FormulaDeLaLista } from '../../entities/formulas-del-origen/lista'
import { COLUMNAS_DE_LA_FILA, conSusPiezas, type Cliente } from './piezas'

export type ListaDeFormulasDelOrigen = {
  formulas: FormulaDeLaLista[]
  hayMas: boolean
  hayArchivadas: boolean
}

export async function leerFormulasDelOrigenSobre(
  cliente: Cliente,
  origenId: string,
): Promise<Resultado<ListaDeFormulasDelOrigen>> {
  if (!z.guid().safeParse(origenId).success) return fallo('validacion', 'Ese origen no es válido.')
  // Las dos por `formulas_del_origen_origen_idx (origen_id, archivada_en, creado_en desc, id desc)`.
  const [vivas, archivadas] = await Promise.all([
    cliente
      .from('formulas_del_origen')
      .select(COLUMNAS_DE_LA_FILA)
      .eq('origen_id', origenId)
      .is('archivada_en', null)
      .order('creado_en', { ascending: false })
      .order('id', { ascending: false })
      .limit(TOPE_DE_FORMULAS_DEL_ORIGEN + 1),
    cliente
      .from('formulas_del_origen')
      .select('id')
      .eq('origen_id', origenId)
      .not('archivada_en', 'is', null)
      .limit(1),
  ])
  const error = vivas.error ?? archivadas.error
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const { filas, hayMas } = cortarAlTope(vivas.data ?? [], TOPE_DE_FORMULAS_DEL_ORIGEN)
  const formulas = await conSusPiezas(cliente, filas)
  if (!formulas.ok) return formulas
  return ok({ formulas: formulas.data, hayMas, hayArchivadas: (archivadas.data ?? []).length > 0 })
}
