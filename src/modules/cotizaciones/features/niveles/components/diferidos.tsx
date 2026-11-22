'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

// «Nuevo nivel» y «Renombrar» se piden recién al abrirse: la matriz no carga el código del formulario para mostrarse. Se monta con
// `useAbiertoAlgunaVez()`.
export const ModalDeNivelDiferido = diferido(() =>
  import('./modal-de-nivel').then((modulo) => modulo.ModalDeNivel),
)

// La confirmación de eliminar un nivel se pide al abrirse (`useAbiertoAlgunaVez()`).
export const EliminarNivelDiferido = diferido(() =>
  import('./eliminar-nivel').then((modulo) => modulo.EliminarNivel),
)

// El «⋯» de cada nivel de la matriz: su código llega después de la tabla, con un hueco del mismo tamaño (32 px; 44 en el celular) para que nada salte.
export const MasAccionesDeNivelDiferido = diferido(
  () => import('./mas-acciones-de-nivel').then((modulo) => modulo.MasAccionesDeNivel),
  { esqueleto: <Skeleton className="size-[44px] shrink-0 md:size-8" />, aviso: 'aqui' },
)
