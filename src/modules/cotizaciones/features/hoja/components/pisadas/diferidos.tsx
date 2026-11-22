'use client'

import { diferido } from '@/shared/ui/diferido'

// Lo pisado no hace falta al primer dibujo: el aviso de la primera vez y la lista del resumen se piden recién cuando hay algo pisado.
export const AvisoDePisadoDiferido = diferido(() =>
  import('./aviso-de-pisado').then((modulo) => modulo.AvisoDePisado),
)

export const ListaDePisadasDiferida = diferido(() =>
  import('./lista-de-pisadas').then((modulo) => modulo.ListaDePisadas),
)
