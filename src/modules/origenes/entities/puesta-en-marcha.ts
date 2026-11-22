// La puesta en marcha de un origen (docs/GLOSARIO.md): el paso a paso que lleva a quien lo crea hasta cotizar con él. Como «Para cotizar y
// mover», se deriva de lo que hay (campos, fases, fórmula de trabajo, fórmula activa) y no de un «paso actual» guardado: lo hecho fuera del paso a
// paso cuenta igual, y si alguien deshace algo, el paso vuelve a faltar. Los permisos llegan ya resueltos para este origen (los calcula `src/app`).
import { PASOS_DE_LA_PUESTA_EN_MARCHA, type PasoDeLaPuestaEnMarcha } from '@/shared/lib/rutas'
import type { OrigenConUso } from './origen'

export { PASOS_DE_LA_PUESTA_EN_MARCHA, type PasoDeLaPuestaEnMarcha }

// Lo que dibuja cada paso en el paso a paso: hecho, pendiente o, sin el permiso en este origen, apagado con su motivo.
export type EstadoDelPaso = 'hecho' | 'pendiente' | 'sin_permiso'

export type PasoConEstado = {
  clave: PasoDeLaPuestaEnMarcha
  titulo: string
  hecho: boolean
  conPermiso: boolean
}

// Los tres permisos que piden los pasos, ya mirados en este origen: `origenes.gestionar` (Datos y Campos), `flujos.configurar` (Flujo) y
// `cotizaciones.configurar` (Fórmula, Tarjeta y Publicar).
export type PermisosDeLaPuestaEnMarcha = { gestionar: boolean; flujo: boolean; cotizador: boolean }

export type EstadoDeLaPuestaEnMarcha = readonly PasoConEstado[]

export const TITULO_DEL_PASO: Record<PasoDeLaPuestaEnMarcha, string> = {
  datos: 'Datos',
  campos: 'Campos',
  flujo: 'Flujo',
  formula: 'Fórmula',
  tarjeta: 'Tarjeta',
  publicar: 'Publicar',
}

export const MOTIVO_SIN_GESTIONAR_EL_ORIGEN =
  'Lo configura quien tiene el permiso «Gestionar orígenes».'

const PERMISO_DEL_PASO: Record<PasoDeLaPuestaEnMarcha, keyof PermisosDeLaPuestaEnMarcha> = {
  datos: 'gestionar',
  campos: 'gestionar',
  flujo: 'flujo',
  formula: 'cotizador',
  tarjeta: 'cotizador',
  publicar: 'cotizador',
}

// Cada paso con si está hecho y si la persona lo hace en este origen. Datos está hecho desde que el origen existe; la Tarjeta, desde que hay una
// fórmula (nace con la suya, la por omisión o la copiada); Publicar, cuando el origen tiene fórmula activa.
export function estadoDeLaPuestaEnMarcha({
  uso,
  hayFormulaDeTrabajo,
  permisos,
}: {
  uso: OrigenConUso['uso']
  hayFormulaDeTrabajo: boolean
  permisos: PermisosDeLaPuestaEnMarcha
}): EstadoDeLaPuestaEnMarcha {
  const hecho: Record<PasoDeLaPuestaEnMarcha, boolean> = {
    datos: true,
    campos: uso.camposActivos > 0,
    flujo: uso.fases > 0,
    formula: hayFormulaDeTrabajo || uso.formulaPublicada,
    tarjeta: hayFormulaDeTrabajo || uso.formulaPublicada,
    publicar: uso.formulaPublicada,
  }
  return PASOS_DE_LA_PUESTA_EN_MARCHA.map((clave) => ({
    clave,
    titulo: TITULO_DEL_PASO[clave],
    hecho: hecho[clave],
    conPermiso: permisos[PERMISO_DEL_PASO[clave]],
  }))
}

export function estadoDelPaso(paso: PasoConEstado): EstadoDelPaso {
  if (!paso.conPermiso) {
    return 'sin_permiso'
  }
  return paso.hecho ? 'hecho' : 'pendiente'
}

// Adonde lleva la raíz de la puesta en marcha: el primer paso que falta y la persona puede hacer, o `listo` si no queda ninguno.
export function pasoPendiente(estado: EstadoDeLaPuestaEnMarcha): PasoDeLaPuestaEnMarcha | 'listo' {
  return estado.find((paso) => !paso.hecho && paso.conPermiso)?.clave ?? 'listo'
}

// Mientras el origen no tenga fórmula activa, la página del origen ofrece seguir la puesta en marcha.
export function enMarcha(estado: EstadoDeLaPuestaEnMarcha): boolean {
  return estado.some((paso) => paso.clave === 'publicar' && !paso.hecho)
}

// Si la cabecera de la página del origen ofrece «Seguir la puesta en marcha»: mientras siga y quede un paso que la persona pueda hacer (lleva a ése).
export function siguePendienteLaPuestaEnMarcha(estado: EstadoDeLaPuestaEnMarcha): boolean {
  return enMarcha(estado) && pasoPendiente(estado) !== 'listo'
}

// «Seguir»: el próximo paso que la persona puede hacer, hecho o no (se sigue con lo de por omisión), o `listo`.
export function pasoSiguiente(
  clave: PasoDeLaPuestaEnMarcha,
  estado: EstadoDeLaPuestaEnMarcha,
): PasoDeLaPuestaEnMarcha | 'listo' {
  const desde = estado.findIndex((paso) => paso.clave === clave)
  return estado.slice(desde + 1).find((paso) => paso.conPermiso)?.clave ?? 'listo'
}

// «Volver»: el paso anterior que la persona puede hacer, o nulo en el primero.
export function pasoAnterior(
  clave: PasoDeLaPuestaEnMarcha,
  estado: EstadoDeLaPuestaEnMarcha,
): PasoDeLaPuestaEnMarcha | null {
  const hasta = estado.findIndex((paso) => paso.clave === clave)
  return (
    estado
      .slice(0, Math.max(hasta, 0))
      .reverse()
      .find((paso) => paso.conPermiso)?.clave ?? null
  )
}
