'use server'

import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { ElementoDeCatalogo } from '@/shared/lib/catalogo'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { escribirCategorias } from '../../../../areas/contenido/composicion'
import { MOTIVO_SIN_PERMISO_PARA_CATEGORIAS } from '../../../../entities/contenido/categorias'
import { esquemaCrearCategoria } from '../schemas/categoria'

// «Crear categoría «x»» del combo de una guía: la agrega al final y la devuelve para elegirla. Se llama con la guía a medio escribir:
// no revalida (redibujar la página la perdería); la lista de «Categorías» la trae al volver a Guías.
export const crearCategoriaDesdeLaGuia = actionClient
  .inputSchema(esquemaCrearCategoria)
  .action(async ({ parsedInput, ctx }): Promise<Resultado<ElementoDeCatalogo>> => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_PARA_CATEGORIAS)
    }
    const hecho = await escribirCategorias.crear(parsedInput)
    // La tabla de categorías de guías no tiene versión: el combo no la pide.
    return hecho.ok ? ok({ ...hecho.data, activo: true, actualizadoEn: '' }) : hecho
  })
