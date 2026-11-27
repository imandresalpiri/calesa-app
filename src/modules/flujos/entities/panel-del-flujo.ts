// El panel al costado del editor del flujo (`panel-del-flujo.tsx`): muestra una fase (`?fase=<id>`) o una sección del flujo entero
// (`?seccion=reglas`). Qué muestra según la URL, y qué claves de URL limpiar al pasar de una cosa a otra. Los catálogos de logística (`?panel=puertos`…)
// abren su propio drawer, que compone `src/app`; aquí sólo se dice qué hacer con su `?panel=`. Sin I/O.
import { PANELES_DE_LOS_CATALOGOS, type PanelDeCatalogo } from '@/shared/lib/rutas'

export { PANELES_DE_LOS_CATALOGOS, type PanelDeCatalogo }

// Las secciones del flujo entero que se abren en el panel desde la barra del flujo. Las fases no son una: son la pantalla.
export const SECCIONES_DEL_PANEL = ['reglas'] as const
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
  // fases y fuera de regla: los modales y paneles por `?panel=`; también el drawer de un catálogo (`?panel=puertos`), que se cierra al abrir una fase.
  'panel',
  // los catálogos: lo que se abre dentro de su drawer (`?accion=nuevo-puerto&de=origen|compartido`, `?accion=editar-tipo&tipo=<id>`) y la fila que edita.
  'accion',
  'tipo',
  'de',
  'puerto',
  'naviera',
  'categoria',
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

// ─── Los catálogos de logística ────────────────────────────────────────────────────────────────────

// Lo que se abre dentro del drawer de un catálogo (crear, editar, eliminar un tipo) va en `?accion=`: `?panel=` ya es el drawer.
export const CLAVE_DE_ACCION = 'accion'
// «Nuevo tipo de documento» (`?accion=nuevo-tipo&de=origen|compartido`): lo abre el drawer de los tipos y también un requisito de documento.
export const ACCION_NUEVO_TIPO = 'nuevo-tipo'
// Las claves que el drawer de un catálogo deja en la URL: cerrarlo las quita todas.
export const CLAVES_DEL_DRAWER_DE_CATALOGO = [
  'panel',
  CLAVE_DE_ACCION,
  'de',
  'tipo',
  'puerto',
  'naviera',
  'categoria',
] as const

// Abrir un catálogo cierra la fase o la sección abierta y lo que éstas abrían: el drawer queda solo.
export function consultaParaAbrirUnCatalogo(panel: PanelDeCatalogo): Record<string, string | null> {
  return {
    ...Object.fromEntries(CLAVES_DEL_PANEL_DE_FASE.map((clave) => [clave, null])),
    fase: null,
    [CLAVE_DE_SECCION]: null,
    panel,
  }
}

// Los `?panel=` de los modales de un tipo de documento antes de que vivieran dentro de su drawer: una URL vieja que los nombra se limpia.
const PANELES_VIEJOS_DE_TIPO: readonly string[] = ['nuevo-tipo', 'editar-tipo', 'eliminar-tipo']

// Qué hacer con un `?panel=`: abrir el drawer de un catálogo que esta pantalla tiene; limpiar el de un catálogo que no tiene (los de transporte y gasto
// en el flujo de repuestos) o un modal viejo de los tipos; ignorar el resto, que es de otro (`nueva-fase`, `copiar-fases`, `fuera-de-regla`…).
export function queHacerConElPanel(
  valor: string | null,
  disponibles: readonly PanelDeCatalogo[],
): 'abrir' | 'limpiar' | 'ignorar' {
  if (valor === null) {
    return 'ignorar'
  }
  const catalogo = PANELES_DE_LOS_CATALOGOS.find((panel) => panel === valor)
  if (catalogo !== undefined) {
    return disponibles.includes(catalogo) ? 'abrir' : 'limpiar'
  }
  return PANELES_VIEJOS_DE_TIPO.includes(valor) ? 'limpiar' : 'ignorar'
}
