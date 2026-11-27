import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { FalloDeEnlace } from '../../../entities/repositorios'

// Lo que vuelve del repositorio de los logos, dicho como resultado de una action: el motivo junto a su campo.
export function comoResultado<T>(
  resultado: { ok: true; data: T } | FalloDeEnlace,
): ResultadoDeAccion<T> {
  if (resultado.ok) {
    return resultado
  }
  const { campo, error } = resultado
  return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
}
