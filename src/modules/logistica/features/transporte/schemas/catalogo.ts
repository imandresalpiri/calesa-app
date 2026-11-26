import { z } from 'zod'
import {
  LARGO_MAXIMO_DE_CODIGO,
  LARGO_MAXIMO_DE_NOMBRE_DE_TRANSPORTE,
  LARGO_MAXIMO_DE_PAIS,
  ORDEN_MAXIMO_DE_PUERTO,
} from '../../../entities/transporte/catalogo'

// Lo que cruza al servidor al crear o corregir un puerto o una naviera (6.08-1). La base vuelve a revisarlo (`smallint` del orden, nombre único por origen). Crear lleva el id
// del intento y el origen (nulo = compartido); guardar, la versión que se vio.
const nombre = z.string().trim().min(1).max(LARGO_MAXIMO_DE_NOMBRE_DE_TRANSPORTE)
const pais = z.string().trim().min(1).max(LARGO_MAXIMO_DE_PAIS).nullable()
const codigo = z.string().trim().min(1).max(LARGO_MAXIMO_DE_CODIGO).nullable()
const orden = z.number().int().min(0).max(ORDEN_MAXIMO_DE_PUERTO)

const intento = { id: z.guid(), origenId: z.guid().nullable() }
const version = { id: z.guid(), actualizadoEn: z.string().min(1) }

export const esquemaCrearPuerto = z.object({
  ...intento,
  datos: z.object({ nombre, pais, codigo, activo: z.boolean(), orden }),
})

// Sólo lo que cambió (`cambiosDePuerto`): al menos una clave.
export const esquemaGuardarPuerto = z.object({
  ...version,
  cambios: z
    .strictObject({
      nombre: nombre.optional(),
      pais: pais.optional(),
      codigo: codigo.optional(),
      activo: z.boolean().optional(),
      orden: orden.optional(),
    })
    .refine((c) => Object.keys(c).length > 0),
})

export const esquemaCrearNaviera = z.object({
  ...intento,
  datos: z.object({ nombre, activo: z.boolean() }),
})

export const esquemaGuardarNaviera = z.object({
  ...version,
  cambios: z
    .strictObject({ nombre: nombre.optional(), activo: z.boolean().optional() })
    .refine((c) => Object.keys(c).length > 0),
})
