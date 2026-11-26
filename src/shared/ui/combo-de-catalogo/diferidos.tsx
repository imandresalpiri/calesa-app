'use client'

import { diferido } from '@/shared/ui/diferido'
import type { PropsDeLaLista } from './tipos'

// La lista (cmdk) llega al abrir el combo: el botón viaja con la pantalla, la lista no.
export const ListaDelComboDiferida = diferido<PropsDeLaLista>(
  () => import('./lista-del-combo').then((modulo) => modulo.ListaDelCombo),
  { esqueleto: <div className="h-48" aria-hidden />, aviso: 'aqui' },
)
