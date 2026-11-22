import type { ReactNode } from 'react'
import type { Tono } from '@/shared/ui/xcell'
import type { ClaveDePieza } from '../../../../entities/diseno'
import type { LugarDelRechazo } from '../../../../entities/diseno/campo-del-rechazo'
import type { NivelDelDiseno } from '../../../../entities/diseno/edicion-del-diseno'
import type { ColorCreado } from '../../../../entities/nuevo-color'
import type { EdicionesDelDiseno } from '../../hooks/use-ediciones-del-diseno'
import type { EditorDelDiseno } from '../../hooks/use-editor-del-diseno'
import type { ErrorDelAspecto, TonoDelCatalogo } from '../aspecto'

// Lo que cada inspector de pieza recibe: el editor y sus ediciones, los niveles y los colores para elegir, y «+ Nuevo nivel» y «+ Nuevo color» (nulos sin permiso).
export type ApoyoDelInspector = {
  editor: EditorDelDiseno
  ediciones: EdicionesDelDiseno
  niveles: readonly NivelDelDiseno[]
  // Las tablas de referencia que nombra la fórmula, para la ayuda de una celda.
  tablas: readonly string[]
  // El catálogo de colores (nulo si no se leyó: el color no se elige) y sus colores para las muestras.
  catalogo: readonly TonoDelCatalogo[] | null
  colores: readonly Tono[]
  // El botón «+ Nuevo nivel»: al crearse, el nivel nuevo queda elegido donde se pidió.
  nuevoNivel: ((alCrear: (clave: string) => void) => ReactNode) | null
  // Suma al catálogo el color creado con «+ Nuevo color» (nulo sin `cotizaciones.configurar` o sin catálogo leído: no se ofrece).
  alCrearColor: ((color: ColorCreado) => void) | null
}

type Donde =
  | { pieza: 'cabecera' }
  | { pieza: 'seccion'; seccion: string }
  | { pieza: 'item'; clave: ClaveDePieza }

// Si el lugar del rechazo es esta pieza.
function esEsteLugar(lugar: LugarDelRechazo, donde: Donde): boolean {
  if (donde.pieza === 'cabecera') return lugar.pieza === 'cabecera'
  if (donde.pieza === 'seccion')
    return lugar.pieza === 'seccion' && lugar.seccionId === donde.seccion
  if (lugar.pieza !== 'item' || lugar.seccionId !== donde.clave.seccion) return false
  const { item } = lugar
  const { clave } = donde
  if (item.tipo !== clave.tipo) return false
  return !('nodo' in item) || ('nodo' in clave && item.nodo === clave.nodo)
}

// El rechazo de forma del aspecto que va bajo un select de esta pieza (`campoDelRechazo()`), si es suyo.
export function errorDelAspecto(editor: EditorDelDiseno, donde: Donde): ErrorDelAspecto {
  const rechazo = editor.rechazo
  const lugar = rechazo?.lugar ?? null
  if (rechazo === null || lugar === null || !esEsteLugar(lugar, donde)) return null
  return { clave: lugar.clave, mensaje: rechazo.mensaje }
}
