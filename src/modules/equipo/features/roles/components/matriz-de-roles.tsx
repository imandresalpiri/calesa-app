'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import type { Permisos } from '@/shared/lib/permisos'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import { EstadoVacio } from '@/shared/ui/estados'
import { avisosDelRol } from '../../../entities/avisos-de-roles'
import { rolDominado } from '../../../entities/dominancia'
import type { GrupoDePermisos, OrigenDeLaMatriz } from '../../../entities/matriz'
import type { RolConConcesiones } from '../../../entities/rol'
import { useAvisosDeRoles } from '../hooks/use-avisos-de-roles'
import { useMatriz } from '../hooks/use-matriz'
import { CabeceraMatriz } from './cabecera-matriz'
import { AvisosDeRolesAlAbrir } from './avisos-de-roles-al-abrir'
import { EliminarRol } from './eliminar-rol'
import type { ColumnaDeRol } from './grupo-matriz'
import { ListaDelRol } from './lista-del-rol'
import { NuevoRol } from './nuevo-rol'
import { SelectorDeRol } from './selector-de-rol'
import { TablaDeRoles } from './tabla-de-roles'

type Props = {
  roles: RolConConcesiones[]
  // El catálogo de permisos, ya agrupado por módulo.
  grupos: GrupoDePermisos[]
  origenes: OrigenDeLaMatriz[]
  // Con qué se dibuja la dominancia: lo que la persona no tiene, no lo puede dar.
  misPermisos: Permisos
  puedeGestionar: boolean
}

// Roles × permisos. Cada celda guarda sola; el panel abierto y el rol a la vista viven en la URL.
export function MatrizDeRoles({ roles, grupos, origenes, misPermisos, puedeGestionar }: Props) {
  const [{ rol: rolElegido, panel, eliminar }, setParametros] = useQueryStates(
    { rol: parseAsString, panel: parseAsString, eliminar: parseAsString },
    { shallow: false },
  )
  const { aplicar, rolEnCurso } = useMatriz()
  // Una sola vista, la que dice el ancho: la tabla desde 768 px (todos los roles) y, por debajo, la lista de un rol (5a-16).
  const enTabla = useAlMenos(CORTE_DE_LA_TABLA)
  const aLaVista = roles.find((rol) => rol.id === rolElegido) ?? roles[0]
  const dominaElRol = (rol: RolConConcesiones) => rolDominado(misPermisos, rol.concesiones)
  const avisos = useAvisosDeRoles({ roles, misPermisos, puedeGestionar, enTabla })

  if (grupos.length === 0 || !aLaVista) {
    return (
      <EstadoVacio
        titulo="Todavía no hay permisos que repartir"
        descripcion="El catálogo de permisos se carga al instalar el sistema. Avisa a quien lo administra."
      />
    )
  }

  const columnas: ColumnaDeRol[] = roles.map((rol) => ({
    rol,
    editable: puedeGestionar && dominaElRol(rol),
    ocupado: rolEnCurso === rol.id,
  }))
  const cantidadDeAvisos = avisosDelRol(aLaVista, {
    dominado: dominaElRol(aLaVista),
    puedeGestionar,
  }).length
  const columnaALaVista = columnas.find(({ rol }) => rol.id === aLaVista.id) ?? columnas[0]

  return (
    <div className="grid gap-4">
      <CabeceraMatriz
        puedeGestionar={puedeGestionar}
        alCrearRol={() => void setParametros({ panel: 'nuevo-rol' })}
        alAvisos={avisos.abrirDeLaPagina}
      />
      <SelectorDeRol
        roles={roles}
        valor={aLaVista.id}
        alCambiar={(rol) => void setParametros({ rol })}
        cantidadDeAvisos={cantidadDeAvisos}
        alAvisos={avisos.abrirDeUnRol}
      />
      <div className="min-w-0 overflow-clip rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
        {enTabla || !columnaALaVista ? (
          <TablaDeRoles
            grupos={grupos}
            columnas={columnas}
            origenes={origenes}
            misPermisos={misPermisos}
            puedeGestionar={puedeGestionar}
            alEliminar={(rolId) => void setParametros({ eliminar: rolId })}
            alAvisos={avisos.abrirDeUnRol}
            alAplicar={(rol, cambio) => void aplicar(rol, cambio)}
          />
        ) : (
          <ListaDelRol
            grupos={grupos}
            columna={columnaALaVista}
            origenes={origenes}
            misPermisos={misPermisos}
            puedeGestionar={puedeGestionar}
            dominado={dominaElRol(columnaALaVista.rol)}
            alEliminar={() => void setParametros({ eliminar: columnaALaVista.rol.id })}
            alAplicar={(cambio) => void aplicar(columnaALaVista.rol, cambio)}
          />
        )}
      </div>
      <NuevoRol
        abierto={puedeGestionar && panel === 'nuevo-rol'}
        alCerrar={() => void setParametros({ panel: null })}
        alCrear={(rol) => void setParametros({ panel: null, rol })}
      />
      <AvisosDeRolesAlAbrir estado={avisos} />
      <EliminarRol
        rol={roles.find((rol) => rol.id === eliminar) ?? null}
        alCerrar={() => void setParametros({ eliminar: null })}
      />
    </div>
  )
}
