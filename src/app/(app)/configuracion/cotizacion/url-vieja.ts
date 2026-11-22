import {
  CLAVE_DE_LA_ACCION_DE_LA_TABLA,
  RUTAS,
  rutaDeConfiguracionDeCotizacion,
  type PestanaDeCotizacion,
} from '@/shared/lib/rutas'
import { conElPanelDeOrigenes, conParametros, type ParametrosDeLaUrl } from '../con-parametros'

// Configuración › Cotización ya no existe: lo de cada origen vive en su página (`/configuracion/origenes/<id>/planilla|hoja|tarjeta`, las tablas en su drawer `?panel=tablas`)
// y lo global en Catálogos y en Orígenes («Para todos los orígenes»). Los enlaces de cuando era una página con pestañas (`?seccion=`, `?origen=`) siguen funcionando:
// - `?seccion=niveles` → su catálogo; `?seccion=colores|tonos|vigencia|ajustes` → el modal de su tarjeta en Orígenes (`?panel=colores|vigencia`; si traía su propio `?panel=`, ése manda).
// - `?seccion=formula|diseno|tarjeta|tablas&origen=<id>` → esa pestaña del origen (`tablas`: la Planilla con el drawer, y el `?panel=` de la tabla en `accion`); `?origen=<id>` sin sección → su Planilla.
// - Una pestaña de un origen sin origen (o con uno que no es un id), o sin nada → la lista de orígenes, sin parámetros (eran de un origen).
// Los demás parámetros (`?panel=`, `?version=`, `?tabla=`, `?tono=`, `?nivel=`, `?vista=`…) viajan con él, salvo hacia la lista. Ningún
// destino lleva `seccion` ni `origen`: no vuelve a redirigir. No mira permisos: cada página comprueba los suyos.
const DEL_ORIGEN: Readonly<Record<string, PestanaDeCotizacion>> = {
  formula: 'formula',
  diseno: 'hoja',
  hoja: 'hoja',
  tarjeta: 'tarjeta',
  tablas: 'tablas',
}

const DE_CATALOGOS: Readonly<Record<string, string>> = {
  niveles: RUTAS.nivelesDeCotizacion,
}

// Lo de toda la empresa que ahora es una tarjeta de Orígenes: la clave de su `?panel=`.
const DE_ORIGENES: Readonly<Record<string, string>> = {
  colores: 'colores',
  tonos: 'colores',
  vigencia: 'vigencia',
  ajustes: 'vigencia',
}

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const primero = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor)

export function destinoDeLaUrlVieja(parametros: ParametrosDeLaUrl): string {
  const seccion = primero(parametros['seccion'])
  const origen = primero(parametros['origen'])
  const resto = Object.fromEntries(
    Object.entries(parametros).filter(([nombre]) => nombre !== 'origen'),
  )
  const catalogo = seccion === undefined ? undefined : DE_CATALOGOS[seccion]
  if (catalogo !== undefined) {
    return conParametros(catalogo, resto)
  }
  const panel = seccion === undefined ? undefined : DE_ORIGENES[seccion]
  if (panel !== undefined) {
    return conElPanelDeOrigenes(RUTAS.origenes, panel, resto)
  }
  const pestana = seccion === undefined ? 'formula' : DEL_ORIGEN[seccion]
  if (pestana === undefined || origen === undefined || !ID.test(origen)) {
    return RUTAS.origenes
  }
  if (pestana === 'tablas') {
    const { panel: deLaTabla, ...sinPanel } = resto
    return conParametros(rutaDeConfiguracionDeCotizacion(origen, pestana), {
      ...sinPanel,
      [CLAVE_DE_LA_ACCION_DE_LA_TABLA]: deLaTabla,
    })
  }
  return conParametros(rutaDeConfiguracionDeCotizacion(origen, pestana), resto)
}
