import 'server-only'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest } from '@/shared/lib/errores'
import {
  campoDelRechazoDeCatalogo,
  creadoDesde,
  guardadoDesde,
  textoDeErrorDeCatalogo,
  type CatalogoCreado,
  type CatalogoGuardado,
  type RechazoDeLaBase,
} from '../../entities/nucleo/catalogos'

// Lo que comparten las escrituras por RPC de los catálogos de logística (puertos, navieras, categorías de gasto): traducir la respuesta y el rechazo. El rechazo
// vuelve con el texto de la base y, si su `hint` es un campo del formulario, también junto a ese campo; `PT409` es un conflicto (`errorDePostgrest`).
const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

type Respuesta = { data: unknown; error: RechazoDeLaBase | null }

export function rechazoDeCatalogo(
  error: RechazoDeLaBase,
  campos: readonly string[],
): ResultadoDeAccion<never> {
  const app = errorDePostgrest(error)
  const mensaje = textoDeErrorDeCatalogo(error) ?? app.mensaje
  const campo = campoDelRechazoDeCatalogo(error, campos)
  return {
    ok: false,
    error: { ...app, mensaje },
    ...(campo ? { porCampo: { [campo]: mensaje } } : {}),
  }
}

const inesperado = (): ResultadoDeAccion<never> => ({
  ok: false,
  error: { codigo: 'inesperado', mensaje: NO_SE_LEYO },
})

/** Lo que devolvió `<catálogo>_crear`: el id y la versión, o el rechazo. */
export function resultadoDeCrear(
  { data, error }: Respuesta,
  campos: readonly string[],
): ResultadoDeAccion<CatalogoCreado> {
  if (error) {
    return rechazoDeCatalogo(error, campos)
  }
  const creado = creadoDesde(data)
  return creado ? { ok: true, data: creado } : inesperado()
}

/** Lo que devolvió `<catálogo>_guardar`: la versión nueva y el uso al desactivar, o el rechazo. */
export function resultadoDeGuardar(
  { data, error }: Respuesta,
  campos: readonly string[],
): ResultadoDeAccion<CatalogoGuardado> {
  if (error) {
    return rechazoDeCatalogo(error, campos)
  }
  const guardado = guardadoDesde(data)
  return guardado ? { ok: true, data: guardado } : inesperado()
}
