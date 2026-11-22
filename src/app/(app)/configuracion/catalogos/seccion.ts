import { LibraryBigIcon } from 'lucide-react'
import type { ClavePermiso } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion, SubseccionDeConfiguracion } from '../secciones'

// La entrada de Configuración › Catálogos en el registro: lo que es de toda la empresa y no de un origen ni de un área. Los niveles de acceso y Quién crea y quién ve viven en la
// matriz de Configuración › Roles (el bloque «Cotizaciones»); Colores y Vigencia, en las tarjetas de «Para todos los orígenes» de Configuración › Orígenes; los catálogos de
// logística (puertos, navieras, categorías de gasto y tipos de documento), en Logística › Configuración (`/logistica/configuracion`). Quedan las tablas compartidas, con `cotizaciones.configurar`.
// La sección no tiene índice: su `route.ts` abre la primera sub-sección que la persona puede abrir. Es la única fuente de títulos, frases, rutas y
// permisos de sus páginas. El tipo se trae con `import type`: el ciclo con `secciones.ts` es sólo de tipos y se borra al compilar.

const TABLAS_COMPARTIDAS = {
  clave: 'tablas',
  titulo: 'Tablas compartidas',
  descripcion: 'Las tablas de referencia que usa cada origen que no tiene la propia.',
  palabras: ['tablas', 'referencia', 'depreciación', 'transporte', 'aranceles'],
  ruta: RUTAS.tablasCompartidas,
  permisos: ['cotizaciones.configurar'],
} as const satisfies SubseccionDeConfiguracion

export const SUBSECCIONES_DE_CATALOGOS: readonly SubseccionDeConfiguracion[] = [TABLAS_COMPARTIDAS]

// La sub-sección de una clave: la de cada página es fija; null si nadie la registró.
export function subseccionDeCatalogos(clave: string): SubseccionDeConfiguracion | null {
  return SUBSECCIONES_DE_CATALOGOS.find((sub) => sub.clave === clave) ?? null
}

export const SECCION_DE_CATALOGOS: SeccionDeConfiguracion = {
  clave: 'catalogos',
  titulo: 'Catálogos',
  descripcion:
    'Lo que es de toda la empresa y no de un origen: las tablas de referencia compartidas.',
  palabras: ['tablas compartidas', 'referencia', 'cotización'],
  ruta: RUTAS.catalogos,
  Icono: LibraryBigIcon,
  permisos: [
    ...new Set(SUBSECCIONES_DE_CATALOGOS.flatMap((sub) => sub.permisos)),
  ] as ClavePermiso[],
  grupo: 'operacion',
  subsecciones: SUBSECCIONES_DE_CATALOGOS,
}
