'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMisEnlacesDeAyuda } from '../../../composicion'
import type { MisEnlacesLeidos } from '../../../entities/mis-enlaces-de-ayuda'
import { esquemaGuardarMisEnlacesDeAyuda } from '../schemas/mis-enlaces-de-ayuda'
import { comoResultado } from '../../enlaces-de-ayuda/actions/resultado'

// Guarda la lista de enlaces de ayuda de quien está en sesión: lo que oculta, su orden y los propios. Sin permiso propio: cada persona
// activa edita sólo lo suyo (la base lo exige con su `uid`).
export const guardarMisEnlacesDeAyuda = actionClient
  .inputSchema(esquemaGuardarMisEnlacesDeAyuda)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<MisEnlacesLeidos>> => {
    const hecho = comoResultado(await repositorioDeMisEnlacesDeAyuda.guardar(parsedInput))
    if (hecho.ok) {
      revalidatePath(RUTAS.perfil)
    }
    return hecho
  })
