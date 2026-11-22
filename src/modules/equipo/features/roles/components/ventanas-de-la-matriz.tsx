'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import type { AvisosDeRoles } from '../hooks/use-avisos-de-roles'
import { AvisosDeRolesAlAbrir } from './avisos-de-roles-al-abrir'
import { EliminarRol } from './eliminar-rol'
import type { HuecosDeNivelesEnLaMatriz } from './huecos-de-niveles'
import { NuevoRol } from './nuevo-rol'
import type { RolConConcesiones } from '../../../entities/rol'

type Props = {
  roles: readonly RolConConcesiones[]
  puedeGestionar: boolean
  avisos: AvisosDeRoles
  // Los modales de los niveles de acceso (los junta la ruta).
  niveles?: HuecosDeNivelesEnLaMatriz
}

// Los modales de la matriz, cada uno con su URL: «Nuevo rol» (`?panel=nuevo-rol`), los avisos, los de los niveles y «Eliminar» un rol (`?eliminar=`).
export function VentanasDeLaMatriz({ roles, puedeGestionar, avisos, niveles }: Props) {
  const [{ panel, eliminar }, setParametros] = useQueryStates(
    { rol: parseAsString, panel: parseAsString, eliminar: parseAsString },
    { shallow: false },
  )
  return (
    <>
      <NuevoRol
        abierto={puedeGestionar && panel === 'nuevo-rol'}
        alCerrar={() => void setParametros({ panel: null })}
        alCrear={(rol) => void setParametros({ panel: null, rol })}
      />
      <AvisosDeRolesAlAbrir estado={avisos} />
      {niveles?.ventanas}
      <EliminarRol
        rol={roles.find((rol) => rol.id === eliminar) ?? null}
        alCerrar={() => void setParametros({ eliminar: null })}
      />
    </>
  )
}
