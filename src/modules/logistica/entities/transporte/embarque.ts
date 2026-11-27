import { z } from 'zod'
import { ESTADOS_DEL_CONTENEDOR, ESTADOS_DEL_EMBARQUE } from './estado'
import type { EstadoDelContenedor, EstadoDelEmbarque } from './estado'

// Un embarque y un contenedor leídos por su id (`embarque_leer`, `contenedor_leer`): lo que dibujan la página del embarque y el drawer del contenedor. El estado, el conteo y si a un
// vehículo le falta algo los calcula la base; acá sólo se leen. Ningún número es un total exacto: `{ n, hayMas }` (tope 100).

export type Conteo = { n: number; hayMas: boolean }

export type VehiculoDelEmbarque = {
  vehiculoId: string
  titulo: string
  vin: string | null
  lote: string | null
  faseId: string | null
  fase: string | null
  faseColor: string | null
  contenedorId: string | null
  contenedor: string | null
  // La versión de su fila de transporte (la que se manda al sacarlo).
  transporteActualizadoEn: string
  // Le falta algo para su fase siguiente (el criterio de «Trabados»).
  falta: boolean
  // La declaración viva que lo cubre.
  declaracion: { id: string; numero: string | null } | null
}

export type ContenedorDelEmbarque = {
  id: string
  numero: string
  tipo: string | null
  tipoNombre: string | null
  sello: string | null
  estado: EstadoDelContenedor
  actualizadoEn: string
}

export type DatosDelEmbarqueLeido = {
  id: string
  booking: string
  navieraId: string | null
  puertoOrigenId: string | null
  puertoDestinoId: string | null
  zarpeEstimadoEl: string | null
  zarpeEl: string | null
  etaEl: string | null
  arriboEl: string | null
  actualizadoEn: string
  estado: EstadoDelEmbarque
}

export type EmbarqueLeido = DatosDelEmbarqueLeido & {
  origenId: string
  notas: string | null
  contenedores: ContenedorDelEmbarque[]
  hayMasContenedores: boolean
  vehiculos: VehiculoDelEmbarque[]
  hayMas: boolean
  // Lleva vehículos que quien mira no ve.
  hayOcultos: boolean
  conteo: Conteo
  // Se pueden editar todas sus unidades (`_embarque_editable`): sin eso, la base no deja cambiarlo.
  editable: boolean
}

export type ContenedorLeido = {
  id: string
  origenId: string
  numero: string
  tipo: string | null
  tipoNombre: string | null
  sello: string | null
  notas: string | null
  actualizadoEn: string
  estado: EstadoDelContenedor
  embarque: {
    id: string
    booking: string
    estado: EstadoDelEmbarque
    zarpeEl: string | null
    etaEl: string | null
    arriboEl: string | null
  } | null
  vehiculos: VehiculoDelEmbarque[]
  hayMas: boolean
  hayOcultos: boolean
  editable: boolean
}

const fecha = z.string().nullable()
export const esquemaDeConteo = z
  .object({ n: z.number(), hay_mas: z.boolean() })
  .transform((c) => ({ n: c.n, hayMas: c.hay_mas }))

const esquemaDelVehiculo = z
  .object({
    vehiculo_id: z.guid(),
    titulo: z.string().nullable(),
    vin: z.string().nullable(),
    lote: z.string().nullable(),
    fase_id: z.guid().nullable(),
    fase: z.string().nullable(),
    fase_color: z.string().nullable(),
    contenedor_id: z.guid().nullable(),
    contenedor: z.string().nullable(),
    transporte_actualizado_en: z.string(),
    falta: z.boolean().nullable(),
    declaracion: z.object({ id: z.guid(), numero: z.string().nullable() }).nullable(),
  })
  .transform((v): VehiculoDelEmbarque => ({
    vehiculoId: v.vehiculo_id,
    titulo: v.titulo ?? 'Sin título',
    vin: v.vin,
    lote: v.lote,
    faseId: v.fase_id,
    fase: v.fase,
    faseColor: v.fase_color,
    contenedorId: v.contenedor_id,
    contenedor: v.contenedor,
    transporteActualizadoEn: v.transporte_actualizado_en,
    falta: v.falta === true,
    declaracion: v.declaracion,
  }))

const esquemaDelContenedorDelEmbarque = z
  .object({
    id: z.guid(),
    numero: z.string(),
    tipo: z.string().nullable(),
    tipo_nombre: z.string().nullable(),
    sello: z.string().nullable(),
    estado: z.enum(ESTADOS_DEL_CONTENEDOR),
    actualizado_en: z.string(),
  })
  .transform((c): ContenedorDelEmbarque => ({
    id: c.id,
    numero: c.numero,
    tipo: c.tipo,
    tipoNombre: c.tipo_nombre,
    sello: c.sello,
    estado: c.estado,
    actualizadoEn: c.actualizado_en,
  }))

