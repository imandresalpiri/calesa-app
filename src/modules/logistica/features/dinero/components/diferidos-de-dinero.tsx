'use client'

import { diferido } from '@/shared/ui/diferido'

// Los modales de Dinero se piden al abrirse por primera vez: la vista no carga el formulario ni el desglose para dibujarse.
export const DesgloseDelMargenDiferido = diferido(
  () => import('./desglose-del-margen').then((m) => m.DesgloseDelMargen),
  { aviso: 'pantalla' },
)

export const ModalDeGastoDiferido = diferido(
  () => import('./modal-de-gasto').then((m) => m.ModalDeGasto),
  { aviso: 'pantalla' },
)

export const ModalDePagoDiferido = diferido(
  () => import('./modal-de-pago').then((m) => m.ModalDePago),
  { aviso: 'pantalla' },
)
