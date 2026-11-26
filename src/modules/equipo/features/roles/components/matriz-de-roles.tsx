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
import { useBloqueALaVista } from '../hooks/use-bloque-a-la-vista'
import { useVersionesDeRoles } from '../hooks/use-versiones-de-roles'
import { columnasDeLaMatriz } from './columnas-de-la-matriz'
import { CuerpoDeLaMatriz } from './cuerpo-de-la-matriz'
import { CabeceraMatriz } from './cabecera-matriz'
import type { HuecosDeNivelesEnLaMatriz } from './huecos-de-niveles'
import { SelectorDeRol } from './selector-de-rol'
import { VentanasDeLaMatriz } from './ventanas-de-la-matriz'

type Props = {
  roles: RolConConcesiones[]
  // El catálogo de permisos, ya agrupado por módulo.
  grupos: GrupoDePermisos[]
  origenes: OrigenDeLaMatriz[]
  // Con qué se dibuja la dominancia: lo que la persona no tiene, no lo puede dar.
  misPermisos: Permisos
  puedeGestionar: boolean
  // Los niveles de acceso de cotizaciones (los junta la ruta). Sin ellos, las filas de nivel se agrupan igual, sin «⋯» ni «+ Nuevo nivel».
  niveles?: HuecosDeNivelesEnLaMatriz
}

// Roles × permisos. Cada celda guarda sola; el panel abierto y el rol a la vista viven en la URL. `?bloque=<módulo>` deja a la vista el bloque de ese módulo.
export function MatrizDeRoles({
  roles,
  grupos,
  origenes,
  misPermisos,
  puedeGestionar,
  niveles,
}: Props) {
  const [{ rol: rolElegido }, setParametros] = useQueryStates(
    { rol: parseAsString, panel: parseAsString, eliminar: parseAsString },
    { shallow: false },
  )
  const versiones = useVersionesDeRoles()
  const { aplicar, rolEnCurso } = useMatriz(versiones)
  const enTabla = useAlMenos(CORTE_DE_LA_TABLA)
  const aLaVista = roles.find((rol) => rol.id === rolElegido) ?? roles[0]
  const dominaElRol = (rol: RolConConcesiones) => rolDominado(misPermisos, rol.concesiones)
  const avisos = useAvisosDeRoles({ roles, misPermisos, puedeGestionar, enTabla })
  useBloqueALaVista(grupos.length > 0 && aLaVista !== undefined)

  if (grupos.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no hay permisos que repartir"
        descripcion="El catálogo de permisos se carga al instalar el sistema. Avisa a quien lo administra."
      />
    )
  }
  const columnas = columnasDeLaMatriz(roles, { misPermisos, puedeGestionar, rolEnCurso })
  const columnaALaVista = columnas.find(({ rol }) => rol.id === aLaVista?.id) ?? columnas[0]

  return (
    <div className="grid gap-4">
      <CabeceraMatriz
        puedeGestionar={puedeGestionar}
        alCrearRol={() => void setParametros({ panel: 'nuevo-rol' })}
        alAvisos={avisos.abrirDeLaPagina}
      />
      {aLaVista && columnaALaVista ? (
        <>
          <SelectorDeRol
            roles={roles}
            valor={aLaVista.id}
            alCambiar={(rol) => void setParametros({ rol })}
            cantidadDeAvisos={
              avisosDelRol(aLaVista, { dominado: dominaElRol(aLaVista), puedeGestionar }).length
            }
            alAvisos={avisos.abrirDeUnRol}
          />
          <CuerpoDeLaMatriz
            enTabla={enTabla}
            grupos={grupos}
            columnas={columnas}
            columnaALaVista={columnaALaVista}
            origenes={origenes}
            misPermisos={misPermisos}
            puedeGestionar={puedeGestionar}
            dominado={dominaElRol(aLaVista)}
            niveles={niveles}
            alEliminar={(rolId) => void setParametros({ eliminar: rolId })}
            alAvisos={avisos.abrirDeUnRol}
            alAplicar={(rol, cambio) => void aplicar(rol, cambio)}
          />
        </>
      ) : (
        <EstadoVacio
          titulo="Todavía no hay roles"
          descripcion="Crea uno con «Nuevo rol» para repartir permisos."
        />
      )}
      <VentanasDeLaMatriz
        roles={roles}
        origenes={origenes}
        misPermisos={misPermisos}
        puedeGestionar={puedeGestionar}
        versiones={versiones}
        avisos={avisos}
        niveles={niveles}
      />
    </div>
  )
}
