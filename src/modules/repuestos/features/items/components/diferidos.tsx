'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { Skeleton } from '@/shared/ui/skeleton'

// La confirmación de eliminar un ítem se pide al abrirse (`useAbiertoAlgunaVez()`): la hoja no carga su código para dibujarse.
export const ConfirmarEliminarItemDiferido = diferido(() =>
  import('./confirmar-eliminar-item').then((modulo) => modulo.ConfirmarEliminarItem),
)

// El panel de imágenes de un ítem se pide al abrirse (`useAbiertoAlgunaVez()`): nada de su código viaja con la hoja (8.09-3, C14).
export const DrawerDeImagenesDiferido = diferido(() =>
  import('./drawer-de-imagenes').then((modulo) => modulo.DrawerDeImagenes),
)

// El panel del ítem en dos columnas (`?item=`): su marco con la lectura de las imágenes que comparten la portada y la tarjeta «Imágenes», la columna izquierda y la tarjeta «Imágenes». Se piden al
// abrir el panel, no viajan con la hoja ni con la Cadena. Si no llegan, lo dice en su lugar.
export const ItemEnDosColumnasDiferido = diferido(
  () => import('./item-en-dos-columnas').then((modulo) => modulo.ItemEnDosColumnas),
  { aviso: 'aqui', esqueleto: <EsqueletoListado filas={4} columnas={2} /> },
)
export const ColumnaDelItemDiferida = diferido(
  () => import('./columna-del-item').then((modulo) => modulo.ColumnaDelItem),
  { aviso: 'aqui', esqueleto: <EsqueletoListado filas={4} columnas={2} /> },
)
export const TarjetaDeImagenesDiferida = diferido(
  () => import('./tarjeta-de-imagenes').then((modulo) => modulo.TarjetaDeImagenes),
  { aviso: 'aqui', esqueleto: <Skeleton className="h-24 w-full" /> },
)

export const TarjetaDeVehiculoYClienteDiferida = diferido(
  () =>
    import('./tarjeta-de-vehiculo-y-cliente').then((modulo) => modulo.TarjetaDeVehiculoYCliente),
  { aviso: 'aqui', esqueleto: <Skeleton className="h-24 w-full" /> },
)

// El panel del ítem de `/repuestos/[id]` (`?item=`): la fila como Excel y sus secciones, en un drawer de abajo. Se pide al abrirse (`useAbiertoAlgunaVez()`).
export const PanelDelItemEnLaHojaDiferido = diferido(() =>
  import('./panel-del-item-en-la-hoja').then((modulo) => modulo.PanelDelItemEnLaHoja),
)

// «Agregar ítems» (`?panel=nuevo-item`): el drawer con la fila nueva. Se pide al abrirse (`useAbiertoAlgunaVez()`).
export const DrawerDeItemsNuevosDiferido = diferido(() =>
  import('./drawer-de-items-nuevos').then((modulo) => modulo.DrawerDeItemsNuevos),
)
