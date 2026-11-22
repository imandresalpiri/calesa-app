'use client'

import { diferido } from '@/shared/ui/diferido'

// El modal de avisos se pide recién al abrirse: la matriz no carga su código para dibujarse. Se monta con `useAbiertoAlgunaVez()`.
export const AvisosDeRolesDiferido = diferido(() =>
  import('./avisos-de-roles').then((modulo) => modulo.AvisosDeRoles),
)
