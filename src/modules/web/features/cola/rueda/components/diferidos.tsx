'use client'

import { diferido } from '@/shared/ui/diferido'
import type { PropsDeConfirmarQuitarDeLaRueda } from './confirmar-quitar-de-la-rueda'
import type { PropsDelModalDeEditarEnLaRueda } from './modal-de-editar-en-la-rueda'
import type { PropsDelPanelAgregarALaRueda } from './panel-agregar-a-la-rueda'

// Los modales y paneles de la rueda se piden al abrirse (`useAbiertoAlgunaVez()`): la página no carga el código de sus formularios para mostrarse.
export const PanelAgregarALaRuedaDiferido = diferido<PropsDelPanelAgregarALaRueda>(() =>
  import('./panel-agregar-a-la-rueda').then((modulo) => modulo.PanelAgregarALaRueda),
)

export const ModalDeEditarEnLaRuedaDiferido = diferido<PropsDelModalDeEditarEnLaRueda>(
  () => import('./modal-de-editar-en-la-rueda').then((modulo) => modulo.ModalDeEditarEnLaRueda),
  { aviso: 'pantalla' },
)

export const ConfirmarQuitarDeLaRuedaDiferido = diferido<PropsDeConfirmarQuitarDeLaRueda>(
  () => import('./confirmar-quitar-de-la-rueda').then((modulo) => modulo.ConfirmarQuitarDeLaRueda),
  { aviso: 'pantalla' },
)
