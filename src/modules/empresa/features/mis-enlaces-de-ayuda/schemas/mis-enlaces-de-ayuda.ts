import { z } from 'zod'
import { esquemaDeCamposDeEnlace } from '../../../entities/enlaces-de-ayuda'

// Lo que cruza el límite al guardar los enlaces de ayuda de una persona: la lista entera, en su orden. Uno de la empresa dice sólo si lo
// oculta; uno propio, sus campos (con `https://` y sus largos). El tope de propios, lo que no es suyo y la versión los dice la base.
const deLaEmpresa = z.object({ enlace_id: z.guid(), oculto: z.boolean() })
const propio = esquemaDeCamposDeEnlace.extend({ id: z.guid() })

export const esquemaGuardarMisEnlacesDeAyuda = z.object({
  // La versión de lo leído; nula si nunca guardó nada.
  actualizadoEnEsperado: z.string().min(1).nullable(),
  // El tope de la base: 30 de la empresa y 20 propios.
  elementos: z.array(z.union([deLaEmpresa, propio])).max(50),
})

export type EntradaDeGuardarMisEnlacesDeAyuda = z.input<typeof esquemaGuardarMisEnlacesDeAyuda>
