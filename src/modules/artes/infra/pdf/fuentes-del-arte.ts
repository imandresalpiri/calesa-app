import 'server-only'
import path from 'node:path'
import { Font } from '@react-pdf/renderer'
import { PESOS_DE_TEXTO } from '../../entities/documento'
import { FUENTE_DEL_PDF } from '../../entities/editor/fuentes'

// La Geist del PDF de un arte: los TTF que carga el lienzo (`FUENTE_DEL_PDF`), registrados en react-pdf una vez por proceso con la ruta del
// archivo en `public/` (un peso por archivo, todos rectos) y medidos con ellos (`medidas-de-geist.ts`). Sin separación en sílabas: una palabra
// que no entra se parte como en el lienzo (`disposicionDelTexto()`), nunca con guion. `next.config.ts` lleva la carpeta en cada ruta que dibuja
// un PDF de arte (`scripts/guardas/fuentes-del-pdf.test.ts`).
export const FAMILIA_DEL_ARTE = FUENTE_DEL_PDF.familia

export const rutaDeLaFuente = (archivo: string) =>
  path.join(process.cwd(), 'public', FUENTE_DEL_PDF.carpeta, archivo)

let registradas = false

export function registrarFuentesDelArte(): void {
  if (registradas) {
    return
  }
  Font.register({
    family: FAMILIA_DEL_ARTE,
    fonts: PESOS_DE_TEXTO.map((peso) => ({
      src: rutaDeLaFuente(FUENTE_DEL_PDF.archivos[peso]),
      fontWeight: peso,
      fontStyle: 'normal' as const,
    })),
  })
  Font.registerHyphenationCallback((palabra) => [palabra])
  registradas = true
}
