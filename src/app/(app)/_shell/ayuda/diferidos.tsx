'use client'

import { diferido } from '@/shared/ui/diferido'
import type { PropsDelModalDeAyuda } from './modal-de-ayuda'

// El modal de «Ayuda» y la lectura de los enlaces (supabase-js) se piden la primera vez que se abre: el menú vive en el marco de **todas** las
// pantallas y sólo viaja su renglón.
export const ModalDeAyudaDiferido = diferido<PropsDelModalDeAyuda>(
  () => import('./modal-de-ayuda').then((m) => m.ModalDeAyuda),
  { aviso: 'pantalla' },
)

// Pide el código sin abrir nada: al llegar el puntero al renglón. Un fallo acá no se dice: nadie pidió nada todavía.
export function adelantarElModalDeAyuda() {
  void import('./modal-de-ayuda').catch(() => undefined)
}
