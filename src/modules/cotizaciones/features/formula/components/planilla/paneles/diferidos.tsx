'use client'

import { diferido } from '@/shared/ui/diferido'

// Los paneles de la planilla (D20): cada uno se pide al abrirse por primera vez (`useAbiertoAlgunaVez`), no con la planilla.
export const PanelDeLaBandaDiferido = diferido(() =>
  import('./panel-de-la-banda').then((m) => m.PanelDeLaBanda),
)
export const PanelDelTotalDiferido = diferido(() =>
  import('./panel-del-total').then((m) => m.PanelDelTotal),
)
export const PanelDelTipoDeCeldaDiferido = diferido(() =>
  import('./panel-del-tipo-de-celda').then((m) => m.PanelDelTipoDeCelda),
)
export const PanelDeDecimalesDiferido = diferido(() =>
  import('./panel-de-decimales').then((m) => m.PanelDeDecimales),
)
export const PanelComoSeEscribeDiferido = diferido(() =>
  import('./panel-como-se-escribe').then((m) => m.PanelComoSeEscribe),
)
export const PanelDeLosTotalesDiferido = diferido(() =>
  import('./panel-de-los-totales').then((m) => m.PanelDeLosTotales),
)
export const PanelDeLaTarjetaDiferido = diferido(() =>
  import('./panel-de-la-tarjeta').then((m) => m.PanelDeLaTarjeta),
)
