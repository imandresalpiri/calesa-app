import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'

// `/configuracion/catalogos` ya no tiene página ni sección: cada catálogo vive donde se usa. La raíz lleva al primer lugar nuevo que la persona puede abrir, en el orden del
// registro viejo: Colores → Niveles y Quién crea y quién ve → Puertos, Navieras y Categorías de gasto → Tipos de documento. Vigencia y Tablas compartidas se abren con el mismo
// permiso que Colores (`cotizaciones.configurar`), así que nunca se llega a ellas antes: no figuran. Es la única fuente de esa regla (el buscador y las demás redirecciones no
// la usan).
const PRIMEROS_LUGARES: readonly { ruta: string; permisos: readonly ClavePermiso[] }[] = [
  { ruta: RUTAS.coloresDeCotizacion, permisos: ['cotizaciones.configurar'] },
  { ruta: RUTAS.cotizacionesEnRoles, permisos: ['equipo.roles.ver', 'equipo.roles.gestionar'] },
  { ruta: RUTAS.puertosDeLogistica, permisos: ['logistica.catalogos.gestionar'] },
  {
    ruta: RUTAS.tiposDeDocumento,
    permisos: ['logistica.catalogos.gestionar', 'flujos.configurar', 'repuestos.configurar'],
  },
]

// A dónde lleva la raíz vieja a esta persona; sin ningún lugar que abrir, al inicio de Configuración (que sólo muestra lo que abre).
export function primerLugarDeLosCatalogos(permisos: Permisos): string {
  const lugar = PRIMEROS_LUGARES.find(({ permisos: claves }) =>
    claves.some((clave) => puede(permisos, clave)),
  )
  return lugar?.ruta ?? RUTAS.inicioDeConfiguracion
}
