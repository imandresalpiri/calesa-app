'use client'

import { diferido } from '@/shared/ui/diferido'

// El formulario de una variante (subir o renombrar) se pide recién al abrirse (`useAbiertoAlgunaVez()`): la lista no carga su código.
export const ModalDeLogoDiferido = diferido(() =>
  import('./modal-de-logo').then((modulo) => modulo.ModalDeLogo),
)

// La confirmación de quitar una variante se pide al abrirse.
export const QuitarLogoDiferido = diferido(() =>
  import('./quitar-logo').then((modulo) => modulo.QuitarLogo),
)

// El editor (la lista en su modal, con el orden por arrastre) se pide la primera vez que se abre algún panel de su familia: la tarjeta sólo dibuja
// el resumen.
export const EditorDeLogosDiferido = diferido(
  () => import('./editor-de-logos').then((modulo) => modulo.EditorDeLogos),
  { aviso: 'pantalla' },
)
