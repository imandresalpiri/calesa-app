// La API de servidor del NÚCLEO de `cotizaciones` (lo que comparten las áreas: la hoja, guardar, encima, revisiones, niveles, el motor, el
// compilador y el diseño). Sale por el `index.ts` de la raíz, que sólo reexporta (`export *`) el núcleo y cada área (4.15-4).
//
// Hoy sale lo que el editor de fórmulas (4.21) y el del diseño de la hoja (4.22) van a usar: el compilador de la fórmula como texto,
// sus códigos de error, el tope del texto que guarda una fila, el validador del diseño con sus reglas y las listas cerradas que el
// diseño admite, y los tipos. Todo es puro (`entities/`, cero I/O). Si un editor es un Client Component, saldrá también por `client.ts`.
export { compilarExpresion } from '../../entities/compilador'
export type {
  ContextoDeCompilacion,
  DestinoDeCompilacion,
  ErrorDeCompilacion,
  ResultadoDeCompilacion,
  Tramo,
} from '../../entities/compilador'
export {
  CODIGOS_DE_COMPILACION,
  type CodigoDeCompilacion,
} from '../../entities/motivos-del-compilador'
export { MAXIMO_DE_TEXTO } from '../../entities/nodos'
export { validarDiseno } from '../../entities/validar-diseno'
export type { ContextoDeDiseno, ResultadoDeValidacionDeDiseno } from '../../entities/validar-diseno'
export { REGLAS_DE_DISENO } from '../../entities/motivos-de-diseno'
export type { RechazoDeDiseno, ReglaDeDiseno } from '../../entities/motivos-de-diseno'
export {
  ANCHOS,
  EFECTOS_DE_INTERRUPTOR,
  MAXIMO_DE_ATAJOS,
  NIVEL_TODOS,
  PRESENTACIONES,
  SECUNDARIOS,
} from '../../entities/diseno'
export type {
  CeldaDeDiseno,
  Diseno,
  ItemDeDiseno,
  ModoDeTipoDeCambio,
  SeccionDeDiseno,
} from '../../entities/diseno'

// Configuración › Catálogos › Niveles (4.09): la lectura de los niveles de acceso con el tope, lo que admite cada uno y por qué no se elimina.
// Los componentes salen por `pantallas/configuracion.ts`. Sólo se importa desde un Server Component.
export { leerNivelesDeAcceso } from './composicion'
export type { ListaDeNiveles, NivelDeAcceso } from '../../entities/nivel'

// La hoja de cotizar (4.13): UNA lectura al abrirla, con el diseño recortado al nivel de quien mira y la versión de la fórmula y la hora de la base para D2. Sólo se importa desde un Server Component.
export { leerHojaParaCotizar } from './composicion'
export type {
  AtajosDeHoja,
  AyudaDeCelda,
  CeldaDeHoja,
  ChipDeAtajos,
  EdicionDeHoja,
  HojaLista,
  HojaParaCotizar,
  HojaSinPublicar,
  InterruptorDeHoja,
  ItemDeHoja,
  MotivoDeCandado,
  NodoDeTarjeta,
  SecundarioDeCelda,
  SeccionDeHoja,
  SubtotalDeHoja,
  TipoDeNodoDeHoja,
  VarianteDeHoja,
} from '../../entities/hoja'

// La hoja de una cotización guardada (4.15-3): UNA lectura con su primer cálculo por la cotización, y la ruta de su página. Sólo se importa desde un Server Component.
export { leerHojaDeUnaGuardada } from './composicion'
export { rutaDeLaCotizacion } from '../../entities/ruta-de-la-hoja'
// «Comparar cotizaciones» (`/cotizaciones/comparar?ids=`): la lectura de `ids` que hace la página. El enlace (`rutaDeComparar`) lo escriben las áreas por dentro.
export {
  MAXIMO_PARA_COMPARAR,
  MINIMO_PARA_COMPARAR,
  idsParaComparar,
} from '../../entities/ruta-de-comparar'
export type {
  CotizacionDeLaHoja,
  HojaDeUnaGuardada,
  LoGuardado,
} from '../../entities/hoja-de-una-guardada'
export type { DisenoDeHoja } from '../../entities/hoja'

