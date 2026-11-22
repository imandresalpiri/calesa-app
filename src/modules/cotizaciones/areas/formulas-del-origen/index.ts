// La API de servidor del área `formulas-del-origen` de `cotizaciones`. Sale por el `index.ts` de la raíz, que sólo la reexporta.
//
// `leerFormulasDelOrigen(origenId)`: la lista del selector de la barra de la fórmula. `leerLaFormulaDelOrigen(origenId, id)`: la elegida en `?formula=` de Planilla, Hoja y Tarjeta,
// nula si no es de ese origen o no se ve. `origenesParaCopiar()`: de qué orígenes copia quien mira (la puesta en marcha lo pasa a «Empezar la fórmula»).
export { leerFormulasDelOrigen, leerLaFormulaDelOrigen } from './composicion'
export type { FormulaAbierta, ActivaDelOrigen } from '../../infra/formulas-del-origen/formula'
export type { ListaDeFormulasDelOrigen } from '../../infra/formulas-del-origen/lista'
export type { FormulaDeLaLista } from '../../entities/formulas-del-origen/lista'
export { estadoDeLaFormula } from '../../entities/formulas-del-origen/lista'
export { CLAVE_DE_LA_COPIA, PANEL_NUEVA_FORMULA } from '../../entities/formulas-del-origen/rutas'
export { origenesParaCopiar } from '../../entities/formulas-del-origen/copiar'
