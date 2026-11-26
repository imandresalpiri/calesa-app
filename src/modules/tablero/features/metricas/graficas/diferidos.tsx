'use client'

import { diferido } from '@/shared/ui/diferido'

// El modal de «Ver como tabla» se pide recién al abrirse: el tablero no carga su código para dibujar las gráficas. Se monta con
// `useAbiertoAlgunaVez()`.
export const ModalDeLaTablaDiferido = diferido(() =>
  import('./modal-de-la-tabla').then((modulo) => modulo.ModalDeLaTabla),
)
