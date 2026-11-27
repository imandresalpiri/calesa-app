// API pública del módulo `vehiculos` para el servidor: lecturas, reglas y tipos. Con `client.ts`, lo único que
// `app/` u otro módulo puede importar. No exporta componentes (una pantalla paga en JS todo lo que reexporta lo
// que importa): los de cada pantalla salen por `pantallas/<pantalla>.ts` (sólo `src/app`) y los de otros módulos
// por `client.ts`. Un Client Component de afuera importa `@/modules/vehiculos/client`.

// El inventario: leer una página de un origen y un vehículo
export {
  buscarVehiculos,
  leerGaleria,
  leerSubasta,
  leerTitulosDeVehiculos,
  leerVehiculo,
} from './composicion'
export { MAXIMO_DE_PAGINA_DE_VEHICULOS } from './entities/vehiculo'
// De dónde se lee una página del inventario: quien ve «propios» por `vehiculos_inventario()`, el resto por la tabla (4.16-2b)
export { fuenteDelInventario, type FuenteDelInventario } from './entities/fuente-del-inventario'
// Los paneles del «⋯» del vehículo (T336): sus claves de la URL, lo que el servidor lee al abrirse y la plantilla de las rutas que arma `src/app`
// («Ver actividad» de cada fila).
export { PANEL_ACTUALIZAR_LOS_DATOS, PANEL_DE_IMAGENES } from './features/acciones/claves'
export { PANEL_DE_VITRINA } from './features/vitrina/claves'
export { datosDelPanelDeImagenes } from './features/fotos/lecturas'
export { MARCADOR_DE_VEHICULO } from './entities/ruta-por-vehiculo'
// «Cotizar vehículo» de la ficha: la hoja con este vehículo (la página arma la de su origen con `cotizaciones`).
export { rutaParaCotizar, type ParaCotizar } from './entities/ruta-para-cotizar'
export type {
  DatosDelPanelDeImagenes,
  DatosDelPanelDeVitrina,
} from './entities/paneles-de-la-lista'
// Con qué se vuelve a preguntar a apibara por un vehículo (enlace, lote o VIN); null = no se puede («Actualizar los datos» apagada).
export { entradaDeRefresco } from './entities/subasta'
export type { Vehiculo } from './entities/vehiculo'
// «VIN X · Lote N»: lo que identifica al vehículo donde no cabe su ficha (la cabecera de la unidad de logística).
export { vinOLote } from './entities/vin-o-lote'
// La zona del patio de un vehículo de subasta (de sus atributos): la hora del patio en el texto para compartir una cotización
export { zonaDelPatioDe } from './entities/zona-del-patio'
export type {
  AprobadasDeLaPagina,
  CotizacionAprobadaDeLaFila,
} from './entities/cotizacion-aprobada-de-la-fila'
// Qué nombra a un vehículo: su campo principal o su título (6.13). Logística lo compone con el principal de `origenes`
export {
  identidadDeVehiculo,
  identidadEnUnaLinea,
  type CampoQueIdentifica,
  type IdentidadDeVehiculo,
} from './entities/identidad'
export type { Galeria } from './entities/foto'
// El vehículo de la hoja de cotizar, como lo dibuja su barra (`pantallas/cotizar`)
export { elegidoDesde, type VehiculoElegido } from './entities/panel-para-cotizar'
// El aviso de la hoja cuando la subasta del vehículo elegido ya cerró (`pantallas/cotizar` › `<AvisoDeSubastaCerrada>`): lo que necesita, leído en el servidor
export { avisoDeSubastaCerrada } from './features/panel-para-cotizar/lecturas'
export type { DatosDelAviso as DatosDelAvisoDeSubastaCerrada } from './entities/subasta-cerrada'
// El dato del elegido que se elige entre las filas de una tabla de la hoja (4.14-2c3): qué datos de la hoja se ofrecen, con su valor y la versión
export { datosParaElegirDe, valoresParaCasar, type ParaElegir } from './entities/dato-para-elegir'

// Qué ve y qué puede hacer la persona
export {
  origenElegido,
  origenesVisibles,
  permisoDeAlta,
  type PermisoDeAlta,
} from './entities/permisos'
// De estos vehículos, cuáles puede editar: lo propio se sabe acá; lo vinculado a un lead de su
// cartera, se le pregunta a la base
export { editablesDe, eliminablesDe, leadsVisiblesDe } from './features/permisos/editables'

