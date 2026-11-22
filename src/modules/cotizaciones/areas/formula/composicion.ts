// Composición del área `formula` de `cotizaciones` en el servidor: la pestaña «Fórmula» de la página del origen (4.20-2a) y lo que escribe (4.20-2b). Sale por la
// `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeLaFormula } from '../../entities/formula/repositorio'
import { publicacionSupabase } from '../../infra/formula/publicacion'
import { getFormulaDelOrigen } from '../../infra/formula/versiones'
import { leerFormulaDeTrabajoSobre } from '../../infra/queries/formula-de-trabajo'
import { createClient } from '@/shared/lib/supabase/server'

// La publicada, el borrador y la primera página de versiones de un origen, con sus autores.
export const leerFormulaDelOrigen = getFormulaDelOrigen
// Publicar el borrador y revertir a una archivada, por las RPC del 4.20-1, y descartar el borrador (4.20-2c).
export const repositorioDeLaFormula: RepositorioDeLaFormula = publicacionSupabase

// La fórmula de trabajo de un origen (la activa o, si no hay, la más nueva sin archivar), con la sesión; nula si el origen no tiene ninguna.
export async function leerFormulaDeTrabajo(origenId: string) {
  return leerFormulaDeTrabajoSobre(await createClient(), origenId)
}
