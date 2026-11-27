import 'server-only'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { z } from 'zod'
import { puede, requerirSesion } from '@/modules/equipo'
import { leerOrigenes, type OrigenConUso } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import type { ParteDelOrigen } from '@/shared/lib/rutas'
import {
  pestanasDelOrigen,
  puedeAbrirElOrigen,
  puedeAbrirOrigenes,
  type PestanaAbierta,
} from '../acceso'

export type Sesion = Awaited<ReturnType<typeof requerirSesion>>

export type OrigenAbierto =
  // Existe, pero la persona no tiene ninguno de los tres permisos en él.
  | { tipo: 'ajeno'; puedeVerOtros: boolean }
  // Abre el origen, pero no esta pestaña: se dice el motivo y se ofrece la primera que abre.
  | { tipo: 'sin-pestana'; motivo: string; primera: PestanaAbierta }
  | {
      tipo: 'abierto'
      sesion: Sesion
      origen: OrigenConUso
      puedeGestionar: boolean
      pestanas: PestanaAbierta[]
      // Con el Modo Live encendido: Planilla, Hoja y Tarjeta se ven y nada se edita (la base y las actions siguen con los permisos reales).
      soloLectura: boolean
    }

// El origen de la URL, si existe: un id que no es un uuid o un origen que no existe son el 404. `leerOrigenes()` lee una vez por request
// (la comparten el layout, la página y el menú).
export const leerElOrigen = cache(async (id: string): Promise<OrigenConUso> => {
  if (!z.guid().safeParse(id).success) {
    notFound()
  }
  const origen = datosO(await leerOrigenes()).find((otro) => otro.id === id)
  if (!origen) {
    notFound()
  }
  return origen
})

// Lo que cada pestaña de un origen comprueba antes de dibujarse: cada página lo hace sola (un layout no protege a su página). Se abre con
// cualquiera de los tres permisos en ese origen; la pestaña pide además el suyo (`acceso.ts`). El permiso va antes de leer: `origenes_resumen()`
// rechaza a quien no tiene ninguno en algún origen, y a quien no abre este no se le dice si existe.
export async function abrirOrigen(id: string, parte: ParteDelOrigen): Promise<OrigenAbierto> {
  const sesion = await requerirSesion()
  if (!puedeAbrirElOrigen(sesion.permisos, id)) {
    if (!z.guid().safeParse(id).success) {
      notFound()
    }
    return { tipo: 'ajeno', puedeVerOtros: puedeAbrirOrigenes(sesion.permisos) }
  }
  const origen = await leerElOrigen(id)
  const soloLectura = sesion.live.encendido
  const pestanas = pestanasDelOrigen(sesion.permisos, origen.id, soloLectura)
  const pedida = pestanas.find((pestana) => pestana.clave === parte)
  const primera = pestanas.find((pestana) => pestana.motivo === undefined)
  if (pedida?.motivo !== undefined && primera) {
    return { tipo: 'sin-pestana', motivo: pedida.motivo, primera }
  }
  return {
    tipo: 'abierto',
    sesion,
    origen,
    puedeGestionar: puede(sesion.permisos, 'origenes.gestionar'),
    pestanas,
    soloLectura,
  }
}
