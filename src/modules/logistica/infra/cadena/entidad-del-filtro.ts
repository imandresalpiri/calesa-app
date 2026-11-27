import 'server-only'
import { cache } from 'react'
import { z } from 'zod'
import { errorDePostgrest, fallo, MENSAJE_INESPERADO, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDelNombreDelFiltro } from '../../entities/cadena/repositorios'

// El número del contenedor o el booking del embarque que filtra la lista de una fase, para su chip. Por la clave primaria (`contenedores_pkey`,
// `embarques_pkey`) y en el origen de la lista, bajo la RLS de quien mira (`contenedores: leer`, `embarques: leer`): uno que no existe, es de otro
// origen o no se ve, nulo.
const esquemaDelNumero = z.array(z.object({ numero: z.string() }))
const esquemaDelBooking = z.array(z.object({ booking: z.string() }))

export const leerNombreDelFiltro: LectorDelNombreDelFiltro = cache(async (tipo, id, origenId) => {
  const supabase = await createClient()
  if (tipo === 'contenedor') {
    const { data, error } = await supabase
      .from('contenedores')
      .select('numero')
      .eq('id', id)
      .eq('origen_id', origenId)
      .limit(1)
    if (error) return { ok: false, error: errorDePostgrest(error) }
    const leido = esquemaDelNumero.safeParse(data)
    return leido.success
      ? ok(leido.data[0]?.numero ?? null)
      : fallo('inesperado', MENSAJE_INESPERADO)
  }
  const { data, error } = await supabase
    .from('embarques')
    .select('booking')
    .eq('id', id)
    .eq('origen_id', origenId)
    .limit(1)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const leido = esquemaDelBooking.safeParse(data)
  return leido.success
    ? ok(leido.data[0]?.booking ?? null)
    : fallo('inesperado', MENSAJE_INESPERADO)
})
