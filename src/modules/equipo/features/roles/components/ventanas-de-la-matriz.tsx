'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import type { AvisosDeRoles } from '../hooks/use-avisos-de-roles'
import { AvisosDeRolesAlAbrir } from './avisos-de-roles-al-abrir'
import { EliminarRol } from './eliminar-rol'
import type { HuecosDeNivelesEnLaMatriz } from './huecos-de-niveles'
import { NuevoRol } from './nuevo-rol'
import type { RolConConcesiones } from '../../../entities/rol'
import type { Permisos } from '@/shared/lib/permisos'
import type { OrigenDeLaMatriz } from '../../../entities/matriz'
import type { VersionesDeRoles } from '../hooks/use-versiones-de-roles'
import { ModalDeQuienCrea } from './modal-de-quien-crea'

type Props = {
  roles: readonly RolConConcesiones[]
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  puedeGestionar: boolean
  // Las versiones de los roles que comparte con la matriz.
  versiones: VersionesDeRoles
  avisos: AvisosDeRoles
  // Los modales de los niveles de acceso (los junta la ruta).
  niveles?: HuecosDeNivelesEnLaMatriz
}

// Los modales de la matriz, cada uno con su URL: «Nuevo rol» (`?panel=nuevo-rol`), «Quién crea y quién ve» (`?panel=quien-crea-y-quien-ve`), los avisos, los de los niveles y «Eliminar» un rol (`?eliminar=`).
export function VentanasDeLaMatriz({
  roles,
  origenes,
  misPermisos,
  puedeGestionar,
  versiones,
  avisos,
  niveles,
}: Props) {
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
      <ModalDeQuienCrea
        roles={roles}
        origenes={origenes}
        misPermisos={misPermisos}
        puedeGestionar={puedeGestionar}
        versiones={versiones}
      />
      <EliminarRol
        rol={roles.find((rol) => rol.id === eliminar) ?? null}
        alCerrar={() => void setParametros({ eliminar: null })}
      />
    </>
  )
}
