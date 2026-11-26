import 'server-only'
import { cache } from 'react'
import { claveDeCatalogo, claveDePuerto } from '@/shared/lib/catalogos/propios'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { TOPE_DE_LA_OFERTA, catalogoDelOrigen, ofertaDesde } from '../../entities/reglas/oferta'
import type {
  LectorDeCatalogoDeTransporte,
  LectorDeOferta,
} from '../../entities/reglas/repositorios'

const NO_SE_LEYO = 'No pudimos leer la oferta de transporte. Vuelve a intentar.'

// La oferta guardada de un flujo (`flujo_oferta()`, 5.10): las listas vacías son «se ofrece todo». Leer es de cualquier cuenta con sesión.
export const leerOfertaDeTransporte: LectorDeOferta = cache(async (flujoId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('flujo_oferta', { p_flujo: flujoId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const oferta = ofertaDesde(data)
  return oferta ? ok(oferta) : fallo('inesperado', NO_SE_LEYO)
})

// Los puertos y navieras activos que usa el origen del flujo, para marcarlos: los compartidos y los propios del origen (sin origen, el flujo de
// repuestos, sólo los compartidos), los compartidos al final para que el tope corte uno antes que el propio que lo tapa. Son catálogos de decenas de
// filas (los únicos por `origen_id` primero sirven al filtro), con `tope + 1` leídas para decir si hay más. Se cargan en Logística; acá sólo se leen.
export const leerCatalogoDeTransporte: LectorDeCatalogoDeTransporte = cache(async (origenId) => {
  const supabase = await createClient()
  const delOrigen =
    origenId === null ? 'origen_id.is.null' : `origen_id.is.null,origen_id.eq.${origenId}`
  const [puertos, navieras] = await Promise.all([
    supabase
      .from('puertos')
      .select('id, nombre, activo, origen_id, pais, orden')
      .eq('activo', true)
      .or(delOrigen)
      .order('origen_id', { nullsFirst: false })
      .order('orden')
      .order('nombre')
      .limit(TOPE_DE_LA_OFERTA + 1),
    supabase
      .from('navieras')
      .select('id, nombre, activo, origen_id')
      .eq('activo', true)
      .or(delOrigen)
      .order('origen_id', { nullsFirst: false })
      .order('nombre')
      .limit(TOPE_DE_LA_OFERTA + 1),
  ])
  const error = puertos.error ?? navieras.error
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(
    catalogoDelOrigen(
      (puertos.data ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        activo: p.activo,
        origenId: p.origen_id,
        orden: p.orden,
        clave: claveDePuerto(p.nombre, p.pais),
      })),
      (navieras.data ?? []).map((n) => ({
        id: n.id,
        nombre: n.nombre,
        activo: n.activo,
        origenId: n.origen_id,
        orden: 0,
        clave: claveDeCatalogo(n.nombre),
      })),
      origenId,
    ),
  )
})
