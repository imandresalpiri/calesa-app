// Escribir un embarque, un contenedor y lo que va en ellos, dicho como interfaz. La implementación (Supabase, por `embarque_crear|guardar`, `contenedor_crear|guardar`,
// `transporte_asignar|quitar`) vive en `infra/transporte/escrituras.ts` y se la entrega `areas/transporte/composicion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { EstadoDelContenedor } from './estado'

// Lo que la base admite de un embarque, con sus claves: una ausente no cambia y `null` vacía. Las fechas van `AAAA-MM-DD`.
export type DatosDelEmbarque = {
  booking?: string
  naviera_id?: string | null
  puerto_origen_id?: string | null
  puerto_destino_id?: string | null
  zarpe_estimado_el?: string | null
  zarpe_el?: string | null
  eta_el?: string | null
  arribo_el?: string | null
  notas?: string | null
}

// Lo de un contenedor: `embarque_id` nulo lo deja sin embarque.
export type DatosDelContenedor = {
  numero?: string
  tipo?: string | null
  sello?: string | null
  embarque_id?: string | null
  notas?: string | null
}

// Crear lleva el id del intento (nace al abrir el formulario): un reintento no duplica.
export type PedidoDeCrear<Datos> = { id: string; origenId: string; datos: Datos }

// Guardar lleva la versión que se leyó (`PT409` si cambió).
export type PedidoDeGuardar<Datos> = {
  id: string
  origenId: string
  actualizadoEnEsperado: string
  cambios: Datos
}

export type TipoDeDestino = 'embarque' | 'contenedor'

// Una unidad del lote con la versión de su transporte que se leyó (nula si todavía no tiene).
export type UnidadDelLote = { vehiculoId: string; actualizadoEn: string | null }

export type PedidoDeAsignar = {
  tipo: TipoDeDestino
  destinoId: string
  // El origen del destino: la action pide el permiso ahí y la base lo vuelve a pedir por unidad.
  origenId: string
  unidades: UnidadDelLote[]
  // Con `true`, las que ya van en otro destino se mudan; sin él, la base frena con `23514 hint mover`.
  mover: boolean
}

export type PedidoDeQuitar = { tipo: TipoDeDestino; origenId: string; unidades: UnidadDelLote[] }

export type EntidadGuardada = {
  id: string
  actualizadoEn: string
  estado: EstadoDelContenedor
  sinCambios: boolean
}

export type LoteAplicado = {
  sinCambios: boolean
  // La versión nueva del transporte de cada unidad.
  unidades: { vehiculoId: string; transporteId: string; actualizadoEn: string }[]
}

export type RepositorioDeEmbarques = {
  crearEmbarque: (
    pedido: PedidoDeCrear<DatosDelEmbarque & { booking: string }>,
  ) => Promise<ResultadoDeAccion<EntidadGuardada>>
  guardarEmbarque: (
    pedido: PedidoDeGuardar<DatosDelEmbarque>,
  ) => Promise<ResultadoDeAccion<EntidadGuardada>>
  crearContenedor: (
    pedido: PedidoDeCrear<DatosDelContenedor & { numero: string }>,
  ) => Promise<ResultadoDeAccion<EntidadGuardada>>
  guardarContenedor: (
    pedido: PedidoDeGuardar<DatosDelContenedor>,
  ) => Promise<ResultadoDeAccion<EntidadGuardada>>
  asignar: (pedido: PedidoDeAsignar) => Promise<ResultadoDeAccion<LoteAplicado>>
  quitar: (pedido: PedidoDeQuitar) => Promise<ResultadoDeAccion<LoteAplicado>>
}
