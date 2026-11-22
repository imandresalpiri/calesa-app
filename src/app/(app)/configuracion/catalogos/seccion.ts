import { LibraryBigIcon } from 'lucide-react'
import type { SeccionDeConfiguracion } from '../secciones'

// La entrada de Configuración › Catálogos en el registro, ya sin nada propio: lo que era de toda la empresa vive donde se usa. Los niveles de acceso y Quién crea y quién ve, en la
// matriz de Configuración › Roles (el bloque «Cotizaciones»); Colores y Vigencia, en las tarjetas de «Para todos los orígenes» de Configuración › Orígenes; las tablas de
// referencia (propias y compartidas), en el drawer «Tablas» de la barra de la fórmula de cada origen; los catálogos de logística, en Logística › Configuración
// (`/logistica/configuracion`). Sin permisos ni sub-secciones, ninguna persona la ve en el menú: queda como la ruta que redirige las URL viejas (`catalogos/route.ts` y las
// de cada catálogo) hasta que se quite del registro. El tipo se trae con `import type`: el ciclo con `secciones.ts` es sólo de tipos y se borra al compilar.
export const SECCION_DE_CATALOGOS: SeccionDeConfiguracion = {
  clave: 'catalogos',
  titulo: 'Catálogos',
  descripcion: 'Lo que era de toda la empresa vive ahora donde se usa.',
  palabras: ['catálogos'],
  ruta: '/configuracion/catalogos',
  Icono: LibraryBigIcon,
  permisos: [],
  grupo: 'operacion',
  subsecciones: [],
}
