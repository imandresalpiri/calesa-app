// El catálogo de tablas de un origen (`entities/catalogo-de-tablas.ts`): id, clave, nombre, si es compartida y sus columnas, de las activas del origen
// y de las compartidas, sobre el cliente que recibe (el del servidor, con la sesión de quien configura: la policy de lectura de `tablas_referencia`
// decide). Una lectura que falla, o una forma que no se entiende, da null: la fórmula y el diseño se editan igual y dicen que no pudimos leer las
// tablas (nunca el mensaje de la base).
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'
import type { Database } from '@/shared/types/database.types'
import {
  catalogoDe,
  TOPE_DE_TABLAS_DEL_CATALOGO,
  type TablaDelCatalogoDelOrigen,
} from '../../entities/catalogo-de-tablas'

type Cliente = SupabaseClient<Database>

const esquemaDeLaTabla = z.object({
  id: z.guid(),
  clave: z.string(),
  nombre: z.string(),
  origen_id: z.guid().nullable(),
  columnas: z.array(z.object({ clave: z.string(), etiqueta: z.string(), tipo: z.string() })),
})

// Por `tablas_referencia_origen_id_clave_key (origen_id, clave)`: por clave, la del origen antes que la compartida, con tope + 1.
export function consultaDelCatalogo(cliente: Cliente, origenId: string) {
  return cliente
    .from('tablas_referencia')
    .select('id, clave, nombre, origen_id, columnas')
    .eq('activa', true)
    .or(`origen_id.eq.${origenId},origen_id.is.null`)
    .order('clave')
    .order('origen_id', { nullsFirst: false })
    .limit(TOPE_DE_TABLAS_DEL_CATALOGO + 1)
}

export async function leerCatalogoDeTablasSobre(
  cliente: Cliente,
  origenId: string,
): Promise<TablaDelCatalogoDelOrigen[] | null> {
  // El origen va dentro del filtro `or`: sólo un guid.
  if (!z.guid().safeParse(origenId).success) return null
  const { data, error } = await consultaDelCatalogo(cliente, origenId)
  if (error) return null
  const leidas = z.array(esquemaDeLaTabla).safeParse(data)
  if (!leidas.success) return null
  // La 101.ª y las que siguen no entran, como en la lista de tablas.
  const { filas } = cortarAlTope(leidas.data, TOPE_DE_TABLAS_DEL_CATALOGO)
  return catalogoDe(
    filas.map((t) => ({
      id: t.id,
      clave: t.clave,
      nombre: t.nombre,
      compartida: t.origen_id === null,
      columnas: t.columnas.map((c) => ({ clave: c.clave, etiqueta: c.etiqueta, tipo: c.tipo })),
    })),
  )
}