// La pantalla de cotizar (4.13-2): el primer cálculo que hace el servidor junto con la hoja, qué orígenes se cotizan, qué se ve al abrir y la URL. Los componentes salen por
// `pantallas/cotizar.ts`. `recalcularAlAbrir` sólo se importa desde un Server Component.
export { recalcularAlAbrir, recalcularAlAbrirEnPar } from './composicion'
export { aperturaDe, inicialDe } from '../../entities/apertura'
// La hoja en par (glosario: «Variante en par» y «Cotizaciones hermanas»): cómo abre la guardada de una hermana.
export { modoDeLaHermana, type ModoDeLaHermana } from '../../entities/hermana'
export type { ParDeHoja } from '../../entities/hoja-en-par'
export { ladoDeLaOpcion } from '../../entities/hoja-en-par'
export { topeDelTituloEnPar, tituloBaseDeLaHermana } from '../../entities/titulo-en-par'
export { modoInicial } from '../../entities/cabecera-de-la-hoja'
export type { Apertura, RecalculoInicial } from '../../entities/apertura'
export { origenElegido, origenesParaCotizar } from '../../entities/origenes-para-cotizar'
export {
  CLAVE_DE_LEAD,
  CLAVE_DE_ORIGEN,
  CLAVE_DE_VEHICULO,
  CLAVE_DEL_ANCHO,
  CLAVE_SIN_MONEDA,
  RUTA_DE_LA_HOJA,
  anchoDeLaImagen,
  sinMonedaDeLaImagen,
  rutaDeLaHoja,
  rutaDelListado,
} from '../../entities/ruta-de-la-hoja'

// El panel del vehículo de la hoja (4.14-2b): «Cotizado (n)», el conteo acotado de las cotizaciones del vehículo que quien mira ve. Sólo se importa desde un Server
// Component. El historial se lee desde el navegador por `composicion.client.ts` y se dibuja con `pantallas/cotizar.ts`.
export { contarCotizacionesDelVehiculo } from './composicion'

// El dato del vehículo de una tabla de la hoja (4.14-2c3): qué campos casan con qué tablas. La página lo pasa al panel del vehículo, que decide cuáles se eligen.
export { datosDelVehiculoDeLaHoja } from '../../entities/dato-del-vehiculo'
export { camposQueCasanLaAyuda } from '../../entities/fila-del-vehiculo'
export type { DatoDeLaHoja } from '../../entities/dato-del-vehiculo'

// Lo que la hoja de cotizar exige elegir según las claves `cotizaciones.crear.sin_lead` y `cotizaciones.crear.sin_vehiculo` del rol en ese origen: la página los calcula en el
// servidor con los permisos de la sesión y manda a la hoja booleanos y textos.
export { eleccionesDeLaHoja, obligatoriosAlCotizar } from '../../entities/obligatorios-por-rol'
export type {
  EleccionesDeLaHoja,
  ObligatoriosAlCotizar,
} from '../../entities/obligatorios-al-cotizar'

// El título de la cotización (T307): la única regla de cómo se nombra una cotización en toda superficie (`tituloDeLaCotizacion()`; la tarjeta y el PDF, sin el de
// respaldo: `tituloAparteDelNumero()`) y su tope.
export {
  TOPE_DEL_TITULO,
  tituloAparteDelNumero,
  tituloDeLaCotizacion,
} from '../../entities/titulo-de-la-cotizacion'
export type { FuenteDelTitulo, TituloMostrado } from '../../entities/titulo-de-la-cotizacion'

// Cambiar el vehículo de una guardada desde su detalle (T315): qué permite la barra (`cambioDeVehiculo()`, con `puede_guardar` de la base y la clase), con qué vehículo calcula la
// hoja (`vehiculoParaCalcular()`) y el motivo de la final.
export {
  MOTIVO_DE_LA_FINAL,
  cambioDeVehiculo,
  vehiculoParaCalcular,
} from '../../entities/vehiculo-de-la-guardada'
export type { CambioPermitido } from '../../entities/vehiculo-de-la-guardada'

// El «⋯» de una cotización (el del listado y el de la cabecera de la guardada): sus acciones y su orden, dichos una vez.
export { accionesDeCotizacion } from '../../entities/acciones-de-cotizacion'
export type {
  ClaveDeAccionDeCotizacion,
  OfertasDelMenuDeCotizacion,
} from '../../entities/acciones-de-cotizacion'

// La referencia del lienzo del editor de la plantilla (la cotización más reciente del origen que quien configura ve, dibujada con lo guardado): la arma `src/app` con las
// lecturas del PDF (`leerHojaDeUnaGuardada()`, `calculoDeLoGuardado()`) y la pasa plana a la pestaña «Tarjeta».
export { calculoDeLoGuardado } from '../../entities/calculo-de-la-tarjeta'
export { referenciaPlana } from '../../entities/referencia-de-la-tarjeta'
export type { ReferenciaDeLaTarjeta } from '../../entities/referencia-de-la-tarjeta'

// La cotización privada (glosario: «Cotización privada»): qué ofrece el «⋯» del listado sobre la marca (la misma regla que la guardada).
export { ofertaDePrivada } from '../../entities/privada'

// Una fórmula del origen (id, nombre, si es la activa y su versión): la leen las rutas de Configuración y la pasan a la planilla, la hoja y la tarjeta.
export type { FormulaDelOrigen } from '../../entities/formula-del-origen'
