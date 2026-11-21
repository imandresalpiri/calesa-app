import type { AccionDeMenu } from '@/shared/ui/lista'

// El «⋯» de una tarjeta de ítem (`docs/UX.md`: «El “⋯” en el mismo lugar»): la lista única de sus acciones, en su orden. Puro.
//
// Imágenes (de todos: el panel decide qué deja hacer), lo que otra área pone en el hueco de la hoja (Stock, Mover a…), un separador y, al final y sólo con permiso para editar, Eliminar.

type Entrada = {
  // `repuestos.editar` con el proyecto abierto.
  editable: boolean
  alImagenes: () => void
  alEliminar: () => void
}

export const CLAVE_IMAGENES = 'imagenes'
export const CLAVE_ELIMINAR = 'eliminar'

export function accionesDelItem(
  { editable, alImagenes, alEliminar }: Entrada,
  delHueco: readonly AccionDeMenu[],
): AccionDeMenu[] {
  const acciones: AccionDeMenu[] = [
    {
      tipo: 'accion',
      clave: CLAVE_IMAGENES,
      etiqueta: 'Imágenes',
      despuesDeCerrar: true,
      alElegir: alImagenes,
    },
    ...delHueco,
  ]
  if (editable) {
    acciones.push(
      { tipo: 'separador', clave: 'separador-eliminar' },
      {
        tipo: 'accion',
        clave: CLAVE_ELIMINAR,
        etiqueta: 'Eliminar',
        destructiva: true,
        despuesDeCerrar: true,
        alElegir: alEliminar,
      },
    )
  }
  return acciones
}
