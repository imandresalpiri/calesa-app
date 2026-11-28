'use client'

import { diferido } from '@/shared/ui/diferido'

// Lo que la pestaña Plantillas abre encima llega recién al abrirse: la rejilla no paga el formulario ni las confirmaciones para dibujarse. Se
// montan con `useAbiertoAlgunaVez()` (el modal, sólo mientras la URL lo pide).
export const ModalNuevaPlantillaDiferido = diferido(() =>
  import('./modal-nueva-plantilla').then((modulo) => modulo.ModalNuevaPlantilla),
)

export const ModalOtroFormatoDiferido = diferido(() =>
  import('./modal-otro-formato').then((modulo) => modulo.ModalOtroFormato),
)

export const ConfirmarEliminarPlantillaDiferido = diferido(() =>
  import('./confirmar-eliminar').then((modulo) => modulo.ConfirmarEliminarPlantilla),
)

export const ConfirmarHacerlaPrivadaDiferido = diferido(() =>
  import('./confirmar-privada').then((modulo) => modulo.ConfirmarHacerlaPrivada),
)
