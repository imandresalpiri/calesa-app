'use client'

import { TableHead, TableRow } from '@/shared/ui/table'
import type { Permisos } from '@/shared/lib/permisos'
import type { NivelDeLaMatriz, OrigenDeLaMatriz } from '../../../entities/matriz'
import type { RolConConcesiones } from '../../../entities/rol'
import type { CambioDeConcesion } from '../hooks/use-matriz'
import { FilaAnchaDeLaMatriz } from './fila-ancha-de-la-matriz'
import { FilaDePermiso } from './fila-de-permiso'
import type { ColumnaDeRol } from './grupo-matriz'
import type { HuecosDeNivelesEnLaMatriz } from './huecos-de-niveles'
import { InsigniaDeRetirado } from './insignia-de-retirado'

export const TITULO_DE_LOS_NIVELES = 'Niveles de acceso'

type Props = {
  niveles: readonly NivelDeLaMatriz[]
  huecos: HuecosDeNivelesEnLaMatriz | undefined
  columnas: readonly ColumnaDeRol[]
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  alAplicar: (rol: RolConConcesiones, cambio: CambioDeConcesion) => void
}

// Los niveles de acceso de la hoja dentro del bloque «Cotizaciones» de la tabla: el rótulo (no se pega: bajo el título del módulo ya hay una barra
// pegada), «Todos» y su frase, las dos filas de cada nivel —el «⋯» en la primera— y «+ Nuevo nivel» al pie. Lo de cotizaciones llega como huecos.
export function NivelesDelGrupo({ niveles, huecos, columnas, ...resto }: Props) {
  return (
    <>
      <TableRow className="hover:bg-transparent">
        <TableHead
          scope="colgroup"
          colSpan={columnas.length + 1}
          className="h-8 text-(length:--text-xs) font-semibold tracking-wide text-(--color-ink-soft)"
        >
          <span className="sticky left-3 inline-block">{TITULO_DE_LOS_NIVELES}</span>
        </TableHead>
      </TableRow>
      {huecos ? (
        <FilaAnchaDeLaMatriz columnas={columnas.length}>{huecos.cabeza}</FilaAnchaDeLaMatriz>
      ) : null}
      {niveles.map((nivel) =>
        nivel.permisos.map((permiso, indice) => (
          <FilaDePermiso
            key={permiso.clave}
            permiso={permiso}
            columnas={columnas}
            {...resto}
            apagado={nivel.retirado}
            adorno={nivel.retirado ? <InsigniaDeRetirado /> : undefined}
            acciones={indice === 0 ? huecos?.menuDelNivel(nivel.clave) : undefined}
          />
        )),
      )}
      {huecos?.pie ? (
        <FilaAnchaDeLaMatriz columnas={columnas.length}>{huecos.pie}</FilaAnchaDeLaMatriz>
      ) : null}
    </>
  )
}
