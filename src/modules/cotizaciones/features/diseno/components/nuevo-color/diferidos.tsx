'use client'

import { diferido } from '@/shared/ui/diferido'

// «Nuevo color» al vuelo se pide recién al abrirse (`useAbiertoAlgunaVez()`, `?color=nuevo`): la planilla no lo carga para mostrarse.
export const NuevoColorAlVueloDiferido = diferido(() =>
  import('./nuevo-color-al-vuelo').then((modulo) => modulo.NuevoColorAlVuelo),
)
