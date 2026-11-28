import type { VariableDelEditor } from '@/shared/ui/editor-con-variables'
import {
  ETIQUETA_DE_VARIABLE,
  OBLIGATORIAS_DEL_MENSAJE,
  VARIABLES_DEL_MENSAJE,
} from '../../../entities/portal-mensaje'

// Los botones de variable del mensaje del portal, con las obligatorias marcadas: los del modal y los del editor del arte.
export const VARIABLES_DEL_EDITOR: readonly VariableDelEditor[] = VARIABLES_DEL_MENSAJE.map(
  (clave) => ({
    clave,
    etiqueta: ETIQUETA_DE_VARIABLE[clave],
    obligatoria: OBLIGATORIAS_DEL_MENSAJE.includes(clave),
  }),
)
