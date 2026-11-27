// Lo que dibuja la página de la unidad de logística: la página (cabecera, «Qué falta» al costado) y las tarjetas con su resumen y su drawer. Sólo `src/app` importa este archivo;
// es del núcleo. Aparte de `unidad.ts` para que `/logistica/gastos` y `/repuestos/[id]`, que abren el panel de un drawer, no paguen el JS de la página.
export { PaginaDeLaUnidad } from '../features/nucleo/components/pagina-de-la-unidad'
export { RejillaDeTarjetas } from '../features/nucleo/components/rejilla-de-tarjetas'
export {
  ContenidoDeLaTarjeta,
  EsqueletoDelResumen,
  ResumenDeLaTarjeta,
  TarjetaDeLaUnidad,
  type UrlDeLaTarjeta,
} from '../features/nucleo/components/tarjeta-de-la-unidad'
