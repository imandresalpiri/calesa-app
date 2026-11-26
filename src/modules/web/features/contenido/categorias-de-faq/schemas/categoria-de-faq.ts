import { z } from 'zod'
import { esquemaDestinoAlQuitar } from '@/shared/lib/catalogo'
import { LARGO_DE_CATEGORIA } from '../../../../entities/contenido/categorias-de-faq'

// El nombre de una categoría de FAQ. La base vuelve a limpiarlo y lo compara normalizado.
const nombre = z
  .string()
  .trim()
  .min(1, { error: 'Escribe un nombre.' })
  .max(LARGO_DE_CATEGORIA, { error: `Hasta ${String(LARGO_DE_CATEGORIA)} caracteres.` })

// Lo que cruza al servidor al crear una categoría de FAQ (el combo de una pregunta o «Agregar» del drawer «Categorías»).
export const esquemaCrearCategoriaDeFaq = z.object({ nombre })

// Una edición desde el drawer, con la versión que se vio.
const edicion = { id: z.guid(), actualizadoEnEsperado: z.string().min(1) }

export const esquemaGuardarCategoriaDeFaq = z.object({
  ...edicion,
  cambios: z
    .object({ nombre: nombre.optional(), activo: z.boolean().optional() })
    .refine((cambios) => cambios.nombre !== undefined || cambios.activo !== undefined, {
      error: 'No hay nada que guardar.',
    }),
})

export const esquemaMoverCategoriaDeFaq = z.object({ ...edicion, despuesDe: z.guid().nullable() })

export const esquemaQuitarCategoriaDeFaq = z.object({
  ...edicion,
  destino: esquemaDestinoAlQuitar,
})