// Los filtros de un origen, desde su layout: el esquema que dibuja FilterShell y las condiciones
// que entiende `buscarVehiculos()`
export { FILTRO_FASE, condicionesDe, esquemaDeFiltros } from './entities/filtros'
// «Subasta» y el orden (sólo en un origen de subasta): si la URL pide una, el orden por defecto es el cierre; con él, el cursor lleva su tramo
export {
  FILTRO_SUBASTA,
  esSubastaElegida,
  ordenElegido,
  type OrdenDelInventario,
} from './entities/filtros-de-subasta'
export { leerCursorDelCierre } from './entities/cursor-del-cierre'
// Las vistas guardadas con el `situacion` de antes, leídas con las claves nuevas

// La vitrina: qué se ve en la web pública y quién publica. Las dos lecturas no tumban la pantalla
export {
  datosDelPanelDeVitrina,
  vistaPreviaDe,
  vitrinaDelOrigen,
} from './features/vitrina/lecturas'
export {
  permisoDeVitrina,
  type PermisoDeVitrina,
  type VistaPreviaDeVitrina,
} from './entities/vitrina'

// La limpieza automática de los vehículos de subasta que nadie compró: lo que dice la base de cada
// vehículo (cuándo se va, si se conserva), la ventana del aviso y la última noche. La regla es de
// la base; acá sólo se lee y se dice. Las lecturas no tumban la pantalla.
export { limpiezaDe, ultimaLimpieza } from './features/limpieza/lecturas'
// La situación real del vehículo (la calcula la base) y quién puede resolver una subasta sin resolver.
export { resolucionDeSubasta, sinResolverDe } from './features/situacion/lecturas'
export {
  puedeResolverLaSubasta,
  type ResolucionDeSubasta,
  type Situacion,
} from './entities/situacion'
export {
  hoyEnZona,
  limiteDeAviso,
  resumenDeUltimaLimpieza,
  seLimpiaPronto,
  VENTANA_DE_AVISO_DIAS,
  type LimpiezaDeVehiculo,
  type UltimaLimpieza,
} from './entities/limpieza'

// La papelera: enviar (desde la ficha y, en lote, desde el listado), restaurar y purgar
export { leerPapelera } from './composicion'
export { limpiezaPendiente } from './features/papelera/lecturas'
export {
  puedeAbrirLaPapelera,
  puedePurgar,
  type LimpiezaPendiente,
  type LoteDePapelera,
} from './entities/papelera'
export {
  bloqueoParaEnviar,
  papeleraDelVehiculo,
  type PermisoDePapelera,
} from './entities/papelera-permiso'
// Las acciones de los avisos de un vehículo (qué se ofrece cuando no se puede enviar a la papelera): `app/` las calcula con lo que decide la base
export {
  alcanceDeAvisos,
  vehiculoDelAviso,
  type AlcanceDeAvisos,
  type AvisosDelMenu,
  type VehiculoDelAviso,
} from './entities/avisos-de-vehiculo'

// Alta y edición: la clave de su URL (el panel y el botón son de `pantallas/ficha`)
export { CLAVE_DE_EDICION } from './features/alta/claves'
export { SIN_APIBARA, type DisponibilidadDeApibara } from './entities/apibara'

// El vínculo a un lead y los interesados: la sección «Vehículos» de la ficha del lead (gestionar: vive acá y la compone `app/`: `leads` no importa `vehiculos`; sus componentes salen
// por `pantallas/vehiculos-del-lead`) y el bloque «Relacionados» de cada detalle (lo que lee el servidor: `pantallas/relacionados` lo dibuja)
export {
  leerRelacionadosDelLead,
  leerRelacionadosDelVehiculo,
  leerVehiculosDelLead,
} from './composicion'
export type { ParaRelacionados } from './entities/acciones-de-relacionados'
export type {
  PresentacionDeRelacionados,
  RelacionadosDelLead,
  RelacionadosDelVehiculo,
} from './entities/relacionados'
export type { VehiculosDelLead } from './entities/vehiculos-del-lead'
export { opcionesDeVehiculoDelLead, type OpcionDeVehiculo } from './features/vinculo/lecturas'

// La subasta de un vehículo de subasta: su fecha, su estado y cuándo se consultó (el modal de «Editar fechas de subasta» la lee).
export { fotosPorTraerDe, type SubastaDeVehiculo } from './entities/subasta-vehiculo'

// Las filas de la subasta del vehículo desde el layout de su origen, como las dibuja la lista: la puja (o el precio) y la «Compra directa» (el campo de apibara con el «Buy it now»). La ficha las muestra arriba de «Datos principales». Puro.
export { columnaDeCompraDirecta } from './entities/compra-directa-de-la-fila'
export { columnaDePrecio } from './entities/precio-de-la-fila'

// Los datos comunes de un vehículo con sus etiquetas (el único lugar con texto fijo): los usa `datos` para exportar los vehículos de un
// origen (9.05-2b). Puro.
export { camposComunes, type CampoComun, type ClaveComun, type TipoComun } from './entities/comunes'
