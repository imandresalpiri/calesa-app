import 'server-only'
import {
  COLUMNAS_DE_CATALOGO,
  TOPE_DE_CATALOGO,
  elementoDeCatalogoDesde,
} from '@/shared/lib/catalogo'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeGruposDeCampos } from '../../entities/repositorios'

// Los grupos de campos de los leads, también los inactivos (el combo ofrece el que tiene el campo). Tabla de configuración: hasta 100 filas
// (lo impone `lead_campo_grupo_crear`), se ordena sin índice propio y la lectura pide una de más para saber si pasó el tope.
export const getGruposDeCampos: LectorDeGruposDeCampos = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads_campos_grupos')
    .select(COLUMNAS_DE_CATALOGO)
    .order('orden')
    .order('id')
    .limit(TOPE_DE_CATALOGO + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const { filas, hayMas } = cortarAlTope(data.map(elementoDeCatalogoDesde), TOPE_DE_CATALOGO)
  return ok({ lista: filas, hayMas })
}
