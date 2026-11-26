import type { AccionDeMenu } from '@/shared/ui/lista'

export type QuehaceresDelCatalogo<T> = {
  alEditar: (id: string) => void
  alActivar: (fila: T, activo: boolean) => void
}

// Lo que cada fila necesita saber del grupo: qué compartidos tapa un propio del origen, cómo se dice («Tapado por el de Miami») y, si quien mira
// no cambia el catálogo en el origen, el motivo (nulo si puede).
export type ContextoDeLasFilas = {
  tapados: ReadonlySet<string>
  tapado: string
  sinPermiso: string | null
}

// El «⋯» de una fila de un catálogo de logística: Editar · Activar o Desactivar. No hay «Eliminar»: borrar deja sin puerto, naviera o categoría a
// lo ya cargado (D3); se desactiva. Sin permiso, las dos van apagadas con su motivo debajo: nunca desaparecen en silencio.
export function accionesDelCatalogo<T extends { id: string; activo: boolean }>(
  fila: T,
  { alEditar, alActivar }: QuehaceresDelCatalogo<T>,
  sinPermiso: string | null,
): AccionDeMenu[] {
  const apagada = sinPermiso !== null
  const acciones: AccionDeMenu[] = [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      despuesDeCerrar: true,
      deshabilitada: apagada,
      alElegir: () => {
        alEditar(fila.id)
      },
    },
    {
      tipo: 'accion',
      clave: fila.activo ? 'desactivar' : 'activar',
      etiqueta: fila.activo ? 'Desactivar' : 'Activar',
      deshabilitada: apagada,
      alElegir: () => {
        alActivar(fila, !fila.activo)
      },
    },
  ]
  return sinPermiso === null
    ? acciones
    : [...acciones, { tipo: 'nota', clave: 'sin-permiso', texto: sinPermiso }]
}

// La insignia de un compartido tapado en el origen, en la misma línea que el nombre.
export function insigniasDelCatalogo(fila: { id: string }, contexto: ContextoDeLasFilas) {
  return contexto.tapados.has(fila.id) ? [contexto.tapado] : []
}
