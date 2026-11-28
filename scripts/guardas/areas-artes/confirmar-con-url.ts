// Parte del registro de `<Confirmar>`: Artes. La guarda (`confirmar-con-url.ts`) suma esta parte a `CONFIRMAR_CON_URL` con
// `import.meta.glob('./areas-*/confirmar-con-url.ts')` (`registros-de-carriles.ts`).
import type { ConfirmarConUrl } from '../confirmar-con-url'

const PLANTILLAS = 'src/modules/artes/features/plantillas'
const IMAGENES = 'src/modules/artes/features/imagenes'

export const REGISTRO: Record<string, ConfirmarConUrl> = {
  // `?panel=eliminar&plantilla=<id>`: eliminar una plantilla de arte, desde su «⋯».
  [`${PLANTILLAS}/components/confirmar-eliminar.tsx`]: {
    abre: `${PLANTILLAS}/hooks/use-acciones-de-las-plantillas.ts`,
    senal: 'PANEL_ELIMINAR_PLANTILLA',
  },
  // `?panel=privada&plantilla=<id>`: hacer privada la plantilla de arte de otra persona, desde su «⋯».
  [`${PLANTILLAS}/components/confirmar-privada.tsx`]: {
    abre: `${PLANTILLAS}/hooks/use-acciones-de-las-plantillas.ts`,
    senal: 'PANEL_HACERLA_PRIVADA',
  },
  // `?pestana=imagenes&panel=quitar&imagen=<id>`: quitar una imagen de la biblioteca, desde su «⋯».
  [`${IMAGENES}/components/confirmar-quitar-imagen.tsx`]: {
    abre: `${IMAGENES}/hooks/use-acciones-de-las-imagenes.ts`,
    senal: 'PANEL_QUITAR_IMAGEN',
  },
}
