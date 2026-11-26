import { z } from 'zod'
import { esquemaDeCamposDeEnlace } from '../../../entities/enlaces-de-ayuda'

// Lo que cruza el límite de los enlaces de ayuda de la empresa. Los campos, con `https://` y sus largos (`esquemaDeCamposDeEnlace`); el
// tope y el conflicto los dice la base, con el campo en el `hint`.
const version = z.string().min(1)

export const esquemaCrearEnlaceDeAyuda = esquemaDeCamposDeEnlace.extend({
  // El del intento: el mismo en cada reintento.
  id: z.guid(),
})

export const esquemaGuardarEnlaceDeAyuda = esquemaDeCamposDeEnlace
  .partial()
  .extend({
    id: z.guid(),
    actualizadoEnEsperado: version,
    activo: z.boolean().optional(),
  })
  .refine(
    (e) =>
      e.titulo !== undefined ||
      e.url !== undefined ||
      e.descripcion !== undefined ||
      e.activo !== undefined,
    { error: 'No hay nada que guardar.' },
  )

export const esquemaMoverEnlaceDeAyuda = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  direccion: z.enum(['subir', 'bajar']),
})

export const esquemaQuitarEnlaceDeAyuda = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
})

export type EntradaDeCrearEnlaceDeAyuda = z.input<typeof esquemaCrearEnlaceDeAyuda>
export type EntradaDeGuardarEnlaceDeAyuda = z.input<typeof esquemaGuardarEnlaceDeAyuda>
