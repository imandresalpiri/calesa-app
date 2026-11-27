import { z } from 'zod'
import { TOPE_DE_LA_SELECCION } from '../../../entities/nucleo/seleccion'
import { codigoDeTransporte } from './embarque'

// Lo que cruza al servidor al sumar vehículos a un embarque o a un contenedor, o al sacarlos: de 1 a 200 (el tope de `transporte_asignar`), cada uno una sola vez y con la
// versión de su transporte que se leyó (nula si todavía no tiene).
const id = z.guid()
const tipo = z.enum(['embarque', 'contenedor'])

const lote = z
  .array(z.strictObject({ vehiculoId: id, actualizadoEn: z.string().min(1).nullable() }))
  .min(1, { error: 'Elige al menos un vehículo.' })
  .max(TOPE_DE_LA_SELECCION, { error: `Hasta ${TOPE_DE_LA_SELECCION} vehículos por vez.` })
  .refine((us) => new Set(us.map((u) => u.vehiculoId)).size === us.length, {
    error: 'Cada vehículo va una sola vez.',
  })

export const esquemaAsignarUnidades = z.strictObject({
  tipo,
  destinoId: id,
  origenId: id,
  unidades: lote,
  mover: z.boolean(),
})

export const esquemaQuitarUnidades = z.strictObject({ tipo, origenId: id, unidades: lote })

// Poner un vehículo en un embarque o un contenedor, de los que hay o nuevo (`nuevo` con lo mínimo: booking y naviera del embarque, número y tipo del contenedor): uno nuevo se crea
// antes con `id` como id del intento, y un reintento no lo duplica.
export const esquemaPonerElVehiculoEnTransporte = z.strictObject({
  origenId: id,
  vehiculoId: id,
  actualizadoEn: z.string().min(1).nullable(),
  destino: z.discriminatedUnion('tipo', [
    z.strictObject({
      tipo: z.literal('embarque'),
      id,
      nuevo: z
        .strictObject({ booking: codigoDeTransporte('booking'), naviera_id: id.nullable() })
        .nullable(),
    }),
    z.strictObject({
      tipo: z.literal('contenedor'),
      id,
      nuevo: z
        .strictObject({
          numero: codigoDeTransporte('número'),
          tipo: z.string().min(1).max(40).nullable(),
        })
        .nullable(),
    }),
  ]),
  mover: z.boolean(),
})

export type EntradaAsignarUnidades = z.input<typeof esquemaAsignarUnidades>
export type EntradaQuitarUnidades = z.input<typeof esquemaQuitarUnidades>
export type EntradaPonerElVehiculoEnTransporte = z.input<typeof esquemaPonerElVehiculoEnTransporte>
