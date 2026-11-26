'use client'

import { diferido } from '@/shared/ui/diferido'

// Los drawers «Puertos» y «Navieras» de las fases de un origen (6.08-1) piden su código al abrirse: la pestaña no carga la lista, el formulario ni el modal.
export const PuertosDelOrigenDiferido = diferido(() =>
  import('./puertos-del-origen').then((modulo) => modulo.PuertosDelOrigen),
)

export const NavierasDelOrigenDiferido = diferido(() =>
  import('./navieras-del-origen').then((modulo) => modulo.NavierasDelOrigen),
)
