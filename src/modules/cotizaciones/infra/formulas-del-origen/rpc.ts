// Las escrituras de la barra de la fórmula por `formula_del_origen_crear|renombrar|archivar|eliminar|activar()` con el cliente de la sesión de quien escribe: cada
// RPC vuelve a pedir `cotizaciones.configurar` (al copiar de otro origen, también en ese), compara la versión y valida.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import type { RepositorioDeFormulasDelOrigen } from '../../entities/formulas-del-origen/repositorio'
import {
  resultadoDeActivar,
  resultadoDeCambio,
  resultadoDeCrear,
  resultadoDeEliminar,
} from '../../entities/formulas-del-origen/resultado'

// Los tipos generados no saben que esos parámetros admiten nulo (`default null` o «el origen no tenía»).
const nulable = (valor: string | null) => valor as string

export function formulasDelOrigenSobre(
  cliente: SupabaseClient<Database>,
): RepositorioDeFormulasDelOrigen {
  return {
    crear: async ({ id, origenId, nombre, copiaDe, pieza }) =>
      resultadoDeCrear(
        await cliente.rpc('formula_del_origen_crear', {
          p_id: id,
          p_origen: origenId,
          p_nombre: nombre,
          p_copia_de: nulable(copiaDe),
          p_pieza: pieza,
        }),
      ),
    renombrar: async ({ id, esperada, nombre }) =>
      resultadoDeCambio(
        await cliente.rpc('formula_del_origen_renombrar', {
          p_id: id,
          p_actualizado_en_esperado: esperada,
          p_nombre: nombre,
        }),
      ),
    archivar: async ({ id, esperada }) =>
      resultadoDeCambio(
        await cliente.rpc('formula_del_origen_archivar', {
          p_id: id,
          p_actualizado_en_esperado: esperada,
        }),
      ),
    eliminar: async ({ id, esperada }) =>
      resultadoDeEliminar(
        await cliente.rpc('formula_del_origen_eliminar', {
          p_id: id,
          p_actualizado_en_esperado: esperada,
        }),
        id,
      ),
    activar: async (p) =>
      resultadoDeActivar(
        await cliente.rpc('formula_del_origen_activar', {
          p_id: p.id,
          p_actualizado_en_esperado: p.esperada,
          p_nota: p.nota,
          p_activa_esperada: nulable(p.activaEsperada),
          p_borrador_esperado: nulable(p.borradorEsperado),
          p_publicada_esperada: nulable(p.publicadaEsperada),
          p_plantilla_borrador_esperado: nulable(p.plantillaBorradorEsperado),
          p_plantilla_publicada_esperada: nulable(p.plantillaPublicadaEsperada),
        }),
      ),
  }
}
