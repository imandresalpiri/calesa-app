import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { FormulaDelOrigen } from '../../entities/formula-del-origen'
import {
  autoresDe,
  conAutores,
  nombreDelAutor,
  type LecturaDeLaFormula,
} from '../../entities/formula/versiones'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { Database } from '@/shared/types/database.types'
import { leerAutores, leerEstado, leerPaginaSinAutores } from './consulta-de-versiones'

type Cliente = SupabaseClient<Database>

// La planilla de una fórmula del origen, en el servidor (la que abre la pestaña `…/planilla?formula=<fórmula>`): lo suyo con la sesión de quien mira.
export async function getFormulaDelOrigen(
  formula: FormulaDelOrigen,
): Promise<Resultado<LecturaDeLaFormula>> {
  if (!z.guid().safeParse(formula.id).success) {
    return fallo('validacion', 'Esa fórmula no es válida.')
  }
  return leerLaFormulaDelOrigen(await createClient(), formula)
}

// La publicada, el borrador y la primera página de versiones de una fórmula del origen (en paralelo), y los nombres de todos los que nombran en una sola
// lectura de `perfiles`.
async function leerLaFormulaDelOrigen(
  supabase: Cliente,
  formulaDelOrigen: FormulaDelOrigen,
): Promise<Resultado<LecturaDeLaFormula>> {
  const [estado, pagina] = await Promise.all([
    leerEstado(supabase, formulaDelOrigen.id),
    leerPaginaSinAutores(supabase, formulaDelOrigen.id, null),
  ])
  if (!estado.ok) {
    return estado
  }
  if (!pagina.ok) {
    return pagina
  }
  const { publicada, borrador } = estado.data
  const autores = await leerAutores(
    supabase,
    autoresDe([
      publicada?.publicadoPor ?? null,
      borrador?.creadoPor ?? null,
      ...pagina.data.filas.map((fila) => fila.publicadoPor),
    ]),
  )
  if (!autores.ok) {
    return autores
  }
  return ok({
    formulaDelOrigen,
    publicada: publicada && {
      ...publicada,
      autor: nombreDelAutor(autores.data, publicada.publicadoPor),
    },
    borrador: borrador && { ...borrador, autor: nombreDelAutor(autores.data, borrador.creadoPor) },
    versiones: conAutores(pagina.data, autores.data),
  })
}
