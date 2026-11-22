'use client'

import { diferido } from '@/shared/ui/diferido'

// Los paneles de la barra de la fórmula se piden recién al abrirse; se montan con `useAbiertoAlgunaVez()`.
export const ModalDeNuevaFormulaDiferido = diferido(() =>
  import('./modal-de-nueva-formula').then((modulo) => modulo.ModalDeNuevaFormula),
)

export const ModalDeRenombrarDiferido = diferido(() =>
  import('./modal-de-renombrar').then((modulo) => modulo.ModalDeRenombrar),
)

export const ModalDeActivarDiferido = diferido(() =>
  import('./modal-de-activar').then((modulo) => modulo.ModalDeActivar),
)

export const ConfirmarArchivarDiferido = diferido(() =>
  import('./confirmar-archivar').then((modulo) => modulo.ConfirmarArchivar),
)

export const ConfirmarEliminarDiferido = diferido(() =>
  import('./confirmar-eliminar').then((modulo) => modulo.ConfirmarEliminar),
)
