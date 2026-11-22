import { LibraryBigIcon } from 'lucide-react'
import type { ClavePermiso } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion, SubseccionDeConfiguracion } from '../secciones'
import { CATALOGOS_DE_LOGISTICA } from './catalogos-de-logistica'

// La entrada de Configuración › Catálogos en el registro: lo que es de toda la empresa y no de un origen, una sub-ruta por catálogo
// (`/configuracion/catalogos/<clave>`), en dos tramos del menú. Los niveles de acceso y Quién crea y quién ve ya no son catálogos: viven en la matriz de
// Configuración › Roles (el bloque «Cotizaciones»); Colores y Vigencia, en las tarjetas de «Para todos los orígenes» de Configuración › Orígenes.
// - «Logística»: los catálogos que llena el módulo (`catalogos-de-logistica.ts`), cada uno con su permiso, y Tipos de documento: los cambia quien
//   gestiona los catálogos de logística y los lee quien configura un flujo.
// - Tablas compartidas, sin rótulo: las tablas de referencia sin origen, con `cotizaciones.configurar`.
// La sección no tiene índice: su `route.ts` abre la primera sub-sección que la persona puede abrir. Es la única fuente de títulos, frases, rutas y
// permisos de sus páginas. El tipo se trae con `import type`: el ciclo con `secciones.ts` es sólo de tipos y se borra al compilar.

const DE_LOGISTICA: readonly SubseccionDeConfiguracion[] = [
  ...[
    ...new Map(CATALOGOS_DE_LOGISTICA.map((catalogo) => [catalogo.clave, catalogo])).values(),
  ].map((catalogo): SubseccionDeConfiguracion => ({
    clave: catalogo.clave,
    titulo: catalogo.titulo,
    descripcion: catalogo.descripcion,
    ruta: `${RUTAS.catalogos}/${catalogo.clave}`,
    permisos: [catalogo.permiso],
    grupo: 'Logística',
  })),
  {
    clave: 'tipos-de-documento',
    titulo: 'Tipos de documento',
    descripcion: 'Los documentos que se piden en las fases, para toda la empresa.',
    palabras: ['documentos', 'requisitos', 'archivos'],
    ruta: RUTAS.tiposDeDocumento,
    permisos: ['logistica.catalogos.gestionar', 'flujos.configurar', 'repuestos.configurar'],
    grupo: 'Logística',
  },
]

const TABLAS_COMPARTIDAS = {
  clave: 'tablas',
  titulo: 'Tablas compartidas',
  descripcion: 'Las tablas de referencia que usa cada origen que no tiene la propia.',
  palabras: ['tablas', 'referencia', 'depreciación', 'transporte', 'aranceles'],
  ruta: RUTAS.tablasCompartidas,
  permisos: ['cotizaciones.configurar'],
} as const satisfies SubseccionDeConfiguracion

export const SUBSECCIONES_DE_CATALOGOS: readonly SubseccionDeConfiguracion[] = [
  ...DE_LOGISTICA,
  TABLAS_COMPARTIDAS,
]

// La sub-sección de una clave: la de cada página es fija; null sólo si nadie la registró (un catálogo de logística que el módulo ya no llena).
export function subseccionDeCatalogos(clave: string): SubseccionDeConfiguracion | null {
  return SUBSECCIONES_DE_CATALOGOS.find((sub) => sub.clave === clave) ?? null
}

export const SECCION_DE_CATALOGOS: SeccionDeConfiguracion = {
  clave: 'catalogos',
  titulo: 'Catálogos',
  descripcion:
    'Lo que es de toda la empresa: puertos, navieras, gastos, documentos y tablas compartidas.',
  palabras: [
    'puertos',
    'navieras',
    'gastos',
    'tipos de documento',
    'tablas compartidas',
    'logística',
    'cotización',
  ],
  ruta: RUTAS.catalogos,
  Icono: LibraryBigIcon,
  permisos: [
    ...new Set(SUBSECCIONES_DE_CATALOGOS.flatMap((sub) => sub.permisos)),
  ] as ClavePermiso[],
  grupo: 'operacion',
  subsecciones: SUBSECCIONES_DE_CATALOGOS,
}
