// Las lecturas y las escrituras de las tablas de referencia con el cliente de la sesión del servidor, uno por pedido (4.23-2).
import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeTablas } from '../../entities/tablas/repositorio'
import { leerTablaParaEditar, leerTablasDeReferencia } from './lectura'
import { estructuraDeTablasSobre } from './estructura'
import { publicacionDeTablasSobre } from './publicacion'

export const getTablasDeReferencia = async (origenId: string) =>
  leerTablasDeReferencia(await createClient(), origenId)

export const getTablaParaEditar = async (tablaId: string) =>
  leerTablaParaEditar(await createClient(), tablaId)

export const tablasSupabase: RepositorioDeTablas = {
  publicar: async (pedido) => publicacionDeTablasSobre(await createClient()).publicar(pedido),
  crear: async (pedido) => estructuraDeTablasSobre(await createClient()).crear(pedido),
  cambiarColumnas: async (pedido) =>
    estructuraDeTablasSobre(await createClient()).cambiarColumnas(pedido),
  desactivar: async (pedido) => estructuraDeTablasSobre(await createClient()).desactivar(pedido),
}
