'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { escribirCategoriasDeFaq } from '../../../../areas/contenido/composicion'
import { SIN_PERMISO_PARA_CONTENIDO } from '../../../../entities/contenido/errores'
import { esquemaMoverCategoriaDeFaq } from '../schemas/categoria-de-faq'

// Drawer «Categorías» de las preguntas frecuentes: subir o bajar una categoría: el orden en que la web agrupa las preguntas. Revalida: el drawer no tiene nada a medio tipear.
export const moverCategoriaDeFaq = actionClient
  .inputSchema(esquemaMoverCategoriaDeFaq)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_CONTENIDO)
    }
    const hecho = await escribirCategoriasDeFaq.mover(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.faqsDelSitio)
    }
    return hecho
  })
