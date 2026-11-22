// Composición del área `formulas-del-origen` de `cotizaciones` en el servidor: la barra de la fórmula de la página del origen y la cabeza del editor de cada
// fórmula. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import { cache } from 'react'
import type { RepositorioDeFormulasDelOrigen } from '../../entities/formulas-del-origen/repositorio'
import {
  formulasDelOrigenSupabase as repositorio,
  getFormulasDelOrigen,
  getLaFormulaDelOrigen,
} from '../../infra/formulas-del-origen/servidor'

// Las fórmulas no archivadas del origen (tope 50, `hayMas`) con sus piezas de hoy, y si hay archivadas.
export const leerFormulasDelOrigen = getFormulasDelOrigen
// Una fórmula del origen por su id, con la activa del origen; nula si no está o no se ve. Con `cache()`: la leen el layout del editor y su cabeza en el mismo pedido.
export const leerLaFormulaDelOrigen = cache(getLaFormulaDelOrigen)
// Crear, renombrar, archivar, eliminar y activar, cada una por su RPC. Las actions de `features/formulas-del-origen/` lo usan.
export const formulasDelOrigenSupabase: RepositorioDeFormulasDelOrigen = repositorio
