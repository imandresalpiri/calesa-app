import { z } from 'zod'
import { LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE } from '../../../entities/transporte/transporte'

// Lo que cruza al servidor al crear o editar un embarque. La base vuelve a revisarlo todo (`embarque_crear|guardar`); acá se corta lo que no tiene la forma.
const fecha = z.iso.date()
const id = z.guid()

// El booking y el número de un contenedor: sin ningún espacio y en mayúsculas, como los guarda la base (`^[A-Z0-9./-]{1,40}$`).
export function codigoDeTransporte(campo: 'booking' | 'número') {
  return z
    .string()
    .transform((texto) => texto.replace(/\s/g, '').toUpperCase())
    .pipe(
      z.string().regex(/^[A-Z0-9./-]{1,40}$/, {
        error: `El ${campo} lleva sólo letras, dígitos, punto, barra o guion (hasta 40).`,
      }),
    )
}

export const notasDeTransporte = z
  .string()
  .max(LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE, {
    error: 'Las notas llevan hasta 2.000 caracteres.',
  })
  .nullable()
  .optional()

// Sólo las claves que la base admite: una de más da 22023. Una ausente no cambia; `null` vacía.
const camposDelEmbarque = {
  naviera_id: id.nullable().optional(),
  puerto_origen_id: id.nullable().optional(),
  puerto_destino_id: id.nullable().optional(),
  zarpe_estimado_el: fecha.nullable().optional(),
  zarpe_el: fecha.nullable().optional(),
  eta_el: fecha.nullable().optional(),
  arribo_el: fecha.nullable().optional(),
  notas: notasDeTransporte,
}

export const esquemaCrearEmbarque = z.strictObject({
  // El id del intento: nace al abrir el formulario.
  id,
  origenId: id,
  datos: z.strictObject({ booking: codigoDeTransporte('booking'), ...camposDelEmbarque }),
})

export const esquemaGuardarEmbarque = z.strictObject({
  id,
  origenId: id,
  actualizadoEnEsperado: z.string().min(1),
  cambios: z
    .strictObject({ booking: codigoDeTransporte('booking').optional(), ...camposDelEmbarque })
    .refine((c) => Object.keys(c).length > 0, { error: 'No hay nada que guardar.' }),
})

export type EntradaCrearEmbarque = z.input<typeof esquemaCrearEmbarque>
export type EntradaGuardarEmbarque = z.input<typeof esquemaGuardarEmbarque>
