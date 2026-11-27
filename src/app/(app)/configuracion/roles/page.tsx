import type { Metadata } from 'next'
import { leerNivelesDeAcceso } from '@/modules/cotizaciones'
import { agruparPorModulo, leerMatriz, puede, requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { MatrizConNiveles } from './matriz-con-niveles'
import { ocultoEnElLive } from '../../_live/guarda'

export const metadata: Metadata = { title: 'Roles y permisos' }

// La matriz de roles × permisos. Verla pide `equipo.roles.ver`; cambiarla, `equipo.roles.gestionar`
// (y la base lo vuelve a comprobar en cada RPC). Los orígenes y los niveles de acceso los lee esta página y se los pasa a
// la matriz: `equipo` no depende de `origenes` ni de `cotizaciones`. Si la lista de niveles no se pudo leer, la matriz sigue y sólo
// el bloque de niveles lo dice.
export default async function PaginaRoles() {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const sesion = await requerirSesion()
  const puedeGestionar = puede(sesion.permisos, 'equipo.roles.gestionar')
  if (!puedeGestionar && !puede(sesion.permisos, 'equipo.roles.ver')) {
    return <EstadoSinPermiso />
  }
  // También los desactivados: lo que se les otorgó sigue valiendo y no se esconde.
  const [matriz, origenes, niveles] = await Promise.all([
    leerMatriz(),
    getOrigenes(true),
    leerNivelesDeAcceso(),
  ])
  const { roles, catalogo } = datosO(matriz)
  return (
    <MatrizConNiveles
      roles={roles}
      grupos={agruparPorModulo(catalogo)}
      origenes={datosO(origenes).map(({ id, nombre, activo }) => ({
        id,
        nombre: activo ? nombre : `${nombre} (inactivo)`,
      }))}
      misPermisos={sesion.permisos}
      puedeGestionar={puedeGestionar}
      niveles={niveles.ok ? niveles.data : null}
    />
  )
}
