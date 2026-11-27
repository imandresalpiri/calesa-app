import type { ClavePermiso } from '@/shared/lib/permisos'
import { PARTES_DEL_ORIGEN, type ParteDelOrigen } from '@/shared/lib/rutas'

// Las pestañas de la página de un origen (`/configuracion/origenes/<id>/<pestana>`): su título, la frase que dice la página bajo las
// pestañas, lo que alguien escribiría para buscarla, los permisos que la abren en ese origen (basta con uno) y el motivo de la apagada. Campos y Categorías no
// piden uno propio: se abren con el origen (sólo lectura sin `origenes.gestionar`). Los datos del origen no son pestaña: van en su drawer
// (`?panel=datos`). La única fuente de las pestañas: las leen el acceso (`acceso.ts`), el marco y las páginas.
export type PestanaDelOrigen = {
  clave: ParteDelOrigen
  titulo: string
  descripcion: string
  palabras: readonly string[]
  permisos: readonly ClavePermiso[] | null
  motivo: string | null
}

export const MOTIVO_SIN_CONFIGURAR_EL_FLUJO =
  'Lo configura quien tiene el permiso «Configurar el flujo».'
// Fases la abre quien configura el flujo (edita el diagrama) o quien gestiona los catálogos de logística del origen (ve el diagrama en sólo lectura y
// edita los catálogos de arriba).
export const MOTIVO_SIN_LAS_FASES =
  'Lo configura quien tiene el permiso «Configurar el flujo» o «Catálogos de logística».'
export const MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR =
  'Lo configura quien tiene el permiso «Configurar el cotizador».'

const DE_CADA_PESTANA: Record<ParteDelOrigen, Omit<PestanaDelOrigen, 'clave'>> = {
  fases: {
    titulo: 'Fases',
    descripcion:
      'Las fases por las que pasa un vehículo de este origen, sus requisitos y reglas, y los puertos, navieras, categorías de gasto y tipos de documento de su logística.',
    palabras: [
      'flujo',
      'transiciones',
      'requisitos',
      'reglas',
      'logística',
      'diagrama',
      'documentos',
      'puertos',
      'navieras',
      'categorías de gasto',
      'tipos de documento',
      'catálogos',
    ],
    permisos: ['flujos.configurar', 'logistica.catalogos.gestionar'],
    motivo: MOTIVO_SIN_LAS_FASES,
  },
  planilla: {
    titulo: 'Planilla',
    descripcion: 'Qué se calcula: la fórmula del origen, sus versiones y sus tablas.',
    palabras: [
      'fórmula',
      'cálculo',
      'costo',
      'margen',
      'publicar',
      'activar',
      'copiar',
      'versiones',
      'tablas',
      'depreciación',
      'cotizador',
    ],
    permisos: ['cotizaciones.configurar'],
    motivo: MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR,
  },
  hoja: {
    titulo: 'Hoja',
    descripcion: 'Cómo se ve y se llena la cotización.',
    palabras: ['cotizar', 'vista previa', 'diseño'],
    permisos: ['cotizaciones.configurar'],
    motivo: MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR,
  },
  tarjeta: {
    titulo: 'Tarjeta',
    descripcion: 'La imagen que recibe el cliente.',
    palabras: ['PDF', 'imagen', 'logo', 'plantilla'],
    permisos: ['cotizaciones.configurar'],
    motivo: MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR,
  },
  campos: {
    titulo: 'Campos',
    descripcion: 'Los datos que se cargan de cada vehículo y los 4 que su ficha muestra primero.',
    palabras: ['datos del vehículo', 'ficha', 'atributos'],
    permisos: null,
    motivo: null,
  },
  categorias: {
    titulo: 'Categorías',
    descripcion: 'Las categorías y subcategorías de los vehículos de este origen.',
    palabras: ['subcategorías', 'marca', 'modelo'],
    permisos: null,
    motivo: null,
  },
}

export const PESTANAS_DEL_ORIGEN: readonly PestanaDelOrigen[] = PARTES_DEL_ORIGEN.map((clave) => ({
  clave,
  ...DE_CADA_PESTANA[clave],
}))

// Con el Modo Live encendido (Configuración de orígenes en «Sólo lectura», glosario: «Modo Live») sólo se ven las del cotizador, en sólo lectura: las demás son
// del inventario y del flujo, que el Live esconde.
export const PESTANAS_DEL_LIVE: readonly ParteDelOrigen[] = ['planilla', 'hoja', 'tarjeta']

export function pestanasVisibles(enElLive: boolean): readonly PestanaDelOrigen[] {
  return enElLive
    ? PESTANAS_DEL_ORIGEN.filter((pestana) => PESTANAS_DEL_LIVE.includes(pestana.clave))
    : PESTANAS_DEL_ORIGEN
}

export function pestanaDelOrigen(clave: ParteDelOrigen): PestanaDelOrigen {
  return { clave, ...DE_CADA_PESTANA[clave] }
}
