import type { ClavePermiso } from '@/shared/lib/permisos'
import { PARTES_DEL_ORIGEN, type ParteDelOrigen } from '@/shared/lib/rutas'

// Las pestañas de la página de un origen (`/configuracion/origenes/<id>/<pestana>`): su título, la frase que dice la página bajo las
// pestañas, lo que alguien escribiría para buscarla, el permiso que pide en ese origen y el motivo de la apagada. Campos y Categorías no
// piden uno propio: se abren con el origen (sólo lectura sin `origenes.gestionar`). Los datos del origen no son pestaña: van en su drawer
// (`?panel=datos`). La única fuente de las pestañas: las leen el acceso (`acceso.ts`), el marco y las páginas.
export type PestanaDelOrigen = {
  clave: ParteDelOrigen
  titulo: string
  descripcion: string
  palabras: readonly string[]
  permiso: ClavePermiso | null
  motivo: string | null
}

export const MOTIVO_SIN_CONFIGURAR_EL_FLUJO =
  'Lo configura quien tiene el permiso «Configurar el flujo».'
export const MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR =
  'Lo configura quien tiene el permiso «Configurar el cotizador».'

const DE_CADA_PESTANA: Record<ParteDelOrigen, Omit<PestanaDelOrigen, 'clave'>> = {
  fases: {
    titulo: 'Fases',
    descripcion: 'Las fases por las que pasa un vehículo de este origen, sus requisitos y reglas.',
    palabras: [
      'flujo',
      'transiciones',
      'requisitos',
      'reglas',
      'logística',
      'diagrama',
      'documentos',
    ],
    permiso: 'flujos.configurar',
    motivo: MOTIVO_SIN_CONFIGURAR_EL_FLUJO,
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
    permiso: 'cotizaciones.configurar',
    motivo: MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR,
  },
  hoja: {
    titulo: 'Hoja',
    descripcion: 'Cómo se ve y se llena la cotización.',
    palabras: ['cotizar', 'vista previa', 'diseño'],
    permiso: 'cotizaciones.configurar',
    motivo: MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR,
  },
  tarjeta: {
    titulo: 'Tarjeta',
    descripcion: 'La imagen que recibe el cliente.',
    palabras: ['PDF', 'imagen', 'logo', 'plantilla'],
    permiso: 'cotizaciones.configurar',
    motivo: MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR,
  },
  campos: {
    titulo: 'Campos',
    descripcion: 'Los datos que se cargan de cada vehículo y los 4 que su ficha muestra primero.',
    palabras: ['datos del vehículo', 'ficha', 'atributos'],
    permiso: null,
    motivo: null,
  },
  categorias: {
    titulo: 'Categorías',
    descripcion: 'Las categorías y subcategorías de los vehículos de este origen.',
    palabras: ['subcategorías', 'marca', 'modelo'],
    permiso: null,
    motivo: null,
  },
}

export const PESTANAS_DEL_ORIGEN: readonly PestanaDelOrigen[] = PARTES_DEL_ORIGEN.map((clave) => ({
  clave,
  ...DE_CADA_PESTANA[clave],
}))

export function pestanaDelOrigen(clave: ParteDelOrigen): PestanaDelOrigen {
  return { clave, ...DE_CADA_PESTANA[clave] }
}
