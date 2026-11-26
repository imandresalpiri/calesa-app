import 'server-only'
import { elementoDeCatalogoDesde, type CatalogoLeido } from '@/shared/lib/catalogo'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_CATEGORIA_DE_FAQ,
  TOPE_DE_CATEGORIAS_DE_FAQ,
} from '../../entities/contenido/categorias-de-faq'

// Las categorías de FAQ, también las inactivas (el combo ofrece la que tiene la pregunta). Tabla de configuración de decenas de filas:
// se ordena sin índice propio (`web_categorias_faqs_pkey` desempata) y pide una de más para saber si pasó el tope.
export async function leerCategoriasDeFaq(): Promise<Resultado<CatalogoLeido>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('web_categorias_faqs')
    .select(COLUMNAS_DE_CATEGORIA_DE_FAQ)
    .order('orden')
    .order('id')
    .limit(TOPE_DE_CATEGORIAS_DE_FAQ + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const { filas, hayMas } = cortarAlTope(
    data.map(elementoDeCatalogoDesde),
    TOPE_DE_CATEGORIAS_DE_FAQ,
  )
  return ok({ lista: filas, hayMas })
}
