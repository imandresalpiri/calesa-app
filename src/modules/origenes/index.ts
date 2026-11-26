// API pública del módulo `origenes` para el servidor: lecturas, reglas y tipos. Con `client.ts`, lo único que
// `app/` u otro módulo puede importar. No exporta componentes (una pantalla paga en JS todo lo que reexporta lo
// que importa): los de Configuración › Orígenes salen por `pantallas/origenes.ts` y `pantallas/origen.ts` (sólo
// `src/app`). Un Client Component de afuera importa `@/modules/origenes/client`.

// Los orígenes para nombrarlos y elegirlos (selectores, la matriz de roles)
export { getOrigenes } from './composicion'
export type { OrigenResumen } from './entities/origen'

// El layout de un origen para quien lo consume: la ficha, los filtros y el alta de `vehiculos`.
// `leerLayout()` trae todos los campos (también los desactivados) y las categorías.
export { leerDatosNuevosDeApibara, leerLayout } from './composicion'
// El catálogo de grupos de campos de un origen (la pantalla «Campos»), con su tope.
export { leerGruposDelOrigen } from './composicion'
export { agruparCampos, tieneOpciones } from './entities/campo'
export type {
  CampoDeLayout,
  CampoPrincipal,
  CamposDelGrupo,
  OpcionDeCampo,
  TipoDeCampo,
  ValorDefecto,
} from './entities/campo'
export type { Categoria } from './entities/categoria'
export type { LayoutDeOrigen } from './entities/repositorios'

// El campo principal activo de un origen (6.13): con qué se nombra a un vehículo fuera del listado (logística).
export { leerCampoPrincipal } from './composicion'

// Los datos clave de un origen (los hasta 4 que la ficha de un vehículo muestra primero), resueltos con su etiqueta y de dónde sale cada
// uno (`de: 'comun'`, con la clave de su columna en snake_case, o `de: 'campo'`); vacía en la base = los de fábrica de su tipo.
export { leerDatosClave } from './composicion'
export { DATOS_COMUNES } from './entities/datos-clave'
export type { DatoClave, DatoClaveResuelto } from './entities/datos-clave'

// Configuración › Orígenes: lo que lee la lista y el detalle de un origen
export { leerOrigenes } from './composicion'
export type { OrigenConUso } from './entities/origen'
export { PANEL_DATOS_DEL_ORIGEN } from './entities/origen'

// «Para cotizar y mover»: lo que le falta a un origen, en cinco pasos con su estado
export {
  CLAVES_DE_PASO,
  pasosParaCotizarYMover,
  pasosQueFaltan,
  type ClaveDePaso,
  type EstadoDePaso,
  type ParaCotizarYMover,
  type PasoParaCotizar,
} from './entities/pasos'

// La puesta en marcha de un origen nuevo: cada paso con si está hecho y si la persona lo hace en ese origen, el que falta, el siguiente y el anterior
export {
  MOTIVO_SIN_GESTIONAR_EL_ORIGEN,
  PASOS_DE_LA_PUESTA_EN_MARCHA,
  TITULO_DEL_PASO,
  enMarcha,
  estadoDeLaPuestaEnMarcha,
  estadoDelPaso,
  pasoAnterior,
  pasoPendiente,
  siguePendienteLaPuestaEnMarcha,
  pasoSiguiente,
  type EstadoDeLaPuestaEnMarcha,
  type EstadoDelPaso,
  type PasoConEstado,
  type PasoDeLaPuestaEnMarcha,
  type PermisosDeLaPuestaEnMarcha,
} from './entities/puesta-en-marcha'
