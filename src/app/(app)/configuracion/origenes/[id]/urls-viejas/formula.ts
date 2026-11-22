import {
  conLaFormulaDelPanel,
  sinLosPanelesQueYaNoExisten,
} from '@/shared/lib/paneles-que-ya-no-existen'
import { rutaDeLaFormula, type ParteDeLaFormula } from '@/shared/lib/rutas'
import { conParametros, type ParametrosDeLaUrl } from '../../../con-parametros'

// La consulta de una ruta vieja de la fórmula como la entiende su pestaña nueva: sin los paneles que ya no existen (el Modo avanzado, «Empezar desde una
// plantilla») y con la fórmula de un panel en `cual` (`formula` es ahora la elegida).
function consultaNueva(parametros: ParametrosDeLaUrl): ParametrosDeLaUrl {
  return conLaFormulaDelPanel(sinLosPanelesQueYaNoExisten(parametros))
}

// A dónde llevan `…/<id>/formulas/<f>` y `…/formulas/<f>/planilla|hoja|tarjeta` (el editor de una fórmula de antes): a esa pestaña con la fórmula elegida
// (`?formula=<f>`), con toda su consulta (`?panel=`, `?version=`, `?vista=`, `?referencia=`, `?fila=`, `?lugar=`). Sin parte, la Planilla.
export function destinoDeLaFormulaVieja(
  origenId: string,
  formulaId: string,
  parte: ParteDeLaFormula,
  parametros: ParametrosDeLaUrl,
): string {
  return conParametros(rutaDeLaFormula(origenId, formulaId, parte), consultaNueva(parametros), [
    'formula',
  ])
}

// A dónde llevan `…/<id>/formulas` (la lista de antes, con sus paneles) y las rutas cortas `…/<id>/formula`, `…/formula/hoja` y `…/formula/tarjeta`: a esa
// pestaña sin `?formula=` (la de trabajo es la de por defecto), con su consulta traducida.
export function destinoSinFormula(
  origenId: string,
  parte: ParteDeLaFormula,
  parametros: ParametrosDeLaUrl,
): string {
  return conParametros(rutaDeLaFormula(origenId, null, parte), consultaNueva(parametros), [])
}
