'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

// La confirmación de eliminar un ítem se pide al abrirse (`useAbiertoAlgunaVez()`): la hoja no carga su código para dibujarse.
export const ConfirmarEliminarItemDiferido = diferido(() =>
  import('./confirmar-eliminar-item').then((modulo) => modulo.ConfirmarEliminarItem),
)

// El panel de imágenes de un ítem se pide al abrirse (`useAbiertoAlgunaVez()`): nada de su código viaja con la hoja (8.09-3, C14).
export const DrawerDeImagenesDiferido = diferido(() =>
  import('./drawer-de-imagenes').then((modulo) => modulo.DrawerDeImagenes),
)

// El bloque «Imágenes» del panel del ítem (`?item=`): se pide al abrir el panel, no viaja con la hoja ni con la Cadena. Si no llega, lo dice en su lugar.
export const ImagenesDelItemDiferido = diferido(
  () => import('./contenido-de-imagenes').then((modulo) => modulo.ContenidoDeImagenes),
  {
    aviso: 'aqui',
    esqueleto: (
      <div role="status" aria-label="Cargando las imágenes" className="grid grid-cols-3 gap-2">
        <Skeleton className="aspect-4/3" />
        <Skeleton className="aspect-4/3" />
        <Skeleton className="aspect-4/3" />
      </div>
    ),
  },
)

// El panel del ítem de `/repuestos/[id]` (`?item=`): la fila como Excel y sus secciones, en un drawer de abajo. Se pide al abrirse (`useAbiertoAlgunaVez()`).
export const PanelDelItemEnLaHojaDiferido = diferido(() =>
  import('./panel-del-item-en-la-hoja').then((modulo) => modulo.PanelDelItemEnLaHoja),
)

// «Agregar ítems» (`?panel=nuevo-item`): el drawer con la fila nueva. Se pide al abrirse (`useAbiertoAlgunaVez()`).
export const DrawerDeItemsNuevosDiferido = diferido(() =>
  import('./drawer-de-items-nuevos').then((modulo) => modulo.DrawerDeItemsNuevos),
)
