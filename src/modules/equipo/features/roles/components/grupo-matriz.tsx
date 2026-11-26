'use client'

import type { ReactNode } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import { TableBody, TableHead, TableRow } from '@/shared/ui/table'
import {
  MODULO_DE_LOS_NIVELES,
  partesDelGrupo,
  type GrupoDePermisos,
  type OrigenDeLaMatriz,
} from '../../../entities/matriz'
import type { RolConConcesiones } from '../../../entities/rol'
import type { CambioDeConcesion } from '../hooks/use-matriz'
import { FilaAnchaDeLaMatriz } from './fila-ancha-de-la-matriz'
import { FilaDePermiso } from './fila-de-permiso'
import type { HuecosDeNivelesEnLaMatriz } from './huecos-de-niveles'
import { NivelesDelGrupo } from './niveles-del-grupo'

// Lo que la tabla sabe de cada columna, ya resuelto una vez para todas sus celdas.
export type ColumnaDeRol = {
  rol: RolConConcesiones
  // La persona gestiona roles y domina este.
  editable: boolean
  ocupado: boolean
}

type Props = {
  grupo: GrupoDePermisos
  columnas: readonly ColumnaDeRol[]
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  alAplicar: (rol: RolConConcesiones, cambio: CambioDeConcesion) => void
  // Los niveles de cotizaciones (huecos); sin ellos las filas de nivel se agrupan igual, sin «⋯» ni pie.
  niveles?: HuecosDeNivelesEnLaMatriz
  // El botón de «Quién crea y quién ve», debajo del título del bloque de cotizaciones.
  quienCrea?: ReactNode
}

// Los permisos de un módulo: su título y un renglón por permiso, con una celda por rol. En «Cotizaciones» llevan, además, el botón de «Quién crea y
// quién ve» y los niveles de acceso agrupados bajo su rótulo.
export function GrupoMatriz({
  grupo,
  columnas,
  origenes,
  misPermisos,
  alAplicar,
  ...extra
}: Props) {
  const esDeLosNiveles = grupo.modulo === MODULO_DE_LOS_NIVELES
  return (
    <TableBody>
      <TableRow className="bg-(--color-paper-dim) hover:bg-(--color-paper-dim)">
        <TableHead
          id={`bloque-${grupo.modulo}`}
          scope="colgroup"
          colSpan={columnas.length + 1}
          className="sticky top-[calc(var(--alto-cabecera-roles,0px)-1px)] z-20 h-8 scroll-mt-(--alto-cabecera-roles) bg-(--color-paper-dim) text-(length:--text-xs) font-semibold tracking-wide text-(--color-ink-soft)"
        >
          {/* El título del módulo abarca todas las columnas: él solo se queda a la vista mientras la tabla se desplaza. */}
          <span className="sticky left-3 inline-block">{grupo.titulo}</span>
        </TableHead>
      </TableRow>
      {esDeLosNiveles && extra.quienCrea ? (
        <FilaAnchaDeLaMatriz columnas={columnas.length}>
          <div className="px-3 py-1">{extra.quienCrea}</div>
        </FilaAnchaDeLaMatriz>
      ) : null}
      {partesDelGrupo(grupo, { conNiveles: extra.niveles !== undefined }).map((parte, indice) =>
        parte.tipo === 'permisos' ? (
          parte.permisos.map((permiso) => (
            <FilaDePermiso
              key={permiso.clave}
              permiso={permiso}
              columnas={columnas}
              origenes={origenes}
              misPermisos={misPermisos}
              alAplicar={alAplicar}
            />
          ))
        ) : (
          <NivelesDelGrupo
            key={`niveles-${String(indice)}`}
            niveles={parte.niveles}
            huecos={extra.niveles}
            columnas={columnas}
            origenes={origenes}
            misPermisos={misPermisos}
            alAplicar={alAplicar}
          />
        ),
      )}
    </TableBody>
  )
}
