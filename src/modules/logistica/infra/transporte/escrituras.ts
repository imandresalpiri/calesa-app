import 'server-only'
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorConCausa, type ErrorPostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { ESTADOS_DEL_CONTENEDOR } from '../../entities/transporte/estado'
import type {
  EntidadGuardada,
  LoteAplicado,
  RepositorioDeEmbarques,
  UnidadDelLote,
} from '../../entities/transporte/repositorio-de-embarques'
import { inesperado } from './rpc'

// Embarques, contenedores y lo que va en ellos se escriben sólo por RPC, con el cliente de quien pide: la base exige `logistica.transporte.editar` del origen (y, al editar
// uno, de todas sus unidades), la versión de la fila y la de cada unidad del lote. Crear lleva el id del intento: un reintento devuelve lo creado (`ya_existia`).

type ErrorConPista = ErrorPostgrest & { hint?: string | null }

// El `hint` de un rechazo nombra la clave del formulario (que es la de la base); `mover` (23514) dice que una unidad ya va en otro destino: viaja como `causa`.
const CAMPOS_DEL_EMBARQUE = [
  'booking',
  'naviera_id',
  'puerto_origen_id',
  'puerto_destino_id',
  'zarpe_estimado_el',
  'zarpe_el',
  'eta_el',
  'arribo_el',
  'notas',
] as const
const CAMPOS_DEL_CONTENEDOR = ['numero', 'tipo', 'sello', 'embarque_id', 'notas'] as const

function fallo(error: ErrorConPista, campos: readonly string[] = []): ResultadoDeAccion<never> {
  const app = errorConCausa(error)
  const campo = error.hint && campos.includes(error.hint) ? error.hint : null
  return campo && (app.codigo === 'regla' || app.codigo === 'duplicado')
    ? { ok: false, error: app, porCampo: { [campo]: app.mensaje } }
    : { ok: false, error: app }
}

const esquemaDeGuardada = z.object({
  id: z.guid(),
  actualizado_en: z.string(),
  estado: z.enum(ESTADOS_DEL_CONTENEDOR),
  sin_cambios: z.boolean().optional(),
})

function guardada(datos: unknown): ResultadoDeAccion<EntidadGuardada> {
  const leido = esquemaDeGuardada.safeParse(datos)
  return leido.success
    ? {
        ok: true,
        data: {
          id: leido.data.id,
          actualizadoEn: leido.data.actualizado_en,
          estado: leido.data.estado,
          sinCambios: leido.data.sin_cambios === true,
        },
      }
    : inesperado()
}

const esquemaDelLote = z.object({
  sin_cambios: z.boolean(),
  unidades: z.array(
    z.object({
      vehiculo_id: z.guid().nullable(),
      id: z.guid().nullable(),
      actualizado_en: z.string().nullable(),
    }),
  ),
})

function aplicado(datos: unknown): ResultadoDeAccion<LoteAplicado> {
  const leido = esquemaDelLote.safeParse(datos)
  if (!leido.success) {
    return inesperado()
  }
  return {
    ok: true,
    data: {
      sinCambios: leido.data.sin_cambios,
      unidades: leido.data.unidades.flatMap((u) =>
        u.vehiculo_id && u.id && u.actualizado_en
          ? [{ vehiculoId: u.vehiculo_id, transporteId: u.id, actualizadoEn: u.actualizado_en }]
          : [],
      ),
    },
  }
}

const loteParaLaBase = (unidades: UnidadDelLote[]) =>
  unidades.map((u) => ({ vehiculo_id: u.vehiculoId, actualizado_en: u.actualizadoEn }))

export const embarquesSupabase: RepositorioDeEmbarques = {
  crearEmbarque: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('embarque_crear', {
      p_id: p.id,
      p_origen: p.origenId,
      p_datos: p.datos,
    })
    return error ? fallo(error, CAMPOS_DEL_EMBARQUE) : guardada(data)
  },
  guardarEmbarque: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('embarque_guardar', {
      p_id: p.id,
      p_actualizado_en_esperado: p.actualizadoEnEsperado,
      p_cambios: p.cambios,
    })
    return error ? fallo(error, CAMPOS_DEL_EMBARQUE) : guardada(data)
  },
  crearContenedor: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('contenedor_crear', {
      p_id: p.id,
      p_origen: p.origenId,
      p_datos: p.datos,
    })
    return error ? fallo(error, CAMPOS_DEL_CONTENEDOR) : guardada(data)
  },
  guardarContenedor: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('contenedor_guardar', {
      p_id: p.id,
      p_actualizado_en_esperado: p.actualizadoEnEsperado,
      p_cambios: p.cambios,
    })
    return error ? fallo(error, CAMPOS_DEL_CONTENEDOR) : guardada(data)
  },
  asignar: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('transporte_asignar', {
      p_tipo: p.tipo,
      p_destino: p.destinoId,
      p_unidades: loteParaLaBase(p.unidades),
      p_mover: p.mover,
    })
    return error ? fallo(error) : aplicado(data)
  },
  quitar: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('transporte_quitar', {
      p_tipo: p.tipo,
      p_unidades: loteParaLaBase(p.unidades),
    })
    return error ? fallo(error) : aplicado(data)
  },
}
