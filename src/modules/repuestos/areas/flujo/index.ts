// La API de servidor del área `flujo` de `repuestos` (8.13): `esperasQueDestraban(vehiculoId)` para el panel del vehículo de `logistica`, `leerItemDelPanel(id)` e `itemAbiertoDe(parametros)` para el panel del ítem (`?item=`), y la Cadena (`?vista=cadena`): `leerCadenaDeRepuestos(filtros)`, sus claves y `rutaDeLaCadena` (los «Ver todas» de Inicio); los números del Modo Live (`leerNumerosDeRepuestos()`); y las dos lecturas de los bloques de Inicio con los textos de sus filas (8.13-4); y el flujo de los pasos de `/repuestos/[id]` (`leerFlujoDeLosPasos`) con sus paneles. Sale por el `index.ts` de la raíz.
export { esperasQueDestraban } from '../../infra/flujo/esperas'
export { leerCadenaDeRepuestos } from '../../infra/flujo/cadena'
export { leerNumerosDeRepuestos } from '../../infra/flujo/numeros'
export { leerEsperasDeInicio, leerRepuestosPorMover } from '../../infra/flujo/inicio'
export { leerItemDelPanel } from '../../infra/flujo/item-del-panel'
export { leerFlujoDeLosPasos } from '../../infra/flujo/pasos'
export {
  PANELES_DEL_PASO,
  TITULO_DEL_PANEL,
  type LecturaDeLosPasos,
  type PanelDelPaso,
} from '../../entities/flujo/pasos-del-flujo'
export {
  CLAVE_DE_ITEM_DEL_PANEL,
  destinoDelPanelDe,
  itemAbiertoDe,
} from '../../entities/flujo/paneles'
export type { ItemDelPanel } from '../../entities/flujo/item-del-panel'
export {
  TOPE_DE_ESPERAS,
  type EsperaDeItem,
  type EsperaDelRequisito,
  type EsperasDelVehiculo,
} from '../../entities/flujo/esperas'
export {
  CLAVE_DE_BUSQUEDA_DE_LA_CADENA,
  CLAVE_DE_FASE_DE_LA_CADENA,
  CLAVE_DE_PROYECTO_DE_LA_CADENA,
  CLAVE_DE_VISTA_DE_LA_CADENA,
  VISTA_DE_CADENA,
  esVistaDeLaCadena,
  esquemaDeLaCadena,
  pedidoDeLaCadena,
  rutaDeLaCadena,
  type CadenaDeRepuestos,
  type ColumnaDeRepuestos,
  type FiltrosDeLaCadena,
  type TarjetaDeRepuesto,
} from '../../entities/flujo/cadena'
export {
  detalleDeEsperaDeInicio,
  detalleDeRepuestoPorMover,
  rutaDelItemDeInicio,
  textoDeEsperaDeInicio,
  textoDeRepuestoPorMover,
  type RepuestoDeInicio,
} from '../../entities/flujo/inicio'
