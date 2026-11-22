'use client'

import { diferido } from '@/shared/ui/diferido'

// Los modales de los pasos Fórmula y Publicar de la puesta en marcha se piden recién al abrirse; se montan con `useAbiertoAlgunaVez()`. Propios de esta
// superficie: los de la barra de la fórmula (`../diferidos.tsx`) no viajan con ella.
export const ModalDeNuevaFormulaDiferido = diferido(() =>
  import('../modal-de-nueva-formula').then((modulo) => modulo.ModalDeNuevaFormula),
)

export const ModalDeActivarDiferido = diferido(() =>
  import('../modal-de-activar').then((modulo) => modulo.ModalDeActivar),
)
