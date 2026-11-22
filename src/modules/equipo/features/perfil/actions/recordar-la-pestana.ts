'use server'

import { actionClient } from '@/shared/lib/safe-action'
import { repositorioPerfil } from '../../../composicion'
import {
  CLAVE_DE_ULTIMA_PESTANA,
  conLaPestana,
  esquemaRecordarPestana,
  pestanasRecordadasDesde,
} from '../../../entities/ultima-pestana'

// La pestaña que la persona acaba de abrir en un origen (docs/GLOSARIO.md › «Última pestaña del origen»): lee lo guardado, lo funde
// (`conLaPestana()`, con tope) y lo vuelve a escribir en su fila. Última escritura gana, sin versión: es una preferencia. Sin revalidar: nada
// de la pantalla cambia; la lee la próxima entrada a `/configuracion/origenes/<id>`. No pide permiso: cada persona escribe sólo la suya (RLS).
export const recordarLaPestana = actionClient
  .inputSchema(esquemaRecordarPestana)
  .action(async ({ parsedInput, ctx }) => {
    const leida = await repositorioPerfil.leerPreferencia(ctx.usuarioId, CLAVE_DE_ULTIMA_PESTANA)
    if (!leida.ok) {
      return leida
    }
    const nuevas = conLaPestana(
      pestanasRecordadasDesde(leida.data),
      parsedInput.origenId,
      parsedInput.parte,
    )
    return repositorioPerfil.escribirPreferencia(ctx.usuarioId, CLAVE_DE_ULTIMA_PESTANA, nuevas)
  })
