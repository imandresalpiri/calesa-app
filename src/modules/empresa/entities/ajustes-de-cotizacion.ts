// Los ajustes de cotización (docs/GLOSARIO.md): la vigencia (D1), la columna de `ajustes_empresa` que vale para todas las cotizaciones. Los cambia `empresa_guardar_ajustes_de_cotizacion()` con la misma
// versión de la fila que el formulario de Empresa; la pantalla, la tarjeta «Vigencia» de Configuración › Orígenes (4.20-4b).
import { origenesCon, type Permisos } from '@/shared/lib/permisos'
import type { Tables } from '@/shared/types/database.types'

export type AjustesDeCotizacion = {
  vigenciaDias: number
  // La versión tal como la dio la base (con sus microsegundos): nunca pasa por `Date`.
  actualizadoEn: string
}

// Lo mismo que el `check` de la columna y la RPC.
export const VIGENCIA_MINIMA_DIAS = 1
export const VIGENCIA_MAXIMA_DIAS = 365

// El modal de la vigencia en la URL (`?panel=vigencia`).
export const PANEL_DE_VIGENCIA = 'vigencia'

// La vigencia tal como se escribe (días enteros, de 1 a 365): el mismo motivo que da el esquema de la action y la base (22023), dicho junto al campo antes de enviar.
export const MOTIVO_DE_VIGENCIA_INVALIDA = `La vigencia va de ${String(VIGENCIA_MINIMA_DIAS)} a ${String(VIGENCIA_MAXIMA_DIAS)} días.`

export function validarVigencia(
  texto: string,
): { ok: true; dias: number } | { ok: false; motivo: string } {
  const limpio = texto.trim()
  if (!/^\d{1,3}$/.test(limpio)) {
    return { ok: false, motivo: MOTIVO_DE_VIGENCIA_INVALIDA }
  }
  const dias = Number(limpio)
  if (dias < VIGENCIA_MINIMA_DIAS || dias > VIGENCIA_MAXIMA_DIAS) {
    return { ok: false, motivo: MOTIVO_DE_VIGENCIA_INVALIDA }
  }
  return { ok: true, dias }
}

// El valor de la tarjeta: «30 días», «1 día».
export const textoDeLaVigencia = (dias: number): string =>
  `${String(dias)} ${dias === 1 ? 'día' : 'días'}`

type FilaDeAjustesDeCotizacion = Pick<Tables<'ajustes_empresa'>, 'vigencia_dias' | 'actualizado_en'>

export function ajustesDeCotizacionDesde(fila: FilaDeAjustesDeCotizacion): AjustesDeCotizacion {
  return {
    vigenciaDias: fila.vigencia_dias,
    actualizadoEn: fila.actualizado_en,
  }
}

// Valen para todas las cotizaciones de todos los orígenes: los cambia quien configura el cotizador en todos (la concesión sin
// origen), no quien lo configura en uno. Espejo de `empresa_guardar_ajustes_de_cotizacion()`, que mira `mis_permisos()` sin origen.
export function puedeCambiarAjustesDeCotizacion(permisos: Permisos): boolean {
  return origenesCon(permisos, 'cotizaciones.configurar') === 'todos'
}
