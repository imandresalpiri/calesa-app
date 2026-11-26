// Crear, corregir y eliminar una categoría de gasto, dicho como interfaz (6.11-4). La implementación (Supabase, por las RPC `categoria_gasto_crear|guardar|eliminar`) vive en
// `infra/dinero/categorias.ts` y se la entrega `areas/dinero/composicion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { CatalogoCreado, CatalogoGuardado } from '../nucleo/catalogos'
import type { DatosDeCategoria } from './categoria'

export type RepositorioDeCategorias = {
  // `id` es el del intento (reintentar con el mismo no crea otra); `origenId` nulo = compartida con todos los orígenes.
  crear: (pedido: {
    id: string
    origenId: string | null
    datos: DatosDeCategoria
  }) => Promise<ResultadoDeAccion<CatalogoCreado>>
  // `cambios` es sólo lo que cambió (`cambiosDeCategoria`) y `actualizadoEn`, la versión que se vio.
  guardar: (pedido: {
    id: string
    actualizadoEn: string
    cambios: Partial<DatosDeCategoria>
  }) => Promise<ResultadoDeAccion<CatalogoGuardado>>
  // La base no borra una categoría con gastos: responde 23503 con ««X» tiene gastos: desactívala.».
  eliminar: (pedido: {
    id: string
    actualizadoEn: string
  }) => Promise<ResultadoDeAccion<{ id: string }>>
}
