'use client'

import { diferido } from '@/shared/ui/diferido'

// «Agregar enlace propio» y «Editar» se piden recién al abrirse (`useAbiertoAlgunaVez()`).
export const ModalDeEnlacePropioDiferido = diferido(() =>
  import('./modal-de-enlace-propio').then((modulo) => modulo.ModalDeEnlacePropio),
)

// La lista de quien mira, en su modal, se pide la primera vez que se abre algún panel de su familia: la tarjeta sólo dibuja el resumen.
export const EditorDeMisEnlacesDiferido = diferido(
  () => import('./editor-de-mis-enlaces').then((modulo) => modulo.EditorDeMisEnlaces),
  { aviso: 'pantalla' },
)
