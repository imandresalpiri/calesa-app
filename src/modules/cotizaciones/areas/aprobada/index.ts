// La API de servidor del área `aprobada` de `cotizaciones`. Sale por el `index.ts` de la raíz, que sólo la reexporta (4.15-4).
//
// La cotización aprobada de un vehículo (B4): las lecturas que las páginas de `src/app` unen a otras pantallas (la columna de `/vehiculos`, la insignia del listado) y
// sus tipos. Los componentes salen por `pantallas/aprobada-<pantalla>.ts`.
export { leerAprobadasDeCotizaciones, leerAprobadasDeVehiculos } from './composicion'
export type { FilaDeEsteVehiculo } from '../../entities/aprobada/de-este-vehiculo'
export { motivoParaNoAprobar, puedeAprobar } from '../../entities/aprobada/acceso'
export type { CotizacionAprobadaDelVehiculo } from '../../entities/aprobada/tipos'

// «Comparar cotizaciones» (`/cotizaciones/comparar`): la lectura, si se comparan y el modelo plano que dibuja la página (`pantallas/aprobada-comparar.ts`).
export { leerParaComparar } from './composicion'
export { compararCotizaciones, veredictoDeComparar } from '../../entities/aprobada/comparar'
export type { ModeloDeComparar } from '../../entities/aprobada/comparar'
export type { AprobarEn } from '../../entities/aprobada/de-este-vehiculo'

// «De este vehículo» leído desde el servidor, de a `TAMANO_DE_ESTE_VEHICULO` con el cursor opaco, y lo puro que lo dibuja (la aprobada primero, sin
// repetir; el título de cada fila): el vehículo de ejemplo del editor de artes (`GET /artes/ejemplo/vehiculos/<id>/cotizaciones`).
export { leerPaginaDeEsteVehiculo } from './composicion'
export { filasALaVista, tituloDeLaFila } from '../../entities/aprobada/de-este-vehiculo'
export type { PaginaLeidaDeEsteVehiculo } from '../../entities/aprobada/de-este-vehiculo'
