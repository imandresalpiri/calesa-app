'use client'

import { diferido } from '@/shared/ui/diferido'
import type { PropsDelModalDeLaPolitica } from './modal-de-la-politica'

// El modal de la política se pide la primera vez que se abre (`useAbiertoAlgunaVez()`): la página dibuja sólo texto y su formulario no viaja en frío.
export const ModalDeLaPoliticaDiferido = diferido<PropsDelModalDeLaPolitica>(
  () => import('./modal-de-la-politica').then((modulo) => modulo.ModalDeLaPolitica),
  { aviso: 'pantalla' },
)
