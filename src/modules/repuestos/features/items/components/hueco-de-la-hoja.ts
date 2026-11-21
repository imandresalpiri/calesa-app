import type { ReactNode } from 'react'
import type { AccionDeMenu } from '@/shared/ui/lista'
import type { FilaDeItem } from '../../../entities/nucleo/item'

// Lo que la hoja le da a quien llena su hueco (8.10-2, C9): las filas vigentes, si se puede editar y si el proyecto está cerrado, y cómo cambiar una fila sin releerla
// (`cambio` recibe la fila **vigente**, así no pisa una celda guardada entretanto). Un id que ya no está no hace nada.
export type ApiDelHueco = {
  filas: readonly FilaDeItem[]
  puedeEditar: boolean
  cerrado: boolean
  cambiarFila: (id: string, cambio: (fila: FilaDeItem) => FilaDeItem) => void
}

// El hueco de la hoja (8.10-2, D4): otra área pone algo en el «⋯» de cada tarjeta, el panel del ítem, un panel, lo que va arriba de la hoja y lo que va en cada tarjeta (el botón del siguiente),
// sin que `items` la importe. Lo llena `src/app` (un área no importa otra): el stock del ítem, la barra de progreso, las pestañas y el botón del siguiente
// (`src/app/(app)/repuestos/[id]/hoja-del-proyecto.tsx`).
export type HuecoDeLaHoja = {
  // El panel del ítem de abajo (`?item=<id>`, su URL es del área `flujo`): `abierto` es el id del ítem abierto (nulo, ninguno), `abrir` y `cerrar` escriben la URL y `secciones` son las que dibuja el
  // servidor (Qué falta, Imágenes, Stock, Compras…) con el id del ítem al que pertenecen; si no es el abierto, aún está llegando la página.
  item: {
    abierto: string | null
    abrir: (id: string) => void
    cerrar: () => void
    secciones: { id: string; contenido: ReactNode } | null
  }
  // Las líneas que el hueco suma al «⋯» de cada tarjeta, entre «Imágenes» y «Eliminar» (Stock, Mover a…); ya filtradas por permiso.
  accionesDeFila: (fila: FilaDeItem) => readonly AccionDeMenu[]
  panel: (api: ApiDelHueco) => ReactNode
  // Antes de la hoja, con sus filas vivas (la barra de progreso, las pestañas del proyecto y el contenido de la abierta).
  arriba?: (api: ApiDelHueco) => ReactNode
  // En cada tarjeta (el botón del siguiente); si no pone nada, la tarjeta muestra su fase.
  pasoDeFila?: (fila: FilaDeItem) => ReactNode
}
