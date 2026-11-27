// El push de este dispositivo con el Modo Live (lo cuenta la ficha del módulo): al encenderlo se da de baja la suscripción del
// navegador y se deja una marca en `localStorage` con la clave pública con que estaba suscrito (vacía si no lo estaba); al apagarlo, con la marca,
// se vuelve a suscribir sin pedir permiso. Chrome exige mostrar algo por cada push (`userVisibleOnly`): no se puede descartar en `sw.js`.
export const CLAVE_DEL_SILENCIO_DEL_PUSH = 'push-silenciado-por-live'

export type PasoDelSilencio = 'silenciar' | 'reanudar' | 'nada'

// Qué toca con el Live como lo dibujó el servidor y la marca de este dispositivo: sólo un cambio de estado hace algo (sin él, ni el código se pide).
export function pasoDelSilencio(enElLive: boolean, marca: string | null): PasoDelSilencio {
  if (enElLive) return marca === null ? 'silenciar' : 'nada'
  return marca === null ? 'nada' : 'reanudar'
}
