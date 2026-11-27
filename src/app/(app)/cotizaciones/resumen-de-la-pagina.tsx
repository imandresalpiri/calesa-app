import { connection } from 'next/server'
import {
  CLAVE_DE_RESUMEN_DE_COTIZACION,
  idDelResumen,
  type LecturaDelServidor,
} from '@/modules/cotizaciones'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { origenesCon, puede } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { leerLaDelResumen } from './lecturas-de-la-pagina'
import { menusDeLaPagina, quienesDelResumen } from './menus-de-la-pagina'
import { ResumenConAcciones } from './resumen-con-acciones'
import { rutaDeVueltaALaFicha } from './ruta-de-vuelta-a-la-ficha'

type Parametros = Awaited<PageProps<'/cotizaciones'>['searchParams']>

// El resumen de la cotización de `?cotizacion=` sobre una pantalla que no es el listado (la ficha del lead y la del vehículo): lee sólo esa cotización (con la RLS de quien mira y
// sus nombres), su «⋯», lo que deja hacer y dónde aprueba, y la monta. Sin la clave en la URL no lee nada ni dibuja nada. Va tras un `<Suspense>`: lee la sesión y la base.
// «Abrir cotización» lleva a la página de la cotización con «Volver» a la ficha (`ruta` con su consulta).
export async function ResumenDeLaPagina({
  parametros,
  ruta,
  enlazarVehiculo = true,
}: {
  parametros: Promise<Parametros> | Parametros
  // La de la ficha (`/leads/<id>`).
  ruta: string
  // Falso en la ficha del propio vehículo: el título no enlaza a sí mismo.
  enlazarVehiculo?: boolean
}) {
  const url = await parametros
  const texto = unParametro(url[CLAVE_DE_RESUMEN_DE_COTIZACION])
  if (texto === undefined) {
    return null
  }
  await connection()
  const sesion = await requerirSesion()
  if (!puede(sesion.permisos, 'cotizaciones.ver')) {
    return null
  }
  const id = idDelResumen(texto)
  const delServidor: LecturaDelServidor | null =
    id === null ? null : await leerLaDelResumen(sesion, id)
  const origenes = datosO(await getOrigenes(true))
    .filter((origen) => puede(sesion.permisos, 'cotizaciones.ver', origen.id))
    .map((origen) => ({ id: origen.id, nombre: origen.nombre, color: origen.color }))
  const filas = delServidor?.estado === 'listo' ? [delServidor.cotizacion] : []
  return (
    <ResumenConAcciones
      origenes={origenes}
      delServidor={delServidor}
      menus={await menusDeLaPagina(sesion, filas)}
      quienes={quienesDelResumen(sesion, [], delServidor)}
      aprobarEn={origenesCon(sesion.permisos, 'cotizaciones.aprobar')}
      vehiculosVisibles={enlazarVehiculo ? origenesCon(sesion.permisos, 'vehiculos.ver') : []}
      volverA={rutaDeVueltaALaFicha(ruta, url, CLAVE_DE_RESUMEN_DE_COTIZACION)}
    />
  )
}
