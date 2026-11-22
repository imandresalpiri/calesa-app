import { PARTES_DEL_ORIGEN, RUTAS } from '@/shared/lib/rutas'

const PAGINA_DEL_ORIGEN = new RegExp(
  `^${RUTAS.origenes}/[^/]+(/(${PARTES_DEL_ORIGEN.join('|')}))?/?$`,
)

// Si la ruta es la página de un origen (una de sus pestañas): ahí el layout de Configuración no dibuja su menú ni su cabecera (las migas los reemplazan) y la
// página usa todo el ancho. La lista, «Nuevo origen» y la puesta en marcha conservan el marco.
export function esLaPaginaDelOrigen(ruta: string): boolean {
  return ruta !== `${RUTAS.origenes}/nuevo` && PAGINA_DEL_ORIGEN.test(ruta)
}
