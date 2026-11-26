import { z } from 'zod'
import { LARGO_DE_CATEGORIA } from '../../../../entities/contenido/categorias-de-faq'

// Lo que cruza al servidor al crear una categoría de FAQ. La base vuelve a limpiar el nombre y lo compara normalizado.
export const esquemaCrearCategoriaDeFaq = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, { error: 'Escribe un nombre.' })
    .max(LARGO_DE_CATEGORIA, { error: `Hasta ${String(LARGO_DE_CATEGORIA)} caracteres.` }),
})
