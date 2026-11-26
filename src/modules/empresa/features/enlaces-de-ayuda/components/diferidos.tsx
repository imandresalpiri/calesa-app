'use client'

import { diferido } from '@/shared/ui/diferido'

// «Nuevo enlace» y «Editar» se piden recién al abrirse (`useAbiertoAlgunaVez()`): la lista no carga el código del formulario.
export const ModalDeEnlaceDeLaEmpresaDiferido = diferido(() =>
  import('./modal-de-enlace-de-la-empresa').then((modulo) => modulo.ModalDeEnlaceDeLaEmpresa),
)

// La confirmación de quitar un enlace se pide al abrirse.
export const QuitarEnlaceDeAyudaDiferido = diferido(() =>
  import('./quitar-enlace-de-ayuda').then((modulo) => modulo.QuitarEnlaceDeAyuda),
)

// El editor (la lista en su modal, con el estado de lo que se hace en ella) se pide la primera vez que se abre algún panel de su familia: la
// tarjeta sólo dibuja el resumen.
export const EditorDeEnlacesDeAyudaDiferido = diferido(
  () => import('./editor-de-enlaces-de-ayuda').then((modulo) => modulo.EditorDeEnlacesDeAyuda),
  { aviso: 'pantalla' },
)
