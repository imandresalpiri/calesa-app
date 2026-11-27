'use client'

import { diferido } from '@/shared/ui/diferido'

// El drawer «Categorías de gasto» de las fases de un origen (6.11-4) pide su código al abrirse: la pestaña no carga la lista, el formulario ni el modal.
export const CategoriasDelOrigenDiferido = diferido(() =>
  import('./categorias-del-origen').then((modulo) => modulo.CategoriasDelOrigen),
)
