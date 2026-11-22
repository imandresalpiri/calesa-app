'use client'

import { diferido } from '@/shared/ui/diferido'

// Los catálogos «Puertos» y «Navieras» de Logística › Configuración (6.08-1) se piden al abrir su pestaña: la página de configuración no carga el código de la lista, el formulario ni el modal.
export const PuertosDeTransporteDiferido = diferido(() =>
  import('./puertos-de-transporte').then((modulo) => modulo.PuertosDeTransporte),
)

export const NavierasDeTransporteDiferido = diferido(() =>
  import('./navieras-de-transporte').then((modulo) => modulo.NavierasDeTransporte),
)
