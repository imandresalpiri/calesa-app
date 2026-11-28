// El «⋯» de una imagen de la biblioteca: Renombrar y Quitar, en ese orden. La personal la cambia su dueño; la de la empresa, quien tiene
// `artes.empresa.gestionar`. Lo que no se puede se ve apagado, con su motivo debajo (nunca se esconde). Puro.
import { puedeGestionarLaImagen, type QuienMira } from './permisos-de-artes'
import type { AmbitoDeImagen } from './tipos'

export type ClaveDeAccionDeImagen = 'renombrar' | 'quitar'

export type LineaDeLaImagen =
  | {
      tipo: 'accion'
      clave: ClaveDeAccionDeImagen
      etiqueta: string
      deshabilitada: boolean
      destructiva?: true
    }
  | { tipo: 'separador'; clave: string }
  | { tipo: 'nota'; clave: string; texto: string }

export function lineasDeLaImagen(
  quien: QuienMira,
  imagen: { ambito: AmbitoDeImagen; duenoId: string | null },
): LineaDeLaImagen[] {
  const permiso = puedeGestionarLaImagen(quien, imagen)
  const apagada = !permiso.ok
  return [
    { tipo: 'accion', clave: 'renombrar', etiqueta: 'Renombrar', deshabilitada: apagada },
    { tipo: 'separador', clave: 'antes-de-quitar' },
    {
      tipo: 'accion',
      clave: 'quitar',
      etiqueta: 'Quitar',
      deshabilitada: apagada,
      destructiva: true,
    },
    ...(permiso.ok ? [] : [{ tipo: 'nota' as const, clave: 'motivo', texto: permiso.motivo }]),
  ]
}
