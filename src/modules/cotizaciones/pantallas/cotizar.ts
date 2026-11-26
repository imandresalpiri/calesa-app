// Lo que dibuja `/cotizaciones/nuevo` (sólo `src/app`): la hoja con su guardado (el marco), las pestañas de origen, el estado «Falta publicar la fórmula» y el esqueleto.
export { EsqueletoDeHoja } from '../features/hoja/components/esqueleto-de-hoja'
export { FormulaSinPublicar } from '../features/hoja/components/formula-sin-publicar'
export { PantallaDeCotizar } from '../features/hoja/components/pantalla-de-cotizar'
// La hoja en par (glosario: «Variante en par»), sólo la cáscara diferida: se pide con una fórmula en par.
export { PantallaDeCotizarEnParDiferida } from '../features/hoja/components/par'
export { PestanasDeOrigen } from '../features/hoja/components/pestanas-de-origen'
export { HistorialDelVehiculo } from '../features/historial/components/diferidos'
// El título de la cotización (T307): su proveedor (sobre las barras y la hoja) y el campo, que va arriba del panel del vehículo.
export { CampoDelTituloDiferido, ProveedorDelTitulo } from '../features/hoja/components/titulo'
// La ranura de la cabecera (glosario: «Ranura de la cabecera»): su proveedor envuelve las barras y la hoja, y la ranura va en la fila de las barras del vehículo y del cliente,
// con la cabecera quieta que muestra antes de hidratar.
export {
  CabeceraQuieta,
  ProveedorDeLaRanuraDeLaCabecera,
  RanuraDeLaCabecera,
} from '../features/hoja/components/ranura-de-la-cabecera'
