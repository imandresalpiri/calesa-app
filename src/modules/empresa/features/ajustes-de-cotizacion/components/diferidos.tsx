'use client'

import { diferido } from '@/shared/ui/diferido'

// El modal de la vigencia se pide la primera vez que se abre (`useAbiertoAlgunaVez()`): la tarjeta dibuja sólo texto y la página de Orígenes no carga el formulario.
export const ModalDeVigenciaDiferido = diferido(
  () => import('./modal-de-vigencia').then((modulo) => modulo.ModalDeVigencia),
  { aviso: 'pantalla' },
)
