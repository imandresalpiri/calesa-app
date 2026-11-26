import {
  elementoDeCatalogoDesde,
  TOPE_DE_CATALOGO,
  type ElementoDeCatalogo,
} from '@/shared/lib/catalogo'

// Las categorías de las preguntas frecuentes (`web_categorias_faqs`): un catálogo que se elige, con nombre único sin importar mayúsculas,
// tildes ni espacios (la base lo exige con su índice y su trigger). Tabla de configuración de decenas de filas: sin índice por `orden`.
export type CategoriaDeFaq = ElementoDeCatalogo

export const TOPE_DE_CATEGORIAS_DE_FAQ = TOPE_DE_CATALOGO
export const LARGO_DE_CATEGORIA = 60

// La columna `activa` de la tabla sale como `activo`, el nombre de todo elemento de catálogo.
export const COLUMNAS_DE_CATEGORIA_DE_FAQ = 'id, nombre, orden, activo:activa, actualizado_en'

/** Las filas de `web_categorias_faqs`; nulo si alguna no tiene la forma esperada. */
export function categoriasDeFaqDesde(datos: unknown): CategoriaDeFaq[] | null {
  if (!Array.isArray(datos)) return null
  try {
    return datos.map(elementoDeCatalogoDesde)
  } catch {
    return null
  }
}

/** El orden de una categoría nueva: diez después de la última. */
export function ordenDeCategoriaNueva(ordenes: readonly number[]): number {
  return ordenes.length === 0 ? 10 : Math.max(...ordenes) + 10
}
