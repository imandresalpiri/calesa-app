// La API de servidor del área `mover` de `flujos` (5.02, 6.01, 6.04). Sale por el `index.ts` de la raíz.
// 6.01: `leerFlujoDeOrigen(origenId)` da las reglas activas del origen y los atributos de sus fases para mover (lo usa el panel de la unidad de `logistica`).
// 6.04: las actions de mover salen por `client.ts` (`cambiarFase`, `cambiarFaseLote`, `previsualizarCambio`, `previsualizarCambioLote`). Lo que lee «Qué falta»
// sale aquí como función de servidor (`leerParaMoverDe` con su esquema, y `leerRequisitosDeFase`: lo que pide una fase cualquiera, para la cadena de la unidad): la llama la action de `logistica` que suma las acciones de cada requisito.
export { leerFlujoDeOrigen } from './composicion'
export { reglaActiva } from '../../entities/mover/flujo-de-origen'
export type { FaseParaMover, FlujoDeOrigen } from '../../entities/mover/flujo-de-origen'
export { leerParaMoverDe, type PedidoParaMover } from '../../features/mover/leer-para-mover-de'
export {
  leerRequisitosDeFase,
  type PedidoDeRequisitosDeFase,
} from '../../features/mover/leer-requisitos-de-fase'
export {
  esquemaLeerParaMover,
  esquemaLeerRequisitosDeFase,
} from '../../features/mover/schemas/mover'
export type { DestinoConVista, ParaMover } from '../../entities/mover/para-mover'
export type { RequisitoVista } from '../../entities/mover/vista-previa'
export { etiquetaDeRequisito, faltaDeRequisito } from '../../entities/mover/requisitos'
