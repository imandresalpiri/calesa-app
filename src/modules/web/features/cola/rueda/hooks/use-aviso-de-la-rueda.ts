'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { RUTAS } from '@/shared/lib/rutas'
import { avisar, avisarExito } from '@/shared/ui/toasts'
import { TEXTO_HABILITADA_SIN_PERMISO } from '../../../../entities/cola/rueda'

// Lo que se dice al guardar a alguien en la rueda. Si su rol no recibe turnos (`enLaRueda` falso), lo avisa con «Abrir Roles» (8-1); si sí, que está en la
// rueda; si no se pudo releer (nulo), sólo que se guardó.
export function useAvisoDeLaRueda(puedeVerRoles: boolean) {
  const router = useRouter()
  return (enLaRueda: boolean | null, nombre: string) => {
    if (enLaRueda === false) {
      avisar(
        TEXTO_HABILITADA_SIN_PERMISO,
        puedeVerRoles
          ? {
              etiqueta: 'Abrir Roles',
              alHacer: () => {
                router.push(RUTAS.roles as Route)
              },
              sale: true,
            }
          : undefined,
      )
    } else if (enLaRueda === true) {
      avisarExito(`${nombre} está en la rueda.`)
    } else {
      avisarExito(`Guardaste a ${nombre} en la cola.`)
    }
  }
}
