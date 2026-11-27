'use server'

import { actionClient } from '@/shared/lib/safe-action'
import { repositorioPerfil } from '../../../composicion'
import {
  CLAVE_DE_VENTANA_DE_CAMARA,
  esquemaDeLaVentanaDeCamara,
} from '../../../entities/ventana-de-camara'

// Guarda la ventana de cámara de quien la movió (docs/GLOSARIO.md › «Ventana de cámara»), entera: última escritura gana, sin versión, como el resto de las
// preferencias. Sin revalidar: ya está aplicada en su pantalla y el servidor la lee en la próxima carga con el Live. Cada persona escribe sólo la suya (RLS).
export const guardarLaVentanaDeCamara = actionClient
  .inputSchema(esquemaDeLaVentanaDeCamara)
  .action(async ({ parsedInput, ctx }) =>
    repositorioPerfil.escribirPreferencia(ctx.usuarioId, CLAVE_DE_VENTANA_DE_CAMARA, parsedInput),
  )
