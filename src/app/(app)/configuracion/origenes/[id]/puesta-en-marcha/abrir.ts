import 'server-only'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { z } from 'zod'
import { leerFormulaDeTrabajo, type FormulaDelOrigen } from '@/modules/cotizaciones'
import { requerirSesion } from '@/modules/equipo'
import {
  estadoDeLaPuestaEnMarcha,
  type EstadoDeLaPuestaEnMarcha,
  type OrigenConUso,
  type PermisosDeLaPuestaEnMarcha,
} from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { puedeAbrirLaPuestaEnMarcha, puedeAbrirOrigenes } from '../../acceso'
import { leerElOrigen, type Sesion } from '../abrir-origen'

export type PuestaEnMarchaAbierta =
  | { tipo: 'ajeno'; puedeVerOtros: boolean }
  | {
      tipo: 'abierto'
      sesion: Sesion
      origen: OrigenConUso
      permisos: PermisosDeLaPuestaEnMarcha
      estado: EstadoDeLaPuestaEnMarcha
      formulaDeTrabajo: FormulaDelOrigen | null
    }

// Los tres permisos de los pasos, en este origen (`origenes.gestionar` es de la empresa, como en las pestañas).
export function permisosDeLaPuestaEnMarcha(
  permisos: Permisos,
  origenId: string,
): PermisosDeLaPuestaEnMarcha {
  return {
    gestionar: puede(permisos, 'origenes.gestionar'),
    flujo: puede(permisos, 'flujos.configurar', origenId),
    cotizador: puede(permisos, 'cotizaciones.configurar', origenId),
  }
}

// Lo que comprueban el resolvedor, el layout y cada paso de la puesta en marcha: se abre con cualquiera de los tres permisos en el origen, como su
// página. El origen y su fórmula de trabajo se leen en paralelo, una vez por request (`cache()`); la fórmula, sólo con el permiso del cotizador (la
// RLS no la deja leer sin él).
export const abrirLaPuestaEnMarcha = cache(async (id: string): Promise<PuestaEnMarchaAbierta> => {
  const sesion = await requerirSesion()
  if (!puedeAbrirLaPuestaEnMarcha(sesion.permisos, id)) {
    if (!z.guid().safeParse(id).success) {
      notFound()
    }
    return { tipo: 'ajeno', puedeVerOtros: puedeAbrirOrigenes(sesion.permisos) }
  }
  const permisos = permisosDeLaPuestaEnMarcha(sesion.permisos, id)
  const [origen, formula] = await Promise.all([
    leerElOrigen(id),
    permisos.cotizador ? leerFormulaDeTrabajo(id) : null,
  ])
  const formulaDeTrabajo = formula === null ? null : datosO(formula)
  return {
    tipo: 'abierto',
    sesion,
    origen,
    permisos,
    estado: estadoDeLaPuestaEnMarcha({
      uso: origen.uso,
      hayFormulaDeTrabajo: formulaDeTrabajo !== null,
      permisos,
    }),
    formulaDeTrabajo,
  }
})
