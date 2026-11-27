import { z } from 'zod'
import { esquemaDelNombreDeLogo } from '../../../entities/logos'

// Lo que cruza el límite de las variantes del logo. El nombre, recortado y con su largo; el archivo ya está en el bucket (`marca/logos/<hash>.<ext>`)
// y su forma la repite la base con el campo en el `hint`.
const version = z.string().min(1)

export const esquemaCrearLogo = z.object({
  // El del intento: el mismo en cada reintento.
  id: z.guid(),
  nombre: esquemaDelNombreDeLogo,
  ruta: z.string().regex(/^logos\/[0-9a-f]{64}\.(svg|png|webp|jpg)$/, {
    error: 'El archivo del logo no es válido.',
  }),
  tipo: z.enum(['svg', 'png', 'webp', 'jpg']),
  ancho: z.number().int().min(1).max(20000),
  alto: z.number().int().min(1).max(20000),
})

export const esquemaRenombrarLogo = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  nombre: esquemaDelNombreDeLogo,
})

export const esquemaOrdenarLogos = z.object({
  ids: z.array(z.guid()).max(20),
})

export const esquemaQuitarLogo = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
})

export const esquemaUsosDelLogo = z.object({
  // `oscuro` o el guid de una variante.
  id: z.union([z.literal('oscuro'), z.guid()]),
})
