import 'server-only'
import { conflicto, errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import type { RepositorioPerfil } from '../entities/repositorios'

const actualizar: RepositorioPerfil['actualizar'] = async (pedido) => {
  const { usuarioId, nombre, avatarRuta, avatarMiniaturaRuta, actualizadoEnEsperado } = pedido
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('perfiles')
    .update(
      avatarRuta === undefined
        ? { nombre }
        : { nombre, avatar_ruta: avatarRuta, avatar_miniatura_ruta: avatarMiniaturaRuta ?? null },
    )
    .eq('id', usuarioId)
    // Si alguien (otra pestaña, quien administra el equipo) lo cambió después de abrir el
    // formulario, ninguna fila coincide y no se pisa nada.
    .eq('actualizado_en', actualizadoEnEsperado)
    .select('actualizado_en')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const fila = data[0]
  if (!fila) {
    return conflicto('Tu perfil cambió desde que abriste esta pantalla.')
  }
  return ok({ actualizadoEn: fila.actualizado_en })
}

const guardarPreferencia: RepositorioPerfil['guardarPreferencia'] = async (
  usuarioId,
  { clave, valor },
) => {
  const supabase = await createClient()
  const tabla = supabase.from('preferencias_usuario')
  // `null` = volver a lo automático: se borra la fila en vez de guardar un null.
  const { error } =
    valor === null
      ? await tabla.delete().eq('usuario_id', usuarioId).eq('clave', clave)
      : await tabla.upsert({ usuario_id: usuarioId, clave, valor })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(null)
}

const leerPreferencia: RepositorioPerfil['leerPreferencia'] = async (usuarioId, clave) => {
  const supabase = await createClient()
  // Por la PK `(usuario_id, clave)`: una fila.
  const { data, error } = await supabase
    .from('preferencias_usuario')
    .select('valor')
    .eq('usuario_id', usuarioId)
    .eq('clave', clave)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data[0]?.valor ?? null)
}

const escribirPreferencia: RepositorioPerfil['escribirPreferencia'] = async (
  usuarioId,
  clave,
  valor,
) => {
  const supabase = await createClient()
  const { error } = await supabase
    .from('preferencias_usuario')
    .upsert({ usuario_id: usuarioId, clave, valor: valor as NonNullable<Json> })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(null)
}

const leerFichaDeQuienPresenta: RepositorioPerfil['leerFichaDeQuienPresenta'] = async (
  usuarioId,
) => {
  const supabase = await createClient()
  // Por la PK: una fila. `perfiles: leer` deja ver la propia.
  const { data, error } = await supabase
    .from('perfiles')
    .select('nombre, cargo, cargo_web, telefono, whatsapp_web')
    .eq('id', usuarioId)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const fila = data[0]
  return ok({
    nombre: fila?.nombre ?? '',
    cargo: fila?.cargo ?? null,
    cargoWeb: fila?.cargo_web ?? null,
    telefono: fila?.telefono ?? null,
    whatsapp: fila?.whatsapp_web ?? null,
  })
}

export const perfilSupabase: RepositorioPerfil = {
  actualizar,
  guardarPreferencia,
  leerPreferencia,
  escribirPreferencia,
  leerFichaDeQuienPresenta,
}
