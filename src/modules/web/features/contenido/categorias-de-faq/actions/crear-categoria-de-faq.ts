'use server'

import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { escribirCategoriasDeFaq } from '../../../../areas/contenido/composicion'
import { SIN_PERMISO_PARA_CONTENIDO } from '../../../../entities/contenido/errores'
import { esquemaCrearCategoriaDeFaq } from '../schemas/categoria-de-faq'

// «Crear categoría «x»» del combo de una pregunta: la crea al final del catálogo y la devuelve para elegirla. Se llama con la pregunta a
// medio escribir: no revalida (redibujar la página la perdería); guardar la pregunta trae la lista nueva.
export const crearCategoriaDeFaq = actionClient
  .inputSchema(esquemaCrearCategoriaDeFaq)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_CONTENIDO)
    }
    return escribirCategoriasDeFaq.crear(parsedInput.nombre)
  })
