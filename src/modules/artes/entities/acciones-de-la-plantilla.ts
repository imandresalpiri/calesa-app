// Las líneas del «⋯» de la tarjeta de una plantilla de arte, en su orden: abrir (la principal: tocar la tarjeta hace lo mismo), duplicar y
// duplicar en otro formato (apagada hasta el editor de artes); usar o quitar como por defecto en su origen; hacerla de la empresa o privada, y
// eliminar. Lo que no se puede va apagado y una nota dice por qué (una sola vez si el motivo se repite). Puro: el componente le pone a cada
// línea lo que hace.
import { nombreDelTipo, tipoDelFormato, type ClaveDeFormato } from './formatos'
import {
  puedeCambiarLaVisibilidad,
  puedeEliminarLaPlantilla,
  type Permiso,
  type QuienMira,
} from './permisos-de-artes'
import type { VisibilidadDeArte } from './tipos'

export const MOTIVO_DEL_OTRO_FORMATO = 'Llega con el editor de artes.'

export type ClaveDeAccionDeArte =
  | 'abrir'
  | 'duplicar'
  | 'otro-formato'
  | 'usar-por-defecto'
  | 'quitar-por-defecto'
  | 'hacerla-de-la-empresa'
  | 'hacerla-privada'
  | 'eliminar'

export type LineaDeLaPlantilla =
  | {
      tipo: 'accion'
      clave: ClaveDeAccionDeArte
      etiqueta: string
      deshabilitada: boolean
      principal?: true
      destructiva?: true
    }
  | { tipo: 'separador'; clave: string }
  | { tipo: 'nota'; clave: string; texto: string }

type DeLaTarjeta = {
  autorId: string
  visibilidad: VisibilidadDeArte
  formato: ClaveDeFormato
  origenNombre: string
  esPorDefecto: boolean
}

function accion(
  clave: ClaveDeAccionDeArte,
  etiqueta: string,
  permiso: Permiso = { ok: true },
): Extract<LineaDeLaPlantilla, { tipo: 'accion' }> {
  return { tipo: 'accion', clave, etiqueta, deshabilitada: !permiso.ok }
}

function notas(permisos: readonly Permiso[], clave: string): LineaDeLaPlantilla[] {
  const motivos = [...new Set(permisos.flatMap((p) => (p.ok ? [] : [p.motivo])))]
  return motivos.map((texto, i) => ({ tipo: 'nota', clave: `${clave}-${String(i)}`, texto }))
}

export function lineasDeLaPlantilla(
  quien: QuienMira,
  plantilla: DeLaTarjeta,
): LineaDeLaPlantilla[] {
  const tipo = nombreDelTipo(tipoDelFormato(plantilla.formato))
  const visibilidad = puedeCambiarLaVisibilidad(quien, plantilla)
  const eliminar = puedeEliminarLaPlantilla(quien, plantilla)
  const otroFormato: Permiso = { ok: false, motivo: MOTIVO_DEL_OTRO_FORMATO }
  return [
    { tipo: 'accion', clave: 'abrir', etiqueta: 'Abrir', deshabilitada: false, principal: true },
    { tipo: 'separador', clave: 'separador-de-copias' },
    accion('duplicar', 'Duplicar'),
    accion('otro-formato', 'Duplicar en otro formato', otroFormato),
    ...notas([otroFormato], 'motivo-de-copias'),
    { tipo: 'separador', clave: 'separador-de-por-defecto' },
    plantilla.esPorDefecto
      ? accion('quitar-por-defecto', 'Quitar como por defecto')
      : accion('usar-por-defecto', `Usar por defecto para ${tipo} en ${plantilla.origenNombre}`),
    { tipo: 'separador', clave: 'separador-de-gestion' },
    plantilla.visibilidad === 'privada'
      ? accion('hacerla-de-la-empresa', 'Hacerla de la empresa', visibilidad)
      : accion('hacerla-privada', 'Hacerla privada', visibilidad),
    { ...accion('eliminar', 'Eliminar', eliminar), destructiva: true },
    ...notas([visibilidad, eliminar], 'motivo-de-gestion'),
  ]
}
