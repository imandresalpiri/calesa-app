import { motivoParaNoEliminar, type OrigenConUso } from './origen'

// Las líneas del «⋯» de la página de un origen, en su orden: en el celular, «Datos» primero (abre su drawer; en la cabecera no cabe el botón); con
// `origenes.gestionar`, activar o desactivar (reversible, con «Deshacer») y eliminar (pide confirmar; con uso va apagada y una nota dice qué lo ata). Sin
// ninguna línea no hay «⋯».
export type LineaDelOrigen =
  | { tipo: 'accion'; clave: 'datos'; etiqueta: string }
  | { tipo: 'accion'; clave: 'activar' | 'desactivar'; etiqueta: string }
  | { tipo: 'separador'; clave: 'separador' }
  | { tipo: 'accion'; clave: 'eliminar'; etiqueta: string; deshabilitada: boolean }
  | { tipo: 'nota'; clave: 'motivo'; texto: string }

export function lineasDelOrigen(
  origen: OrigenConUso,
  { conDatos = false, gestiona = true }: { conDatos?: boolean; gestiona?: boolean } = {},
): LineaDelOrigen[] {
  const datos: LineaDelOrigen[] = conDatos
    ? [{ tipo: 'accion', clave: 'datos', etiqueta: 'Datos' }]
    : []
  if (!gestiona) {
    return datos
  }
  const separador: LineaDelOrigen[] = conDatos ? [{ tipo: 'separador', clave: 'separador' }] : []
  return [...datos, ...separador, ...lineasDeGestion(origen)]
}

function lineasDeGestion(origen: OrigenConUso): LineaDelOrigen[] {
  const motivo = motivoParaNoEliminar(origen)
  return [
    origen.activo
      ? { tipo: 'accion', clave: 'desactivar', etiqueta: 'Desactivar' }
      : { tipo: 'accion', clave: 'activar', etiqueta: 'Activar' },
    { tipo: 'separador', clave: 'separador' },
    {
      tipo: 'accion',
      clave: 'eliminar',
      etiqueta: 'Eliminar origen',
      deshabilitada: motivo !== null,
    },
    ...(motivo === null ? [] : [{ tipo: 'nota', clave: 'motivo', texto: motivo } as const]),
  ]
}
