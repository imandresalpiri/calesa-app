'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel para agregar un vehículo, la confirmación de desvincular y los vínculos anteriores se piden recién al abrirse: la
// sección no carga su código para mostrar las listas. Se montan con `useAbiertoAlgunaVez()`.
export const PanelAgregarVehiculoDiferido = diferido(() =>
  import('./panel-agregar-vehiculo').then((modulo) => modulo.PanelAgregarVehiculo),
)

export const ConfirmarDesvincularDiferido = diferido(() =>
  import('./confirmar-desvincular').then((modulo) => modulo.ConfirmarDesvincular),
)

export const DrawerDeVinculosAnterioresDiferido = diferido(() =>
  import('./drawer-de-vinculos-anteriores').then((modulo) => modulo.DrawerDeVinculosAnteriores),
)
