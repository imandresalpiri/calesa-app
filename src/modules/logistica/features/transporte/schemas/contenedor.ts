import { z } from 'zod'
import { codigoDeTransporte, notasDeTransporte } from './embarque'

// Lo que cruza al servidor al crear o editar un contenedor. La base vuelve a revisarlo todo (`contenedor_crear|guardar`).
const id = z.guid()

const camposDelContenedor = {
  // La clave de `tipos_contenedor`.
  tipo: z.string().min(1).max(40).nullable().optional(),
  sello: z
    .string()
    .trim()
    .max(40, { error: 'El sello lleva hasta 40 caracteres.' })
    .nullable()
    .optional(),
  // Nulo lo deja sin embarque.
  embarque_id: id.nullable().optional(),
  notas: notasDeTransporte,
}

export const esquemaCrearContenedor = z.strictObject({
  id,
  origenId: id,
  datos: z.strictObject({ numero: codigoDeTransporte('número'), ...camposDelContenedor }),
})

export const esquemaGuardarContenedor = z.strictObject({
  id,
  origenId: id,
  actualizadoEnEsperado: z.string().min(1),
  cambios: z
    .strictObject({ numero: codigoDeTransporte('número').optional(), ...camposDelContenedor })
    .refine((c) => Object.keys(c).length > 0, { error: 'No hay nada que guardar.' }),
})

export type EntradaCrearContenedor = z.input<typeof esquemaCrearContenedor>
export type EntradaGuardarContenedor = z.input<typeof esquemaGuardarContenedor>
