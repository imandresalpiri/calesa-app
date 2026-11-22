'use client'

import type { ReactNode } from 'react'
import { cn } from 'cn'
import type { Permisos } from '@/shared/lib/permisos'
import {
  concesionesDelPermiso,
  type OrigenDeLaMatriz,
  type PermisoDelCatalogo,
} from '../../../entities/matriz'
import type { CambioDeConcesion } from '../hooks/use-matriz'
import { CeldaConcesion } from './celda-concesion'
import type { ColumnaDeRol } from './grupo-matriz'

type Props = {
  permiso: PermisoDelCatalogo
  columna: ColumnaDeRol
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  alAplicar: (cambio: CambioDeConcesion) => void
  adorno?: ReactNode
  acciones?: ReactNode
  apagado?: boolean
}

// Un permiso en la lista de un rol (celular): su nombre y su explicación y, debajo, el control del rol.
export function RenglonDelRol(props: Props) {
  const { permiso, columna, origenes, misPermisos, adorno, acciones, apagado } = props
  const { rol, editable, ocupado } = columna
  return (
    <li
      data-permiso={permiso.clave}
      data-nivel={permiso.nivel?.clave}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] justify-items-start gap-2 border-t border-(--color-line) px-4 py-3"
    >
      <div className="flex w-full min-w-0 items-start justify-between gap-2">
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
      <CeldaConcesion
        permiso={permiso}
        rolNombre={rol.nombre}
        delPermiso={concesionesDelPermiso(rol.concesiones, permiso.clave)}
        origenes={origenes}
        misPermisos={misPermisos}
        editable={editable}
        ocupado={ocupado}
        alAplicar={props.alAplicar}
      />
    </li>
  )
}
