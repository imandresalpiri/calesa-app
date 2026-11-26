'use client'

import { diferido } from '@/shared/ui/diferido'

// «Editar» se pide recién al abrirse: el drawer no carga el código del formulario para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeTipoDiferido = diferido(() =>
  import('./modal-de-tipo').then((modulo) => modulo.ModalDeTipo),
)

// La confirmación de eliminar un tipo se pide al abrirse (`useAbiertoAlgunaVez()`).
export const EliminarTipoDiferido = diferido(() =>
  import('./eliminar-tipo').then((modulo) => modulo.EliminarTipo),
)

// «Nuevo tipo de documento» se pide la primera vez que la URL lo abre (`?accion=nuevo-tipo`): el editor del flujo no lo carga para mostrarse.
export const CrearTipoDeDocumentoDiferido = diferido(() =>
  import('./crear-tipo-de-documento').then((modulo) => modulo.CrearTipoDeDocumento),
)
