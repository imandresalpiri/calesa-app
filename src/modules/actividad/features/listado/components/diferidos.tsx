'use client'

import { diferido } from '@/shared/ui/diferido'

// El drawer del detalle de un cambio llega recién al abrirse: la lista de la actividad no carga su lectura ni su presentación para mostrar sus
// frases. Se monta con `useAbiertoAlgunaVez()`.
export const DrawerDelCambioDiferido = diferido(() =>
  import('./drawer-del-cambio').then((modulo) => modulo.DrawerDelCambio),
)
