'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { usosDeLaImagen } from '../../../composicion'
import { esquemaUsosDeLaImagen } from '../schemas/imagenes'

// Cuántas plantillas de arte usan una imagen, con tope (101 = «más de 100»): lo que dice su confirmación de quitar antes de que se toque
// «Quitar». Cuenta todas, también las que quien mira no ve (una privada de otra persona): la RPC sólo devuelve el número.
export const leerUsosDeLaImagen = actionClient
  .inputSchema(esquemaUsosDeLaImagen)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<number>> =>
    usosDeLaImagen(parsedInput),
  )
