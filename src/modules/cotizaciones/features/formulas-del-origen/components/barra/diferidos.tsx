'use client'

import { diferido } from '@/shared/ui/diferido'

// La lista del selector de fórmula se pide recién al abrirlo; se monta con `useAbiertoAlgunaVez()`.
export const ListaDelSelectorDiferida = diferido(() =>
  import('./lista-del-selector').then((modulo) => modulo.ListaDelSelector),
)
