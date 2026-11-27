'use client'

import { diferido } from '@/shared/ui/diferido'

// Lo que la cadena trae al primer uso: «Qué falta» de una fase que no es destino (lee sus requisitos). Un archivo propio: la página en frío no lo paga.
export const QueFaltaDeLaFaseDiferido = diferido(
  () => import('./que-falta-de-la-fase').then((m) => m.QueFaltaDeLaFase),
  { aviso: 'aqui' },
)
