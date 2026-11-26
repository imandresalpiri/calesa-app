// Crear y corregir puertos y navieras, dicho como interfaz (6.08-1). La implementación (Supabase, por las RPC `puerto_crear|guardar` y `naviera_crear|guardar`) vive en
// `infra/transporte/catalogos.ts` y se la entrega `areas/transporte/composicion.ts`. Sin borrar: se desactivan (D3).
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { CatalogoCreado, CatalogoGuardado } from '../nucleo/catalogos'
import type { DatosDeNaviera, DatosDePuerto } from './catalogo'

// Crear: `id` es el del intento (reintentar con el mismo no crea otro); `origenId` nulo = compartido con todos los orígenes.
type PedidoDeCrear<Datos> = { id: string; origenId: string | null; datos: Datos }
// Guardar: `cambios` es sólo lo que cambió (`cambiosDePuerto`, `cambiosDeNaviera`) y `actualizadoEn`, la versión que se vio.
type PedidoDeGuardar<Datos> = { id: string; actualizadoEn: string; cambios: Partial<Datos> }

export type RepositorioDeCatalogosDeTransporte = {
  crearPuerto: (pedido: PedidoDeCrear<DatosDePuerto>) => Promise<ResultadoDeAccion<CatalogoCreado>>
  guardarPuerto: (
    pedido: PedidoDeGuardar<DatosDePuerto>,
  ) => Promise<ResultadoDeAccion<CatalogoGuardado>>
  crearNaviera: (
    pedido: PedidoDeCrear<DatosDeNaviera>,
  ) => Promise<ResultadoDeAccion<CatalogoCreado>>
  guardarNaviera: (
    pedido: PedidoDeGuardar<DatosDeNaviera>,
  ) => Promise<ResultadoDeAccion<CatalogoGuardado>>
}
