'use client'

import { diferido } from '@/shared/ui/diferido'

// La pestaña «Diseño» (4.22-2) trae el validador del diseño y el editor: la página del origen no los carga para mostrar sus otras pestañas.
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

// La vista previa de la hoja (4.22-5) trae la hoja de cotizar entera; abrir la pestaña «Diseño» no la carga, sólo «Vista previa».
export const VistaPreviaDelDisenoDiferido = diferido(
  () => import('./vista-previa-del-diseno').then((modulo) => modulo.VistaPreviaDelDiseno),
  { aviso: 'aqui' },
)
