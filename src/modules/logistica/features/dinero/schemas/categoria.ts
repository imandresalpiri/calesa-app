import { z } from 'zod'
import {
  LARGO_MAXIMO_DE_NOMBRE_DE_CATEGORIA,
  ORDEN_MAXIMO_DE_CATEGORIA,
  PROPOSITOS_DE_CATEGORIA,
} from '../../../entities/dinero/categoria'

// Lo que cruza al servidor al crear, corregir o eliminar una categoría de gasto (6.11-4). La base vuelve a revisarlo (`check` del propósito, `smallint` del orden, nombre único
// por origen). Crear lleva el id del intento y el origen (nulo = compartida); guardar y eliminar, la versión que se vio.
const nombre = z.string().trim().min(1).max(LARGO_MAXIMO_DE_NOMBRE_DE_CATEGORIA)
const proposito = z
  .string()
  .refine((valor) => PROPOSITOS_DE_CATEGORIA.some((p) => p.valor === valor))
  .nullable()
const orden = z.number().int().min(0).max(ORDEN_MAXIMO_DE_CATEGORIA)

export const esquemaCrearCategoria = z.object({
  id: z.guid(),
  origenId: z.guid().nullable(),
  datos: z.object({ nombre, proposito, activo: z.boolean(), orden }),
})

// Sólo lo que cambió (`cambiosDeCategoria`): al menos una clave.
export const esquemaGuardarCategoria = z.object({
  id: z.guid(),
  actualizadoEn: z.string().min(1),
  cambios: z
    .strictObject({
      nombre: nombre.optional(),
      proposito: proposito.optional(),
      activo: z.boolean().optional(),
      orden: orden.optional(),
    })
    .refine((c) => Object.keys(c).length > 0),
})
