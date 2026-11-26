// Las categorías de gasto de Logística › Configuración, leídas desde el navegador (6.11-4): las compartidas con todos los orígenes (`origen_id` nulo), también las
// desactivadas, con su versión, y sin recordar nada (la lista se relee tras cada escritura). Es un catálogo de decenas de filas: `.limit(200)`, como `leerOpcionesDeGasto`
// (`categorias_gasto_origen_clave_key`: el origen va primero).
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { categoriasDesde, type CategoriaDeGasto } from '../../entities/dinero/categoria'

export const NO_SE_CARGARON_LAS_CATEGORIAS = 'No se pudieron cargar las categorías.'

export async function leerCategoriasDeConfiguracion(): Promise<Resultado<CategoriaDeGasto[]>> {
  const { data, error } = await createClient()
    .from('categorias_gasto')
    .select('id, origen_id, nombre, proposito, activo, orden, actualizado_en')
    .is('origen_id', null)
    .order('orden')
    .order('nombre')
    .limit(200)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lista = categoriasDesde(data)
  return lista ? ok(lista) : fallo('inesperado', NO_SE_CARGARON_LAS_CATEGORIAS)
}
