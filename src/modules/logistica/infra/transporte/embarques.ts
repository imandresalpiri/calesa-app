import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_PAGINA_POR_DEFECTO } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import {
  contenedorLeidoDesde,
  embarqueLeidoDesde,
  type ContenedorLeido,
  type EmbarqueLeido,
} from '../../entities/transporte/embarque'
import type { PedidoDeEmbarques } from '../../entities/transporte/filtros-de-embarques'
import {
  paginaDeContenedoresDesde,
  paginaDeEmbarquesDesde,
  type PaginaDeContenedores,
  type PaginaDeEmbarques,
} from '../../entities/transporte/lista-de-embarques'
import { NO_SE_LEYO, nuloParaLaBase } from './rpc'

// `/logistica/embarques` y la página de un embarque leen sólo por RPC, con la sesión de quien mira: la base lista las entidades del origen (también las vacías) y cuenta sólo los vehículos
// que quien mira ve. Las listas, por cursor opaco (el id de la última fila) de a `TAMANO_DE_PAGINA_POR_DEFECTO`, por `embarques_origen_booking_idx` y `contenedores_origen_numero_idx`;
// recorren a lo sumo 500 por llamada (`cortada`). Un embarque y un contenedor, por su clave primaria (`embarques_pkey`, `contenedores_pkey`) con sus contenedores
// (`contenedores_embarque_idx`) y sus vehículos (`transportes_embarque_idx`, `transportes_contenedor_id_idx`) en la misma lectura.

const NO_ESTA = 'No existe o ya no lo ves.'

function inesperado(): Resultado<never> {
  return fallo('inesperado', NO_SE_LEYO)
}

export async function leerEmbarques(
  pedido: PedidoDeEmbarques,
): Promise<Resultado<PaginaDeEmbarques>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('embarques_listar', {
    p_origen: pedido.origenId,
    p_desde: nuloParaLaBase(pedido.desde),
    p_tope: TAMANO_DE_PAGINA_POR_DEFECTO,
    p_filtros: pedido.filtros,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeEmbarquesDesde(data)
  return pagina === null ? inesperado() : ok(pagina)
}

export async function leerContenedores(
  pedido: PedidoDeEmbarques,
): Promise<Resultado<PaginaDeContenedores>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('contenedores_listar', {
    p_origen: pedido.origenId,
    p_desde: nuloParaLaBase(pedido.desde),
    p_tope: TAMANO_DE_PAGINA_POR_DEFECTO,
    p_filtros: pedido.filtros,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeContenedoresDesde(data)
  return pagina === null ? inesperado() : ok(pagina)
}

// El que no existe, el de repuestos y el de un origen cuya logística no se ve dan el mismo P0002: la pantalla dice una sola cosa.
function noEncontrado(error: { code?: string | null }): boolean {
  return error.code === 'P0002'
}

/** Un embarque por su id; con `falta`, sólo los vehículos con algo que falta. */
export async function leerEmbarque(
  id: string,
  { falta }: { falta: boolean },
): Promise<Resultado<EmbarqueLeido>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('embarque_leer', { p_id: id, p_falta: falta })
  if (error) {
    return noEncontrado(error)
      ? fallo('no_encontrado', NO_ESTA)
      : { ok: false, error: errorDePostgrest(error) }
  }
  const embarque = embarqueLeidoDesde(data)
  return embarque === null ? inesperado() : ok(embarque)
}

export async function leerContenedor(id: string): Promise<Resultado<ContenedorLeido>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('contenedor_leer', { p_id: id })
  if (error) {
    return noEncontrado(error)
      ? fallo('no_encontrado', NO_ESTA)
      : { ok: false, error: errorDePostgrest(error) }
  }
  const contenedor = contenedorLeidoDesde(data)
  return contenedor === null ? inesperado() : ok(contenedor)
}

// El catálogo fijo de tipos de contenedor (20, 40, 40HC…: decenas de filas, se escribe sólo por migración; `tipos_contenedor_pkey`, policy `using (true)`), para el selector «Tipo».
const TOPE_DE_TIPOS_DE_CONTENEDOR = 50

export type TipoDeContenedor = { clave: string; nombre: string }

export async function leerTiposDeContenedor(): Promise<Resultado<TipoDeContenedor[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tipos_contenedor')
    .select('clave, nombre')
    .eq('activo', true)
    .order('orden')
    .limit(TOPE_DE_TIPOS_DE_CONTENEDOR)
  return error ? { ok: false, error: errorDePostgrest(error) } : ok(data)
}
