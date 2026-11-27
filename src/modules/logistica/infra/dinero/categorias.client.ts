// Las categorías de gasto de un origen, leídas desde el navegador para su drawer en las fases del origen (6.11-4): las propias del origen y las
// compartidas con todos (`origen_id` nulo), también las desactivadas, con su versión. Es un catálogo de decenas de filas: cada grupo con `.limit(201)` y
// `cortarAlTope` a 200 (`leerCatalogoDelOrigen`). Índice: `categorias_gasto_origen_clave_key` (el origen va primero: sirve para `=` y para `is null`).
import type { Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  categoriasDesde,
  ordenarCategorias,
  TOPE_DE_CATEGORIAS_DE_GASTO,
  type CategoriaDeGasto,
} from '../../entities/dinero/categoria'
import type { CatalogoDelOrigenLeido } from '../../entities/nucleo/catalogo-del-origen'
import { leerCatalogoDelOrigen } from '../nucleo/catalogo-del-origen.client'

export const NO_SE_CARGARON_LAS_CATEGORIAS = 'No se pudieron cargar las categorías.'

export function leerCategoriasDelOrigen(
  origenId: string,
): Promise<Resultado<CatalogoDelOrigenLeido<CategoriaDeGasto>>> {
  return leerCatalogoDelOrigen(origenId, {
    consulta: (origen) => {
      const consulta = createClient()
        .from('categorias_gasto')
        .select('id, origen_id, nombre, proposito, activo, orden, actualizado_en')
      return (origen === null ? consulta.is('origen_id', null) : consulta.eq('origen_id', origen))
        .order('orden')
        .order('nombre')
        .limit(TOPE_DE_CATEGORIAS_DE_GASTO + 1)
    },
    desde: categoriasDesde,
    ordenar: ordenarCategorias,
    tope: TOPE_DE_CATEGORIAS_DE_GASTO,
    mensaje: NO_SE_CARGARON_LAS_CATEGORIAS,
  })
}
