'use client'

import { useRef, type ReactNode } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import { CabeceraPegada } from '@/shared/ui/lista'
import { Table, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { rolDominado } from '../../../entities/dominancia'
import type { GrupoDePermisos, OrigenDeLaMatriz } from '../../../entities/matriz'
import type { RolConConcesiones } from '../../../entities/rol'
import { useAltoPegado } from '../hooks/use-alto-pegado'
import type { CambioDeConcesion } from '../hooks/use-matriz'
import { EncabezadoRol } from './encabezado-rol'
import { GrupoMatriz, type ColumnaDeRol } from './grupo-matriz'
import type { HuecosDeNivelesEnLaMatriz } from './huecos-de-niveles'

type Props = {
  grupos: readonly GrupoDePermisos[]
  columnas: readonly ColumnaDeRol[]
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  puedeGestionar: boolean
  alEliminar: (rolId: string) => void
  alAvisos: (rolId: string) => void
  alAplicar: (rol: RolConConcesiones, cambio: CambioDeConcesion) => void
  niveles?: HuecosDeNivelesEnLaMatriz
  quienCrea?: ReactNode
}

// La matriz desde 768 px: una columna por rol y un renglón por permiso. La columna «Permiso» va pegada a la izquierda: con muchos roles la
// tabla se desplaza de costado dentro de su tarjeta (4.012 px con ocho roles al 200 %) y el nombre de cada permiso no se pierde (5a-19).
// La fila de los roles queda pegada arriba mientras se desplazan los permisos: la tarjeta es la que se desplaza (`max-h`), porque un
// `sticky top` no sirve dentro de un contenedor con `overflow-x`; el título del módulo se pega justo debajo (`GrupoMatriz`).
// Por debajo de 768 px, un rol a la vez en `ListaDelRol`.
export function TablaDeRoles(props: Props) {
  const { grupos, columnas, origenes, misPermisos, puedeGestionar } = props
  const cabecera = useRef<HTMLTableSectionElement>(null)
  useAltoPegado(cabecera, '--alto-cabecera-roles')
  return (
    // `scroll-pl-44`: el ancho de «Permiso» (`min-w-44`): una columna a la que se desplaza la tabla no queda debajo de la fija (5a-33).
    // `max-h`: la pantalla menos la barra superior y el relleno de abajo del marco (`md:pb-14` = 3.5rem): con la página desplazada hasta el
    // final la tarjeta queda con su borde de arriba a ras de la barra superior, ni tapada por ella ni con un hueco.
    // `@container/roles`: lo que abarca toda la tabla (el botón de «Quién crea y quién ve», «Todos» y el pie de los niveles) mide lo que se ve de la tarjeta
    // (`100cqw`) y no los 4.000 px de la tabla.
    <Table contenedor="@container/roles scroll-pl-44 max-h-[calc(100dvh-var(--topbar)-3.5rem)] overflow-y-auto">
      <TableHeader ref={cabecera} className="sticky top-0 z-30 bg-(--color-surface)">
        <TableRow>
          <CabeceraPegada lado="nombre" className="top-0 z-30 min-w-44 align-bottom">
            Permiso
          </CabeceraPegada>
          {columnas.map(({ rol }) => (
            <TableHead key={rol.id} className="align-top">
              <EncabezadoRol
                rol={rol}
                puedeGestionar={puedeGestionar}
                dominado={rolDominado(misPermisos, rol.concesiones)}
                alEliminar={() => {
                  props.alEliminar(rol.id)
                }}
                alAvisos={() => {
                  props.alAvisos(rol.id)
                }}
              />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      {grupos.map((grupo) => (
        <GrupoMatriz
          key={grupo.modulo}
          grupo={grupo}
          columnas={columnas}
          origenes={origenes}
          misPermisos={misPermisos}
          alAplicar={props.alAplicar}
          niveles={props.niveles}
          quienCrea={props.quienCrea}
        />
      ))}
    </Table>
  )
}
