import { puede, type Permisos } from '@/shared/lib/permisos'
import { RUTAS, rutaDeParteDelOrigen } from '@/shared/lib/rutas'
import { conParametros, type ParametrosDeLaUrl } from '../con-parametros'

// Configuración › Flujos ya no existe: el flujo de cada origen es la pestaña Fases de su página, el de repuestos vive en Repuestos y los tipos
// de documento de la empresa en Logística › Configuración. Sus enlaces (`?origen=`, `?ambito=`, `?seccion=`, `?fase=`) siguen funcionando:
// - `?ambito=repuestos` → el flujo de repuestos (Repuestos › Configuración).
// - `?seccion=documentos` sin `flujos.configurar` (quien sólo gestionaba los catálogos de logística los veía en la página) → Tipos de documento.
// - `?origen=<id>` → la pestaña Fases de ese origen (la pestaña dice si no se abre).
// - Sin origen: el del primer origen donde configura el flujo; si no hay, el de repuestos con `repuestos.configurar`; si no, Tipos de documento.
// `?seccion=` sigue siendo la sección del panel (`reglas`, `documentos`) y viaja con `fase`, `vista`, `panel` y los demás; `origen` y
// `ambito` no (ya están en la ruta). Hacia Tipos de documento no viaja `seccion`.
const SIN_ORIGEN_NI_AMBITO = ['origen', 'ambito']
const HACIA_DOCUMENTOS = ['origen', 'ambito', 'seccion']

const primero = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor)

export function destinoDeLaUrlVieja(
  parametros: ParametrosDeLaUrl,
  permisos: Permisos,
  origenes: readonly { id: string }[],
): string {
  const con = (ruta: string) => conParametros(ruta, parametros, SIN_ORIGEN_NI_AMBITO)
  const aDocumentos = conParametros(RUTAS.tiposDeDocumento, parametros, HACIA_DOCUMENTOS)
  if (primero(parametros['ambito']) === 'repuestos') {
    return con(RUTAS.flujoDeRepuestos)
  }
  if (primero(parametros['seccion']) === 'documentos' && !puede(permisos, 'flujos.configurar')) {
    return aDocumentos
  }
  const origen = primero(parametros['origen'])
  if (origen !== undefined && origen !== '') {
    return con(rutaDeParteDelOrigen(origen, 'fases'))
  }
  const configura = origenes.find((uno) => puede(permisos, 'flujos.configurar', uno.id))
  if (configura !== undefined) {
    return con(rutaDeParteDelOrigen(configura.id, 'fases'))
  }
  return puede(permisos, 'repuestos.configurar') ? con(RUTAS.flujoDeRepuestos) : aDocumentos
}
