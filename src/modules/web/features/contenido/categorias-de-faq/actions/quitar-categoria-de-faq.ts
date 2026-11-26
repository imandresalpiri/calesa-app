'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { escribirCategoriasDeFaq } from '../../../../areas/contenido/composicion'
import { SIN_PERMISO_PARA_CONTENIDO } from '../../../../entities/contenido/errores'
import { esquemaQuitarCategoriaDeFaq } from '../schemas/categoria-de-faq'

// Drawer «Categorías» de las preguntas frecuentes: quitar una categoría sin preguntas, o con «Mover sus N preguntas a…», que las mueve antes en la misma RPC. Revalida: el drawer no tiene nada a medio tipear.
export const quitarCategoriaDeFaq = actionClient
  .inputSchema(esquemaQuitarCategoriaDeFaq)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_CONTENIDO)
    }
    const hecho = await escribirCategoriasDeFaq.quitar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.faqsDelSitio)
    }
    return hecho
  })
