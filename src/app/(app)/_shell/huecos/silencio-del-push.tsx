'use client'

import { SilencioDelPushEnElLive } from '@/modules/notificaciones/shell.client'

// El push de este dispositivo con el Modo Live: lo da de baja al encenderlo y lo vuelve a suscribir al apagarlo (`notificaciones`). No dibuja nada;
// va dentro de `<ProveedorDelLive>` porque mira el Live con que el servidor dibujó.
export function HuecoSilencioDelPush() {
  return <SilencioDelPushEnElLive />
}
