'use client'

import type { ComponentProps } from 'react'
import { NivelesEnLaMatriz } from '@/modules/cotizaciones/pantallas/configuracion'
import { MatrizDeRoles } from '@/modules/equipo/pantallas/roles'

type PropsDeLaMatriz = Omit<ComponentProps<typeof MatrizDeRoles>, 'niveles'>

type Props = PropsDeLaMatriz & {
  // La lista de niveles de acceso que lee la página (`ListaDeNiveles` de cotizaciones); nulo si no se pudo leer.
  niveles: ComponentProps<typeof NivelesEnLaMatriz>['lista']
}

// La matriz de Roles con los niveles de acceso de cotizaciones adentro. `equipo` no depende de `cotizaciones` ni al revés: esta ruta los junta, y lo hace
// desde un Client Component porque lo que cotizaciones le da a la matriz son funciones (el «⋯» de cada nivel) y una función no cruza de un Server Component a uno de cliente.
export function MatrizConNiveles({ niveles, puedeGestionar, ...matriz }: Props) {
  return (
    <NivelesEnLaMatriz lista={niveles} puedeGestionar={puedeGestionar}>
      {(huecos) => <MatrizDeRoles {...matriz} puedeGestionar={puedeGestionar} niveles={huecos} />}
    </NivelesEnLaMatriz>
  )
}
