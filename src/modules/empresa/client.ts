// La entrada de CLIENTE del módulo `empresa`: lo que puede importar un Client Component de `app/` o de otro
// módulo (`@/modules/empresa/client`). La action del tipo de cambio, para el ⚙ de una celda de la hoja
// (4.20), y el tipo de su entrada; y del asistente de IA, sus topes y las acciones de sus errores (el panel de
// compartir). Nada de servidor: para eso está `index.ts`.
export { guardarTipoCambio } from './features/tipos-cambio/actions/guardar-tipo-cambio'
export type { EntradaDeGuardarTipoCambio } from './features/tipos-cambio/schemas/tipos-cambio'
export {
  LARGO_MAXIMO_INSTRUCCION as LARGO_MAXIMO_INSTRUCCION_DEL_ASISTENTE,
  LARGO_MAXIMO_TEXTO as LARGO_MAXIMO_TEXTO_DEL_ASISTENTE,
} from './entities/asistente-ia/config'
export {
  ACCIONES_DEL_ASISTENTE,
  accionDelAsistente,
  esCausaDelAsistente,
  type CausaDelAsistente,
} from './entities/asistente-ia/respuesta'
// Las reglas de un SVG subido (sin código, que diga cuánto mide) y su tope de peso: las usa la biblioteca de imágenes de las artes.
export { medidasDeSvg, motivoDeSvgInvalido, PESO_MAXIMO_SVG } from './entities/marca'
