'use client'

import { diferido } from '@/shared/ui/diferido'

// La pestaña «Hoja» trae el validador del diseño, el editor de la hoja (con la hoja de cotizar y dnd-kit): la página del origen no los carga para mostrar sus
// otras pestañas.
export const DisenoDelOrigenDiferido = diferido(
  () => import('./diseno-del-origen').then((modulo) => modulo.DisenoDelOrigen),
  { aviso: 'aqui' },
)

// La lista de colores en su modal (con el estado de todo lo que se hace en ella): se pide la primera vez que se abre algún panel de su familia
// (`useFamiliaDeColores().montar`); la tarjeta de Orígenes sólo dibuja el resumen.
export const ColoresDelCatalogoDiferido = diferido(
  () => import('./colores-del-catalogo').then((modulo) => modulo.ColoresDelCatalogo),
  { aviso: 'pantalla' },
)

// «Nuevo color» y «Editar color» (con la derivación de sus muestras) se piden recién al abrirse (`useAbiertoAlgunaVez()`): la lista no los carga para mostrarse.
export const ModalDeColorDiferido = diferido(() =>
  import('./modal-de-color').then((modulo) => modulo.ModalDeColor),
)

// La confirmación de eliminar un color se pide al abrirse (`useAbiertoAlgunaVez()`).
export const EliminarColorDiferido = diferido(() =>
  import('./eliminar-color').then((modulo) => modulo.EliminarColor),
)
