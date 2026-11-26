// Parte del registro de `<Confirmar>`: las fórmulas del origen de cotizaciones. La guarda (`confirmar-con-url.ts`) suma esta parte a `CONFIRMAR_CON_URL` con
// `import.meta.glob('./areas-*/confirmar-con-url.ts')` (`registros-de-carriles.ts`).
import type { ConfirmarConUrl } from '../confirmar-con-url'

export const REGISTRO: Record<string, ConfirmarConUrl> = {
  // `?panel=archivar-formula&cual=<id>` y `?panel=eliminar-formula&cual=<id>`: el mismo diálogo, desde el «⋯» de la lista o de la cabeza del editor.
  'src/modules/cotizaciones/features/formulas-del-origen/components/confirmar-en-la-formula.tsx': {
    abre: 'src/modules/cotizaciones/features/formulas-del-origen/hooks/use-paneles-de-la-formula.tsx',
    senal: 'PANEL_ARCHIVAR_FORMULA',
  },
}
