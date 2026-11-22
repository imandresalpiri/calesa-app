// La rejilla de tarjetas de la página de la cola: tantas columnas como quepan, de 20 rem como mínimo (`min(100%, 20rem)`: en una pantalla angosta o con el
// texto al 200 % es una sola columna y nunca se sale). Sin tope de ancho: la página ocupa lo que le da el área.
export const REJILLA_DE_TARJETAS =
  'grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-3'
