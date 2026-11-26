import { z } from 'zod'
import {
  LARGO_MAXIMO_INSTRUCCION_DEL_ASISTENTE,
  LARGO_MAXIMO_TEXTO_DEL_ASISTENTE,
} from '@/modules/empresa/client'

const texto = z
  .string()
  .trim()
  .min(1, { error: 'Escribe el texto que el asistente tiene que redactar.' })
  .max(LARGO_MAXIMO_TEXTO_DEL_ASISTENTE, { error: 'El texto no puede pasar de 8.000 caracteres.' })

// «Generar» con un atajo, desde el texto de compartir de una cotización.
export const esquemaDeGenerar = z.object({
  cotizacionId: z.guid(),
  atajoId: z.guid(),
  texto,
})

// «Reescribir» un texto con una instrucción libre.
export const esquemaDeReescribir = z.object({
  cotizacionId: z.guid(),
  texto,
  instruccion: z
    .string()
    .trim()
    .min(1, { error: 'Escribe qué tiene que cambiar el asistente.' })
    .max(LARGO_MAXIMO_INSTRUCCION_DEL_ASISTENTE, {
      error: 'La instrucción va hasta 500 caracteres.',
    }),
})

export type EntradaDeGenerar = z.input<typeof esquemaDeGenerar>
export type EntradaDeReescribir = z.input<typeof esquemaDeReescribir>
