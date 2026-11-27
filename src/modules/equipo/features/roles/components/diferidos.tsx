'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

// El modal de avisos se pide recién al abrirse: la matriz no carga su código para dibujarse. Se monta con `useAbiertoAlgunaVez()`.
export const AvisosDeRolesDiferido = diferido(() =>
  import('./avisos-de-roles').then((modulo) => modulo.AvisosDeRoles),
)

// «Quién crea y quién ve» (el modal que abre el botón del bloque de cotizaciones) se pide recién al abrirse: la matriz no carga su código para dibujarse. Se
// monta con `useAbiertoAlgunaVez()`, dentro del modal.
export const QuienCreaYQuienVeDiferido = diferido(
  () => import('./quien-crea-y-quien-ve').then((modulo) => modulo.QuienCreaYQuienVe),
  {
    esqueleto: (
      <div className="grid gap-2" aria-busy="true" aria-label="Cargando quién crea y quién ve">
        {Array.from({ length: 3 }, (_, n) => (
          <Skeleton key={n} className="h-11 w-full" />
        ))}
      </div>
    ),
    aviso: 'aqui',
  },
)
