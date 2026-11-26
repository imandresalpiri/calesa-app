// Los puertos y las navieras de un origen, leídos desde el navegador para su drawer en las fases del origen (6.08-1): los propios del origen y los
// compartidos con todos (`origen_id` nulo), también los desactivados, con su versión. Son catálogos de decenas de filas: cada grupo con `.limit(201)` y
// `cortarAlTope` a 200 (`leerCatalogoDelOrigen`). Índices: `puertos_origen_clave_key` y `navieras_origen_clave_key` (el origen va primero: sirven para `=`
// y para `is null`).
import { createClient } from '@/shared/lib/supabase/browser'
import type { Resultado } from '@/shared/lib/errores'
import type { CatalogoDelOrigenLeido } from '../../entities/nucleo/catalogo-del-origen'
import {
  navierasDesde,
  ordenarNavieras,
  ordenarPuertos,
  puertosDesde,
  TOPE_DE_CATALOGO_DE_TRANSPORTE,
  type NavieraDeCatalogo,
  type PuertoDeCatalogo,
} from '../../entities/transporte/catalogo'
import { leerCatalogoDelOrigen } from '../nucleo/catalogo-del-origen.client'

export const NO_SE_CARGARON_LOS_PUERTOS = 'No se pudieron cargar los puertos.'
export const NO_SE_CARGARON_LAS_NAVIERAS = 'No se pudieron cargar las navieras.'

export function leerPuertosDelOrigen(
  origenId: string,
): Promise<Resultado<CatalogoDelOrigenLeido<PuertoDeCatalogo>>> {
  return leerCatalogoDelOrigen(origenId, {
    consulta: (origen) => {
      const consulta = createClient()
        .from('puertos')
        .select('id, origen_id, nombre, pais, codigo, activo, orden, actualizado_en')
      return (origen === null ? consulta.is('origen_id', null) : consulta.eq('origen_id', origen))
        .order('orden')
        .order('nombre')
        .limit(TOPE_DE_CATALOGO_DE_TRANSPORTE + 1)
    },
    desde: puertosDesde,
    ordenar: ordenarPuertos,
    tope: TOPE_DE_CATALOGO_DE_TRANSPORTE,
    mensaje: NO_SE_CARGARON_LOS_PUERTOS,
  })
}

export function leerNavierasDelOrigen(
  origenId: string,
): Promise<Resultado<CatalogoDelOrigenLeido<NavieraDeCatalogo>>> {
  return leerCatalogoDelOrigen(origenId, {
    consulta: (origen) => {
      const consulta = createClient()
        .from('navieras')
        .select('id, origen_id, nombre, activo, actualizado_en')
      return (origen === null ? consulta.is('origen_id', null) : consulta.eq('origen_id', origen))
        .order('nombre')
        .limit(TOPE_DE_CATALOGO_DE_TRANSPORTE + 1)
    },
    desde: navierasDesde,
    ordenar: ordenarNavieras,
    tope: TOPE_DE_CATALOGO_DE_TRANSPORTE,
    mensaje: NO_SE_CARGARON_LAS_NAVIERAS,
  })
}
