'use client'

import { diferido } from '@/shared/ui/diferido'

// Los modales y las confirmaciones de Configuración › Modo Live se piden la primera vez que se abren (`useAbiertoAlgunaVez()`): la página dibuja
// sólo texto y los formularios no viajan en frío.
export const ModalDelRolDiferido = diferido(
  () => import('./modal-del-rol').then((modulo) => modulo.ModalDelRol),
  { aviso: 'pantalla' },
)

export const ModalDeLaPersonaDiferido = diferido(
  () => import('./modal-de-la-persona').then((modulo) => modulo.ModalDeLaPersona),
  { aviso: 'pantalla' },
)

export const VolverALoPorDefectoDiferido = diferido(
  () => import('./volver-a-lo-por-defecto').then((modulo) => modulo.VolverALoPorDefecto),
  { aviso: 'pantalla' },
)

export const VolverALoDeSuRolDiferido = diferido(
  () => import('./volver-a-lo-de-su-rol').then((modulo) => modulo.VolverALoDeSuRol),
  { aviso: 'pantalla' },
)
