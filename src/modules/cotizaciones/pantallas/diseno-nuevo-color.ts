// Pantalla del área `diseno` de `cotizaciones` para la planilla de la fórmula (la pestaña «Planilla» del origen y su puesta en marcha). Sólo `src/app` importa este
// archivo: reexporta lo que esas pantallas dibujan y nada más.
//
// «+ Nuevo color» del panel de una banda: la página lo pasa por el hueco `NuevoColor` de la sección de la fórmula (`entities/nuevo-color.ts`), sólo con
// `cotizaciones.configurar`.
export { NuevoColorAlVueloDiferido } from '../features/diseno/components/nuevo-color/diferidos'
