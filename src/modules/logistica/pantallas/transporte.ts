// Pantallas del área `transporte` de `logistica`: `/logistica/embarques` (la lista de embarques y contenedores) y `/logistica/embarques/[id]` (la página de un embarque), con el drawer
// de un contenedor y lo que se abre encima. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esas pantallas dibujan y nada más.
export { ListadoDeEmbarques } from '../features/transporte/components/listado-de-embarques'
export { FichaDelEmbarque } from '../features/transporte/components/ficha-del-embarque'
export { DrawerDelContenedor } from '../features/transporte/components/drawer-del-contenedor'
export { CuerpoDelContenedor } from '../features/transporte/components/cuerpo-del-contenedor'
export {
  DrawerAgregarVehiculosDiferido as DrawerAgregarVehiculos,
  DrawerDelHuecoDiferido as DrawerDelHueco,
  ModalDelContenedorDiferido as ModalDelContenedor,
  ModalDelEmbarqueDiferido as ModalDelEmbarque,
} from '../features/transporte/components/diferidos-de-embarques'