// Lo de un embarque que comparten la lista y la lectura por id.
export const camposDelEmbarque = {
  id: z.guid(),
  booking: z.string(),
  naviera_id: z.guid().nullable(),
  puerto_origen_id: z.guid().nullable(),
  puerto_destino_id: z.guid().nullable(),
  zarpe_estimado_el: fecha,
  zarpe_el: fecha,
  eta_el: fecha,
  arribo_el: fecha,
  actualizado_en: z.string(),
  estado: z.enum(ESTADOS_DEL_EMBARQUE),
}

type CamposDelEmbarque = z.infer<z.ZodObject<typeof camposDelEmbarque>>

export function datosDelEmbarque(e: CamposDelEmbarque): DatosDelEmbarqueLeido {
  return {
    id: e.id,
    booking: e.booking,
    navieraId: e.naviera_id,
    puertoOrigenId: e.puerto_origen_id,
    puertoDestinoId: e.puerto_destino_id,
    zarpeEstimadoEl: e.zarpe_estimado_el,
    zarpeEl: e.zarpe_el,
    etaEl: e.eta_el,
    arriboEl: e.arribo_el,
    actualizadoEn: e.actualizado_en,
    estado: e.estado,
  }
}

const esquemaDelEmbarqueLeido = z.object({
  ...camposDelEmbarque,
  origen_id: z.guid(),
  notas: z.string().nullable(),
  contenedores: z.array(esquemaDelContenedorDelEmbarque),
  hay_mas_contenedores: z.boolean(),
  vehiculos: z.array(esquemaDelVehiculo),
  hay_mas: z.boolean(),
  hay_ocultos: z.boolean(),
  conteo: esquemaDeConteo,
  editable: z.boolean(),
})

/** Lo que devolvió `embarque_leer()`; nulo si no tiene la forma esperada. */
export function embarqueLeidoDesde(datos: unknown): EmbarqueLeido | null {
  const r = esquemaDelEmbarqueLeido.safeParse(datos)
  if (!r.success) return null
  const d = r.data
  return {
    ...datosDelEmbarque(d),
    origenId: d.origen_id,
    notas: d.notas,
    contenedores: d.contenedores,
    hayMasContenedores: d.hay_mas_contenedores,
    vehiculos: d.vehiculos,
    hayMas: d.hay_mas,
    hayOcultos: d.hay_ocultos,
    conteo: d.conteo,
    editable: d.editable,
  }
}

const esquemaDelContenedorLeido = z.object({
  id: z.guid(),
  origen_id: z.guid(),
  numero: z.string(),
  tipo: z.string().nullable(),
  tipo_nombre: z.string().nullable(),
  sello: z.string().nullable(),
  notas: z.string().nullable(),
  actualizado_en: z.string(),
  estado: z.enum(ESTADOS_DEL_CONTENEDOR),
  embarque: z
    .object({
      id: z.guid(),
      booking: z.string(),
      estado: z.enum(ESTADOS_DEL_EMBARQUE),
      zarpe_el: fecha,
      eta_el: fecha,
      arribo_el: fecha,
    })
    .nullable(),
  vehiculos: z.array(esquemaDelVehiculo),
  hay_mas: z.boolean(),
  hay_ocultos: z.boolean(),
  editable: z.boolean(),
})

/** Lo que devolvió `contenedor_leer()`; nulo si no tiene la forma esperada. */
export function contenedorLeidoDesde(datos: unknown): ContenedorLeido | null {
  const r = esquemaDelContenedorLeido.safeParse(datos)
  if (!r.success) return null
  const d = r.data
  return {
    id: d.id,
    origenId: d.origen_id,
    numero: d.numero,
    tipo: d.tipo,
    tipoNombre: d.tipo_nombre,
    sello: d.sello,
    notas: d.notas,
    actualizadoEn: d.actualizado_en,
    estado: d.estado,
    embarque: d.embarque && {
      id: d.embarque.id,
      booking: d.embarque.booking,
      estado: d.embarque.estado,
      zarpeEl: d.embarque.zarpe_el,
      etaEl: d.embarque.eta_el,
      arriboEl: d.embarque.arribo_el,
    },
    vehiculos: d.vehiculos,
    hayMas: d.hay_mas,
    hayOcultos: d.hay_ocultos,
    editable: d.editable,
  }
}
