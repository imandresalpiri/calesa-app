import { leerFormulaDelOrigen } from '../../../areas/formula/composicion'
import type { FormulaDelOrigen } from '../../../entities/formula-del-origen'
import { PublicarDesdeLaHoja } from './publicar-desde-la-hoja'

type Props = {
  // El origen abierto: la página ya comprobó `cotizaciones.configurar` en él.
  origen: { id: string; nombre: string }
  // La fórmula del origen que abre la URL: la ruta ya la leyó por id y origen.
  formula: FormulaDelOrigen
}

// «Publicar…» de la pestaña Hoja (área `formula`; la compone `src/app` por `pantallas/formula-publicar.ts`, porque el área `diseno` no importa esta): lee la
// publicada y el borrador con la sesión de quien mira. Si la lectura falla no ofrece nada (el editor de la hoja dice lo suyo).
export async function PublicarEnLaHoja({ origen, formula }: Props) {
  const leida = await leerFormulaDelOrigen(formula)
  return leida.ok ? <PublicarDesdeLaHoja origen={origen} formula={leida.data} /> : null
}
