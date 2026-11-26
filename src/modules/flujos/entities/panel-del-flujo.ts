// El panel al costado del editor del flujo (`panel-del-flujo.tsx`): muestra una fase (`?fase=<id>`) o una sección del flujo entero
// (`?seccion=reglas|documentos`). Qué muestra según la URL, y qué claves de URL limpiar al pasar de una cosa a otra. Sin I/O.

// Las secciones del flujo entero que se abren en el panel desde la barra del flujo. Las fases no son una: son la pantalla.
export const SECCIONES_DEL_PANEL = ['reglas', 'documentos'] as const
export type SeccionDelPanel = (typeof SECCIONES_DEL_PANEL)[number]

export const CLAVE_DE_SECCION = 'seccion'

// Lo que abren los bloques de una fase o de una sección en la URL. Al pasar a otra fase o sección se limpian: si no, la nueva abriría lo de la anterior o
// diría «ese requisito ya no existe».
export const CLAVES_DEL_PANEL_DE_FASE = [
  // requisitos: `?agregar=nuevo&forma=…`, `?editar=requisito&requisito=<id>`; requisitos y salidas: `?eliminar=requisito|salida`.
  'agregar',
  'forma',
  'editar',
  'requisito',
  'eliminar',
  // requisitos y fases: lo que se quita (`?eliminar=requisito&quitar=`, `?panel=eliminar-fase&quitar=`).
  'quitar',
  // transiciones: `?eliminar=salida&salida=<id>` y `?editar=salida&editada=<id>`.
  'salida',
  'editada',
  // fases, documentos y fuera de regla: los modales y paneles por `?panel=`.
  'panel',
  // documentos: `?panel=editar-tipo&tipo=<id>`, `?panel=nuevo-tipo&de=empresa|flujo`.
  'tipo',
  'de',
  // fases: la pestaña del panel de una fase (`?fase=<id>&pestana=identidad|ajustes`; sin ella, «Reglas»). Es la `CLAVE_DE_PESTANA_DE_FASE` del área `fases`.
  'pestana',
  // fases: dónde nace la fase pedida en el diagrama (`?panel=nueva-fase&en=<x>,<y>`, en rem).
  'en',
] as const

export type ContenidoDelPanel =
  { tipo: 'seccion'; clave: SeccionDelPanel } | { tipo: 'fase'; faseId: string } | null

// Qué muestra el panel. Gana la sección: con `?seccion=reglas&fase=<id>` abre las reglas. Una sección que esta persona no ve, o una fase que no es del flujo
// (escritas a mano), no abren nada.
export function contenidoDelPanel(
  url: { seccion: string | null; fase: string | null },
  fases: readonly { id: string }[],
  seccionesDisponibles: readonly string[],
): ContenidoDelPanel {
  const seccion = SECCIONES_DEL_PANEL.find(
    (clave) => clave === url.seccion && seccionesDisponibles.includes(clave),
  )
  if (seccion !== undefined) {
    return { tipo: 'seccion', clave: seccion }
  }
  return url.fase !== null && fases.some((f) => f.id === url.fase)
    ? { tipo: 'fase', faseId: url.fase }
    : null
}
