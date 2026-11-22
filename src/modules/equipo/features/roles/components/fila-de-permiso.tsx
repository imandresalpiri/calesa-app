'use client'

import type { ReactNode } from 'react'
import { cn } from 'cn'
import type { Permisos } from '@/shared/lib/permisos'
import { CabeceraPegada } from '@/shared/ui/lista'
import { TableCell, TableRow } from '@/shared/ui/table'
import {
  concesionesDelPermiso,
  type OrigenDeLaMatriz,
  type PermisoDelCatalogo,
} from '../../../entities/matriz'
import type { RolConConcesiones } from '../../../entities/rol'
import type { CambioDeConcesion } from '../hooks/use-matriz'
import { CeldaConcesion } from './celda-concesion'
import type { ColumnaDeRol } from './grupo-matriz'

type Props = {
  permiso: PermisoDelCatalogo
  columnas: readonly ColumnaDeRol[]
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  alAplicar: (rol: RolConConcesiones, cambio: CambioDeConcesion) => void
  // Junto al nombre: la insignia «Retirado» de un nivel.
  adorno?: ReactNode
  // Arriba a la derecha de la celda del nombre: el «⋯» de un nivel.
  acciones?: ReactNode
  // El nombre en un tono más suave (un nivel retirado).
  apagado?: boolean
}

// El renglón de un permiso en la tabla: su nombre y explicación (la celda pegada a la izquierda) y una celda por rol.
export function FilaDePermiso(props: Props) {
  const { permiso, columnas, origenes, misPermisos, alAplicar, adorno, acciones, apagado } = props
  return (
    <TableRow data-permiso={permiso.clave} data-nivel={permiso.nivel?.clave}>
      <CabeceraPegada
        lado="nombre"
        scope="row"
        className="min-w-44 py-2 font-normal whitespace-normal"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                data-nombre-de-permiso
                className={cn(
                  'block text-(length:--text-sm)',
                  apagado ? 'text-(--color-ink-soft)' : 'text-(--color-ink)',
                )}
              >
                {permiso.nombre}
              </span>
              {adorno}
            </span>
            <span className="block text-(length:--text-xs) text-(--color-ink-faint)">
              {permiso.descripcion}
            </span>
          </div>
          {acciones}
        </div>
      </CabeceraPegada>
      {columnas.map(({ rol, editable, ocupado }) => (
        <TableCell key={rol.id}>
          <CeldaConcesion
            permiso={permiso}
            rolNombre={rol.nombre}
            delPermiso={concesionesDelPermiso(rol.concesiones, permiso.clave)}
            origenes={origenes}
            misPermisos={misPermisos}
            editable={editable}
            ocupado={ocupado}
            alAplicar={(cambio) => {
              alAplicar(rol, cambio)
            }}
          />
        </TableCell>
      ))}
    </TableRow>
  )
}
