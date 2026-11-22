'use client'

import type { AvisosDeRoles } from '../hooks/use-avisos-de-roles'
import { AvisosDeRolesDiferido } from './diferidos'

// Monta el modal de avisos la primera vez que se abre y lo deja montado: se va con su animación y no vuelve a pedir su código.
export function AvisosDeRolesAlAbrir({ estado }: { estado: AvisosDeRoles }) {
  return estado.montar ? (
    <AvisosDeRolesDiferido
      abierto={estado.abierto}
      alCerrar={estado.cerrar}
      titulo={estado.titulo}
      avisos={estado.avisos}
    />
  ) : null
}
