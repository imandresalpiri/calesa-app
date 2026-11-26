import 'server-only'
import { cache } from 'react'
import { z } from 'zod'
import { claveDeCatalogo, loQueUsaElOrigen } from '@/shared/lib/catalogos/propios'
import { errorDePostgrest, fallo, MENSAJE_INESPERADO, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeNavieras } from '../../entities/cadena/repositorios'

// Las navieras activas que usa el origen de la lista, para el filtro «Naviera»: sus propias y las compartidas que no tapa con una propia de su nombre. Un catálogo de decenas de filas
// (`navieras_pkey`; policy `leer using (true)`), con tope de 200 y las compartidas al final, para que el tope corte una compartida antes que la propia que la tapa: no es una tabla que crece.
const TOPE_DE_NAVIERAS = 200

const esquemaDeNavieras = z.array(
  z.object({ id: z.guid(), nombre: z.string(), origen_id: z.guid().nullable() }),
)

export const leerNavieras: LectorDeNavieras = cache(async (origenId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('navieras')
    .select('id, nombre, origen_id')
    .eq('activo', true)
    .or(`origen_id.is.null,origen_id.eq.${origenId}`)
    .order('origen_id', { nullsFirst: false })
    .order('nombre')
    .limit(TOPE_DE_NAVIERAS)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const leidas = esquemaDeNavieras.safeParse(data)
  if (!leidas.success) return fallo('inesperado', MENSAJE_INESPERADO)
  const filas = leidas.data.map((n) => ({
    id: n.id,
    nombre: n.nombre,
    origenId: n.origen_id,
    clave: claveDeCatalogo(n.nombre),
    activo: true,
  }))
  return ok(
    loQueUsaElOrigen(filas, origenId)
      .map(({ id, nombre }) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  )
})
