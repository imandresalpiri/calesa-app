'use client'

import type { Permisos } from '@/shared/lib/permisos'
import { Modal } from '@/shared/ui/modal'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { OrigenDeLaMatriz } from '../../../entities/matriz'
import type { RolConConcesiones } from '../../../entities/rol'
import type { VersionesDeRoles } from '../hooks/use-versiones-de-roles'
import {
  PANEL_DE_QUIEN_CREA_Y_QUIEN_VE,
  TITULO_DE_QUIEN_CREA_Y_QUIEN_VE,
} from './boton-de-quien-crea'
import { QuienCreaYQuienVeDiferido } from './diferidos'

type Props = {
  roles: readonly RolConConcesiones[]
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  puedeGestionar: boolean
  versiones: VersionesDeRoles
}

// «Quién crea y quién ve» en un modal por URL (`?panel=quien-crea-y-quien-ve`): el cuadro se pide al abrirse por primera vez y escribe en la matriz
// por las mismas RPC. Un solo cierre: Esc, la ✕ o el clic afuera; al cerrar se va también el `?origen=` que eligió.
export function ModalDeQuienCrea({
  roles,
  origenes,
  misPermisos,
  puedeGestionar,
  versiones,
}: Props) {
  const panel = usePanelPorUrl(PANEL_DE_QUIEN_CREA_Y_QUIEN_VE, ['origen'])
  const montar = useAbiertoAlgunaVez(panel.abierto)
  return (
    <Modal
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      titulo={TITULO_DE_QUIEN_CREA_Y_QUIEN_VE}
      ancho="grande"
    >
      {montar ? (
        <QuienCreaYQuienVeDiferido
          roles={roles}
          origenes={origenes}
          misPermisos={misPermisos}
          puedeGestionar={puedeGestionar}
          versiones={versiones}
        />
      ) : null}
    </Modal>
  )
}
