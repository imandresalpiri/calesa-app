import type { ReactNode } from 'react'
import type { FilaDeItem } from '../../../entities/nucleo/item'

// Lo que la hoja le da a quien llena su hueco (8.10-2, C9): las filas vigentes, si se puede editar y si el proyecto está cerrado, y cómo cambiar una fila sin releerla
// (`cambio` recibe la fila **vigente**, así no pisa una celda guardada entretanto). Un id que ya no está no hace nada.
export type ApiDelHueco = {
  filas: readonly FilaDeItem[]
  puedeEditar: boolean
  cerrado: boolean
  cambiarFila: (id: string, cambio: (fila: FilaDeItem) => FilaDeItem) => void
}

// El hueco de la hoja (8.10-2, D4): otra área pone algo en cada fila (junto a «Imágenes»), un panel, lo que va arriba de la hoja y lo que va en la columna «Siguiente» de cada fila,
// sin que `items` la importe. Lo llena `src/app` (un área no importa otra): el stock del ítem, la barra de progreso, las pestañas y el botón del siguiente
// (`src/app/(app)/repuestos/[id]/hoja-del-proyecto.tsx`).
export type HuecoDeLaHoja = {
  accionDeFila: (fila: FilaDeItem) => ReactNode
  panel: (api: ApiDelHueco) => ReactNode
  // Antes de la hoja, con sus filas vivas (la barra de progreso, las pestañas del proyecto y el contenido de la abierta).
  arriba?: (api: ApiDelHueco) => ReactNode
  // En la columna «Siguiente» de cada fila (el botón del siguiente); si no pone nada, la fila muestra su fase.
  pasoDeFila?: (fila: FilaDeItem) => ReactNode
}
