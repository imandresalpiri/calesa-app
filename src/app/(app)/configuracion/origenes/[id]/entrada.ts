import 'server-only'
import { connection } from 'next/server'
import { leerLasPestanasRecordadas, requerirSesion } from '@/modules/equipo'
import { redireccionPermanente, type ParametrosDeLaUrl } from '../../con-parametros'
import { pestanasDelOrigen } from '../acceso'
import { destinoAlEntrar } from './urls-viejas/pestana'

// Lo que responden `/configuracion/origenes/<id>` y `/<id>/datos`: un 308 a la pestaña de entrada de esta persona (la última que abrió ahí, por la PK de
// `preferencias_usuario`; si no, la primera que abre), por persona (`private, no-store`: depende de quién pide y de lo que abrió). La pestaña comprueba el
// permiso y el 404.
export async function redirigirAlEntrar(
  id: string,
  parametros: ParametrosDeLaUrl,
): Promise<Response> {
  await connection()
  const sesion = await requerirSesion()
  const recordadas = await leerLasPestanasRecordadas(sesion.usuarioId)
  const abiertas = pestanasDelOrigen(sesion.permisos, id)
    .filter((pestana) => pestana.motivo === undefined)
    .map((pestana) => pestana.clave)
  return redireccionPermanente(
    destinoAlEntrar({ id, parametros, recordada: recordadas[id] ?? null, abiertas }),
    { porPersona: true },
  )
}
