import 'server-only'
import { elementoDeCatalogoDesde, rechazoDelCatalogo } from '@/shared/lib/catalogo'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  categoriasDeFaqDesde,
  ordenDeCategoriaNueva,
  ordenesTrasMover,
  TOPE_DE_CATEGORIAS_DE_FAQ,
  COLUMNAS_DE_CATEGORIA_DE_FAQ,
} from '../../entities/contenido/categorias-de-faq'
import {
  ORDEN_CAMBIADO,
  rechazoDeEscritura,
  sinFilas,
  SIN_PERMISO_PARA_CONTENIDO,
  type ErrorAlEscribir,
} from '../../entities/contenido/errores'
import type { EscritorDeCategoriasDeFaq } from '../../entities/contenido/repositorios'

type Cliente = Awaited<ReturnType<typeof createClient>>

const TOPE_ALCANZADO = `Ya hay ${String(TOPE_DE_CATEGORIAS_DE_FAQ)} categorías, el máximo: quita una que no uses.`
const CAMBIADA = 'Otra persona cambió esta categoría mientras la editabas.'
const YA_NO_EXISTE = 'Esa categoría ya no existe: recarga.'
const MAS_DE_LAS_QUE_SE_VEN =
  'Hay más categorías de las que se muestran; ordénalas desde las primeras.'

// El error de la base como valor: sin permiso con el texto del contenido; lo demás con su mensaje y, si nombra un dato (`hint`), junto a él.
function rechazo(error: ErrorAlEscribir): ResultadoDeAccion<never> {
  return error.code === '42501' ? rechazoDeEscritura(error) : rechazoDelCatalogo(error)
}

// Una escritura con la versión esperada quedó en cero filas: se relee por id para decir ya no existe, conflicto o sin permiso.
async function ceroFilas(
  supabase: Cliente,
  id: string,
  esperada: string,
  conflicto = CAMBIADA,
): Promise<ResultadoDeAccion<never>> {
  const { data, error } = await supabase
    .from('web_categorias_faqs')
    .select('actualizado_en')
    .eq('id', id)
    .limit(1)
  if (error) {
    return rechazo(error)
  }
  const fila = data[0]
  return sinFilas(
    { existe: fila !== undefined, versionDistinta: fila?.actualizado_en !== esperada },
    conflicto,
    { yaNoExiste: YA_NO_EXISTE, sinPermiso: SIN_PERMISO_PARA_CONTENIDO },
  )
}

// Las categorías de FAQ se escriben directo bajo la RLS (`web.contenido.gestionar`): no otorgan permisos. Quitar va por la RPC
// `web_categoria_faq_eliminar` porque mueve preguntas. La base limpia el nombre y rechaza el que ya existe con otra escritura («Ya existe
// «X».», 23505) o el largo (23514), con `hint` `nombre`: su mensaje es el que se muestra.
export const escritorDeCategoriasDeFaq: EscritorDeCategoriasDeFaq = {
  async crear(nombre) {
    const supabase = await createClient()
    // `web_categorias_faqs_pkey`: decenas de filas, el orden de la nueva sale de las últimas.
    const leidas = await supabase
      .from('web_categorias_faqs')
      .select('orden')
      .order('orden', { ascending: false })
      .limit(TOPE_DE_CATEGORIAS_DE_FAQ)
    if (leidas.error) {
      return rechazo(leidas.error)
    }
    if (leidas.data.length >= TOPE_DE_CATEGORIAS_DE_FAQ) {
      return fallo('regla', TOPE_ALCANZADO)
    }
    const { data, error } = await supabase
      .from('web_categorias_faqs')
      .insert({ nombre, orden: ordenDeCategoriaNueva(leidas.data.map((fila) => fila.orden)) })
      .select(COLUMNAS_DE_CATEGORIA_DE_FAQ)
      .limit(1)
    if (error) {
      return rechazo(error)
    }
    const fila = data[0]
    return fila === undefined
      ? fallo('sin_permiso', 'No se pudo crear la categoría.')
      : ok(elementoDeCatalogoDesde(fila))
  },

  async guardar({ id, actualizadoEnEsperado, cambios }) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('web_categorias_faqs')
      .update({
        ...(cambios.nombre === undefined ? {} : { nombre: cambios.nombre }),
        ...(cambios.activo === undefined ? {} : { activa: cambios.activo }),
      })
      .eq('id', id)
      .eq('actualizado_en', actualizadoEnEsperado)
      .select('actualizado_en')
      .limit(1)
    if (error) {
      return rechazo(error)
    }
    const fila = data[0]
    return fila ? ok(fila.actualizado_en) : ceroFilas(supabase, id, actualizadoEnEsperado)
  },

  async mover({ id, actualizadoEnEsperado, despuesDe }) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('web_categorias_faqs')
      .select(COLUMNAS_DE_CATEGORIA_DE_FAQ)
      .order('orden')
      .order('id')
      .limit(TOPE_DE_CATEGORIAS_DE_FAQ + 1)
    if (error) {
      return rechazo(error)
    }
    const lista = categoriasDeFaqDesde(data)
    if (lista === null) {
      return fallo('inesperado', 'No se pudieron leer las categorías.')
    }
    // Sin la lista completa el orden mostrado no es el de la base (la interfaz ya avisa del tope).
    if (lista.length > TOPE_DE_CATEGORIAS_DE_FAQ) {
      return fallo('regla', MAS_DE_LAS_QUE_SE_VEN)
    }
    const movida = lista.find((categoria) => categoria.id === id)
    if (movida?.actualizadoEn !== actualizadoEnEsperado) {
      return fallo('conflicto', movida ? CAMBIADA : YA_NO_EXISTE)
    }
    const cambios = ordenesTrasMover(lista, id, despuesDe)
    if (cambios === null) {
      return fallo('conflicto', ORDEN_CAMBIADO)
    }
    for (const cambio of cambios) {
      const escrita = await supabase
        .from('web_categorias_faqs')
        .update({ orden: cambio.orden })
        .eq('id', cambio.id)
        .eq('actualizado_en', cambio.actualizadoEn)
        .select('id')
        .limit(1)
      if (escrita.error) {
        return rechazo(escrita.error)
      }
      if (escrita.data.length === 0) {
        return ceroFilas(supabase, cambio.id, cambio.actualizadoEn, ORDEN_CAMBIADO)
      }
    }
    return ok(null)
  },

  async quitar({ id, actualizadoEnEsperado, destino }) {
    const supabase = await createClient()
    const { error } = await supabase.rpc('web_categoria_faq_eliminar', {
      p_categoria: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_mover: destino.mover,
      ...(destino.mover && destino.destino !== null ? { p_destino: destino.destino } : {}),
    })
    return error ? rechazo(error) : ok(null)
  },
}
