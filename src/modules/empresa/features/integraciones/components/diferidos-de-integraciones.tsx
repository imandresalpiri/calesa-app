'use client'

import { diferido } from '@/shared/ui/diferido'

// Los modales de las tarjetas de Integraciones se piden la primera vez que se abren (`useAbiertoAlgunaVez()`): la página dibuja sólo texto.
export const ModalDeApibaraDiferido = diferido(
  () => import('./modal-de-apibara').then((modulo) => modulo.ModalDeApibara),
  { aviso: 'pantalla' },
)

export const ModalDeWebPublicaDiferido = diferido(
  () => import('./modal-de-web-publica').then((modulo) => modulo.ModalDeWebPublica),
  { aviso: 'pantalla' },
)

export const ModalDeSecretoDiferido = diferido(
  () => import('./modal-de-secreto').then((modulo) => modulo.ModalDeSecreto),
  { aviso: 'pantalla' },
)

export const ModalDeAsistenteIaDiferido = diferido(
  () => import('./modal-de-asistente-ia').then((modulo) => modulo.ModalDeAsistenteIa),
  { aviso: 'pantalla' },
)

export const ModalDeIndicacionesDelAsistenteDiferido = diferido(
  () =>
    import('./modal-de-indicaciones-del-asistente').then(
      (modulo) => modulo.ModalDeIndicacionesDelAsistente,
    ),
  { aviso: 'pantalla' },
)
