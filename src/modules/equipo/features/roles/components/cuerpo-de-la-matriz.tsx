'use client'

import type { Permisos } from '@/shared/lib/permisos'
import type { GrupoDePermisos, OrigenDeLaMatriz } from '../../../entities/matriz'
import type { RolConConcesiones } from '../../../entities/rol'
import type { CambioDeConcesion } from '../hooks/use-matriz'
import type { ColumnaDeRol } from './grupo-matriz'
import type { HuecosDeNivelesEnLaMatriz } from './huecos-de-niveles'
import { ListaDelRol } from './lista-del-rol'
import { BotonDeQuienCrea } from './boton-de-quien-crea'
import { TablaDeRoles } from './tabla-de-roles'

type Props = {
  // Una sola vista, la que dice el ancho: la tabla desde 768 px (todos los roles) y, por debajo, la lista de un rol (5a-16).
  enTabla: boolean
  grupos: readonly GrupoDePermisos[]
  columnas: readonly ColumnaDeRol[]
  columnaALaVista: ColumnaDeRol
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  puedeGestionar: boolean
  dominado: boolean
  niveles?: HuecosDeNivelesEnLaMatriz
  alEliminar: (rolId: string) => void
  alAvisos: (rolId: string) => void
  alAplicar: (rol: RolConConcesiones, cambio: CambioDeConcesion) => void
}

// La tarjeta de la matriz: la tabla de todos los roles o la lista del rol a la vista.
export function CuerpoDeLaMatriz(props: Props) {
  const { columnaALaVista, grupos, origenes, misPermisos, puedeGestionar } = props
  const { niveles } = props
  const quienCrea = <BotonDeQuienCrea />
  return (
    <div className="min-w-0 overflow-clip rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
      {props.enTabla ? (
        <TablaDeRoles
          grupos={grupos}
          columnas={props.columnas}
          origenes={origenes}
          misPermisos={misPermisos}
          puedeGestionar={puedeGestionar}
          alEliminar={props.alEliminar}
          alAvisos={props.alAvisos}
          alAplicar={props.alAplicar}
          niveles={niveles}
          quienCrea={quienCrea}
        />
      ) : (
        <ListaDelRol
          grupos={grupos}
          columna={columnaALaVista}
          origenes={origenes}
          misPermisos={misPermisos}
          puedeGestionar={puedeGestionar}
          dominado={props.dominado}
          alEliminar={() => {
            props.alEliminar(columnaALaVista.rol.id)
          }}
          alAplicar={(cambio) => {
            props.alAplicar(columnaALaVista.rol, cambio)
          }}
          niveles={niveles}
          quienCrea={quienCrea}
        />
      )}
    </div>
  )
}
