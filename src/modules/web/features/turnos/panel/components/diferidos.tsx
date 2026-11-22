'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel «Turnos de la web sin confirmar» (con su hook de lectura y su `Drawer`) se pide al abrirse por primera vez: el JS de Inicio no crece en frío.
// Se monta con `useAbiertoAlgunaVez()`.
export const PanelDeTurnosDiferido = diferido(
  () => import('./panel-de-turnos').then((modulo) => modulo.PanelDeTurnos),
  { aviso: 'pantalla' },
)
