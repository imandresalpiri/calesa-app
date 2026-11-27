// La API de servidor del área `mover` de `logistica` (6.01). Sale por el `index.ts` de la raíz.
// La clave de URL del modo «La ganamos» de «Qué falta»: con ella `src/app` arma el enlace de la ficha del vehículo.
export { CLAVE_DE_GANADA, VALOR_DE_GANADA } from '../../entities/mover/ganada'
// La cadena de la unidad: las pasadas (lectura del servidor), el camino y lo que se mira con `?fase_vista=`. `src/app` la arma con las fases del flujo y la unidad.
export { leerPasadasDeLaUnidad } from './composicion'
export { AVISO_SIN_CAMINO, AVISO_SIN_PASADAS, cadenaDeLaUnidad } from '../../entities/mover/cadena'
export type {
  CadenaDeLaUnidad,
  FaseDelCamino,
  NodoDeLaCadena,
  PasadaLeida,
} from '../../entities/mover/cadena'
export { CLAVE_DE_FASE_VISTA } from '../../entities/mover/fase-vista'
export { opcionesDelFiltro } from '../../entities/mover/filtro-del-historial'
export type { OpcionDelFiltro } from '../../entities/mover/filtro-del-historial'
