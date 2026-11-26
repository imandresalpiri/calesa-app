'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { escribirCategoriasDeFaq } from '../../../../areas/contenido/composicion'
import { SIN_PERMISO_PARA_CONTENIDO } from '../../../../entities/contenido/errores'
import { esquemaGuardarCategoriaDeFaq } from '../schemas/categoria-de-faq'

// Drawer «Categorías» de las preguntas frecuentes: renombrar, activar o desactivar una categoría (renombrar la cambia en todas sus preguntas: es una referencia). Revalida: el drawer no tiene nada a medio tipear.
export const guardarCategoriaDeFaq = actionClient
  .inputSchema(esquemaGuardarCategoriaDeFaq)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_CONTENIDO)
    }
    const hecho = await escribirCategoriasDeFaq.guardar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.faqsDelSitio)
    }
    return hecho
  })
