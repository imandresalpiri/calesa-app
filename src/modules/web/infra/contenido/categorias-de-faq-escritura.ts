import 'server-only'
import { elementoDeCatalogoDesde } from '@/shared/lib/catalogo'
import { fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  ordenDeCategoriaNueva,
  TOPE_DE_CATEGORIAS_DE_FAQ,
  COLUMNAS_DE_CATEGORIA_DE_FAQ,
} from '../../entities/contenido/categorias-de-faq'
import { rechazoDeEscritura } from '../../entities/contenido/errores'
import type { EscritorDeCategoriasDeFaq } from '../../entities/contenido/repositorios'

const TOPE_ALCANZADO = `Ya hay ${String(TOPE_DE_CATEGORIAS_DE_FAQ)} categorías, el máximo: quita una que no uses.`

// Las categorías de FAQ se escriben directo bajo la RLS (`web.contenido.gestionar`): no otorgan permisos. La base limpia el nombre y
// rechaza el que ya existe con otra escritura («Ya existe «X».», 23505) o el largo (23514): su mensaje es el que se muestra.
export const escritorDeCategoriasDeFaq: EscritorDeCategoriasDeFaq = {
  async crear(nombre) {
    const supabase = await createClient()
    // `web_categorias_faqs_pkey`: decenas de filas, el orden de la nueva sale de las últimas.
    const leidas = await supabase
      .from('web_categorias_faqs')
      .select('orden')
      .order('orden', { ascending: false })
      .limit(TOPE_DE_CATEGORIAS_DE_FAQ)
    if (leidas.error) {
      return rechazoDeEscritura(leidas.error)
    }
    if (leidas.data.length >= TOPE_DE_CATEGORIAS_DE_FAQ) {
      return fallo('regla', TOPE_ALCANZADO)
    }
    const { data, error } = await supabase
      .from('web_categorias_faqs')
      .insert({ nombre, orden: ordenDeCategoriaNueva(leidas.data.map((fila) => fila.orden)) })
      .select(COLUMNAS_DE_CATEGORIA_DE_FAQ)
      .limit(1)
    if (error) {
      return rechazoDeEscritura(error)
    }
    const fila = data[0]
    return fila === undefined
      ? fallo('sin_permiso', 'No se pudo crear la categoría.')
      : ok(elementoDeCatalogoDesde(fila))
  },
}
