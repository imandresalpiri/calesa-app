'use client'

import { diferido } from '@/shared/ui/diferido'

// Lo que se abre sobre la lista de Embarques o sobre la página de un embarque se pide recién al abrirlo: dibujar la lista o la página no carga el código de sus formularios.
export const ModalDelEmbarqueDiferido = diferido(() =>
  import('./modal-del-embarque').then((modulo) => modulo.ModalDelEmbarque),
)

export const ModalDelContenedorDiferido = diferido(() =>
  import('./modal-del-contenedor').then((modulo) => modulo.ModalDelContenedor),
)

export const DrawerAgregarVehiculosDiferido = diferido(() =>
  import('./drawer-agregar-vehiculos').then((modulo) => modulo.DrawerAgregarVehiculos),
)

export const DrawerDelHuecoDiferido = diferido(() =>
  import('./drawer-del-hueco').then((modulo) => modulo.DrawerDelHueco),
)
