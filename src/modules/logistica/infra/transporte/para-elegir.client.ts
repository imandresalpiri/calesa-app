// Lo que ofrecen los selectores de los formularios, leído desde el navegador al abrirlos: los contenedores sin embarque del origen («Agregar contenedor» › «Elegir uno sin embarque»)
// y los embarques del origen («Asignar a un embarque» de un contenedor). Las mismas RPC de la lista (`contenedores_listar`, `embarques_listar`), de a `TOPE_PARA_ELEGIR` por
// `contenedores_origen_numero_idx` y `embarques_origen_booking_idx`; con más, se busca por prefijo (3 letras o dígitos seguidos).
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  paginaDeContenedoresDesde,
  paginaDeEmbarquesDesde,
  type ContenedorDeLaLista,
  type EmbarqueDeLaLista,
} from '../../entities/transporte/lista-de-embarques'
import { TOPE_PARA_ELEGIR } from '../../entities/transporte/filtros-de-embarques'

export { TOPE_PARA_ELEGIR }

export const NO_SE_CARGARON_LAS_OPCIONES = 'No se pudieron cargar las opciones.'

export type OpcionesParaElegir<Fila> = { filas: Fila[]; hayMas: boolean }

const conPrefijo = (prefijo: string | null) => (prefijo === null ? {} : { prefijo })

export async function leerContenedoresSinEmbarque(
  origenId: string,
  prefijo: string | null,
): Promise<Resultado<OpcionesParaElegir<ContenedorDeLaLista>>> {
  const { data, error } = await createClient().rpc('contenedores_listar', {
    p_origen: origenId,
    p_desde: null as unknown as string,
    p_tope: TOPE_PARA_ELEGIR,
    p_filtros: { estado: 'sin_embarque', ...conPrefijo(prefijo) },
  })
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const pagina = paginaDeContenedoresDesde(data)
  return pagina === null
    ? fallo('inesperado', NO_SE_CARGARON_LAS_OPCIONES)
    : ok({ filas: pagina.filas, hayMas: pagina.siguiente !== null })
}

export async function leerEmbarquesParaElegir(
  origenId: string,
  prefijo: string | null,
): Promise<Resultado<OpcionesParaElegir<EmbarqueDeLaLista>>> {
  const { data, error } = await createClient().rpc('embarques_listar', {
    p_origen: origenId,
    p_desde: null as unknown as string,
    p_tope: TOPE_PARA_ELEGIR,
    p_filtros: conPrefijo(prefijo),
  })
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const pagina = paginaDeEmbarquesDesde(data)
  return pagina === null
    ? fallo('inesperado', NO_SE_CARGARON_LAS_OPCIONES)
    : ok({ filas: pagina.filas, hayMas: pagina.siguiente !== null })
}
