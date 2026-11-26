import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { RUTAS, rutaDeTiposDeRepuestos } from '@/shared/lib/rutas'

// Los destinos de búsqueda de Configuración: lo que el buscador encuentra y que no es una sección ni una sub-sección del registro porque no tiene ruta
// propia, sino un modal de una página con su `?panel=` («Orígenes › Colores» abre `/configuracion/origenes?panel=colores`). El buscador los lee junto al registro
// (`secciones.ts` los suma a la sección de cada uno; el de un bloque de la matriz de Roles lleva su `?bloque=`); el menú y el selector de sección no los dibujan. Una página de Configuración que pasa una tarjeta a otra
// con modal suma aquí su destino, así «colores» o «vigencia» siguen encontrándose.
// No mira permisos al abrir: la página comprueba los suyos. Aquí sólo decide a quién se ofrece (`destinosDeLaSeccion`).
export type DestinoDeBusqueda = {
  clave: string
  // La clave de la sección del registro a la que pertenece: el camino que se muestra empieza por su título.
  seccion: string
  titulo: string
  // La ruta con su consulta; sin ella, una página que existe.
  ruta: string
  // Se ofrece a quien tiene alguno de estos permisos (en algún origen).
  permisos: readonly ClavePermiso[]
  // Lo que la persona escribiría para encontrarlo además de su título, sin distinguir acentos ni mayúsculas.
  palabras: readonly string[]
}

export const DESTINOS_DE_BUSQUEDA: readonly DestinoDeBusqueda[] = [
  {
    clave: 'colores',
    seccion: 'origenes',
    titulo: 'Colores',
    ruta: RUTAS.coloresDeCotizacion,
    permisos: ['cotizaciones.configurar'],
    palabras: ['color', 'tema', 'tarjeta', 'cotización', 'para todos los orígenes'],
  },
  {
    clave: 'vigencia',
    seccion: 'origenes',
    titulo: 'Vigencia',
    ruta: RUTAS.vigenciaDeCotizacion,
    permisos: ['cotizaciones.configurar'],
    palabras: ['días', 'vence', 'caducidad', 'validez', 'cotización', 'para todos los orígenes'],
  },
  {
    clave: 'niveles-de-acceso',
    seccion: 'roles',
    titulo: 'Niveles de acceso',
    ruta: RUTAS.cotizacionesEnRoles,
    permisos: ['equipo.roles.ver', 'equipo.roles.gestionar'],
    palabras: ['niveles', 'nivel de acceso', 'celdas', 'ver', 'editar', 'cotización'],
  },
  {
    clave: 'quien-crea-y-quien-ve',
    seccion: 'roles',
    titulo: 'Quién crea y quién ve',
    ruta: RUTAS.cotizacionesEnRoles,
    permisos: ['equipo.roles.ver', 'equipo.roles.gestionar'],
    palabras: ['quién crea', 'quién ve', 'privadas', 'crear', 'origen', 'cotización'],
  },
]

// Un destino que el buscador de Configuración encuentra y que ya no es de Configuración: una página de otra área (Repuestos › Cotizador de repuestos). Se ofrece a quien tiene alguno de sus
// permisos, con su camino («Repuestos › Cotizador de repuestos») y sin pertenecer a ninguna sección del registro: lo lee el buscador aparte. No mira permisos al abrir: la página comprueba los suyos.
export type DestinoFueraDeConfiguracion = {
  clave: string
  // El área donde está: el camino que se muestra empieza por ella.
  lugar: string
  titulo: string
  ruta: string
  permisos: readonly ClavePermiso[]
  palabras: readonly string[]
}

export const DESTINOS_FUERA_DE_CONFIGURACION: readonly DestinoFueraDeConfiguracion[] = [
  {
    clave: 'flujo-de-repuestos',
    lugar: 'Repuestos',
    titulo: 'Flujo de repuestos',
    ruta: RUTAS.flujoDeRepuestos,
    permisos: ['repuestos.configurar'],
    palabras: ['fases', 'reglas', 'requisitos', 'tipos de documento', 'mover', 'configuración'],
  },
  {
    clave: 'tipos-de-documento-de-repuestos',
    lugar: 'Repuestos › Flujo de repuestos',
    titulo: 'Tipos de documento',
    ruta: rutaDeTiposDeRepuestos(),
    permisos: ['repuestos.configurar'],
    palabras: ['documentos', 'requisitos', 'archivos', 'catálogos', 'configuración'],
  },
  {
    clave: 'cotizador-de-repuestos',
    lugar: 'Repuestos',
    titulo: 'Cotizador de repuestos',
    ruta: RUTAS.cotizadorDeRepuestos,
    permisos: ['repuestos.configurar'],
    palabras: ['fórmula', 'tramos', 'cajas', 'logística', 'configuración'],
  },
  {
    clave: 'catalogos-de-repuestos',
    lugar: 'Repuestos',
    titulo: 'Catálogos de repuestos',
    ruta: RUTAS.catalogosDeRepuestos,
    permisos: ['repuestos.configurar'],
    palabras: [
      'tipo de pieza',
      'condición',
      'vía',
      'transporte',
      'país',
      'país de origen',
      'configuración',
    ],
  },
]

// Lo que el navegador recibe de un destino: sólo lo que el buscador usa (sin los permisos).
export type DestinoDelNavegador = Pick<DestinoDeBusqueda, 'clave' | 'titulo' | 'ruta' | 'palabras'>

// Lo que el navegador recibe de un destino fuera de Configuración: sólo lo que el buscador usa (sin los permisos).
export type DestinoFueraDelNavegador = Pick<
  DestinoFueraDeConfiguracion,
  'clave' | 'lugar' | 'titulo' | 'ruta' | 'palabras'
>

// Los destinos fuera de Configuración que esta persona puede abrir.
export function destinosFueraDeConfiguracion(permisos: Permisos): DestinoFueraDelNavegador[] {
  return DESTINOS_FUERA_DE_CONFIGURACION.filter((destino) =>
    destino.permisos.some((clave) => puede(permisos, clave)),
  ).map(({ clave, lugar, titulo, ruta, palabras }) => ({ clave, lugar, titulo, ruta, palabras }))
}

// Los destinos de una sección que esta persona puede abrir.
export function destinosDeLaSeccion(seccion: string, permisos: Permisos): DestinoDelNavegador[] {
  return DESTINOS_DE_BUSQUEDA.filter(
    (destino) =>
      destino.seccion === seccion && destino.permisos.some((clave) => puede(permisos, clave)),
  ).map(({ clave, titulo, ruta, palabras }) => ({ clave, titulo, ruta, palabras }))
}
