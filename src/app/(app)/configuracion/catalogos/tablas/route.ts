import 'server-only'
import { connection, type NextRequest } from 'next/server'
import { leerDondeSeUsaLaTabla } from '@/modules/cotizaciones'
import { requerirSesion } from '@/modules/equipo'
import { leerOrigenes } from '@/modules/origenes'
import { puede } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { deLaBusqueda, redireccionPermanente } from '../../con-parametros'
import { destinoDeLasTablasCompartidas } from './destino'

// Configuración › Catálogos › Tablas compartidas ya no es una página: las tablas viven en el drawer «Tablas» de cada origen. Un 308 por persona (`private, no-store`: el
// destino sale de los orígenes que configura) al drawer del primer origen que usa la tabla de `?tabla=` y que ella configura, o, sin tabla, al del primero que configura,
// con el resto de la consulta; sin ningún origen que configure, al inicio de Configuración (`destino.ts`). Lee los orígenes de la lista y, con `?tabla=`, esa tabla por su PK
// y los orígenes con una propia de su clave: nada que crezca con las cotizaciones.
export async function GET(peticion: NextRequest) {
  await connection()
  const { permisos } = await requerirSesion()
  const parametros = deLaBusqueda(peticion.nextUrl.searchParams)
  const lectura = await leerOrigenes()
  const configurables = lectura.ok
    ? lectura.data
        .filter((origen) => puede(permisos, 'cotizaciones.configurar', origen.id))
        .map((origen) => origen.id)
    : []
  const tablaId = unParametro(parametros['tabla'])
  const usada =
    tablaId !== undefined && configurables.length > 0
      ? await leerDondeSeUsaLaTabla(tablaId, configurables)
      : null
  return redireccionPermanente(
    destinoDeLasTablasCompartidas({
      configurables,
      uso: usada?.ok ? usada.data : null,
      parametros,
    }),
    { porPersona: true },
  )
}
