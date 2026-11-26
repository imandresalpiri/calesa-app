import { z } from 'zod'
import { conteoAcotado, conteoEnFrase } from '@/shared/lib/conteo'

// Lo común de los catálogos de logística que son propios de un origen o compartidos (puertos, navieras, categorías de gasto): se escriben sólo por
// RPC (`<catálogo>_crear` con el id del intento, `<catálogo>_guardar` con la versión), y la base dice el rechazo con sus palabras.

export type RechazoDeLaBase = { code?: string | null; message: string; hint?: string | null }

// Lo que las RPC de los catálogos levantan con el texto ya escrito para la persona: sin permiso en el origen (o en uno que lo usa), nombre repetido,
// dato que no vale o de otro origen, y una categoría con gastos.
const CODIGOS_CON_TEXTO_DE_LA_BASE = new Set(['42501', '23505', '22023', '23503'])

/** El texto de un rechazo de la base, tal cual para lo que escriben sus RPC (aunque el nombre que cita parezca técnico); nulo para lo demás. */
export function textoDeErrorDeCatalogo(error: RechazoDeLaBase): string | null {
  return error.code && CODIGOS_CON_TEXTO_DE_LA_BASE.has(error.code) && error.message.trim() !== ''
    ? error.message
    : null
}

/** El campo del formulario de un rechazo (su `hint`) si es uno de `campos` y el rechazo es de un dato (`22023`) o un repetido (`23505`); nulo si no. */
export function campoDelRechazoDeCatalogo(
  error: RechazoDeLaBase,
  campos: readonly string[],
): string | null {
  const deUnDato = error.code === '22023' || error.code === '23505'
  return deUnDato && error.hint && campos.includes(error.hint) ? error.hint : null
}

// `_<catálogo>_uso()` cuenta hasta 51: más de 50 se dice «más de 50», nunca el total.
export const TOPE_DEL_USO = 50

/** El aviso al desactivar algo que se usa: «Desactivaste «X»: lo usan 12 transportes u ofertas; siguen mostrándolo.». */
export function textoDeUso(p: {
  nombre: string
  uso: number
  femenino: boolean
  // Lo que lo usa, en singular y en plural.
  usadoPor: readonly [string, string]
}): string {
  const pronombre = p.femenino ? 'la' : 'lo'
  const cuantos = conteoEnFrase(conteoAcotado(p.uso, TOPE_DEL_USO))
  const uno = p.uso === 1
  const usan = uno ? 'usa' : 'usan'
  const quien = uno ? p.usadoPor[0] : p.usadoPor[1]
  const siguen = uno ? 'sigue' : 'siguen'
  return `Desactivaste «${p.nombre}»: ${pronombre} ${usan} ${cuantos} ${quien}; ${siguen} mostrándo${pronombre}.`
}

export type CatalogoCreado = { id: string; actualizadoEn: string }
// `uso`: cuántos lo usan, sólo al desactivarlo (hasta 51); nulo si no se desactivó.
export type CatalogoGuardado = { actualizadoEn: string; uso: number | null }

const esquemaDeCreado = z.object({ id: z.guid(), actualizado_en: z.string().min(1) })
const esquemaDeGuardado = z.object({
  actualizado_en: z.string().min(1),
  uso: z.number().int().min(0).nullable(),
})

/** La respuesta de `<catálogo>_crear`; nula si no tiene la forma esperada. */
export function creadoDesde(datos: unknown): CatalogoCreado | null {
  const leido = esquemaDeCreado.safeParse(datos)
  return leido.success ? { id: leido.data.id, actualizadoEn: leido.data.actualizado_en } : null
}

/** La respuesta de `<catálogo>_guardar`; nula si no tiene la forma esperada. */
export function guardadoDesde(datos: unknown): CatalogoGuardado | null {
  const leido = esquemaDeGuardado.safeParse(datos)
  return leido.success ? { actualizadoEn: leido.data.actualizado_en, uso: leido.data.uso } : null
}
