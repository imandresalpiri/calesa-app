'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { escribirCategoriasDeFaq } from '../../../../areas/contenido/composicion'
import { SIN_PERMISO_PARA_CONTENIDO } from '../../../../entities/contenido/errores'
import { esquemaCrearCategoriaDeFaq } from '../schemas/categoria-de-faq'

async function crear(permisos: Permisos, nombre: string) {
  if (!puede(permisos, 'web.contenido.gestionar')) {
    return fallo('sin_permiso', SIN_PERMISO_PARA_CONTENIDO)
  }
  return escribirCategoriasDeFaq.crear(nombre)
}

// «Crear categoría «x»» del combo de una pregunta: la crea al final del catálogo y la devuelve para elegirla. Se llama con la pregunta a
// medio escribir: no revalida (redibujar la página la perdería); guardar la pregunta trae la lista nueva.
export const crearCategoriaDeFaq = actionClient
  .inputSchema(esquemaCrearCategoriaDeFaq)
  .action(({ parsedInput, ctx }) => crear(ctx.permisos, parsedInput.nombre))

// «Agregar» del drawer «Categorías»: lo mismo, y revalida (el formulario del drawer se vacía al terminar; no hay nada a medio tipear).
export const agregarCategoriaDeFaq = actionClient
  .inputSchema(esquemaCrearCategoriaDeFaq)
  .action(async ({ parsedInput, ctx }) => {
    const hecho = await crear(ctx.permisos, parsedInput.nombre)
    if (hecho.ok) {
      revalidatePath(RUTAS.faqsDelSitio)
    }
    return hecho
  })
