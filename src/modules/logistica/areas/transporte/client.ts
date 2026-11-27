// La API de cliente de el área `transporte` de `logistica`: las acciones de un embarque, un contenedor y lo que va en ellos (cada una pide su permiso en el servidor) y los
// nombres del estado. Sale por el `client.ts` de la raíz.
export { crearEmbarque } from '../../features/transporte/actions/crear-embarque'
export { guardarEmbarque } from '../../features/transporte/actions/guardar-embarque'
export { crearContenedor } from '../../features/transporte/actions/crear-contenedor'
export { guardarContenedor } from '../../features/transporte/actions/guardar-contenedor'
export { asignarUnidades } from '../../features/transporte/actions/asignar-unidades'
export { quitarUnidades } from '../../features/transporte/actions/quitar-unidades'
export { ponerElVehiculoEnTransporte } from '../../features/transporte/actions/poner-el-vehiculo-en-transporte'
export type {
  EntradaAsignarUnidades,
  EntradaPonerElVehiculoEnTransporte,
  EntradaQuitarUnidades,
} from '../../features/transporte/schemas/asignacion'
export type {
  EntradaCrearContenedor,
  EntradaGuardarContenedor,
} from '../../features/transporte/schemas/contenedor'
export type {
  EntradaCrearEmbarque,
  EntradaGuardarEmbarque,
} from '../../features/transporte/schemas/embarque'
export {
  TEXTO_DEL_ESTADO,
  type EstadoDelContenedor,
  type EstadoDelEmbarque,
} from '../../entities/transporte/estado'
export type {
  EntidadGuardada,
  LoteAplicado,
} from '../../entities/transporte/repositorio-de-embarques'
