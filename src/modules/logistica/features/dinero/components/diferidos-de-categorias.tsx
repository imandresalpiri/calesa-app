'use client'

import { diferido } from '@/shared/ui/diferido'

// «Nueva categoría» y «Editar» se piden recién al abrirse: la lista no carga el código del formulario para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeCategoriaDiferido = diferido(() =>
  import('./modal-de-categoria').then((modulo) => modulo.ModalDeCategoria),
)
